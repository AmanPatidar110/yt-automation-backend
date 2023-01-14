const axios = require("axios");
const cheerio = require("cheerio");
const ffmpeg = require("fluent-ffmpeg");
const {
    fileDownload,
    fileDownloadWithoutAudio,
} = require("./download.controller");
exports.getVideoFromTiktokVideoId = async (
    videoId = "7166646626642087170",
    user = "naddymckenz"
) => {
    // const formData

    var config = {
        method: "post",
        url: "https://ssstik.io/abc?url=dl",
        headers: {
            "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:108.0) Gecko/20100101 Firefox/108.0",
            Accept: "*/*",
            "Accept-Language": "en-US,en;q=0.5",
            "Accept-Encoding": "gzip, deflate, br",
            "HX-Request": "true",
            "HX-Trigger": "_gcaptcha_pt",
            "HX-Target": "target",
            "HX-Current-URL": "https://ssstik.io/how-to-download-tiktok-video",
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            Origin: "https://ssstik.io",
            Connection: "keep-alive",
            Referer: "https://ssstik.io/how-to-download-tiktok-video",
            "Sec-Fetch-Dest": "empty",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Site": "same-origin",
            TE: "trailers",
        },
        data: `id=https%3A%2F%2Fwww.tiktok.com%2F%40${user}%2Fvideo%2F${videoId}&locale=en`,
    };

    try {
        const res = await axios(config);
        console.log(res.data, "data html");
        return res.data;
    } catch (error) {
        console.log(error);
    }
};
