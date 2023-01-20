import express from 'express'
import { db } from '../firebase.js'

// puppeteer imports ======================
import puppeteer from 'puppeteer-extra'

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

import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import chromium from 'chromium'
puppeteer.use(StealthPlugin())

const router = express.Router()

router.get('/', async (req, res, next) => {
  try {
    const muteAttachedMusic = req.query.muteAttachedMusic
    const forUser = req.query.forUser
    const email = req.query.email
    const targetUploadCount = req.query.targetUploadCount

    console.log('muteAttachedMusic', muteAttachedMusic)
    const channelRef = db.collection('channels').doc(email)
    const channel = await (await channelRef.get()).data()

    const videosRef = db.collection('videos')
    const query = videosRef
      .where('forEmail', '==', email)
      .where('forUser', '==', forUser)
      .where('uploaded', '==', false)
    let availableCount = (await query.count().get()).data().count
    console.log('availableCount -> before:', availableCount, chromium.path)
    while (availableCount < targetUploadCount) {
      if (availableCount < targetUploadCount) {
        await fetchKeywordVideos(email, channel.keywords, forUser)
      }
      availableCount = (await query.count().get()).data().count
      console.log('availableCount -> after fetch:', availableCount)
    }

    const snapshot2 = await query.limit(parseInt(targetUploadCount)).get()
    if (snapshot2.empty) {
      console.log('No matching videos.')

      return res.status(200).json({ msg: 'No matching videos.' })
    }

    const videos = []
    const videoMetaData = []
    snapshot2.forEach(vid => {
      videos.push(vid.data())
    })

    const browser = await puppeteer.launch({
      headless: true,
      ignoreHTTPSErrors: true,
      executablePath: chromium.path,
      args: ['--no-sandbox']
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
          video.music_info.original,
          muteAttachedMusic
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
      executablePath: chromium.path,
      headless: true,
      ignoreHTTPSErrors: true,
      args: [
        '--no-sandbox',
        '--disable-gpu',
        '--enable-webgl',
        '--start-maximized'
      ]
    })

    console.log('Uploading successfully!', resp)
    res.status(200).json({ msg: 'Videos uploaded', resp })
  } catch (e) {
    console.log(e)
  }
})

const onVideoUploadSuccess = async (videoId, email) => {
  try {
    await db.collection('videos').doc(videoId).update({
      uploaded: true
    })

    await removeFile(`Videos/${videoId}_${email}.mp4`)
  } catch (error) {
    console.log(error)
  }
}

export default router
