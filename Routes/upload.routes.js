import express from 'express'
import axios from 'axios'

// puppeteer imports ======================

import {
  fileDownloadWithoutAudio,
  removeFile
} from '../Controllers/download.controller.js'
import { fetchKeywordVideos } from '../Controllers/fetchKeywordVideos.js'
import { upload } from '../Utility/youtubeUploaderLibrary/upload.js'
import { getVideoUrlForInsta } from '../Controllers/getVideoUrlForInsta.js'
import { getVideoUrlFromTiktokVideoId } from '../Controllers/getVideoUrlFromTiktokVideoId.js'

import 'puppeteer-extra-plugin-user-data-dir'
import 'puppeteer-extra-plugin-user-preferences'
import 'puppeteer-extra-plugin-stealth/evasions/chrome.app/index.js'
import 'puppeteer-extra-plugin-stealth/evasions/chrome.csi/index.js'
import 'puppeteer-extra-plugin-stealth/evasions/chrome.loadTimes/index.js'
import 'puppeteer-extra-plugin-stealth/evasions/chrome.runtime/index.js'
import 'puppeteer-extra-plugin-stealth/evasions/defaultArgs/index.js' // pkg warned me this one was missing
import 'puppeteer-extra-plugin-stealth/evasions/iframe.contentWindow/index.js'
import 'puppeteer-extra-plugin-stealth/evasions/media.codecs/index.js'
import 'puppeteer-extra-plugin-stealth/evasions/navigator.hardwareConcurrency/index.js'
import 'puppeteer-extra-plugin-stealth/evasions/navigator.languages/index.js'
import 'puppeteer-extra-plugin-stealth/evasions/navigator.permissions/index.js'
import 'puppeteer-extra-plugin-stealth/evasions/navigator.plugins/index.js'
import 'puppeteer-extra-plugin-stealth/evasions/navigator.vendor/index.js'
import 'puppeteer-extra-plugin-stealth/evasions/navigator.webdriver/index.js'
import 'puppeteer-extra-plugin-stealth/evasions/sourceurl/index.js'
import 'puppeteer-extra-plugin-stealth/evasions/user-agent-override/index.js'
import 'puppeteer-extra-plugin-stealth/evasions/webgl.vendor/index.js'
import 'puppeteer-extra-plugin-stealth/evasions/window.outerdimensions/index.js'

import chromium from 'chrome-aws-lambda'
import { puppeteerExtra } from '../Utility/getPuppeteer.js'
import { apiServiceUrl } from '../Utility/api-service.js'

const router = express.Router()

router.get('/', async (req, res, next) => {
  try {
    const forUser = req.query.forUser
    const email = req.query.email
    const targetUploadCount = req.query.targetUploadCount

    console.log(
      'uploading videos',
      forUser,
      email,
      targetUploadCount,
      chromium.headless
    )

    const channelResponse = await axios.request({
      method: 'GET',
      url: `${apiServiceUrl}/channel/get_channel?email=${email}`
    })
    const channel = channelResponse.data.channel

    const response = await axios.request({
      method: 'GET',
      url: `${apiServiceUrl}/video/get_videos_count?forUser=${forUser}&email=${email}`
    })

    let availableCount = response.data.availableCount
    console.log('availableCount -> before:', availableCount)
    while (availableCount < targetUploadCount) {
      if (availableCount < targetUploadCount) {
        await fetchKeywordVideos(email, channel.keywords, forUser)
      }
      const response = await axios.request({
        method: 'GET',
        url: `${apiServiceUrl}/video/get_videos_count?forUser=${forUser}&email=${email}`
      })
      availableCount = response.data.availableCount
      console.log(
        'availableCount -> after fetch:',
        response,
        availableCount,
        `${apiServiceUrl}/video/get_videos_count?forUser=${forUser}&email=${email}`
      )
    }

    const videoResponse = await axios.request({
      method: 'GET',
      url: `${apiServiceUrl}/video/get_videos?forUser=${forUser}&email=${email}&limit=${targetUploadCount}`
    })
    const videos = videoResponse.data.videos

    const videoMetaData = []
    const browser = await puppeteerExtra.launch({
      headless: true,
      ignoreHTTPSErrors: true,
      executablePath: await chromium.executablePath,
      args: chromium.args
    })
    const page = await browser.newPage()

    for (const video of videos) {
      console.log(video.video_id, '=>', 'fetching download url...')

      let videoURL = ''
      try {
        if (video.source === 'INSTAGRAM') {
          videoURL = await getVideoUrlForInsta(video.video_id)
        } else {
          videoURL = await getVideoUrlFromTiktokVideoId(
            page,
            video.video_id,
            video.author.unique_id
          )
        }

        console.log('videoURL', videoURL)
        if (!videoURL) {
          await onVideoUploadSuccess(video.video_id, email)
          continue
        }
        await fileDownloadWithoutAudio(
          videoURL,
          video.video_id,
          email,
          video.music_info.original
        )
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
          onProgress: progress => {
            console.log('progress', progress)
          },
          uploadAsDraft: false,
          isAgeRestriction: false,
          isNotForKid: true
        })
      } catch (error) {
        console.log(error)
      }
    }
    browser.close()
    console.log('Videos downloaded locally. Now, Uploading ...')

    const credentials = {
      email,
      pass: channel.password,
      recoveryemail: 'aamanpatidar110@gmail.com'
    }
    const resp = await upload(credentials, videoMetaData, {
      executablePath: await chromium.executablePath,
      headless: true,
      ignoreHTTPSErrors: true,
      args: chromium.args
    })

    console.log('Uploading successfully!', resp)
    res.status(200).json({ msg: 'Videos uploaded', resp })
  } catch (e) {
    console.log(e)
  }
})

const onVideoUploadSuccess = async (videoId, email) => {
  try {
    await axios.request({
      method: 'PATCH',
      url: `${apiServiceUrl}/video/update_video`,
      data: {
        videoId,
        video: {
          uploaded: true
        }
      }
    })

    await removeFile(`Videos/${videoId}_${email}.mp4`)
  } catch (error) {
    console.log(error)
  }
}

export default router
