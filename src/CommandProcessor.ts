import { MatrixClient, RichReply } from "matrix-bot-sdk";
import { LogService } from "matrix-js-snippets";
import striptags = require("striptags");
const axios = require('axios');

export class CommandProcessor {
    constructor(private client: MatrixClient) {
    }

    public tryCommand(roomId: string, event: any): Promise<any> {
        const message = event['content']['body'];
        if (!message || !message.startsWith("!gif")) return;

        let showHelp = false;
        const searchTerm = message.substring("!gif".length).trim();
        if (searchTerm.toLowerCase().trim() === "help") showHelp = true;

        try {
            if (searchTerm && !showHelp) {
                const url = "https://rightgif.com/search/web";

                axios({
                    method: 'post',
                    url: url,
                    data: {
                        text: searchTerm
                    },
                    headers: {
                        'Content-Type': 'application/json'
                    }
                })
                .then((response) => {
                    if (response && response.data && response.data.url) {
                        return this.sendHtmlReply(roomId, event, response.data.url);
                    } else {
                        return this.sendHtmlReply(roomId, event, `No gif found for term <code>${searchTerm}</code>`);
                    }
                }, (error) => {
                    console.log(error);
                });
            }
            else if (!searchTerm && !showHelp) {
                return this.sendHtmlReply(roomId, event, "No search term! Try <code>!gif help</code>");
            }
            else if (showHelp) {
                const htmlMessage = "" +
                    "<h4>GifBot Help</h4>" +
                    "<pre><code>" +
                    `!gif help        - Shows this help menu\n` +
                    `!gif [TERM]      - Finds a gif for the term provided from the default source\n` +
                    "</code></pre>";
                return this.sendHtmlReply(roomId, event, htmlMessage);
            }
        } catch (err) {
            LogService.error("CommandProcessor", err);
            return this.sendHtmlReply(roomId, event, "There was an error processing your command");
        }
    }

    private sendHtmlReply(roomId: string, event: any, message: string): Promise<any> {
        const reply = RichReply.createFor(roomId, event, striptags(message), message);
        reply["msgtype"] = "m.notice";
        return this.client.sendMessage(roomId, reply);
    }
}
