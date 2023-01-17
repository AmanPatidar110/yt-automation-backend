const { default: axios } = require('axios')
const apiKey = require('../Constants/keys')
const { uploadVideosOnFirestore } = require('./fireStoreUpload.controller')

const getApiKey = FETCH_COUNT => {
  return apiKey[FETCH_COUNT % 10]
}

exports.fetchKeywordVideos = async (forEmail, keywords, forUser) => {
  const keyword = keywords[Math.floor(Math.random() * keywords.length)]
  try {
    let FETCH_COUNT = 0
    let hasNext = true
    let cursor = '0'

    let options = {
      method: 'GET',
      url: 'https://tiktok-video-no-watermark2.p.rapidapi.com/feed/search',
      params: { keywords: keyword, count: '30', cursor },
      headers: getApiKey(FETCH_COUNT)
    }

    while (FETCH_COUNT < 30 && hasNext) {
      const response = await axios.request(options)

      hasNext = response.data.data.hasMore
      cursor = response.data.data.cursor
      options = {
        ...options,
        params: { ...options.params, cursor },
        headers: getApiKey(FETCH_COUNT)
      }

      FETCH_COUNT = uploadVideosOnFirestore(
        response.data.data.videos,
        forEmail,
        keyword,
        'TIKTOK',
        FETCH_COUNT,
        forUser,
        keywords
      )
    }
  } catch (error) {
    if (!error.statusCode) error.statusCode = 500
    console.log(error)
    throw error
  }
}
