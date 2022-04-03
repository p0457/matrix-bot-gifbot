# matrix-bot-gifbot

A matrix bot to find gifs for you.
Supports finding gifs from:
- ~RightGIF (permanently offline)~
- ~~Tenor (not working)~~
- ~~Giphy (not working)~~
- ~~GifMe (not working)~~
- GifTV
- ~~ReplyGif (not working)~~

By default, you can target the services directly using `!rightgif [TERM]` for example, or use a default handler `!gif [TERM]`, which is default set to RightGIF.

# Usage

1. Invite bot to a room
2. Send the message `!gif [TERM]` to get a gif from the default source (you can customize the listener)

# Configuration

1. Copy `config/default.yaml` to `config/production.yaml` and customize to your needs
2. Get a token for the bot account by logging in:
```
curl -X POST --header 'Content-Type: application/json' -d '{
    "identifier": { "type": "m.id.user", "user": "bot.gifbot" },
    "password": "PASSWORD",
    "type": "m.login.password"
}' 'https://YOUR_HOMESERVER/_matrix/client/r0/login'
```
3. The pre-disabed providers are confirmed not working (TODO: Investigate)

# Building your own

*Note*: You'll need to have access to an account that the bot can use to get the access token.

1. Clone this repository
2. Use the VS Code build tasks, or `npm install && npm run build`
3. Copy `config/default.yaml` to `config/production.yaml` and customize to your needs
4. Run the bot with `NODE_ENV=production node lib/index.js`

### Docker

```
A Dockerfile and docker-compose are provided.
Copy `config/default.yaml` to `config/production.yaml` and customize to your needs

Build the docker image:
`docker build -t matrix-bot-gifbot .`

Docker-compose (foreground):
`docker-compose run matrix-bot-gifbot`

Docker-compose (background):
`docker-compose up -d`

Run manually:
`docker run matrix-bot-gifbot`
```
