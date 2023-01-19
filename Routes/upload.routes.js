const express = require('express')
const router = express.Router()

const YoutubeUploader = require('../Utility/youtubeUploaderLibrary/index')
const { db } = require('../firebase')
const {
  fileDownloadWithoutAudio,
  removeFile
} = require('../Controllers/download.controller')

const { getVideoUrlForInsta } = require('../Controllers/getVideoUrlForInsta')

const { fetchKeywordVideos } = require('../Controllers/fetchKeywordVideos')
const {
  getVideoUrlFromTiktokVideoId
} = require('../Controllers/getVideoUrlFromTiktokVideoId')

// puppeteer imports ======================
const puppeteer = require('puppeteer-extra')
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
const chromium = require('chromium')
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
    console.log('availableCount -> before:', availableCount)
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

    const youtubeUploader = new YoutubeUploader(
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'PRIVATE'
    )

    const browser = await puppeteer.launch({
      headless: true,
      ignoreHTTPSErrors: true,
      executablePath: chromium.path
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
          videoURL,
          video.video_id,
          email,
          video.music_info.original,
          muteAttachedMusic
        )
        videoMetaData.push({
          Video: `Videos/${video.video_id}_${email}.mp4`,
          Title: video.title,
          Description: video.description + video.tags,
          Thumbnail: '',
          Tags: video.tags,
          onSuccess: async () =>
            await onVideoUploadSuccess(video.video_id, email)
        })
      } catch (error) {
        console.log(error)
      }
    }
    browser.close()
    console.log('Videos downloaded locally. Now, Uploading ...')

    await youtubeUploader.Login(email, channel.password)
    console.log('LoggedIn to your account and muting audio')
    await youtubeUploader.UploadVideos(videoMetaData)

    console.log('Uploading successfully!')
    const UPLOAD_COUNT = await youtubeUploader.CloseBrowser()
    res.status(200).json({ msg: 'Videos uploaded', UPLOAD_COUNT })
  } catch (e) {
    console.log(e)
  }
})

const onVideoUploadSuccess = async (videoId, email) => {
  await db.collection('videos').doc(videoId).update({
    uploaded: true
  })

  await removeFile(`Videos/${videoId}_${email}.mp4`)
}

module.exports = router
