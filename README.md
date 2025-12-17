![Birthday Painter Logo](birthday-painter.png)

# Birthday Painter

This GitHub action paints birthday images for employees having birthdays and posts them to Slack channels.

## Configuring

### Secrets

The following repository secrets need to be set:

- `SLACK_BOT_TOKEN`: The *bot token* for the Slack app with the following scopes: `channels:read`, `groups:read`, `chat:write`, `files:write`, `users:read`, `users:read.email`
- `SLACK_USER_TOKEN`: The *user token* for the Slack app with the following scopes: `users:read`, `users:read.email`, `users.profile:read`
- `PERSONIO_CLIENT_ID`: The client ID for a Personio API integration with *read permission* for the `employees` endpoint, with the following attributes: `first name`, `last name`, `status`, `gender`, `date of birth`, `city`, `country`
- `PERSONIO_CLIENT_SECRET`: The client secret for a Personio API integration.
- `GEMINI_API_KEY`: The API key for Google Gemini to generate birthday images.
