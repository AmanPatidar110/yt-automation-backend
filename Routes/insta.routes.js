const express = require('express')
const router = express.Router()
const { crawl } = require('../instabot')
const { db } = require('../firebase')

router.post('/add_insta_account', async (req, res, next) => {
  try {
    const credId = req.body.credId
    const credPassword = req.body.credPassword
    const threadIds = req.body.threadIds
    const accountName = req.body.accountName
    const defaultForEmail = req.body.defaultForEmail

    console.log(
      'body',
      credId,
      credPassword,
      threadIds,
      accountName,
      defaultForEmail
    )
    const resp = await db.collection('instaAccounts').doc(credId).set({
      credId,
      credPassword,
      threadIds,
      accountName,
      defaultForEmail
    })

    console.log('insta account added', resp)
    res.status(200).json({ msg: 'ok', resp })
  } catch (error) {
    if (!error.statusCode) error.statusCode = 500
    console.log(error)
    return next(error)
  }
})

router.post('/fetch_messages_from_insta', async (req, res, next) => {
  try {
    const instaCredId = req.body.instaCredId // 'swipe_facts'
    const forChannelEmail = req.body.forChannelEmail // 'amanpatidar110@gmail.com'

    const instaRef = db.collection('instaAccounts').doc(instaCredId)
    const instaAccount = (await instaRef.get()).data()

    await crawl(
      instaAccount.threadIds,
      instaCredId,
      instaAccount.credPassword,
      res,
      forChannelEmail
    )
  } catch (error) {
    if (!error.statusCode) error.statusCode = 500
    console.log(error)
    return next(error)
  }
})

module.exports = router

module.exports = router
