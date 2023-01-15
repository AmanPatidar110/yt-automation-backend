const express = require('express')
const router = express.Router()
const { db } = require('../firebase')

router.post('/add_channel', async (req, res, next) => {
  try {
    const channelEmail = req.body.channelEmail
    const channelPassword = req.body.channelPassword
    const keywords = req.body.keywords

    console.log('body', channelEmail, channelPassword, keywords)
    const resp = await db.collection('channels').doc(channelEmail).set({
      channelEmail,
      channelPassword,
      keywords
    })

    console.log('channel added', resp)
    res.status(200).json({ msg: 'ok', resp })
  } catch (error) {
    if (!error.statusCode) error.statusCode = 500
    console.log(error)
    return next(error)
  }
})

module.exports = router
