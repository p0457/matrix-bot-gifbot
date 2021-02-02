import { AutojoinRoomsMixin, AutojoinUpgradedRoomsMixin, MatrixClient, SimpleRetryJoinStrategy } from "matrix-bot-sdk";
import config from "./config";
import { LogService } from "matrix-js-snippets";
import { CommandProcessor } from "./CommandProcessor";

LogService.configure(config.logging);
const client = new MatrixClient(config.homeserverUrl, config.accessToken);
const commands = new CommandProcessor(client);

AutojoinRoomsMixin.setupOnClient(client);
AutojoinUpgradedRoomsMixin.setupOnClient(client);
client.setJoinStrategy(new SimpleRetryJoinStrategy());

async function finishInit() {
    const userId = await client.getUserId();
    LogService.info("index", `GifBot logged in as ${userId}`);

    client.on("room.message", async (roomId, event) => {
        if (event['sender'] === userId) return;
        if (event['type'] !== "m.room.message") return;
        if (!event['content']) return;
        if (event['content']['msgtype'] !== "m.text") return;

        const secondsSinceEpoch = new Date().getTime(); // Get current ms since epoch for now UTC
        const eventSecondsSinceEpoch = event.origin_server_ts; // Get ms since epoch for message UTC
        const tsDiff = secondsSinceEpoch - eventSecondsSinceEpoch; // Find difference

        // In order to not respond to all messages in the room upon re-joining on startup, clip using the epoch ts of the server message
        try {
            if (tsDiff < 200) {
                return Promise.resolve(commands.tryCommand(roomId, event));
            } else {
                LogService.error("index", "Will not respond to a message that has likely already been responded to");
                return;
            }
        } catch (err) {
            LogService.error("index", err);
            return client.sendNotice(roomId, "There was an error processing your command");
        }
    });

    client.on("room.event", (roomId, event) => {
        if (event['type'] !== "m.room.bot.options") return;
        if (event['state_key'] !== `_${userId}`) return;
    });

    return client.start();
}

finishInit().then(() => LogService.info("index", "GifBot started!"));
