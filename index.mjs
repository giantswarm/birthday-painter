import {readFile} from 'fs/promises';

function getInput(name) {
    return (process.env[`INPUT_${name.replace(/ /g, '_').toUpperCase()}`] || '').trim()
}

const PERSONIO_CLIENT_ID = process.env.PERSONIO_CLIENT_ID || getInput('PERSONIO_CLIENT_ID');
const PERSONIO_CLIENT_SECRET = process.env.PERSONIO_CLIENT_SECRET || getInput('PERSONIO_CLIENT_SECRET');
const SLACK_USER_TOKEN = process.env.SLACK_USER_TOKEN || getInput('SLACK_USER_TOKEN');
const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN || getInput('SLACK_BOT_TOKEN');
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || getInput('GEMINI_API_KEY');

if (!PERSONIO_CLIENT_ID || !PERSONIO_CLIENT_SECRET || !SLACK_USER_TOKEN || !SLACK_BOT_TOKEN) {
    console.error('Missing required environment variables: PERSONIO_CLIENT_ID, PERSONIO_CLIENT_SECRET, SLACK_USER_TOKEN, SLACK_BOT_TOKEN');
    process.exit(1);
}

async function getPersonioToken() {
    const response = await fetch('https://api.personio.de/v1/auth', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            client_id: PERSONIO_CLIENT_ID,
            client_secret: PERSONIO_CLIENT_SECRET,
        }),
    });
    const data = await response.json();
    if (!data.success) {
        throw new Error(`Error getting Personio token: ${data.error.message}`);
    }
    return data.data.token;
}

async function getPaginatedPersonioData(personioToken, endpoint, params = {}) {
    let allData = [], offset = 0, hasMore = true;
    const limit = 200;
    const urlParams = new URLSearchParams(params);

    do {
        const response = await fetch(`https://api.personio.de/v1/${endpoint}?${urlParams.toString()}&limit=${limit}&offset=${offset}`, {
            headers: {'Authorization': `Bearer ${personioToken}`},
        });
        const data = await response.json();
        if (!data.success) {
            throw new Error(`Error getting data from Personio endpoint ${endpoint}: ${JSON.stringify(data.error)}`);
        }

        if (data.data?.length > 0) {
            allData = allData.concat(data.data);
            offset += limit;
        }

        hasMore = data.data?.length >= limit;
    } while (hasMore);

    return allData;
}

async function getActiveEmployees(personioToken) {
    return (await getPaginatedPersonioData(personioToken, 'company/employees')).filter(e => e?.attributes?.status?.value === 'active');
}

