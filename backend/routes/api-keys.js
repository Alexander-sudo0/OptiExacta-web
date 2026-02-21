/**
 * API Key Management Routes
 *
 * Enterprise-grade API key system inspired by Stripe/AWS.
 *
 * Key design:
 *   - Keys are AES-256-GCM encrypted and stored for dashboard reveal
 *   - SHA-256 hash stored separately for O(1) auth lookups
 *   - Plan-based limits: FREE=1, PRO=5, ENTERPRISE=10, UNLIMITED=25
 *   - Expiry presets: 30d, 90d, 180d, 365d, never
 *   - Masked by default, revealable via dedicated endpoint
 *
 * Mounted at: /api/api-keys
 * Auth: Firebase (verifyAuth + attachTenantContext)
 *
 * Endpoints:
 *   POST   /              — Generate a new API key
 *   GET    /              — List all API keys for the tenant
 *   GET    /:keyId/reveal — Decrypt and return the full key
 *   DELETE /:keyId        — Revoke an API key
 */

const express = require('express')
const crypto = require('crypto')
const { auditLog } = require('../lib/audit')

// ──────────────────────────────────────────────────────────────────────
// Encryption config (AES-256-GCM)
// ──────────────────────────────────────────────────────────────────────

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const API_KEY_SECRET = process.env.API_KEY_ENCRYPTION_SECRET ||
  process.env.SHARE_TOKEN_SECRET ||
  'visionera-default-api-key-secret-k' // 32+ chars; MUST override in prod

function getEncryptionKey() {
  return Buffer.from(API_KEY_SECRET, 'utf-8').subarray(0, 32)
}

function encryptKey(rawKey) {
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv)
  let encrypted = cipher.update(rawKey, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  const authTag = cipher.getAuthTag()
  // Store as iv:authTag:ciphertext (all hex)
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
}

