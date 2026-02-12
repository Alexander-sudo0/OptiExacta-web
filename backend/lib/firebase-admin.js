const admin = require('firebase-admin')

function initializeFirebaseAdmin() {
  if (admin.apps.length) {
    return admin.app()
  }

  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_PRIVATE_KEY

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Firebase Admin SDK env vars are missing')
  }

  const normalizedKey = privateKey.replace(/\\n/g, '\n')

  return admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey: normalizedKey
    })
  })
}

module.exports = {
  admin,
  initializeFirebaseAdmin
}
