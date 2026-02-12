const { getRedisClient } = require('../lib/redis')

function getMinuteKey() {
  return Math.floor(Date.now() / 60000)
}

function enforceRateLimits(options) {
  const { tenantPerMinute, ipPerMinute } = options

  return async (req, res, next) => {
    let redis
    try {
      redis = await getRedisClient()
    } catch (error) {
      return res.status(500).json({ error: 'redis_not_configured' })
    }

    const minute = getMinuteKey()
    const tenantId = req.saas && req.saas.tenant ? req.saas.tenant.id : 'unknown'
    const ip = req.ip || req.connection?.remoteAddress || 'unknown'

    const tenantKey = `rate:tenant:${tenantId}:${minute}`
    const ipKey = `rate:ip:${ip}:${minute}`

    const [tenantCount, ipCount] = await Promise.all([
      redis.incr(tenantKey),
      redis.incr(ipKey)
    ])

    if (tenantCount === 1) {
      await redis.expire(tenantKey, 120)
    }

    if (ipCount === 1) {
      await redis.expire(ipKey, 120)
    }

    if (tenantCount > tenantPerMinute) {
      return res.status(429).json({ error: 'tenant_rate_limit_exceeded' })
    }

    if (ipCount > ipPerMinute) {
      return res.status(429).json({ error: 'ip_rate_limit_exceeded' })
    }

    return next()
  }
}

module.exports = {
  enforceRateLimits
}
