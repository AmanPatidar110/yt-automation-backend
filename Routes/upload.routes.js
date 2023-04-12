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
import {
  getVideoUrlFromInstaId,
  getVideoUrlFromTiktokVideoId,
} from '../Controllers/getDownloadUrls.js';
import { MessageTransport } from '../Utility/messageTransport.js';
import {
  getChannel,
  getVideoCount,
  getVideos,
  increaseChannelKeywordCount,
  updateVideo,
} from '../Utility/firebaseUtilFunctions.js';
import { apiKeys } from '../Constants/keys.js';

const router = express.Router();

router.get('/', async (req, res, next) => {
  let browser;
  const forUser = req.query.forUser;
  const email = req.query.email;
  const targetUploadCount = req.query.targetUploadCount;
  const messageTransport = new MessageTransport({ email, forUser });
  try {
    messageTransport.log('/upload' + forUser + 'target: ' + targetUploadCount);
    messageTransport.log('Fetching channel');

    const channelResponse = await getChannel(email, messageTransport);
    const channel = channelResponse.data.channel;
    const selectedChannelKeyword =
      channel?.keywords[
        (channel?.KEYWORD_COUNT ?? 1) % (channel?.keywords.length + 1 || 1)
      ];
    messageTransport.log('Fetching video count');

    let availableCount = await getVideoCount(
      forUser,
      email,
      selectedChannelKeyword
    );
    messageTransport.log(email, 'availableCount -> before: ' + availableCount);
    increaseChannelKeywordCount(channel?.KEYWORD_COUNT, channel?.email);

    if (
      availableCount < targetUploadCount &&
      selectedChannelKeyword !== 'INSTAGRAM'
    ) {
      try {
        messageTransport.log(
          email,
          'Fetching keyword videos: api_count: ' + global.api_count
        );
        await fetchKeywordVideos(
          email,
          channel?.keywords,
          forUser,
          messageTransport,
          channel?.KEYWORD_COUNT,
          channel?.descriptionKeywords
        );
      } catch (error) {
        messageTransport.log(
          'Error: Fetching video count, increasing api_count: ',
          error
        );
        messageTransport.log('apiKeys.length: ', apiKeys.length);
        messageTransport.log('Current Api_Count ', global.api_count);
        global.api_count += 1;
        return;
      }
      availableCount = await getVideoCount(
        forUser,
        email,
        selectedChannelKeyword
      );
      messageTransport.log('availableCount -> after fetch:' + availableCount);

      if (availableCount < targetUploadCount) {
        messageTransport.log('availableCount < targetUploadCount');
        return;
      }
    }

    messageTransport.log('Fetching videos from firebase');
    const videoResponse = await getVideos(
      forUser,
      email,
      targetUploadCount,
      selectedChannelKeyword
    );
    const videos = videoResponse.data.videos;

    messageTransport.log('Fetched videos from firestore: ' + videos?.length);

    const videoMetaData = [];

    messageTransport.log('Launching browser');
    browser = await getBrowser();
    messageTransport.log('Launching page');
    const page = await createPage(browser);

    for (const video of videos) {
      let videoURL = '';
      try {
        if (video.source === 'INSTAGRAM') {
          messageTransport.log(
            email,
            video.video_id +
              ' ===> In loop: fetching download url from intagram downloader...'
          );
          videoURL = await getVideoUrlFromInstaId(
            page,
            video.video_id,
            messageTransport
          );
        } else {
          messageTransport.log(
            video.video_id +
              '===> In loop: fetching download url from tiktok downloader...'
          );
          videoURL = await getVideoUrlFromTiktokVideoId(
            page,
            video.video_id,
            video.author.unique_id,
            messageTransport
          );
        }

        messageTransport.log('In loop: videoURL found: ' + videoURL);
        if (!videoURL) {
          await onVideoUploadSuccess(video.video_id, email, messageTransport);
        } else {
          await fileDownloadWithoutAudio(
            videoURL,
            video.video_id,
            email,
            messageTransport
          );

          const filteredDescriptionKeywords = channel.descriptionKeywords;
          // .filter((each) =>
          //   keywordSplitArray.some((substring) => each.includes(substring))
          // );
          videoMetaData.push({
            video_id: video.video_id,
            path: `Videos/${video.video_id}_${email}.mp4`,
            title: video.title || '#ytshorts',
            description: `
${video.title}
===================================
Main Keyword: ${video.keyword}
====================================

Tags: ${filteredDescriptionKeywords.join(' ')}

====================================

Thank you for watching! Please like and subscribe for more videos. 

====================================

Credits goes to all the creators seen in this video! The credit and username is shown below. Make sure to check them out.

If you are the owner of a video and would like your video to be taken down or have your social media linked, please email me as mentioned in Credits. I will delete this upload immediately.

*Note: Copyright Disclaimer Under Section 107 of the Copyright Act 1976, allowance is made for "fair use" for purposes such as criticism, comment, news reporting, teaching, scholar ship, and research. Fair use is a use permitted by copyright statute that might otherwise be infringing. Non-profit, educational or personal use tips the balance in favour of fair use.

====================================

Credits:
${video.description}

====================================
`,
            thumbnail: '',
            language: 'english',
            tags: `${
              typeof video.tags === 'string'
                ? video.tags.replaceAll('#', '')
                : video.tags.join(', ')
            }, ytshorts, trendingshorts, shorts`,
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
          page.waitForTimeout(5000);
        }
      } catch (error) {
        messageTransport.log(error.message || error);
        console.log(error);
      }
    }

    messageTransport.log('Closing downloader page');
    await page.close();

    const credentials = {
      email,
      pass: channel.password,
      recoveryemail: 'aamanpatidar110@gmail.com',
    };
    const resp = await upload(
      credentials,
      videoMetaData,
      browser,
      messageTransport
    );

    messageTransport.log('Uploading successfully! ' + resp);
    res.status(200).json({ msg: 'Videos uploaded', resp });
  } catch (e) {
    messageTransport.log(e);
    messageTransport.log('Browser closed!');
    if (browser) {
      browser.close();
    }
  }
});

export const onVideoUploadSuccess = async (
  videoId,
  email,
  messageTransport
) => {
  try {
    const video = {
      uploaded: true,
    };
    const updateResponse = await updateVideo(video, videoId, messageTransport);

    await removeFile(`Videos/${videoId}_${email}.mp4`);
  } catch (error) {
    messageTransport.log(error.message || error);
    console.log(error);
  }
};

export default router;
