const { default: axios } = require("axios");
const express = require("express");
const router = express.Router();
const { db } = require("../firebase");
const apiKey = require("../Constants/keys");

router.get("/fetch_keyword_videos", async (req, res, next) => {
    try {
        const keyword = req.query.keyword;
        const forEmail = req.query.forEmail;

        let FETCH_COUNT = 0;
        let apiUseCount = 0;
        let hasNext = true;
        let cursor = "0";
        const getApiKey = () => {
            return apiKey[apiUseCount % 10];
        };

        let options = {
            method: "GET",
            url: "https://tiktok-video-no-watermark2.p.rapidapi.com/feed/search",
            params: { keywords: keyword, count: "30", cursor },
            headers: getApiKey(),
        };

        while (FETCH_COUNT < 30 && hasNext) {
            const response = await axios.request(options);

            // console.log(response.data.data.videos)
            hasNext = response.data.data.hasMore;
            cursor = response.data.data.cursor;
            options = { ...options, params: { ...options.params, cursor } };
            response.data.data.videos.forEach(async (video) => {
                const vidRef = db.collection("videos").doc(video.video_id);
                const vid = await vidRef.get();
                if (!vid.exists) {
                    await db
                        .collection("videos")
                        .doc(video.video_id)
                        .set({
                            ...video,
                            keyword,
                            forEmail,
                            title: video.title.substr(0, 75),
                            description: video.title,
                            tags: video.title
                                .split("#")
                                .join(", #")
                                .substr(0, 500),
                            uploaded: false,
                        });

                    FETCH_COUNT += 1;
                    apiUseCount += 1;
                } else {
                    console.log("Document already exists!");
                }
            });

            console.log(options);
        }
        res.status(200).json({ msg: "ok", FETCH_COUNT });
    } catch (error) {
        if (!error.statusCode) error.statusCode = 500;
        console.log(error);
        return next(error);
    }
});

module.exports = router;
