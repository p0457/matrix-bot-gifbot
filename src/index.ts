import { AutojoinRoomsMixin, AutojoinUpgradedRoomsMixin, MatrixClient, SimpleRetryJoinStrategy } from "matrix-bot-sdk";
import config from "./config";
import { LogService } from "matrix-js-snippets";
import { CommandProcessor } from "./CommandProcessor";
import { getListeningTermProviders } from "./helpers";

LogService.configure(config.logging);
const client = new MatrixClient(config.homeserverUrl, config.accessToken);
const commands = new CommandProcessor(client);

AutojoinRoomsMixin.setupOnClient(client);
AutojoinUpgradedRoomsMixin.setupOnClient(client);
client.setJoinStrategy(new SimpleRetryJoinStrategy());

async function finishInit() {
    // Check defaultListeningTerm exists
    if (!config.defaultListeningTerm) {
        LogService.error("index", "defaultListeningTerm is not defined");
        return;
    }

    // Check defaultProvider exists
    if (!config.defaultProvider) {
        LogService.error("index", "defaultProvider is not defined");
        return;
    }

    // Check defaultProvider is valid
    const validProviders = ["rightGif", "tenor", "giphy", "gifMe", "gifTv", "replyGif"];
    const foundValidProvider = validProviders.find((p) => {
        return p.toLowerCase().trim() === config.defaultProvider.toLowerCase().trim();
    });
    if (!foundValidProvider) {
        LogService.error("index", "defaultProvider was invalid");
        return;
    }

    // Check defaultProvider is enabled
    if (
        (foundValidProvider === "rightGif" && !config.rightGifEnabled) || 
        (foundValidProvider === "tenor" && !config.tenorEnabled) || 
        (foundValidProvider === "giphy" && !config.giphyEnabled) || 
        (foundValidProvider === "gifMe" && !config.gifMeEnabled) || 
        (foundValidProvider === "gifTv" && !config.gifTvEnabled) || 
        (foundValidProvider === "replyGif" && !config.replyGifEnabled) 
    ) {
        LogService.error("index", `defaultProvider ${foundValidProvider} was not enabled`);
        return;
    }

    const userId = await client.getUserId();
    LogService.info("index", `GifBot logged in as ${userId}`);

    client.on("room.message", async (roomId, event) => {
        if (event["sender"] === userId) return;
        if (event["type"] !== "m.room.message") return;
        if (!event["content"]) return;
        if (event["content"]["msgtype"] !== "m.text") return;

        const message = event["content"]["body"];
        const messageForCompare = message + " "; // Add a space add the end for `giftv `

        // Check message is received from a date not too far behind
        // NOTE: When restarting application, bot will respond to most messages in the room, instead of just new ones
        if (isNaN(config.msBetweenResponses) || config.msBetweenResponses < 0) {
            LogService.error("index", "Invalid value for msBetweenResponses");
            return;
        }
        const secondsSinceEpoch = new Date().getTime(); // Get current ms since epoch for now UTC
        const eventSecondsSinceEpoch = event.origin_server_ts; // Get ms since epoch for message UTC
        const tsDiff = secondsSinceEpoch - eventSecondsSinceEpoch; // Find difference
        if (tsDiff >= config.msBetweenResponses) {
            const eventId = event["event_id"];
            const sender = event["sender"]
            LogService.warn("index", `Will not respond to a message that has likely already been responded to (or ignored) ${tsDiff}ms ago (${eventId} sent by ${sender})`);
            return;
        }

        // Check message starts with something valid
        let validListeners = getListeningTermProviders();
        validListeners.push(config.defaultListeningTerm);
        let validListener = false;
        const validProvider = validListeners.find((l) => {
            if (config.listenerCaseSensitive) return messageForCompare.toLowerCase().startsWith(`${l.toLowerCase()} `);
            else return messageForCompare.startsWith(`${l} `);
        });
        if (validProvider) validListener = true;
        if (!validListener) return;

        // Process the command
        try {
            return Promise.resolve(commands.tryCommand(roomId, event));
        } catch (err) {
            LogService.error("index", err);
            return client.sendNotice(roomId, "There was an error processing your command");
        }
    });

    return client.start();
}

finishInit().then(() => LogService.info("index", "GifBot started"));
