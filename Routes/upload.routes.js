import express from 'express';
import axios from 'axios';

// puppeteer imports ======================

import {
    fileDownloadWithoutAudio,
    removeFile,
} from '../Controllers/download.controller.js';
import { fetchKeywordVideos } from '../Controllers/fetchKeywordVideos.js';
import { upload } from '../Utility/youtubeUploaderLibrary/upload.js';

import 'puppeteer-extra-plugin-user-data-dir';
import 'puppeteer-extra-plugin-user-preferences';
import 'puppeteer-extra-plugin-stealth/evasions/chrome.app/index.js';
import 'puppeteer-extra-plugin-stealth/evasions/chrome.csi/index.js';
import 'puppeteer-extra-plugin-stealth/evasions/chrome.loadTimes/index.js';
import 'puppeteer-extra-plugin-stealth/evasions/chrome.runtime/index.js';
import 'puppeteer-extra-plugin-stealth/evasions/defaultArgs/index.js'; // pkg warned me this one was missing
import 'puppeteer-extra-plugin-stealth/evasions/iframe.contentWindow/index.js';
import 'puppeteer-extra-plugin-stealth/evasions/media.codecs/index.js';
import 'puppeteer-extra-plugin-stealth/evasions/navigator.hardwareConcurrency/index.js';
import 'puppeteer-extra-plugin-stealth/evasions/navigator.languages/index.js';
import 'puppeteer-extra-plugin-stealth/evasions/navigator.permissions/index.js';
import 'puppeteer-extra-plugin-stealth/evasions/navigator.plugins/index.js';
import 'puppeteer-extra-plugin-stealth/evasions/navigator.vendor/index.js';
import 'puppeteer-extra-plugin-stealth/evasions/navigator.webdriver/index.js';
import 'puppeteer-extra-plugin-stealth/evasions/sourceurl/index.js';
import 'puppeteer-extra-plugin-stealth/evasions/user-agent-override/index.js';
import 'puppeteer-extra-plugin-stealth/evasions/webgl.vendor/index.js';
import 'puppeteer-extra-plugin-stealth/evasions/window.outerdimensions/index.js';

import createPage, { getBrowser } from '../Utility/getPage.js';
import { apiServiceUrl } from '../Utility/api-service.js';
import {
    getVideoUrlFromInstaId,
    getVideoUrlFromTiktokVideoId,
} from '../Controllers/getDownloadUrls.js';
import { messageTransport } from '../Utility/messageTransport.js';

const router = express.Router();

router.get('/', async (req, res, next) => {
    let browser;
    try {
        const forUser = req.query.forUser;
        const email = req.query.email;
        const targetUploadCount = req.query.targetUploadCount;

        messageTransport(
            email,
            '/upload' + forUser + 'target: ' + targetUploadCount
        );
        messageTransport(email, 'Fetching channel');

        const channelResponse = await axios.request({
            method: 'GET',
            url: `${apiServiceUrl}/channel/get_channel?email=${email}`,
        });
        const channel = channelResponse.data.channel;

        messageTransport(email, 'Fetching video count');
        const response = await axios.request({
            method: 'GET',
            url: `${apiServiceUrl}/video/get_videos_count?forUser=${forUser}&email=${email}`,
        });

        let availableCount = response.data.availableCount;
        messageTransport(email, 'availableCount -> before: ' + availableCount);
        while (availableCount < targetUploadCount) {
            if (availableCount < targetUploadCount) {
                try {
                    messageTransport(
                        email,
                        'Fetching keyword videos: api_count' + global.api_count
                    );
                    await fetchKeywordVideos(email, channel.keywords, forUser);
                } catch (error) {
                    messageTransport(
                        email,
                        'Error: Fetching video count, increasing api_count'
                    );
                    global.api_count += 1;
                    continue;
                }
            }

            messageTransport(email, 'In loop: Fetching video count');
            const response = await axios.request({
                method: 'GET',
                url: `${apiServiceUrl}/video/get_videos_count?forUser=${forUser}&email=${email}`,
            });
            availableCount = response.data.availableCount;
            messageTransport(
                email,
                'availableCount -> after fetch:' +
                    availableCount +
                    `: ${apiServiceUrl}/video/get_videos_count?forUser=${forUser}&email=${email}`
            );
        }

        messageTransport(email, 'Fetching videos from firebase');
        const videoResponse = await axios.request({
            method: 'GET',
            url: `${apiServiceUrl}/video/get_videos?forUser=${forUser}&email=${email}&limit=${targetUploadCount}`,
        });
        const videos = videoResponse.data.videos;

        messageTransport(
            email,
            'Fetched videos from firestore: ' + videos.length
        );
        const videoMetaData = [];

        messageTransport(email, 'Launching browser');
        browser = await getBrowser();
        messageTransport(email, 'Launching page');
        const page = await createPage(browser);

        for (const video of videos) {
            let videoURL = '';
            try {
                if (video.source === 'INSTAGRAM') {
                    messageTransport(
                        email,
                        video.video_id +
                            ' ===> In loop: fetching download url from intagram downloader...'
                    );
                    videoURL = await getVideoUrlFromInstaId(
                        page,
                        video.video_id
                    );
                } else {
                    messageTransport(
                        email,
                        video.video_id +
                            '===> In loop: fetching download url from tiktok downloader...'
                    );
                    videoURL = await getVideoUrlFromTiktokVideoId(
                        page,
                        video.video_id,
                        video.author.unique_id
                    );
                }

                messageTransport(email, 'In loop: videoURL found: ' + videoURL);
                if (!videoURL) {
                    await onVideoUploadSuccess(video.video_id, email);
                    continue;
                }
                await fileDownloadWithoutAudio(
                    videoURL,
                    video.video_id,
                    email,
                    video.music_info.original
                );
                videoMetaData.push({
                    path: `Videos/${video.video_id}_${email}.mp4`,
                    title: video.title,
                    description: video.description + video.tags,
                    thumbnail: '',
                    language: 'english',
                    tags: video.tags,
                    onSuccess: async () =>
                        await onVideoUploadSuccess(video.video_id, email),
                    skipProcessingWait: true,
                    onProgress: (progress) => {
                        messageTransport(email, progress);
                    },
                    uploadAsDraft: false,
                    isAgeRestriction: false,
                    isNotForKid: true,
                });
            } catch (error) {
                messageTransport(email, error);
            }
        }

        messageTransport(email, 'Closing downloader page');
        await page.close();

        const credentials = {
            email,
            pass: channel.password,
            recoveryemail: 'aamanpatidar110@gmail.com',
        };
        const resp = await upload(credentials, videoMetaData, browser);

        messageTransport(email, 'Uploading successfully! ' + resp);
        res.status(200).json({ msg: 'Videos uploaded', resp });
    } catch (e) {
        messageTransport('User', e);
        messageTransport('user', 'Browser closed!');
        browser?.close();
    }
});

const onVideoUploadSuccess = async (videoId, email) => {
    try {
        await axios.request({
            method: 'PATCH',
            url: `${apiServiceUrl}/video/update_video`,
            data: {
                videoId,
                video: {
                    uploaded: true,
                },
            },
        });

        await removeFile(`Videos/${videoId}_${email}.mp4`);
    } catch (error) {
        messageTransport(email, error);
    }
};

export default router;
