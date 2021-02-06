import { MatrixClient, RichReply } from "matrix-bot-sdk";
import { LogService } from "matrix-js-snippets";
import striptags = require("striptags");
const axios = require('axios');
import config from "./config";
import { getListeningTermProviders } from "./helpers";

export class CommandProcessor {
    constructor(private client: MatrixClient) {
    }

    public tryCommand(roomId: string, event: any): Promise<any> {
        const defaultListeningTerm = config.defaultListeningTerm;
        if (!defaultListeningTerm) return this.sendHtmlReply(roomId, event, "GifBot is misconfigured");

        const message = event['content']['body'];
        if (!message) return;
        const messageForCompare = (config.listenerCaseSensitive ? message: message.toLowerCase()) + " "; // Add a space add the end for `giftv `

        let provider = config.defaultProvider.toLowerCase();
        let searchTerm = "";

        let showHelp = false;
        if (message.toLowerCase().trim() === `${defaultListeningTerm} help`) showHelp = true;

        try {
            if (showHelp) {
                return this.sendHtmlReply(roomId, event, this.getHelpString());
            } else {
                // Make sure to check for the space
                if (!messageForCompare.startsWith(`${defaultListeningTerm} `)) {
                    const validProviders = getListeningTermProviders();
                    const foundValidProvider = validProviders.find((p) => {
                        if (config.listenerCaseSensitive) return messageForCompare.startsWith(`${p} `);
                        else return messageForCompare.startsWith(`${p.toLowerCase()} `);
                    });
                    if (!foundValidProvider) return this.sendHtmlReply(roomId, event, "This provider either does not exist or is not enabled");
                    else {
                        provider = foundValidProvider.substring(1).toLowerCase(); // Remove '!'
                        searchTerm = message.substring(foundValidProvider.length + 1).trim();
                    }
                }
                else searchTerm = message.substring(defaultListeningTerm.length + 1).trim();

                // Handle `!giftv` or the replaced listening term for it
                if (!searchTerm && provider == "giftv") return this.getGifGifTv(roomId, event, searchTerm);
                else if (!searchTerm) {
                    return this.sendHtmlReply(roomId, event, `No search term! Try <code>${defaultListeningTerm} help</code>`);
                } else if (searchTerm && !showHelp) {
                    if (provider === "rightgif") return this.getGifRightGif(roomId, event, searchTerm);
                    else if (provider == "tenor") return this.getGifTenor(roomId, event, searchTerm);
                    else if (provider == "giphy") return this.getGifGiphy(roomId, event, searchTerm);
                    else if (provider == "gifme") return this.getGifGifMe(roomId, event, searchTerm);
                    else if (provider == "giftv") return this.getGifGifTv(roomId, event, searchTerm);
                    else if (provider == "replygif") return this.getGifReplyGif(roomId, event, searchTerm);
                    else return this.sendHtmlReply(roomId, event, "There was an error processing your command");
                }
            }
        } catch (err) {
            LogService.error("CommandProcessor", err);
            return this.sendHtmlReply(roomId, event, "There was an error processing your command");
        }
    }

    private getHelpString(): string {
        let helpString = "<h4>GifBot Help</h4><pre><code>";
        let options = [
            {
                command: `${config.defaultListeningTerm} help`,
                description: "Shows this help menu"
            },
            {
                command: `${config.defaultListeningTerm} [TERM]`,
                description: `Finds a gif for the term provided from the default source (${config.defaultProvider})`
            }
        ];
        if (config.rightGifEnabled) {
            options.push({
                command: `${config.rightGifListeningTerm} [TERM]`,
                description: "Finds a gif for the term provided from RightGIF"
            });
        }
        if (config.tenorEnabled) {
            options.push({
                command: `${config.tenorListeningTerm} [TERM]`,
                description: "Finds a gif for the term provided from Tenor"
            });
        }
        if (config.giphyEnabled) {
            options.push({
                command: `${config.giphyListeningTerm} [TERM]`,
                description: "Finds a gif for the term provided from Giphy"
            });
        }
        if (config.gifMeEnabled) {
            options.push({
                command: `${config.gifMeListeningTerm} [TERM]`,
                description: "Finds a gif for the term provided from GifMe"
            });
        }
        if (config.gifTvEnabled) {
            options.push({
                command: config.gifTvListeningTerm,
                description: "Finds a random gif from GifTV (no search)"
            });
        }
        if (config.replyGifEnabled) {
            options.push({
                command: `${config.replyGifListeningTerm} [TERM]`,
                description: "Finds a gif for the term provided from ReplyGif"
            });
        }
        // Get max length of commands
        const maxCommandLength = Math.max.apply(Math, options.map(function(o) { return o.command.length; }));
        const minimumLength = 17;
        const commandDisplayColumnLength = Math.max(maxCommandLength, minimumLength);
        options.forEach((o) => {
            helpString += o.command;
            const numberOfSpaces = commandDisplayColumnLength - o.command.length;
            if (numberOfSpaces > 0) helpString += new Array(numberOfSpaces + 1).join(" ");
            helpString += `- ${o.description}\n`;
        });
        helpString += "</code></pre>";

        return helpString;
    }

    private getGif(roomId: string, event: any, provider: string, searchTerm: string, axiosOptions: any, processResponse: Function): Promise<any> {
        return new Promise((resolve, reject) => {
            axios(axiosOptions)
            .then((response) => {
                const gifUrl = processResponse(response);
                if (gifUrl) {
                    this.sendHtmlReply(roomId, event, gifUrl);
                    resolve();
                } else {
                    this.sendHtmlReply(roomId, event, `No gif found for term <code>${searchTerm}</code>`);
                    resolve();
                }
            }, (error) => {
                LogService.error(`CommandProcessor.${provider}`, error);
                this.sendHtmlReply(roomId, event, "There was an error processing your command");
                reject(error);
            });
            resolve();
        });
    }

