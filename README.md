# matrix-bot-gifbot

A matrix bot to find gifs for you.

# Usage

1. Invite bot to a private room
2. Send the message `!gif text` to get a gif from the default source

# Building your own

*Note*: You'll need to have access to an account that the bot can use to get the access token.

1. Clone this repository
2. `npm install`
3. `npm run build`
4. Copy `config/default.yaml` to `config/production.yaml`
5. Run the bot with `NODE_ENV=production node lib/index.js`

### Docker

```
# Create the directory structure
# The bot needs it's config folder and cache location.
mkdir -p /matrix-bot-gifbot/config
mkdir -p /matrix-bot-gifbot/storage

# Create the configuration file. Use the default configration as a template.
nano /matrix-bot-gifbott/config/production.yaml

# Run the container
TODO: 
```
