const { default: axios } = require("axios");
const express = require("express");
const router = express.Router();
const apiKey = require("../Constants/keys");
const {
    uploadVideos,
    uploadVideosOnFirestore,
} = require("../Controllers/fireStoreUpload.controller");
const { db } = require("../firebase");
const { crawl } = require("../instabot");

const getApiKey = (apiUseCount) => {
    return apiKey[apiUseCount % 10];
};

router.get("/fetch_keyword_videos", async (req, res, next) => {
    try {
        const keyword = req.query.keyword;
        const forEmail = req.query.forEmail;

        let FETCH_COUNT = 0;
        let apiUseCount = 0;
        let hasNext = true;
        let cursor = "0";

        let options = {
            method: "GET",
            url: "https://tiktok-video-no-watermark2.p.rapidapi.com/feed/search",
            params: { keywords: keyword, count: "30", cursor },
            headers: getApiKey(apiUseCount),
        };

        while (FETCH_COUNT < 30 && hasNext) {
            const response = await axios.request(options);
            hasNext = response.data.data.hasMore;
            cursor = response.data.data.cursor;
            options = {
                ...options,
                params: { ...options.params, cursor },
                headers: getApiKey(apiUseCount),
            };
            console.log(options.headers);
            FETCH_COUNT = await uploadVideosOnFirestore(
                response.data.data.videos,
                forEmail,
                keyword,
                "TIKTOK",
                FETCH_COUNT
            );
            apiUseCount += 1;
            console.log(options);
        }
        res.status(200).json({ msg: "ok", FETCH_COUNT });
    } catch (error) {
        if (!error.statusCode) error.statusCode = 500;
        console.log(error);
        return next(error);
    }
});

router.post("/fetch_messages_from_insta", async (req, res, next) => {
    try {
        let FETCH_COUNT = 0;
        const threadIds = req.body.threadIds; // ['340282366841710300949128151362669835188']
        const userName = req.body.userName; // 'swipe_facts'
        const password = req.body.password; // '_iCHlpHI1=dR6+o3refI'
        const forChannelEmail = req.body.forChannelEmail; //'amanpatidar110@gmail.com'

        await crawl(threadIds, userName, password, res, forChannelEmail);
    } catch (error) {
        if (!error.statusCode) error.statusCode = 500;
        console.log(error);
        return next(error);
    }
});

module.exports = router;