    private getGifRightGif(roomId: string, event: any, searchTerm: string): Promise<any> {
        const axiosOptions = {
            method: 'post',
            url: config.rightGifApiEndpoint,
            data: {
                text: searchTerm
            },
            headers: {
                'Content-Type': 'application/json'
            }
        };
        return this.getGif(roomId, event, "RightGIF", searchTerm, axiosOptions, (response) => {
            if (response && response.data && response.data.url) {
                return response.data.url;
            }
            else return undefined;
        });
    }

    private getGifTenor(roomId: string, event: any, searchTerm: string): Promise<any> {
        if (!config.tenorApiKey) {
            LogService.error("CommandProcessor.Tenor", "Tenor API Key was not defined");
            return this.sendHtmlReply(roomId, event, "GifBot is misconfigured");
        }
        const axiosOptions = {
            method: 'get',
            url: config.tenorAnonApiEndpoint.replace("{key}", config.tenorApiKey)
        };
        return this.getGif(roomId, event, "Tenor", searchTerm, axiosOptions, (response) => {
            try {
                const body = JSON.parse(response.body);
                const anonId = body["anon_id"];
                const limit = 8;
                const url = config.tenorApiEndpoint
                .replace("{searchTerm}", searchTerm)
                .replace("{key}", config.tenorApiKey)
                .replace("{limit}", limit.toString())
                .replace("{anonId}", anonId);
                axios({
                    method: 'get',
                    url: url
                })
                .then((response) => {
                    const parsedResponse = JSON.parse(response);
                    const searchResults = parsedResponse["results"];
                    const result = searchResults[0];
                    const gifUrl = result["media"][0]["tinygif"]["url"];
                    if (gifUrl) return gifUrl;
                    else return undefined;
                }, (error) => {
                    LogService.error("CommandProcessor.Tenor", error);
                    this.sendHtmlReply(roomId, event, "There was an error processing your command");
                    return undefined;
                });
            }
            catch (err) {
                return undefined;
            }
        });
    }

    private getGifGiphy(roomId: string, event: any, searchTerm: string): Promise<any> {
        if (!config.giphyApiKey) {
            LogService.error("CommandProcessor.Giphy", "Giphy API Key was not defined");
            return this.sendHtmlReply(roomId, event, "GifBot is misconfigured");
        }
        const url = config.giphyApiEndpoint
        .replace("{key}", config.giphyApiKey)
        .replace("{searchTerm}", searchTerm);
        const axiosOptions = {
            method: 'get',
            url: url
        };
        return this.getGif(roomId, event, "Giphy", searchTerm, axiosOptions, (response) => {
            try {
                const body = JSON.parse(response.body);
                const data = body.data;
                const gifUrl = data[0].images.original.url;
                if (gifUrl) return gifUrl
                else return undefined;
            }
            catch (err) {
                return undefined;
            }
        });
    }

    private getGifGifMe(roomId: string, event: any, searchTerm: string): Promise<any> {
        if (!config.gifMeApiKey) {
            LogService.error("CommandProcessor.GifMe", "GifMe API Key was not defined");
            return this.sendHtmlReply(roomId, event, "GifBot is misconfigured");
        }
        const url = config.gifMeApiEndpoint
        .replace("{key}", config.gifMeApiKey)
        .replace("{searchTerm}", searchTerm);
        const axiosOptions = {
            method: 'get',
            url: url
        };
        return this.getGif(roomId, event, "GifMe", searchTerm, axiosOptions, (response) => {
            try {
                const body = JSON.parse(response.body);
                const data = body.data;
                const gifUrl = data[0].link;
                if (gifUrl) return gifUrl
                else return undefined;
            }
            catch (err) {
                return undefined;
            }
        });
    }

    // Doesn't support search term
    private getGifGifTv(roomId: string, event: any, searchTerm: string): Promise<any> {
        if (!config.gifTvGifStub) {
            LogService.error("CommandProcessor.GifTV", "GifTV API Key was not defined");
            return this.sendHtmlReply(roomId, event, "GifBot is misconfigured");
        }
        const axiosOptions = {
            method: 'get',
            url: config.gifTvApiEndpoint
        };
        return this.getGif(roomId, event, "GifTV", searchTerm, axiosOptions, (response) => {
            try {
                if (response.data) return config.gifTvGifStub.replace("{id}", response.data);
                else return undefined;
            }
            catch (err) {
                return undefined;
            }
        });
    }

    private getGifReplyGif(roomId: string, event: any, searchTerm: string): Promise<any> {
        if (!config.replyGifApiKey) {
            LogService.error("CommandProcessor.ReplyGif", "ReplyGif API Key was not defined");
            return this.sendHtmlReply(roomId, event, "GifBot is misconfigured");
        }
        const url = config.replyGifApiEndPoint
        .replace("{key}", config.replyGifApiKey)
        .replace("{searchTerm}", searchTerm);
        const axiosOptions = {
            method: 'get',
            url: url
        };
        return this.getGif(roomId, event, "ReplyGif", searchTerm, axiosOptions, (response) => {
            try {
                const body = JSON.parse(response.body);
                const data = body.data;
                const gifUrl = data[0].file;
                if (gifUrl) return gifUrl
                else return undefined;
            }
            catch (err) {
                return undefined;
            }
        });
    }

    private sendHtmlReply(roomId: string, event: any, message: string): Promise<any> {
        const reply = RichReply.createFor(roomId, event, striptags(message), message);
        reply["msgtype"] = "m.notice";
        return this.client.sendMessage(roomId, reply);
    }
}
