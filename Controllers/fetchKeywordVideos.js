const { default: axios } = require('axios')
const apiKey = require('../Constants/keys')
const { db } = require('../firebase')
const { uploadVideosOnFirestore } = require('./fireStoreUpload.controller')

const getApiKey = FETCH_COUNT => {
  return apiKey[FETCH_COUNT % 10]
}
const updateApiCount = async currentCount => {
  const constantsRef = db.collection('constants').doc('Up8smqy8uZukjhDBCus9')
  constantsRef.update({ api_count: currentCount + 1 })
  return currentCount + 1
}

exports.fetchKeywordVideos = async (forEmail, keywords, forUser) => {
  const keyword = keywords[Math.floor(Math.random() * keywords.length)]
  const constantsRef = db.collection('constants').doc('Up8smqy8uZukjhDBCus9')

  let API_COUNT = 0
  let FETCH_COUNT = 0
  let hasNext = true
  let cursor = '0'

  try {
    const constants = (await constantsRef.get()).data()
    API_COUNT = constants.api_count
    let options = {
      method: 'GET',
      url: 'https://tiktok-video-no-watermark2.p.rapidapi.com/feed/search',
      params: { keywords: keyword, count: '30', cursor },
      headers: getApiKey(API_COUNT)
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
      API_COUNT = await updateApiCount(API_COUNT)
    }
  } catch (error) {
    if (!error.statusCode) error.statusCode = 500
    console.log(error)
    API_COUNT = await updateApiCount(API_COUNT)
  }
}
