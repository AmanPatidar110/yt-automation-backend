import admin from 'firebase-admin'
import { serviceAccountConstants } from './service-account.js'

admin.initializeApp({
  credential: admin.credential.cert(serviceAccountConstants)
})

export const db = admin.firestore()
