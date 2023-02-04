import express from "express";
import axios from "axios";

// puppeteer imports ======================

import {
    fileDownloadWithoutAudio,
    removeFile,
} from "../Controllers/download.controller.js";
import { fetchKeywordVideos } from "../Controllers/fetchKeywordVideos.js";
import { upload } from "../Utility/youtubeUploaderLibrary/upload.js";

import "puppeteer-extra-plugin-user-data-dir";
import "puppeteer-extra-plugin-user-preferences";
import "puppeteer-extra-plugin-stealth/evasions/chrome.app/index.js";
import "puppeteer-extra-plugin-stealth/evasions/chrome.csi/index.js";
import "puppeteer-extra-plugin-stealth/evasions/chrome.loadTimes/index.js";
import "puppeteer-extra-plugin-stealth/evasions/chrome.runtime/index.js";
import "puppeteer-extra-plugin-stealth/evasions/defaultArgs/index.js"; // pkg warned me this one was missing
import "puppeteer-extra-plugin-stealth/evasions/iframe.contentWindow/index.js";
import "puppeteer-extra-plugin-stealth/evasions/media.codecs/index.js";
import "puppeteer-extra-plugin-stealth/evasions/navigator.hardwareConcurrency/index.js";
import "puppeteer-extra-plugin-stealth/evasions/navigator.languages/index.js";
import "puppeteer-extra-plugin-stealth/evasions/navigator.permissions/index.js";
import "puppeteer-extra-plugin-stealth/evasions/navigator.plugins/index.js";
import "puppeteer-extra-plugin-stealth/evasions/navigator.vendor/index.js";
import "puppeteer-extra-plugin-stealth/evasions/navigator.webdriver/index.js";
import "puppeteer-extra-plugin-stealth/evasions/sourceurl/index.js";
import "puppeteer-extra-plugin-stealth/evasions/user-agent-override/index.js";
import "puppeteer-extra-plugin-stealth/evasions/webgl.vendor/index.js";
import "puppeteer-extra-plugin-stealth/evasions/window.outerdimensions/index.js";

import createPage, { getBrowser } from "../Utility/getPage.js";
import {
    getVideoUrlFromInstaId,
    getVideoUrlFromTiktokVideoId,
} from "../Controllers/getDownloadUrls.js";
import { MessageTransport } from "../Utility/messageTransport.js";
import {
    getChannel,
    getVideoCount,
    getVideos,
    updateVideo,
} from "../Utility/firebaseUtilFunctions.js";

const router = express.Router();

