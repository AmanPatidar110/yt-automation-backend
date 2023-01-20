import express from 'express'
import { db } from '../firebase.js'

const router = express.Router()

router.delete('/get_videos_count', async (req, res, next) => {
  try {
    const forUser = req.query.forUser
    const email = req.query.email

    const videosRef = db.collection('videos')
    const query = videosRef
      .where('forEmail', '==', email)
      .where('forUser', '==', forUser)
      .where('uploaded', '==', false)

    const availableCount = (await query.count().get()).data().count
    res.status(200).json({ msg: 'ok', availableCount })
  } catch (error) {
    if (!error.statusCode) error.statusCode = 500
    console.log(error)
    return next(error)
  }
})

router.patch('/update_video', async (req, res, next) => {
  try {
    const video = req.body.video
    const videoId = req.body.videoId

    await db.collection('videos').doc(videoId).update({
      ...video
    })

    res.status(200).json({ msg: 'ok' })
  } catch (error) {
    if (!error.statusCode) error.statusCode = 500
    console.log(error)
    return next(error)
  }
})

router.patch('/update_videos', async (req, res, next) => {
  try {
    const videos = req.body.videos
    const forEmail = req.body.forEmail
    const keyword = req.body.keyword
    const source = req.body.source
    const channelKeywords = req.body.channelKeywords
    let FETCH_COUNT = req.body.FETCH_COUNT

    videos.forEach(async video => {
      const forUser = req.body.forUser
      const vidRef = db.collection('videos').doc(video.video_id)
      const vid = await vidRef.get()
      if (!vid.exists) {
        await db
          .collection('videos')
          .doc(video.video_id)
          .set({
            ...video,
            forEmail,
            forUser,
            keyword,
            title: video.title.substr(0, 75),
            description: `Video credit goes to: @${video.author.unique_id} (${source}) 
            For removal request please refer this email: ${forEmail} 
            ${video.title}
            `,
            tags: [
              ...video.title.split('#'),
              ...channelKeywords,
              'short',
              'shorts',
              'shorts_video',
              'shortsfeed',
              'trending'
            ]
              .join(', #')
              .substr(0, 450),
            uploaded: false,
            source
          })

        FETCH_COUNT += 1

        return FETCH_COUNT
      } else {
        console.log('Document already exists!')
      }
    })

    res.status(200).json({ msg: 'ok' })
  } catch (error) {
    if (!error.statusCode) error.statusCode = 500
    console.log(error)
    return next(error)
  }
})
export default router
