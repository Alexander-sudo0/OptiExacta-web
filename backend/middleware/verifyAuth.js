/**
 * verifyAuth — Firebase token verification middleware
 *
 * SECURITY RULES:
 *  1. Production: always verify via Firebase Admin SDK with revocation check
 *  2. Dev mode (SKIP_AUTH_IN_DEV=true + NODE_ENV=development): bypass with hard-coded identity
 *  3. Disposable email domains are rejected
 *  4. Decoded auth info is set on req.auth
 */

const { admin, initializeFirebaseAdmin } = require('../lib/firebase-admin')

const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com', 'guerrillamail.com', 'tempmail.com', 'throwaway.email',
  'yopmail.com', 'sharklasers.com', 'grr.la', 'guerrillamailblock.com',
  'pokemail.net', 'spam4.me', 'bccto.me', 'trashmail.com', 'trashmail.net',
  'dispostable.com', 'mailnesia.com', 'maildrop.cc', 'fakeinbox.com',
  'tempail.com', 'temp-mail.org', 'getnada.com', '10minutemail.com',
  'mohmal.com', 'discard.email', 'tempr.email', 'emailondeck.com',
  'mailcatch.com', 'meltmail.com',
])

function getBearerToken(req) {
  const header = req.headers.authorization || ''
  if (!header.startsWith('Bearer ')) return null
  return header.slice('Bearer '.length).trim()
}

function isDisposableEmail(email) {
  if (!email) return false
  const domain = email.split('@')[1]?.toLowerCase()
  return domain ? DISPOSABLE_DOMAINS.has(domain) : false
}

function verifyAuth(req, res, next) {
  // Dev bypass
  if (process.env.SKIP_AUTH_IN_DEV === 'true' && process.env.NODE_ENV === 'development') {
    req.auth = { uid: 'dev-user', email: 'dev@test.com', provider: 'development', emailVerified: true }
    return next()
  }

  try { initializeFirebaseAdmin() } catch {
    return res.status(500).json({ error: 'firebase_admin_not_configured' })
  }

  const token = getBearerToken(req)
  if (!token) return res.status(401).json({ error: 'missing_auth_token' })

  admin.auth().verifyIdToken(token, /* checkRevoked */ true)
    .then((decoded) => {
      if (isDisposableEmail(decoded.email)) {
        return res.status(403).json({ error: 'disposable_email', message: 'Disposable email addresses are not allowed' })
      }
      req.auth = {
        uid: decoded.uid,
        email: decoded.email || null,
        emailVerified: !!decoded.email_verified,
        provider: decoded.firebase?.sign_in_provider || null,
      }
      next()
    })
    .catch((err) => {
      if (err.code === 'auth/id-token-revoked') return res.status(401).json({ error: 'token_revoked' })
      return res.status(401).json({ error: 'invalid_auth_token' })
    })
}

module.exports = { verifyAuth, isDisposableEmail, DISPOSABLE_DOMAINS }