async function slackApiCall(asUser, endpoint, method = 'GET', body = null) {
    const url = `https://slack.com/api/${endpoint}`;
    const options = {
        method,
        headers: {
            'Authorization': `Bearer ${asUser ? SLACK_USER_TOKEN : SLACK_BOT_TOKEN}`,
            'Content-Type': 'application/json; charset=utf-8',
        },
    };
    if (body) {
        options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    const data = await response.json();
    if (!data.ok) {
        throw new Error(`Slack API error for ${endpoint}: ${data.error}`);
    }
    return data;
}

async function getCursorPaginatedSlackData(asUser, endpoint, resultKey, initialCursor = '') {
    const getNested = (obj, path) => path.split('.').reduce((acc, part) => acc && acc[part], obj);
    let results = [];
    let cursor = initialCursor;
    do {
        const url = cursor ? `${endpoint}&cursor=${cursor}` : endpoint;
        const data = await slackApiCall(asUser, url);
        const newResults = getNested(data, resultKey);
        if (newResults) {
            results = results.concat(newResults);
        }
        cursor = data.response_metadata ? data.response_metadata.next_cursor : (resultKey ? data[resultKey.split('.')[0]].paging.next_cursor : null);
    } while (cursor);
    return results;
}

function toMonthDay(date) {
    const month = ('' + (date.getMonth() + 1)).padStart(2, '0');
    const day = ('' + date.getDate()).padStart(2, '0');
    return `${month}-${day}`;
}

function findAttributeKeyByLabel(attributes, label) {
    for (const key in attributes) {
        if ((attributes[key]?.label || '').toLowerCase() === label.toLowerCase()) {
            return key;
        }
    }
    return null;
}

function getEmployeesWithBirthdayToday(employees, date = new Date()) {
    if (!employees.length) {
        return [];
    }

    const bdayKey = findAttributeKeyByLabel(employees[0]?.attributes || {}, "Date of birth");
    const todayMonthDay = toMonthDay(date);
    return employees.filter(employee => {
        return (employee?.attributes?.[bdayKey]?.value || '').substring(5, 10) === todayMonthDay
    });
}

async function getSlackUserByEmail(email) {
    try {
        const data = await slackApiCall(false, `users.lookupByEmail?email=${encodeURIComponent(email)}`);
        return data.user;
    } catch (error) {
        console.error(`Error looking up Slack user by email ${email}:`, error);
        return null;
    }
}

async function downloadImageToBuffer(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to download image from ${url}: ${response.statusText}`);
    }
    const buffer = await response.arrayBuffer();
    return Buffer.from(buffer);
}

async function loadLogoImage() {
    const bantBuffer = await readFile(`${process.cwd()}/bant.png`);
    return bantBuffer.toString('base64');
}

function buildEmployeeDataText(employee) {
    const firstName = employee.attributes.first_name?.value || '';
    const lastName = employee.attributes.last_name?.value || '';
    const gender = employee.attributes.gender?.value || '';
    const office = employee.attributes.office?.value?.attributes?.name || '';
    const bdayKey = findAttributeKeyByLabel(employee.attributes || {}, "Date of birth");
    const bday = new Date(employee?.attributes?.[bdayKey]?.value);

    const month = bday.toLocaleString('en-US', {month: 'short'});
    const day = bday.getDate();

    return `${firstName} ${lastName}, ${gender}, ${month} ${day}, ${office}`;
}

function generateBirthdayFilename(slackUsers, extension) {
    const slackHandles = slackUsers
        .filter(u => u?.name)
        .map(u => u.name)
        .join('-');
    const sanitizedHandles = slackHandles.replace(/[^a-zA-Z0-9-_]/g, '-');
    return sanitizedHandles ? `birthday-${sanitizedHandles}.${extension}` : `birthday-generated.${extension}`;
}

async function generateBirthdayImage(employees, slackUsers) {
    const parts = [];
    parts.push({
        text: `The following staff members have birthday at the specified days.
        Lookup a *single* (pick the most nerdy, noteworthy, positive, funny) historic event fact/event/scene/happening
        on or around this day of the year, that is loosely relevant to that staff members style/location and is somewhat
        suitable for visualization in an image.
        Pick the most curious/important/fun/visualizable scene and render and image with the staff member(s) prominently
        featuring inside and taking part in the activities/event (profile pictures of staff members attached after
        each staff member line, where available).
        Pick *one* event and let the people be together, optionally interact in an activity relevant to that place/event.
        Also place the logo (first picture following this text) unobtrusively, without overdoing it, for example on
        clothing, hats, flags, or similar.
        Use an artistic style if it fits the event (e.g. oil painting, digital art,
        comic style, anime, pop art, street art, etc.). Avoid too dark or dull colors.
        The image should be funny and meme-like, not a formal or serious depiction.
        Also render the text "Happy birthday <first names>!<linebreak><short event title>" in cute font on top or on the
        bottom of the image (where it fits). It shouldn't look like a birthday card, more like a meme (LOL):\n`
    });
    parts.push({text: "Logo image (bant.png):"});
    const logoBase64 = await loadLogoImage();
    parts.push({
        inline_data: {
            mime_type: "image/png",
            data: logoBase64
        }
    });

    for (let i = 0; i < employees.length; i++) {
        const employee = employees[i];
        parts.push({text: buildEmployeeDataText(employee)});

        const slackUser = slackUsers[i];
        if (slackUser?.profile?.image_512) {
            const firstName = employee.attributes.first_name?.value || '';
            const lastName = employee.attributes.last_name?.value || '';
            try {
                const buffer = await downloadImageToBuffer(slackUser.profile.image_512);
                const base64 = buffer.toString('base64');
                parts.push({
                    inline_data: {
                        mime_type: "image/png",
                        data: base64
                    }
                });
            } catch (error) {
                console.error(`Error downloading profile picture for ${firstName} ${lastName}:`, error);
            }
        }
    }

    for (let attempt = 1; attempt <= 3; attempt++) {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'x-goog-api-key': GEMINI_API_KEY,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [
                    {
                        parts: parts
                    }
                ],
                tools: [{"google_search": {}}],
                generationConfig: {
                    "responseModalities": ["IMAGE"]
                }
            }),
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(`Gemini API error: ${JSON.stringify(data).substring(0, 256)}`);
        }

        const candidate = data.candidates?.[0];
        if (!candidate) {
            throw new Error(`No candidates in Gemini response: ${JSON.stringify(data).substring(0, 256)}`);
        }

        if (!candidate.content?.parts?.length) {
            throw new Error(`No parts in Gemini response: ${JSON.stringify(data).substring(0, 256)}`);
        }

        for (const part of candidate.content.parts) {
            let extension = null;
            switch (part.inlineData?.mimeType) {
                case 'image/png':
                    extension = 'png';
                    break;
                case 'image/jpeg':
                    extension = 'jpg';
                    break;
            }
            if (extension && part?.inlineData?.data) {
                const imageBuffer = Buffer.from(part.inlineData.data, 'base64');
                const filename = generateBirthdayFilename(slackUsers, extension);

                return {buffer: imageBuffer, filename};
            }
        }

        if (candidate?.finishReason === 'IMAGE_OTHER') {
            console.log('Gemini returned finishReason=IMAGE_OTHER... retrying');
        } else {
            throw new Error(`No image data in Gemini response: ${JSON.stringify(data).substring(0, 256)}`);
        }
    }
}

