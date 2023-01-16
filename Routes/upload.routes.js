const express = require('express')
const router = express.Router()

const YoutubeUploader = require('../Utility/youtubeUploaderLibrary/index')
const { db } = require('../firebase')
const {
  fileDownloadWithoutAudio,
  removeFile
} = require('../Controllers/download.controller')

const { getVideoUrlForInsta } = require('../Controllers/getVideoUrlForInsta')
const {
  getVideoFromTiktokVideoId
} = require('../Controllers/getVideoFromTiktokVideoId')
const { fetchKeywordVideos } = require('../Controllers/fetchKeywordVideos')

router.get('/', async (req, res, next) => {
  try {
    const email = req.query.email
    const targetUploadCount = req.query.targetUploadCount

    const channelRef = db.collection('channels').doc(email)
    const channel = await (await channelRef.get()).data()

    const videosRef = db.collection('videos')
    let availableCount = 0
    do {
      const snapshot = await videosRef
        .where('forEmail', '==', email)
        .where('uploaded', '==', false)
        .count()
        .get()

      availableCount = snapshot.data().count
      console.log('snapshot', availableCount)
      if (availableCount < targetUploadCount) {
        await fetchKeywordVideos(email, channel.keywords)
      }
    } while (availableCount < targetUploadCount)

    const snapshot2 = await videosRef
      .where('forEmail', '==', email)
      .where('uploaded', '==', false)
      .limit(parseInt(targetUploadCount))
      .get()
    if (snapshot2.empty) {
      console.log('No matching videos.')
      res.status(200).json({ msg: 'No matching videos.' })
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

    for (const video of videos) {
      console.log(video.video_id, '=>', targetUploadCount)

      let videoURL = ''
      if (video.source === 'INSTAGRAM') {
        videoURL = await getVideoUrlForInsta(video.video_id)
      } else {
        videoURL = await getVideoFromTiktokVideoId(
          video.video_id,
          video.unique_id
        )
      }

      console.log('videoURL', videoURL)
      if (!videoURL) {
        await onVideoUploadSuccess(video.video_id, email)
        continue
      }
      await fileDownloadWithoutAudio(videoURL, video.video_id)
      videoMetaData.push({
        Video: `Videos/${video.video_id}_${email}.mp4`,
        Title: video.title,
        Description: video.description,
        Thumbnail: '',
        Tags: video.tags,
        onSuccess: async () => await onVideoUploadSuccess(video.video_id, email)
      })
    }
    console.log('Videos downloaded locally. Now, Uploading ...')

    await youtubeUploader.Login(email, channel.password)
    console.log('LoggedIn to your account and muting audio')
    await youtubeUploader.UploadVideo(videoMetaData)

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
