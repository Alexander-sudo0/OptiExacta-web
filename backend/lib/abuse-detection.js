/**
 * abuse-detection — Periodic background scanner for suspicious activity
 *
 * Scans:
 *   1. Rate-limit violations (count from Redis burst/rate keys)
 *   2. High API usage spikes (compare current month vs. plan limit)
 *   3. Multiple signups from same IP (query signup tracking in Redis)
 *   4. Excessive 4xx/5xx error rates (from AuditLog)
 *
 * Creates AbuseFlag records with severity LOW / MEDIUM / HIGH / CRITICAL.
 *
 * Exports:
 *   runAbuseScan(prisma)                 — One-off scan
 *   startAbuseScanner(prisma, interval)  — Recurring interval (ms)
 */

const { getRedisClient } = require('./redis')

/**
 * Run a single abuse scan pass.
 */
async function runAbuseScan(prisma) {
  const now = new Date()
  const flags = []

  try {
    // ----------------------------------------------------------------
    // 1. Users with high error rates in last 24 hours
    // ----------------------------------------------------------------
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    const errorHeavy = await prisma.$queryRaw`
      SELECT "userId", COUNT(*) as cnt
      FROM "AuditLog"
      WHERE action = 'API_CALL'
        AND "timestamp" > ${oneDayAgo}
        AND detail::text LIKE '%"status":4%'
      GROUP BY "userId"
      HAVING COUNT(*) > 100
    `.catch(() => [])

    for (const row of errorHeavy) {
      if (row.userId) {
        flags.push({
          userId: row.userId,
          reason: `High client-error rate: ${row.cnt} 4xx responses in 24h`,
          severity: Number(row.cnt) > 500 ? 'HIGH' : 'MEDIUM',
        })
      }
    }

    // ----------------------------------------------------------------
    // 2. Users exceeding 80% of their plan limit
    // ----------------------------------------------------------------
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const tenants = await prisma.tenant.findMany({
      where: { subscriptionStatus: { in: ['ACTIVE', 'TRIAL'] } },
      include: { plan: true, users: { include: { user: true } } },
    })

    let redis
    try {
      redis = await getRedisClient()
    } catch {
      redis = null
    }

    for (const t of tenants) {
      const limit = t.plan?.monthlyRequestLimit
      if (!limit || !redis) continue

      const key = `usage:tenant:${t.id}:month:${ym}`
      const current = Number(await redis.get(key)) || 0

      if (current > limit) {
        const userId = t.users[0]?.user?.id
        flags.push({
          userId,
          tenantId: t.id,
          reason: `Usage over limit: ${current}/${limit} (${Math.round(current / limit * 100)}%)`,
          severity: 'HIGH',
        })
      } else if (current > limit * 0.9) {
        const userId = t.users[0]?.user?.id
        flags.push({
          userId,
          tenantId: t.id,
          reason: `Usage at 90%+: ${current}/${limit}`,
          severity: 'LOW',
        })
      }
    }

    // ----------------------------------------------------------------
    // 3. Multiple signups from same IP (check signupIp duplicates)
    // ----------------------------------------------------------------
    const dupSignups = await prisma.$queryRaw`
      SELECT "signupIp", COUNT(*) as cnt
      FROM "User"
      WHERE "signupIp" IS NOT NULL
        AND "createdAt" > ${oneDayAgo}
      GROUP BY "signupIp"
      HAVING COUNT(*) > 3
    `.catch(() => [])

    for (const row of dupSignups) {
      // Find users with that IP
      const users = await prisma.user.findMany({ where: { signupIp: row.signupIp } })
      for (const u of users) {
        flags.push({
          userId: u.id,
          reason: `Multiple signups from IP ${row.signupIp}: ${row.cnt} accounts in 24h`,
          severity: Number(row.cnt) > 10 ? 'CRITICAL' : 'HIGH',
        })
      }
    }

    // ----------------------------------------------------------------
    // 4. Rate-limit hit count in last 24h
    // ----------------------------------------------------------------
    const rlHits = await prisma.$queryRaw`
      SELECT "userId", COUNT(*) as cnt
      FROM "AuditLog"
      WHERE action = 'RATE_LIMIT_HIT'
        AND "timestamp" > ${oneDayAgo}
      GROUP BY "userId"
      HAVING COUNT(*) > 20
    `.catch(() => [])

    for (const row of rlHits) {
      if (row.userId) {
        flags.push({
          userId: row.userId,
          reason: `${row.cnt} rate-limit hits in 24h`,
          severity: Number(row.cnt) > 100 ? 'HIGH' : 'MEDIUM',
        })
      }
    }

    // ----------------------------------------------------------------
    // Write flags (skip duplicates by checking recent flags)
    // ----------------------------------------------------------------
    for (const f of flags) {
      if (!f.userId) continue

      // Check if a similar flag was created in the last 24h
      const existing = await prisma.abuseFlag.findFirst({
        where: {
          userId: f.userId,
          reason: f.reason,
          createdAt: { gt: oneDayAgo },
        },
      })

      if (!existing) {
        await prisma.abuseFlag.create({
          data: {
            userId: f.userId,
            tenantId: f.tenantId || null,
            reason: f.reason,
            severity: f.severity,
          },
        }).catch(err => console.error('[abuse-detection] Failed to create flag:', err.message))
      }
    }

    console.log(`[abuse-detection] Scan complete. ${flags.length} potential flags evaluated.`)
    return flags
  } catch (err) {
    console.error('[abuse-detection] Scan failed:', err.message)
    return []
  }
}

/**
 * Start recurring abuse scanner.
 *
 * @param {PrismaClient} prisma
 * @param {number} intervalMs — default: 10 minutes
 * @returns {NodeJS.Timeout} — clearInterval handle
 */
function startAbuseScanner(prisma, intervalMs = 10 * 60 * 1000) {
  console.log(`[abuse-detection] Scanner started (interval: ${intervalMs / 1000}s)`)
  // Run once immediately, then on interval
  runAbuseScan(prisma).catch(() => {})
  return setInterval(() => runAbuseScan(prisma).catch(() => {}), intervalMs)
}

module.exports = { runAbuseScan, startAbuseScanner }
