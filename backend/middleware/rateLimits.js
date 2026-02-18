/**
 * rateLimits — Per-tenant and per-IP rate limiting via Redis
 *
 * Strategies:
 *   1. Per-tenant per-minute  (sliding window via Redis INCR + TTL)
 *   2. Per-IP per-hour        (prevents anonymous abuse)
 *   3. Signup-specific        (max signups per IP per day)
 *   4. IP burst detection     (flags rapid-fire requests)
 *
 * Exports:
 *   enforceRateLimits(options?)   → Express middleware
 *   signupRateLimit()             → Express middleware for signup endpoints
 */

const { getRedisClient } = require('../lib/redis')

function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim()
    || req.ip
    || req.connection?.remoteAddress
    || '0.0.0.0'
}

function currentMinute() {
  return Math.floor(Date.now() / 60_000)
}
function currentHour() {
  return Math.floor(Date.now() / 3_600_000)
}
function currentDay() {
  return new Date().toISOString().slice(0, 10) // YYYY-MM-DD
}

/**
 * enforceRateLimits — per-tenant + per-IP limits
 *
 * @param {Object} options
 * @param {number} options.tenantPerMinute  — max requests / tenant / minute  (default 60)
 * @param {number} options.ipPerHour        — max requests / IP / hour        (default 300)
 * @param {number} options.burstPerSecond   — burst detection threshold / IP  (default 20)
 */
function enforceRateLimits(options = {}) {
  const tenantPerMinute = options.tenantPerMinute ?? 60
  const ipPerHour       = options.ipPerHour       ?? 300
  const burstPerSecond  = options.burstPerSecond   ?? 20

  return async (req, res, next) => {
    const ip = getClientIp(req)
    let redis
    try {
      redis = await getRedisClient()
    } catch {
      // Redis down → fail open
      return next()
    }

    try {
      // ----- Per-IP per-hour -----
      const ipKey = `rate:ip:${ip}:${currentHour()}`
      const ipCount = await redis.incr(ipKey)
      if (ipCount === 1) await redis.expire(ipKey, 3700) // slightly > 1 hour
      if (ipCount > ipPerHour) {
        return res.status(429).json({
          code: 'IP_RATE_LIMIT',
          message: 'Too many requests from this IP. Try again later.',
          retryAfterSeconds: 60,
        })
      }

      // ----- Burst detection (per-IP per-second) -----
      const burstKey = `rate:burst:${ip}:${Math.floor(Date.now() / 1000)}`
      const burstCount = await redis.incr(burstKey)
      if (burstCount === 1) await redis.expire(burstKey, 5)
      if (burstCount > burstPerSecond) {
        return res.status(429).json({
          code: 'BURST_DETECTED',
          message: 'Request rate too high. Slow down.',
          retryAfterSeconds: 5,
        })
      }

      // ----- Per-tenant per-minute (only if authenticated) -----
      const tenantId = req.saas?.tenant?.id
      if (tenantId) {
        const tKey = `rate:tenant:${tenantId}:${currentMinute()}`
        const tCount = await redis.incr(tKey)
        if (tCount === 1) await redis.expire(tKey, 120)
        if (tCount > tenantPerMinute) {
          return res.status(429).json({
            code: 'TENANT_RATE_LIMIT',
            message: 'Rate limit exceeded. Try again shortly.',
            retryAfterSeconds: 30,
          })
        }
      }
    } catch (err) {
      console.error('[rateLimits] Redis error, failing open:', err.message)
    }

    return next()
  }
}

/**
 * signupRateLimit — restrict signups per IP per day
 *
 * @param {number} maxPerDay — default 5
 */
function signupRateLimit(maxPerDay = 5) {
  return async (req, res, next) => {
    const ip = getClientIp(req)
    let redis
    try {
      redis = await getRedisClient()
    } catch {
      return next()
    }

    try {
      const key = `signup:ip:${ip}:${currentDay()}`
      const count = await redis.incr(key)
      if (count === 1) await redis.expire(key, 86_400)
      if (count > maxPerDay) {
        return res.status(429).json({
          code: 'SIGNUP_RATE_LIMIT',
          message: 'Too many signup attempts from this IP. Try again tomorrow.',
        })
      }
    } catch {
      // fail open
    }

    return next()
  }
}

module.exports = { enforceRateLimits, signupRateLimit }
