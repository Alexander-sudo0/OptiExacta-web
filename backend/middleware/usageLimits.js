/**
 * usageLimits — Subscription + plan enforcement middleware
 *
 * Enforcement chain per request:
 *   token → user → suspension → tenant → subscription → trial → plan → feature → daily → monthly → video
 *
 * Redis counters:
 *   Monthly:  usage:tenant:{id}:month:{YYYY-MM}         TTL 35 days
 *   Daily:    usage:tenant:{id}:day:{YYYY-MM-DD}         TTL 48 hours
 *   Video:    video:tenant:{id}:month:{YYYY-MM}          TTL 35 days
 *
 * Exports:
 *   enforceUsage(prisma, options?)  → Express middleware
 *   enforceImageSize()              → Express middleware (post-multer)
 *
 * Options:
 *   allowColumn  — Plan boolean column to check (e.g. 'allowFaceSearchOneToOne')
 *   featureKey   — Human-readable feature name for error messages
 *   isVideo      — If true, also increment monthly video counter
 */

const { getRedisClient } = require('../lib/redis')

// ──────────────────────────────────────────────────────────────────────
// Key helpers
// ──────────────────────────────────────────────────────────────────────

function monthKey(tenantId) {
  const now = new Date()
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  return `usage:tenant:${tenantId}:month:${ym}`
}

function dayKey(tenantId) {
  const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
  return `usage:tenant:${tenantId}:day:${today}`
}

function videoMonthKey(tenantId) {
  const now = new Date()
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  return `video:tenant:${tenantId}:month:${ym}`
}

const TTL_35_DAYS = 35 * 24 * 60 * 60
const TTL_48_HOURS = 48 * 60 * 60

// Whitelist of valid plan boolean columns to prevent injection
const VALID_ALLOW_COLUMNS = new Set([
  'allowFaceSearchOneToOne',
  'allowFaceSearchOneToN',
  'allowFaceSearchNToN',
  'allowVideoProcessing',
])

// ──────────────────────────────────────────────────────────────────────
// Standardised error codes
// ──────────────────────────────────────────────────────────────────────

const ERROR = {
  CONTEXT_MISSING:       { code: 'CONTEXT_MISSING',        status: 500 },
  SUBSCRIPTION_CANCELED: { code: 'SUBSCRIPTION_CANCELED',   status: 403 },
  SUBSCRIPTION_PAST_DUE: { code: 'SUBSCRIPTION_PAST_DUE',  status: 403 },
  ACCOUNT_SUSPENDED:     { code: 'ACCOUNT_SUSPENDED',       status: 403 },
  FEATURE_NOT_ALLOWED:   { code: 'FEATURE_NOT_ALLOWED',     status: 403 },
  DAILY_LIMIT_REACHED:   { code: 'DAILY_LIMIT_REACHED',     status: 429 },
  PLAN_LIMIT_REACHED:    { code: 'PLAN_LIMIT_REACHED',      status: 429 },
  VIDEO_LIMIT_REACHED:   { code: 'VIDEO_LIMIT_REACHED',     status: 429 },
  IMAGE_TOO_LARGE:       { code: 'IMAGE_TOO_LARGE',         status: 413 },
}

// ──────────────────────────────────────────────────────────────────────
// Main middleware
// ──────────────────────────────────────────────────────────────────────

