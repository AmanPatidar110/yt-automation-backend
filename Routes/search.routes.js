const { default: axios } = require('axios')
const express = require('express')
const router = express.Router()
const { db } = require('../firebase')

router.get('/fetch_keyword_videos', async (req, res, next) => {
  try {
    const keyword = req.query.keyword
    const forEmail = req.query.forEmail

    let FETCH_COUNT = 0
    let hasNext = true
    let cursor = '0'

    let options = {
      method: 'GET',
      url: 'https://tiktok-video-no-watermark2.p.rapidapi.com/feed/search',
      params: { keywords: keyword, count: '30', cursor },
      headers: {
        'X-RapidAPI-Key': 'ec024eb781msh6ddf7d7b6e847e1p177749jsn56cc0a2f9572',
        'X-RapidAPI-Host': 'tiktok-video-no-watermark2.p.rapidapi.com'
      }
    }

    while (FETCH_COUNT < 30 && hasNext) {
      const response = await axios.request(options)

      // console.log(response.data.data.videos)
      hasNext = response.data.data.hasMore
      cursor = response.data.data.cursor
      options = { ...options, params: { ...options.params, cursor } }
      response.data.data.videos.forEach(async video => {
        const vidRef = db.collection('videos').doc(video.video_id)
        const vid = await vidRef.get()
        if (!vid.exists) {
          await db
            .collection('videos')
            .doc(video.video_id)
            .set({
              ...video,
              keyword,
              forEmail,
              title: video.title.substr(0, 75),
              description: video.title,
              tags: video.title.split('#').join(', #').substr(0, 500),
              uploaded: false
            })

          FETCH_COUNT += 1
        } else {
          console.log('Document already exists!')
        }
      })

      console.log(options)
    }
    res.status(200).json({ msg: 'ok', FETCH_COUNT })
  } catch (error) {
    if (!error.statusCode) error.statusCode = 500
    console.log(error)
    return next(error)
  }
})

module.exports = router
