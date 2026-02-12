import * as admin from 'firebase-admin'

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  const projectId = process.env.FIREBASE_PROJECT_ID || 'optiexacta-labs'
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || 'firebase-adminsdk-fbsvc@optiexacta-labs.iam.gserviceaccount.com'
  const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n')

  // Check if Firebase Admin credentials are configured
  if (!privateKey || privateKey.trim() === '') {
    console.warn('⚠️  Firebase Admin SDK not configured - FIREBASE_PRIVATE_KEY is missing')
    console.warn('⚠️  User authentication will not work until Firebase Admin is properly configured')
  }

  const serviceAccount = {
    projectId,
    clientEmail,
    privateKey: privateKey || 'dummy-key', // Prevent initialization error
  }

  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
      projectId: serviceAccount.projectId,
    })
  } catch (error) {
    console.error('❌ Firebase Admin initialization failed:', error)
    console.error('   Please configure FIREBASE_PRIVATE_KEY in backend/.env')
  }
}

export const adminAuth = admin.auth()
export const adminDb = admin.firestore()

export default admin
