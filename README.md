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
A Dockerfile and docker-compose are provided.

Build the docker image:
`docker build -t matrix-bot-gifbot .`

Build the docker image and run docker-compose to deploy to your server:
`docker build -t matrix-bot-gifbot . && docker-compose run matrix-bot-gifbot`
```
