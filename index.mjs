import {readFile} from 'fs/promises';

function getInput(name) {
    return (process.env[`INPUT_${name.replace(/ /g, '_').toUpperCase()}`] || '').trim()
}

const PERSONIO_CLIENT_ID = process.env.PERSONIO_CLIENT_ID || getInput('PERSONIO_CLIENT_ID');
const PERSONIO_CLIENT_SECRET = process.env.PERSONIO_CLIENT_SECRET || getInput('PERSONIO_CLIENT_SECRET');
const SLACK_USER_TOKEN = process.env.SLACK_USER_TOKEN || getInput('SLACK_USER_TOKEN');
const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN || getInput('SLACK_BOT_TOKEN');
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || getInput('GEMINI_API_KEY');
const BANT_PNG_BASE64 = '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';

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
    parts.push({
        inline_data: {
            mime_type: "image/png",
            data: BANT_PNG_BASE64
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
        const birthdayEmployees = getEmployeesWithBirthdayToday(employees, new Date());

        if (birthdayEmployees.length === 0) {
            console.log('No birthdays today');
            return;
        }
        console.log(`Found ${birthdayEmployees.length} birthday(s) today`);

        const slackUsers = [];
        for (const employee of birthdayEmployees) {
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
