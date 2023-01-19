import { db } from '../firebase.js'

export const uploadVideosOnFirestore = async (
  videos,
  forEmail,
  keyword,
  source,
  FETCH_COUNT,
  forUser,
  channelKeywords
) => {
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
}
