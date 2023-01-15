const express = require("express");
const router = express.Router();
const cheerio = require("cheerio");
const { upload } = require("youtube-videos-uploader");

const { YoutubeUploader } = require("@luthfipun/yt-uploader");
const {
    UPLOAD_PRIVACY_PRIVATE,
} = require("@luthfipun/yt-uploader/dist/helpers/youtubeUploaderOptions");
const { db } = require("../firebase");
const {
    fileDownloadWithoutAudio,
    removeFile,
} = require("../Controllers/download.controller");
const {
    getVideoFromTiktokVideoId,
} = require("../Controllers/getVIdeoFromTiktokVideoId");

router.get("/", async (req, res, next) => {
    try {
        let UPLOAD_COUNT = 0;
        const email = req.query.email;
        const password = req.query.password;
        const targetUploadCount = req.query.targetUploadCount;

        const videosRef = db.collection("videos");
        const snapshot = await videosRef
            .where("forEmail", "==", email)
            .where("uploaded", "==", false)
            .get();
        console.log("snapshot", snapshot);
        if (snapshot.empty) {
            console.log("No matching videos.");
            res.status(200).json({ msg: "No matching videos.", UPLOAD_COUNT });
        }

        const youtubeUploader = new YoutubeUploader(
            "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
            UPLOAD_PRIVACY_PRIVATE
        );

        const videos = [];
        snapshot.forEach((vid) => {
            videos.push(vid.data());
        });

        for (const video of videos) {
            console.log(video.video_id, "=>", UPLOAD_COUNT, targetUploadCount);
            if (UPLOAD_COUNT >= targetUploadCount) {
                break;
            }
            await youtubeUploader.Login(email, password);
            console.log("LoggedIn to your account and muting audio");
            const $ = cheerio.load(
                await getVideoFromTiktokVideoId(video.video_id, video.unique_id)
            );
            const videoURL = $("a").first().attr("href");
            console.log(videoURL);

            await fileDownloadWithoutAudio(videoURL, video.video_id);
            console.log("muting done. Now, Uploading ...");
            await youtubeUploader.UploadVideo(
                `Videos/${video.video_id}.mp4`,
                video.title,
                video.description,
                "",
                video.tags
            );

            UPLOAD_COUNT += 1;
            await db.collection("videos").doc(video.video_id).update({
                uploaded: true,
            });

            await removeFile(`Videos/${video.video_id}.mp4`);

            console.log("Uploading successfully");
        }

        await youtubeUploader.CloseBrowser();
        res.status(200).json({ msg: "Videos uploaded", UPLOAD_COUNT });
    } catch (e) {
        console.log(e);
    }
});

router.get("/new", async (req, res) => {
    try {
        const credentials = {
            email: req.query.email,
            pass: req.query.password,
        };
        const targetUploadCount = req.query.targetUploadCount;

        const videosRef = db.collection("videos");
        const snapshot = await videosRef
            .where("forEmail", "==", email)
            .where("uploaded", "==", false)
            .get();
        if (snapshot.empty) {
            console.log("No matching videos.");
            res.status(200).json({ msg: "No matching videos.", UPLOAD_COUNT });
        }

        const videos = [];
        snapshot.forEach((vid) => {
            const oneVideo = vid.data();
            videos.push({
                path: `Videos/${oneVideo.video_id}.mp4`,
            });
        });
    } catch (error) {
        console.log(error);
    }
});
const obj = {
    path: "video2.mp4",
    title: "title 2",
    description: "description 2",
    thumbnail: "thumbnail.png",
    language: "english",
    tags: ["video", "github"],
    playlist: "playlist name",
    channelName: "Channel Name",
    onSuccess: onVideoUploadSuccess,
    skipProcessingWait: true,
    onProgress: (progress) => {
        console.log("progress", progress);
    },
    uploadAsDraft: false,
    isAgeRestriction: false,
    isNotForKid: false,
};

module.exports = router;
