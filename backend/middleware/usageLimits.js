const { getRedisClient } = require('../lib/redis')

function secondsUntilUtcMidnight() {
  const now = new Date()
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1))
  return Math.max(1, Math.floor((end - now) / 1000))
}

function enforceUsage(prisma, options) {
  const { featureKey, allowColumn } = options

  return async (req, res, next) => {
    const { tenant, plan } = req.saas

    if (!plan) {
      return res.status(500).json({ error: 'plan_missing' })
    }

    const now = new Date()
    if (tenant.subscriptionStatus === 'TRIAL' && tenant.trialEndsAt < now) {
      return res.status(403).json({ error: 'trial_expired' })
    }

    if (tenant.subscriptionStatus !== 'TRIAL' && tenant.subscriptionStatus !== 'ACTIVE') {
      return res.status(403).json({ error: 'subscription_inactive' })
    }

    if (!plan[allowColumn]) {
      return res.status(403).json({ error: 'feature_not_available' })
    }

    const dailyLimit = plan.dailyRequestLimit
    if (dailyLimit === null || dailyLimit === undefined) {
      return res.status(403).json({ error: 'plan_limit_missing' })
    }

    if (dailyLimit === 0) {
      return next()
    }

    let redis
    try {
      redis = await getRedisClient()
    } catch (error) {
      return res.status(500).json({ error: 'redis_not_configured' })
    }

    const dayKey = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const key = `usage:${tenant.id}:${featureKey}:${dayKey}`
    const count = await redis.incr(key)

    if (count === 1) {
      await redis.expire(key, secondsUntilUtcMidnight())
    }

    if (count > dailyLimit) {
      return res.status(429).json({ error: 'rate_limit_exceeded' })
    }

    return next()
  }
}

module.exports = {
  enforceUsage
}
