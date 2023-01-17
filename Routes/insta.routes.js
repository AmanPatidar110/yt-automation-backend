const express = require('express')
const router = express.Router()
const { crawl } = require('../instabot')
const { db } = require('../firebase')

router.post('/add_insta_account', async (req, res, next) => {
  try {
    const forUser = req.body.forUser
    const credId = req.body.credId
    const credPassword = req.body.credPassword
    const threadIds = req.body.threadIds
    const accountName = req.body.accountName
    const defaultForEmail = req.body.defaultForEmail

    console.log(
      'body',
      forUser,
      credId,
      credPassword,
      threadIds,
      accountName,
      defaultForEmail
    )
    const resp = await db.collection('instaAccounts').doc(credId).set({
      forUser,
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
    const forUser = req.body.forUser // 'AMAN | "ABHISHEK'
    const instaCredId = req.body.instaCredId // 'swipe_facts'
    const forChannelEmail = req.body.forChannelEmail // 'amanpatidar110@gmail.com'

    const instaRef = db.collection('instaAccounts').doc(instaCredId)
    const instaAccount = (await instaRef.get()).data()

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

router.get('/get_insta_accounts', async (req, res, next) => {
  try {
    const forUser = req.query.forUser

    const snapshot = await db
      .collection('instaAccounts')
      .where('forUser', '==', forUser)
      .get()
    const instaAccounts = []
    snapshot.forEach(vid => {
      instaAccounts.push(vid.data())
    })

    console.log('instaAccounts', instaAccounts)
    res.status(200).json({ msg: 'ok', instaAccounts })
  } catch (error) {
    if (!error.statusCode) error.statusCode = 500
    console.log(error)
    return next(error)
  }
})

router.delete('/delete_insta_account', async (req, res, next) => {
  try {
    const forUser = req.query.forUser
    const credId = req.query.credId

    const snapshot = await db
      .collection('instaAccounts')
      .where('forUser', '==', forUser)
      .where('credId', '==', credId)
      .get()

    const batch = db.batch()

    snapshot.forEach(doc => {
      batch.delete(doc.ref)
    })

    await batch.commit()
    res.status(200).json({ msg: 'ok' })
  } catch (error) {
    if (!error.statusCode) error.statusCode = 500
    console.log(error)
    return next(error)
  }
})
module.exports = router