router.get("/", async (req, res, next) => {
    let browser;
    const forUser = req.query.forUser;
    const email = req.query.email;
    const targetUploadCount = req.query.targetUploadCount;
    const messageTransport = new MessageTransport({ email, forUser });
    try {
        messageTransport.log(
            "/upload" + forUser + "target: " + targetUploadCount
        );
        messageTransport.log("Fetching channel");

        const channelResponse = await getChannel(email, messageTransport);
        const channel = channelResponse.data.channel;

        messageTransport.log("Fetching video count");

        let availableCount = await getVideoCount(
            forUser,
            email,
            messageTransport
        );
        messageTransport.log(
            email,
            "availableCount -> before: " + availableCount
        );
        let INCREASE_COUNT_AFTER_FAILING = 0;
        while (availableCount < targetUploadCount) {
            if (availableCount < targetUploadCount) {
                try {
                    messageTransport.log(
                        email,
                        "Fetching keyword videos: api_count" + global.api_count
                    );
                    await fetchKeywordVideos(
                        email,
                        channel.keywords,
                        forUser,
                        messageTransport
                    );
                } catch (error) {
                    messageTransport.log(
                        "Error: Fetching video count, increasing api_count"
                    );
                    global.api_count += 1;
                    INCREASE_COUNT_AFTER_FAILING += 1;
                    if (INCREASE_COUNT_AFTER_FAILING > 9) {
                        messageTransport.log(
                            "Error: All RAPID APIs are failing"
                        );
                    } else {
                        continue;
                    }
                }
            }

            messageTransport.log("In loop: Fetching video count");

            availableCount = await getVideoCount(
                forUser,
                email,
                messageTransport
            );
            messageTransport.log(
                "availableCount -> after fetch:" + availableCount
            );
        }

        messageTransport.log("Fetching videos from firebase");
        const videoResponse = await getVideos(
            forUser,
            email,
            targetUploadCount,
            messageTransport
        );
        const videos = videoResponse.data.videos;

        messageTransport.log("Fetched videos from firestore: " + videos.length);
        const videoMetaData = [];

        messageTransport.log("Launching browser");
        browser = await getBrowser();
        messageTransport.log("Launching page");
        const page = await createPage(browser);

        for (const video of videos) {
            let videoURL = "";
            try {
                if (video.source === "INSTAGRAM") {
                    messageTransport.log(
                        email,
                        video.video_id +
                            " ===> In loop: fetching download url from intagram downloader..."
                    );
                    videoURL = await getVideoUrlFromInstaId(
                        page,
                        video.video_id,
                        messageTransport
                    );
                } else {
                    messageTransport.log(
                        video.video_id +
                            "===> In loop: fetching download url from tiktok downloader..."
                    );
                    videoURL = await getVideoUrlFromTiktokVideoId(
                        page,
                        video.video_id,
                        video.author.unique_id,
                        messageTransport
                    );
                }

                messageTransport.log("In loop: videoURL found: " + videoURL);
                if (!videoURL) {
                    await onVideoUploadSuccess(
                        video.video_id,
                        email,
                        messageTransport
                    );
                } else {
                    await fileDownloadWithoutAudio(
                        videoURL,
                        video.video_id,
                        email,
                        messageTransport
                    );
                    console.log("video.tags", video.tags, typeof video.tags);
                    videoMetaData.push({
                        path: `Videos/${video.video_id}_${email}.mp4`,
                        title: video.title,
                        description:
                            video.description + typeof video.tags === "string"
                                ? video.tags.replaceAll(",", " #")
                                : video.tags.join(" #"),
                        thumbnail: "",
                        language: "english",
                        tags:
                            typeof video.tags === "string"
                                ? video.tags.replaceAll("#", "")
                                : video.tags.join(", "),
                        onSuccess: async () =>
                            await onVideoUploadSuccess(
                                video.video_id,
                                email,
                                messageTransport
                            ),
                        skipProcessingWait: true,
                        onProgress: (progress) => {
                            messageTransport.log(
                                `progress: ${progress.progress}, stage: ${progress.stage}`
                            );
                        },
                        uploadAsDraft: false,
                        isAgeRestriction: false,
                        isNotForKid: true,
                    });
                }
            } catch (error) {
                messageTransport.log(error.message || error);
                console.log(error);
            }
        }

        messageTransport.log("Closing downloader page");
        await page.close();

        const credentials = {
            email,
            pass: channel.password,
            recoveryemail: "aamanpatidar110@gmail.com",
        };
        const resp = await upload(
            credentials,
            videoMetaData,
            browser,
            messageTransport
        );

        messageTransport.log("Uploading successfully! " + resp);
        res.status(200).json({ msg: "Videos uploaded", resp });
    } catch (e) {
        messageTransport.log(e);
        messageTransport.log("Browser closed!");
        if (browser) {
            browser.close();
        }
    }
});

const onVideoUploadSuccess = async (videoId, email, messageTransport) => {
    try {
        const video = {
            uploaded: true,
        };
        const updateResponse = await updateVideo(
            video,
            videoId,
            messageTransport
        );

        await removeFile(`Videos/${videoId}_${email}.mp4`);
    } catch (error) {
        messageTransport.log(error.message || error);
        console.log(error);
    }
};

export default router;
