/**
 * API Key Authentication Middleware
 *
 * Validates public API requests using API keys (not Firebase tokens).
 * Supports two header formats:
 *   - Authorization: Bearer vra_live_xxxx
 *   - x-api-key: vra_live_xxxx
 *
 * On success, sets:
 *   req.apiKey   — The ApiKey record
 *   req.saas     — { user, tenant, role, plan } (same shape as Firebase auth)
 *   req.auth     — { uid, email, provider: 'api_key' }
 *
 * This allows downstream middleware (enforceUsage, audit, etc.) to work
 * identically for both Firebase-auth and API-key-auth requests.
 */

const crypto = require('crypto')

// ──────────────────────────────────────────────────────────────────────
// Error responses
// ──────────────────────────────────────────────────────────────────────

const ERRORS = {
  MISSING_KEY: {
    status: 401,
    body: {
      code: 'AUTHENTICATION_REQUIRED',
      message: 'API key is required. Pass it as Authorization: Bearer <key> or x-api-key: <key>.',
    },
  },
  INVALID_KEY: {
    status: 401,
    body: {
      code: 'INVALID_API_KEY',
      message: 'The API key provided is invalid or does not exist.',
    },
  },
  REVOKED_KEY: {
    status: 401,
    body: {
      code: 'API_KEY_REVOKED',
      message: 'This API key has been revoked. Generate a new one from the dashboard.',
    },
  },
  EXPIRED_KEY: {
    status: 401,
    body: {
      code: 'API_KEY_EXPIRED',
      message: 'This API key has expired. Generate a new one from the dashboard.',
    },
  },
  ACCOUNT_SUSPENDED: {
    status: 403,
    body: {
      code: 'ACCOUNT_SUSPENDED',
      message: 'Your account has been suspended. Contact support.',
    },
  },
  ACCOUNT_BANNED: {
    status: 403,
    body: {
      code: 'ACCOUNT_BANNED',
      message: 'Your account has been banned.',
    },
  },
  SUBSCRIPTION_INACTIVE: {
    status: 403,
    body: {
      code: 'SUBSCRIPTION_INACTIVE',
      message: 'Your subscription is not active. Please upgrade your plan.',
    },
  },
}

// ──────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────

function hashKey(rawKey) {
  return crypto.createHash('sha256').update(rawKey).digest('hex')
}

/**
 * Extract API key from request headers.
 * Accepts:
 *   Authorization: Bearer vra_live_xxxx
 *   x-api-key: vra_live_xxxx
 */
function extractApiKey(req) {
  // Try Authorization header first
  const authHeader = req.headers.authorization
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim()
    if (token.startsWith('vra_')) return token
  }

  // Try x-api-key header
  const xApiKey = req.headers['x-api-key']
  if (xApiKey && xApiKey.startsWith('vra_')) return xApiKey

  return null
}

// ──────────────────────────────────────────────────────────────────────
// Middleware factory
// ──────────────────────────────────────────────────────────────────────

/**
 * Create API key auth middleware.
 * @param {import('@prisma/client').PrismaClient} prisma
 * @returns {Function} Express middleware
 */
function apiKeyAuth(prisma) {
  return async (req, res, next) => {
    const rawKey = extractApiKey(req)

    if (!rawKey) {
      return res.status(ERRORS.MISSING_KEY.status).json(ERRORS.MISSING_KEY.body)
    }

    const keyHash = hashKey(rawKey)

    // Look up the key with tenant + plan
    const apiKey = await prisma.apiKey.findUnique({
      where: { keyHash },
      include: {
        tenant: {
          include: { plan: true },
        },
        user: true,
      },
    })

    if (!apiKey) {
      return res.status(ERRORS.INVALID_KEY.status).json(ERRORS.INVALID_KEY.body)
    }

    // Check revoked
    if (apiKey.revokedAt) {
      return res.status(ERRORS.REVOKED_KEY.status).json(ERRORS.REVOKED_KEY.body)
    }

    // Check expired
    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      return res.status(ERRORS.EXPIRED_KEY.status).json(ERRORS.EXPIRED_KEY.body)
    }

    // Check user status
    if (apiKey.user.isBanned) {
      return res.status(ERRORS.ACCOUNT_BANNED.status).json(ERRORS.ACCOUNT_BANNED.body)
    }
    if (apiKey.user.isSuspended) {
      return res.status(ERRORS.ACCOUNT_SUSPENDED.status).json(ERRORS.ACCOUNT_SUSPENDED.body)
    }

    // Check subscription status
    const subStatus = apiKey.tenant.subscriptionStatus
    if (subStatus === 'SUSPENDED' || subStatus === 'CANCELED' || subStatus === 'PAST_DUE') {
      return res.status(ERRORS.SUBSCRIPTION_INACTIVE.status).json({
        ...ERRORS.SUBSCRIPTION_INACTIVE.body,
        subscriptionStatus: subStatus,
      })
    }

    // Auto-expire trial
    if (subStatus === 'TRIAL' && apiKey.tenant.trialEndsAt < new Date()) {
      await prisma.tenant.update({
        where: { id: apiKey.tenant.id },
        data: { subscriptionStatus: 'PAST_DUE' },
      })
      return res.status(ERRORS.SUBSCRIPTION_INACTIVE.status).json({
        ...ERRORS.SUBSCRIPTION_INACTIVE.body,
        message: 'Your trial has expired. Please upgrade your plan.',
      })
    }

    // Get tenant role (for req.saas compatibility)
    const tenantUser = await prisma.tenantUser.findFirst({
      where: { tenantId: apiKey.tenant.id, userId: apiKey.user.id },
    })

    // Set req.auth (Firebase-compatible shape)
    req.auth = {
      uid: apiKey.user.firebaseUid,
      email: apiKey.user.email,
      provider: 'api_key',
    }

    // Set req.saas (same shape as attachTenantContext)
    req.saas = {
      user: apiKey.user,
      tenant: apiKey.tenant,
      role: tenantUser?.role || 'MEMBER',
      plan: apiKey.tenant.plan,
    }

    // Set req.apiKey for downstream use
    req.apiKey = apiKey

    // Update lastUsedAt (fire and forget)
    prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    }).catch(() => {})

    // Log the API call with apiKeyId after the response has been sent
    res.on('finish', () => {
      const { auditLog } = require('../lib/audit')
      auditLog(prisma, {
        userId: apiKey.userId,
        tenantId: apiKey.tenantId,
        action: 'API_CALL',
        endpoint: req.originalUrl || req.path,
        method: req.method,
        ipAddress: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || null,
        userAgent: req.get('user-agent') || null,
        responseStatus: res.statusCode,
        detail: {
          apiKeyId: apiKey.id,
          keyPrefix: apiKey.keyPrefix,
          keyName: apiKey.name,
        },
      }).catch(() => {})
    })

    next()
  }
}

module.exports = { apiKeyAuth, hashKey, extractApiKey }
