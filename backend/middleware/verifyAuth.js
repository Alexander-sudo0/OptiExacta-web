const { admin, initializeFirebaseAdmin } = require('../lib/firebase-admin')

function getBearerToken(req) {
  const header = req.headers.authorization || ''
  if (!header.startsWith('Bearer ')) {
    return null
  }
  return header.slice('Bearer '.length).trim()
}

function verifyAuth(req, res, next) {
  // Development mode bypass (for testing without Firebase Auth)
  if (process.env.SKIP_AUTH_IN_DEV === 'true' && process.env.NODE_ENV === 'development') {
    console.log('⚠️  Auth bypassed (development mode)')
    req.auth = {
      uid: 'dev-user',
      email: 'dev@test.com',
      provider: 'development'
    }
    return next()
  }

  try {
    initializeFirebaseAdmin()
  } catch (error) {
    return res.status(500).json({ error: 'firebase_admin_not_configured' })
  }

  const token = getBearerToken(req)
  if (!token) {
    return res.status(401).json({ error: 'missing_auth_token' })
  }

  admin
    .auth()
    .verifyIdToken(token)
    .then((decoded) => {
      req.auth = {
        uid: decoded.uid,
        email: decoded.email || null,
        provider: decoded.firebase && decoded.firebase.sign_in_provider
          ? decoded.firebase.sign_in_provider
          : null
      }
      next()
    })
    .catch(() => {
      res.status(401).json({ error: 'invalid_auth_token' })
    })
}

module.exports = {
  verifyAuth
}
