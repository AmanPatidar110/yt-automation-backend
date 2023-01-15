const express = require('express')
const router = express.Router()
const { crawl } = require('../instabot')

router.post('/fetch_messages_from_insta', async (req, res, next) => {
  try {
    const threadIds = req.body.threadIds // ['340282366841710300949128151362669835188']
    const userName = req.body.userName // 'swipe_facts'
    const password = req.body.password // '_iCHlpHI1=dR6+o3refI'
    const forChannelEmail = req.body.forChannelEmail // 'amanpatidar110@gmail.com'

    await crawl(threadIds, userName, password, res, forChannelEmail)
  } catch (error) {
    if (!error.statusCode) error.statusCode = 500
    console.log(error)
    return next(error)
  }
})

module.exports = router
