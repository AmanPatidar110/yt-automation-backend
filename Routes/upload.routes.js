import express from 'express'
import { db } from '../firebase.js'

import { dirname } from 'path'
// puppeteer imports ======================
import puppeteerRaw from 'puppeteer'
import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'

import {
  fileDownloadWithoutAudio,
  removeFile
} from '../Controllers/download.controller.js'
import { fetchKeywordVideos } from '../Controllers/fetchKeywordVideos.js'
import { upload } from '../Utility/youtubeUploaderLibrary/upload.js'
import { getVideoUrlForInsta } from '../Controllers/getVideoUrlForInsta.js'
import { getVideoUrlFromTiktokVideoId } from '../Controllers/getVideoUrlFromTiktokVideoId.js'

const router = express.Router()
puppeteer.use(StealthPlugin())

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
    console.log(
      'availableCount -> before:',
      availableCount,
      dirname(puppeteerRaw.executablePath())
    )
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
      executablePath: dirname(puppeteerRaw.executablePath())
    })
    const page = await browser.newPage()

    for (const video of videos) {
      console.log(video.video_id, '=>', targetUploadCount)

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
          videoURL || '',
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
      executablePath: puppeteerRaw.executablePath(),
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
