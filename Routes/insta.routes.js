import express from 'express'
import axios from 'axios'
import { crawl } from '../instabot.js'

import { apiServiceUrl } from '../Utility/api-service.js'

const router = express.Router()

router.post('/fetch_messages_from_insta', async (req, res, next) => {
  try {
    const forUser = req.body.forUser // 'AMAN | "ABHISHEK'
    const instaCredId = req.body.instaCredId // 'swipe_facts'
    const forChannelEmail = req.body.forChannelEmail // 'amanpatidar110@gmail.com'

    const response = await axios.request({
      method: 'GET',
      url: `${apiServiceUrl}/insta/get_insta_accounts?forUser=${forUser}`
    })
    const instaAccount = response.data.instaAccount

    const FETCH_COUNT = await crawl(
      instaAccount.threadIds,
      instaCredId,
      instaAccount.credPassword,
      forChannelEmail,
      forUser
    )
    res.status(200).json({ msg: 'ok', FETCH_COUNT })
  } catch (error) {
    if (!error.statusCode) error.statusCode = 500
    console.log(error)
    return next(error)
  }
})

export default router