function enforceUsage(prisma, options = {}) {
  const { allowColumn, featureKey, isVideo } = options

  return async (req, res, next) => {
    const { tenant, plan, user } = req.saas || {}
    if (!tenant || !plan) {
      return res.status(ERROR.CONTEXT_MISSING.status).json({
        code: ERROR.CONTEXT_MISSING.code,
        message: 'Tenant context not loaded.',
      })
    }

    // SUPER_ADMIN bypass — unlimited usage
    if (user?.systemRole === 'SUPER_ADMIN') return next()

    // ──────────────────────────────────────────────────────────────
    // 1. Subscription status gate
    // ──────────────────────────────────────────────────────────────
    const status = tenant.subscriptionStatus

    if (status === 'SUSPENDED') {
      return res.status(ERROR.ACCOUNT_SUSPENDED.status).json({
        code: ERROR.ACCOUNT_SUSPENDED.code,
        message: 'Your account has been suspended. Contact support.',
      })
    }
    if (status === 'CANCELED') {
      return res.status(ERROR.SUBSCRIPTION_CANCELED.status).json({
        code: ERROR.SUBSCRIPTION_CANCELED.code,
        message: 'Your subscription has been canceled. Please resubscribe.',
      })
    }
    if (status === 'PAST_DUE') {
      return res.status(ERROR.SUBSCRIPTION_PAST_DUE.status).json({
        code: ERROR.SUBSCRIPTION_PAST_DUE.code,
        message: 'Your trial has expired or payment is past due. Please upgrade your plan.',
      })
    }

    // ──────────────────────────────────────────────────────────────
    // 2. Feature permission check (plan boolean columns)
    // ──────────────────────────────────────────────────────────────
    if (allowColumn && VALID_ALLOW_COLUMNS.has(allowColumn)) {
      if (!plan[allowColumn]) {
        const feature = featureKey || allowColumn.replace('allow', '').replace(/([A-Z])/g, ' $1').trim()
        return res.status(ERROR.FEATURE_NOT_ALLOWED.status).json({
          code: ERROR.FEATURE_NOT_ALLOWED.code,
          message: `Your plan does not include ${feature}. Please upgrade.`,
          feature,
        })
      }
    }

    // ──────────────────────────────────────────────────────────────
    // Redis counters (fail open if Redis is down)
    // ──────────────────────────────────────────────────────────────
    let redis
    try {
      redis = await getRedisClient()
    } catch {
      // Redis down → fail open
      return next()
    }

    try {
      // ────────────────────────────────────────────────────────────
      // 3. Daily usage limit
      // ────────────────────────────────────────────────────────────
      const dailyLimit = plan.dailyRequestLimit
      if (dailyLimit != null && dailyLimit > 0) {
        const dKey = dayKey(tenant.id)
        const dailyCurrent = await redis.incr(dKey)
        if (dailyCurrent === 1) await redis.expire(dKey, TTL_48_HOURS)

        if (dailyCurrent > dailyLimit) {
          if (plan.softDailyLimit) {
            // Soft limit: attach warning header but allow
            res.setHeader('X-Daily-Limit-Warning', 'true')
            res.setHeader('X-Daily-Usage', String(dailyCurrent - 1))
            res.setHeader('X-Daily-Limit', String(dailyLimit))
          } else {
            // Hard limit: block
            return res.status(ERROR.DAILY_LIMIT_REACHED.status).json({
              code: ERROR.DAILY_LIMIT_REACHED.code,
              message: `Daily request limit (${dailyLimit}) reached. Try again tomorrow.`,
              usage: dailyCurrent - 1,
              limit: dailyLimit,
              retryAfterSeconds: secondsUntilMidnight(),
            })
          }
        }
      }

      // ────────────────────────────────────────────────────────────
      // 4. Monthly usage limit
      // ────────────────────────────────────────────────────────────
      const monthlyLimit = plan.monthlyRequestLimit
      if (monthlyLimit != null && monthlyLimit > 0) {
        const mKey = monthKey(tenant.id)
        const monthlyCurrent = await redis.incr(mKey)
        if (monthlyCurrent === 1) await redis.expire(mKey, TTL_35_DAYS)

        if (monthlyCurrent > monthlyLimit) {
          return res.status(ERROR.PLAN_LIMIT_REACHED.status).json({
            code: ERROR.PLAN_LIMIT_REACHED.code,
            message: `Monthly request limit (${monthlyLimit}) reached. Please upgrade your plan.`,
            usage: monthlyCurrent - 1,
            limit: monthlyLimit,
          })
        }

        // Attach usage info for downstream / audit
        req.saas.usage = {
          monthCurrent: monthlyCurrent,
          monthLimit: monthlyLimit,
        }
      }

      // ────────────────────────────────────────────────────────────
      // 5. Monthly video processing limit (only for video routes)
      // ────────────────────────────────────────────────────────────
      if (isVideo) {
        const videoLimit = plan.monthlyVideoLimit
        if (videoLimit != null && videoLimit > 0) {
          const vKey = videoMonthKey(tenant.id)
          const videoCurrent = await redis.incr(vKey)
          if (videoCurrent === 1) await redis.expire(vKey, TTL_35_DAYS)

          if (videoCurrent > videoLimit) {
            return res.status(ERROR.VIDEO_LIMIT_REACHED.status).json({
              code: ERROR.VIDEO_LIMIT_REACHED.code,
              message: `Monthly video processing limit (${videoLimit}) reached. Please upgrade your plan.`,
              usage: videoCurrent - 1,
              limit: videoLimit,
            })
          }

          req.saas.videoUsage = {
            current: videoCurrent,
            limit: videoLimit,
          }
        }
      }
    } catch (err) {
      // Redis down → fail open (log and allow)
      console.error('[usageLimits] Redis error, failing open:', err.message)
    }

    return next()
  }
}

// ──────────────────────────────────────────────────────────────────────
// Image size enforcement (call AFTER multer, uses plan.maxImageSize)
// ──────────────────────────────────────────────────────────────────────

function enforceImageSize() {
  return (req, res, next) => {
    const maxMB = req.saas?.plan?.maxImageSize
    if (!maxMB || maxMB <= 0) return next()

    // SUPER_ADMIN bypass
    if (req.saas?.user?.systemRole === 'SUPER_ADMIN') return next()

    const maxBytes = maxMB * 1024 * 1024

    // Check single file
    if (req.file && req.file.size > maxBytes) {
      return res.status(ERROR.IMAGE_TOO_LARGE.status).json({
        code: ERROR.IMAGE_TOO_LARGE.code,
        message: `Image exceeds your plan limit of ${maxMB}MB.`,
        maxSizeMB: maxMB,
      })
    }

    // Check multiple files (req.files can be an object of arrays)
    if (req.files) {
      const fileArrays = Array.isArray(req.files)
        ? [req.files]
        : Object.values(req.files)

      for (const files of fileArrays) {
        if (!Array.isArray(files)) continue
        for (const f of files) {
          if (f.size > maxBytes) {
            return res.status(ERROR.IMAGE_TOO_LARGE.status).json({
              code: ERROR.IMAGE_TOO_LARGE.code,
              message: `Image "${f.originalname}" (${(f.size / 1024 / 1024).toFixed(1)}MB) exceeds your plan limit of ${maxMB}MB.`,
              maxSizeMB: maxMB,
            })
          }
        }
      }
    }

    return next()
  }
}

// ──────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────

function secondsUntilMidnight() {
  const now = new Date()
  const midnight = new Date(now)
  midnight.setHours(24, 0, 0, 0)
  return Math.ceil((midnight - now) / 1000)
}

module.exports = { enforceUsage, enforceImageSize, ERROR }
