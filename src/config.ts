import * as config from "config";
import { LogConfig } from "matrix-js-snippets";

interface IConfig {
    homeserverUrl: string;
    accessToken: string;

    msBetweenResponses: number;

    defaultListeningTerm: string;

    rightGifEnabled: boolean;
    tenorEnabled: boolean;
    giphyEnabled: boolean;
    gifMeEnabled: boolean;
    gifTvEnabled: boolean;
    replyGifEnabled: boolean;

    rightGifListeningTerm: string;
    tenorListeningTerm: string;
    giphyListeningTerm: string;
    gifMeListeningTerm: string;
    gifTvListeningTerm: string;
    replyGifListeningTerm: string;

    listenerCaseSensitive: false;

    rightGifApiEndpoint: string;
    tenorAnonApiEndpoint: string;
    tenorApiEndpoint: string;
    giphyApiEndpoint: string;
    gifMeApiEndpoint: string;
    gifTvApiEndpoint: string;
    gifTvGifStub: string;
    replyGifApiEndPoint: string;

    tenorApiKey: string;
    giphyApiKey: string;
    gifMeApiKey: string;
    replyGifApiKey: string;

    defaultProvider: string;

    logging: LogConfig;
}

const conf = <IConfig>config;

if (process.env["BOT_DOCKER_LOGS"]) {
    console.log("Altering log configuration to only write out to console");
    conf.logging = {
        file: "/data/logs/matrix-bot-gifbot.log",
        console: true,
        consoleLevel: conf.logging.consoleLevel,
        fileLevel: "error",
        writeFiles: false,
        rotate: {
            size: 0,
            count: 0,
        },
    };
}

export default conf;
