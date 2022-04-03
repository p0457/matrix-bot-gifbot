import { MatrixClient, RichReply } from "matrix-bot-sdk";
import { LogService } from "matrix-js-snippets";
import striptags = require("striptags");
const axios = require('axios');
import config from "./config";
import { getListeningTermProviders } from "./helpers";
import { v4 as uuidv4 } from "uuid";

export class CommandProcessor {
    private _client: MatrixClient;

    constructor(private client: MatrixClient) {
        this._client = client;
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

                // Upload gif by url
                if (config.supportUrlUploadToServer && this.isValidURL(searchTerm.trim())) {
                    return this.uploadGifByUrl(roomId, event, searchTerm.trim());
                }

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
        if (config.supportUrlUploadToServer) {
            options.push({
                command: `${config.defaultListeningTerm} [URL]`,
                description: "Upload a gif from URL to this server to enable auto-play"
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

    private uploadGifByUrl(roomId: string, event: any, gifUrl: string): Promise<any> {
        return new Promise((resolve, reject) => {
            axios.get(gifUrl, { responseType: 'arraybuffer' })
                .then((response) => {
                    const buffer = Buffer.from(response.data, "utf-8");
                    const fileName = `gif-${uuidv4()}.gif`;
                    const mimeType = "image/gif";
                    this._client.uploadContent(buffer, mimeType, fileName)
                        .then((contentUri) => {
                            this.sendImageReply(roomId, event, fileName, contentUri, mimeType);
                            resolve(undefined);
                        })
                        .catch((error) => {
                            LogService.error(`CommandProcessor.URLUpload`, error);
                            this.sendHtmlReply(roomId, event, "There was an error processing your command");
                            reject(error);
                        });
                })
                .catch((error) => {
                    LogService.error(`CommandProcessor.URLUpload`, error);
                    this.sendHtmlReply(roomId, event, "There was an error processing your command");
                    reject(error);
                });
        });
    }

    private getGif(roomId: string, event: any, provider: string, searchTerm: string, axiosOptions: any, processResponse: Function): Promise<any> {
        return new Promise((resolve, reject) => {
            axios(axiosOptions)
            .then(async (response) => {
                const gifUrl = await processResponse(response);
                if (gifUrl) {
                    if (config.uploadToServer) {
                        axios.get(gifUrl, { responseType: 'arraybuffer' })
                            .then((response) => {
                                const buffer = Buffer.from(response.data, "utf-8");
                                const fileName = `gif-${uuidv4()}.gif`;
                                const mimeType = "image/gif";
                                this._client.uploadContent(buffer, mimeType, fileName)
                                    .then((contentUri) => {
                                        this.sendImageReply(roomId, event, fileName, contentUri, mimeType);
                                        resolve(undefined);
                                    })
                                    .catch((error) => {
                                        LogService.error(`CommandProcessor.${provider}`, error);
                                        this.sendHtmlReply(roomId, event, "There was an error processing your command");
                                        reject(error);
                                    });
                            })
                            .catch((error) => {
                                LogService.error(`CommandProcessor.${provider}`, error);
                                this.sendHtmlReply(roomId, event, "There was an error processing your command");
                                reject(error);
                            });
                    } else {
                        this.sendHtmlReply(roomId, event, gifUrl);
                        resolve(undefined);
                    }
                } else {
                    this.sendHtmlReply(roomId, event, `No gif found for term <code>${searchTerm}</code>`);
                    resolve(undefined);
                }
            }, (error) => {
                LogService.error(`CommandProcessor.${provider}`, error);
                this.sendHtmlReply(roomId, event, "There was an error processing your command");
                reject(error);
            });
            resolve(undefined);
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
            url: config.tenorAnonApiEndpoint
            .replace("{key}", config.tenorApiKey)
            .replace("&anon_id={anonId}", "")
        };
        LogService.verbose("CommandProcessor.Tenor", `Finding Gifs from Tenor at endpoint '${axiosOptions.url}'`);
        return this.getGif(roomId, event, "Tenor", searchTerm, axiosOptions, async (response) => {
            return new Promise((resolve, reject) => {
                try {
                    let mediaType = config.tenorMediaType;
                    if (!mediaType) {
                        mediaType = "nanogif"; // The default
                    }
                    const body = response.data;
                    const anonId = body["anon_id"];
                    const limit = 8;
                    const url = config.tenorApiEndpoint
                    .replace("{searchTerm}", searchTerm)
                    .replace("{key}", config.tenorApiKey)
                    .replace("{limit}", limit.toString())
                    .replace("{anonId}", anonId);
                    LogService.verbose("CommandProcessor.Tenor", `Finding Gif from Tenor at endpoint '${url}'`);
                    axios({
                        method: 'get',
                        url: url
                    })
                    .then((response) => {
                        const result = response.data.results[0];
                        if (!result || 
                            !result.media || 
                            !result.media[0] || 
                            !result.media[0][mediaType] || 
                            !result.media[0][mediaType].url) {
                            LogService.error("CommandProcessor.Tenor", `Gif Url not found in data from endpoint '${url}'; data: ${JSON.stringify(result)}`);
                            resolve(undefined); 
                        }
                        const gifUrl = result.media[0][mediaType].url;
                        if (gifUrl) resolve(gifUrl);
                        else resolve(undefined); 
                    }, (error) => {
                        LogService.error("CommandProcessor.Tenor", error);
                        this.sendHtmlReply(roomId, event, "There was an error processing your command");
                        resolve(undefined);
                    });
                }
                catch (err) {
                    resolve(undefined);
                }
            });
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

    private isValidURL(url: string): boolean {
        const res = url.match(/(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/g);
        return (res !== null);
    };

    private sendHtmlReply(roomId: string, event: any, message: string): Promise<any> {
        const reply = RichReply.createFor(roomId, event, striptags(message), message);
        reply["msgtype"] = "m.notice";
        return this.client.sendMessage(roomId, reply);
    }

    private sendImageReply(roomId: string, event: any, fileName: string, contentUri: string, mimeType: string): Promise<any> {
        const reply = RichReply.createFor(roomId, event, striptags(contentUri), contentUri);
        reply["body"] = fileName;
        reply["info"] = {
            mimetype: mimeType
        };
        reply["msgtype"] = "m.image";
        reply["url"] = contentUri;
        return this.client.sendMessage(roomId, reply);
    }
}
