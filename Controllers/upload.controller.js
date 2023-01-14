const { db } = require('../firebase')

exports.uploadVideos = async (videos, forEmail, keyword) => {
  let FETCH_COUNT = 0
  videos.forEach(async video => {
    const vidRef = db.collection('videos').doc(video.video_id)
    const vid = await vidRef.get()
    if (!vid.exists) {
      await db
        .collection('videos')
        .doc(video.video_id)
        .set({
          ...video,
          forEmail,
          keyword,
          title: video.title.substr(0, 75),
          description: video.title,
          tags: video.title.split('#').join(', #').substr(0, 500),
          uploaded: false
        })

      FETCH_COUNT += 1

      return FETCH_COUNT
    } else {
      console.log('Document already exists!')
    }
  })
}