async function getSlackUploadURL(filename, filesize) {
    const formData = new URLSearchParams();
    formData.append('filename', filename);
    formData.append('length', filesize.toString());

    const response = await fetch('https://slack.com/api/files.getUploadURLExternal', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${SLACK_BOT_TOKEN}`,
            'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
        },
        body: formData,
    });

    const data = await response.json();
    if (!data.ok) {
        throw new Error(`Slack getUploadURLExternal error: ${data.error}`);
    }

    return {
        uploadUrl: data.upload_url,
        fileId: data.file_id,
    };
}

async function uploadFileToSlackURL(uploadUrl, fileBuffer) {
    const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/octet-stream',
        },
        body: fileBuffer,
    });

    if (!response.ok) {
        throw new Error(`Failed to upload file to Slack URL: ${response.statusText}`);
    }
}

async function completeSlackFileUpload(fileId, filename, channelId, initialComment = null) {
    const requestBody = {
        files: [
            {
                id: fileId,
                title: filename,
            }
        ],
        channel_id: channelId,
    };

    if (initialComment) {
        requestBody.initial_comment = initialComment;
    }

    const response = await fetch('https://slack.com/api/files.completeUploadExternal', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${SLACK_BOT_TOKEN}`,
            'Content-Type': 'application/json; charset=utf-8',
        },
        body: JSON.stringify(requestBody),
    });

    const data = await response.json();
    if (!data.ok) {
        throw new Error(`Slack completeUploadExternal error: ${data.error}`);
    }

    return data.files?.[0];
}

async function uploadImageToSlack(fileBuffer, filename, channelIds, initialComment = null) {
    const {uploadUrl, fileId} = await getSlackUploadURL(filename, fileBuffer.length);
    await uploadFileToSlackURL(uploadUrl, fileBuffer);

    for (const channelId of channelIds) {
        console.log(`Sharing image with Slack channel ${channelId}`);
        return await completeSlackFileUpload(fileId, filename, channelId, initialComment);
    }
}

async function main() {
    try {
        const personioToken = await getPersonioToken();
        const employees = await getActiveEmployees(personioToken);
        const birthdayEmployees = getEmployeesWithBirthdayToday(employees, new Date('2025-08-09'));

        if (birthdayEmployees.length === 0) {
            console.log('No birthdays today');
            return;
        }
        console.log(`Found ${birthdayEmployees.length} birthday(s) today`);

        const slackUsers = [];
        for await (const employee of birthdayEmployees) {
            const email = employee.attributes.email?.value;
            if (!email) {
                slackUsers.push(null);
                continue;
            }
            const slackUser = await getSlackUserByEmail(email);
            slackUsers.push(slackUser);
        }
        const channels = await getCursorPaginatedSlackData(false, 'users.conversations?types=public_channel,private_channel&exclude_archived=true', 'channels');
        if (channels.length) {
            console.log('Generating birthday image with Gemini...');
            const {buffer: imageBuffer, filename} = await generateBirthdayImage(birthdayEmployees, slackUsers);

            console.log('Uploading image to Slack...');
            const mentions = slackUsers
                .filter(u => u?.id)
                .map(u => `<@${u.id}>`)
                .join(' ');
            await uploadImageToSlack(imageBuffer, filename, channels.map(c => c.id), mentions ? mentions + ' :birthday-cake:' : null);
        }

        console.log('Birthday Painter processing complete');
    } catch (error) {
        console.error('Error in main execution:', error);
    }
}

await main();