function decryptKey(encryptedStr) {
  const [ivHex, authTagHex, ciphertext] = encryptedStr.split(':')
  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')
  const decipher = crypto.createDecipheriv(ALGORITHM, getEncryptionKey(), iv)
  decipher.setAuthTag(authTag)
  let decrypted = decipher.update(ciphertext, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}

// ──────────────────────────────────────────────────────────────────────
// Key generation
// ──────────────────────────────────────────────────────────────────────

function generateApiKey() {
  const randomPart = crypto.randomBytes(24).toString('hex') // 48 hex chars
  return `vra_live_${randomPart}` // 57 chars total
}

function hashKey(rawKey) {
  return crypto.createHash('sha256').update(rawKey).digest('hex')
}

// ──────────────────────────────────────────────────────────────────────
// Plan-based key limits
// ──────────────────────────────────────────────────────────────────────

const DEFAULT_KEY_LIMITS = {
  FREE: 1,
  PRO: 5,
  ENTERPRISE: 10,
  UNLIMITED: 25,
}

function getMaxKeys(plan) {
  if (plan.maxApiKeys != null && plan.maxApiKeys > 0) return plan.maxApiKeys
  return DEFAULT_KEY_LIMITS[plan.code] || 1
}

// ──────────────────────────────────────────────────────────────────────
// Expiry helpers
// ──────────────────────────────────────────────────────────────────────

const EXPIRY_PRESETS = { '30d': 30, '90d': 90, '180d': 180, '365d': 365 }

function parseExpiry(input) {
  if (!input || input === 'never') return null
  const days = EXPIRY_PRESETS[input]
  if (days) {
    const d = new Date()
    d.setDate(d.getDate() + days)
    return d
  }
  const d = new Date(input)
  if (isNaN(d.getTime()) || d <= new Date()) return 'INVALID'
  return d
}

// ──────────────────────────────────────────────────────────────────────
// Router
// ──────────────────────────────────────────────────────────────────────

function createApiKeyRouter(prisma) {
  const router = express.Router()

  // ===== POST / — Create key =============================================
  router.post('/', async (req, res) => {
    try {
      const { user, tenant, plan } = req.saas || {}
      if (!user || !tenant || !plan) {
        return res.status(500).json({ code: 'CONTEXT_MISSING', message: 'Auth context not loaded.' })
      }

      const name = (req.body.name || '').trim()
      if (!name) {
        return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'Key name is required.', field: 'name' })
      }
      if (name.length > 100) {
        return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'Key name must be 100 characters or less.', field: 'name' })
      }

      // Plan-based limit
      const maxKeys = getMaxKeys(plan)
      const activeCount = await prisma.apiKey.count({ where: { tenantId: tenant.id, revokedAt: null } })

      if (activeCount >= maxKeys) {
        const label = plan.code === 'FREE' ? 'Free plan' : `${plan.name || plan.code} plan`
        return res.status(403).json({
          code: 'KEY_LIMIT_REACHED',
          message: `Your ${label} allows ${maxKeys} active API key${maxKeys > 1 ? 's' : ''}. ${
            plan.code === 'FREE' ? 'Upgrade to Pro for up to 5 keys.' : 'Revoke unused keys or upgrade your plan.'
          }`,
          limit: maxKeys,
          current: activeCount,
          planCode: plan.code,
        })
      }

      // Parse expiry
      const expiryInput = req.body.expiry || req.body.expiresAt || '90d'
      const expiresAt = parseExpiry(expiryInput)
      if (expiresAt === 'INVALID') {
        return res.status(400).json({
          code: 'VALIDATION_ERROR',
          message: 'Invalid expiry. Use: "30d", "90d", "180d", "365d", "never", or a future ISO date.',
          field: 'expiry',
        })
      }

      // Generate, hash, encrypt
      const rawKey = generateApiKey()
      const keyH = hashKey(rawKey)
      const encrypted = encryptKey(rawKey)
      const keyPrefix = rawKey.substring(0, 12)

      const apiKey = await prisma.apiKey.create({
        data: {
          tenantId: tenant.id,
          userId: user.id,
          name,
          keyPrefix,
          keyHash: keyH,
          encryptedKey: encrypted,
          expiresAt,
        },
      })

      auditLog(prisma, {
        userId: user.id,
        tenantId: tenant.id,
        action: 'API_KEY_CREATED',
        detail: { keyId: apiKey.id, name, keyPrefix, expiresAt },
        meta: { method: req.method, path: req.originalUrl, ip: req.ip, userAgent: req.get('user-agent') },
      })

      return res.status(201).json({
        success: true,
        data: {
          id: apiKey.id,
          key: rawKey,
          name: apiKey.name,
          keyPrefix: apiKey.keyPrefix,
          scopes: apiKey.scopes,
          expiresAt: apiKey.expiresAt,
          createdAt: apiKey.createdAt,
        },
        meta: { keysUsed: activeCount + 1, keysLimit: maxKeys },
      })
    } catch (err) {
      console.error('[API Keys] Create error:', err)
      return res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Failed to create API key.' })
    }
  })

  // ===== GET / — List keys (masked) ======================================
  router.get('/', async (req, res) => {
    try {
      const { tenant, plan } = req.saas || {}
      if (!tenant || !plan) {
        return res.status(500).json({ code: 'CONTEXT_MISSING', message: 'Auth context not loaded.' })
      }

      const keys = await prisma.apiKey.findMany({
        where: { tenantId: tenant.id },
        select: {
          id: true, name: true, keyPrefix: true, scopes: true,
          lastUsedAt: true, expiresAt: true, revokedAt: true, createdAt: true,
          user: { select: { email: true, username: true } },
        },
        orderBy: { createdAt: 'desc' },
      })

      const maxKeys = getMaxKeys(plan)
      const activeCount = keys.filter((k) => !k.revokedAt).length

      return res.json({
        success: true,
        data: keys.map((k) => ({
          id: k.id,
          name: k.name,
          keyPrefix: k.keyPrefix,
          maskedKey: k.keyPrefix + '•'.repeat(45),
          scopes: k.scopes,
          lastUsedAt: k.lastUsedAt,
          expiresAt: k.expiresAt,
          revokedAt: k.revokedAt,
          isActive: !k.revokedAt && (!k.expiresAt || k.expiresAt > new Date()),
          isExpired: !!k.expiresAt && k.expiresAt <= new Date(),
          createdAt: k.createdAt,
          createdBy: k.user?.email || k.user?.username || 'Unknown',
        })),
        meta: { keysUsed: activeCount, keysLimit: maxKeys, planCode: plan.code },
      })
    } catch (err) {
      console.error('[API Keys] List error:', err)
      return res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Failed to list API keys.' })
    }
  })

  // ===== GET /:keyId/reveal — Decrypt full key ===========================
  router.get('/:keyId/reveal', async (req, res) => {
    try {
      const { tenant } = req.saas || {}
      if (!tenant) {
        return res.status(500).json({ code: 'CONTEXT_MISSING', message: 'Auth context not loaded.' })
      }

      const apiKey = await prisma.apiKey.findFirst({
        where: { id: req.params.keyId, tenantId: tenant.id },
      })
      if (!apiKey) {
        return res.status(404).json({ code: 'KEY_NOT_FOUND', message: 'API key not found.' })
      }
      if (apiKey.revokedAt) {
        return res.status(400).json({ code: 'KEY_REVOKED', message: 'Revoked keys cannot be revealed.' })
      }

      if (!apiKey.encryptedKey) {
        return res.status(400).json({
          code: 'NO_ENCRYPTED_KEY',
          message: 'This key was created before reveal support was added. Please revoke and create a new key.',
        })
      }

      let fullKey
      try {
        fullKey = decryptKey(apiKey.encryptedKey)
      } catch {
        return res.status(500).json({ code: 'DECRYPTION_FAILED', message: 'Unable to reveal. Regenerate the key.' })
      }

      return res.json({ success: true, data: { key: fullKey } })
    } catch (err) {
      console.error('[API Keys] Reveal error:', err)
      return res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Failed to reveal API key.' })
    }
  })

  // ===== DELETE /:keyId — Revoke key =====================================
  router.delete('/:keyId', async (req, res) => {
    try {
      const { user, tenant } = req.saas || {}
      if (!user || !tenant) {
        return res.status(500).json({ code: 'CONTEXT_MISSING', message: 'Auth context not loaded.' })
      }

      const apiKey = await prisma.apiKey.findFirst({
        where: { id: req.params.keyId, tenantId: tenant.id },
      })
      if (!apiKey) {
        return res.status(404).json({ code: 'KEY_NOT_FOUND', message: 'API key not found.' })
      }
      if (apiKey.revokedAt) {
        return res.status(400).json({ code: 'ALREADY_REVOKED', message: 'Already revoked.' })
      }

      await prisma.apiKey.update({
        where: { id: req.params.keyId },
        data: { revokedAt: new Date() },
      })

      auditLog(prisma, {
        userId: user.id,
        tenantId: tenant.id,
        action: 'API_KEY_REVOKED',
        detail: { keyId: req.params.keyId, name: apiKey.name, keyPrefix: apiKey.keyPrefix },
        meta: { method: req.method, path: req.originalUrl, ip: req.ip, userAgent: req.get('user-agent') },
      })

      return res.json({ success: true, message: 'API key revoked successfully.' })
    } catch (err) {
      console.error('[API Keys] Revoke error:', err)
      return res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Failed to revoke API key.' })
    }
  })

  return router
}

module.exports = { createApiKeyRouter }
