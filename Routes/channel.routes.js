import express from 'express'
import { db } from '../firebase.js'

const router = express.Router()

router.post('/add_channel', async (req, res, next) => {
  try {
    const forUser = req.body.forUser
    const channelEmail = req.body.channelEmail
    const channelPassword = req.body.channelPassword
    const keywords = req.body.keywords
    const channelName = req.body.channelName
    const defaultUploadCount = req.body.defaultUploadCount

    console.log('body', channelEmail, channelPassword, keywords)
    const resp = await db.collection('channels').doc(channelEmail).set({
      forUser,
      name: channelName,
      email: channelEmail,
      password: channelPassword,
      defaultUploadCount,
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

router.get('/get_channels', async (req, res, next) => {
  try {
    const forUser = req.query.forUser

    const snapshot = await db
      .collection('channels')
      .where('forUser', '==', forUser)
      .get()
    const channels = []
    snapshot.forEach(vid => {
      channels.push(vid.data())
    })

    console.log('channels', channels)
    res.status(200).json({ msg: 'ok', channels })
  } catch (error) {
    if (!error.statusCode) error.statusCode = 500
    console.log(error)
    return next(error)
  }
})

router.delete('/delete_channel', async (req, res, next) => {
  try {
    const forUser = req.query.forUser
    const email = req.query.email

    const snapshot = await db
      .collection('channels')
      .where('forUser', '==', forUser)
      .where('email', '==', email)
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

export default router
