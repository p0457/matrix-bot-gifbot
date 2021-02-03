import config from "./config";

export function getListeningTermProviders(): string[] {
    let result = [];
    if (config.rightGifEnabled) result.push(config.rightGifListeningTerm);
    if (config.tenorEnabled) result.push(config.tenorListeningTerm);
    if (config.giphyEnabled) result.push(config.giphyListeningTerm);
    if (config.gifMeEnabled) result.push(config.gifMeListeningTerm);
    if (config.gifTvEnabled) result.push(config.gifTvListeningTerm);
    if (config.replyGifEnabled) result.push(config.replyGifListeningTerm);
    return result;
}