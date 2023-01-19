import admin from 'firebase-admin'

import serviceAccount from './service-account.json' assert { type: 'json' }

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
})

export const db = admin.firestore()
