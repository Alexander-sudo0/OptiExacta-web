/**
 * Admin API Routes
 *
 * All routes are protected by verifyAuth + attachTenantContext + requireSuperAdmin.
 * Every mutating action is audit-logged.
 */

const express = require('express')
const { v4: uuidv4 } = require('uuid')
const { auditLog } = require('../lib/audit')
const { runAbuseScan } = require('../lib/abuse-detection')
const { getRedisClient } = require('../lib/redis')

function createAdminRouter(prisma) {
  const router = express.Router()

  // ========================================================================
  // ADMIN AUDIT — log every admin request with IP + userAgent
  // ========================================================================
  router.use((req, res, next) => {
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || null
    const userAgent = req.headers['user-agent'] || null

    auditLog(prisma, {
      action: 'ADMIN_ACCESS',
      userId: req.saas?.user?.id,
      tenantId: req.saas?.tenant?.id,
      ip,
      meta: {
        method: req.method,
        path: req.originalUrl || req.path,
        userAgent,
      },
    })

    // Track last admin IP for anomaly detection
    if (req.saas?.user?.id) {
      prisma.user.update({
        where: { id: req.saas.user.id },
        data: { lastLoginAt: new Date() },
      }).catch(() => {})
    }

    next()
  })

  // ========================================================================
  // DASHBOARD STATS  (GET /api/admin/stats)
  // ========================================================================
  router.get('/stats', async (req, res) => {
    try {
      const now = new Date()
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

      const [
        totalUsers,
        activeUsers,
        suspendedUsers,
        bannedUsers,
        planCounts,
        subStatusCounts,
        apiCallsToday,
        apiCallsMonth,
        recentSignups,
        abuseFlags,
      ] = await Promise.all([
        // Total users
        prisma.user.count(),
        // Active (not suspended, not banned, logged in last 30 days)
        prisma.user.count({
          where: {
            isSuspended: false,
            isBanned: false,
            lastLoginAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          },
        }),
        // Suspended
        prisma.user.count({ where: { isSuspended: true } }),
        // Banned
        prisma.user.count({ where: { isBanned: true } }),
        // Users by plan (via tenant)
        prisma.$queryRaw`
          SELECT p.code, p.name, COUNT(DISTINCT u.id)::int as count
          FROM "User" u
          JOIN "TenantUser" tu ON tu."userId" = u.id
          JOIN "Tenant" t ON t.id = tu."tenantId"
          JOIN "Plan" p ON p.id = t."planId"
          GROUP BY p.code, p.name
          ORDER BY p.code
        `,
        // Subscription status counts
        prisma.$queryRaw`
          SELECT "subscriptionStatus" as status, COUNT(*)::int as count
          FROM "Tenant"
          GROUP BY "subscriptionStatus"
        `,
        // API calls today
        prisma.auditLog.count({
          where: { action: 'API_CALL', timestamp: { gte: todayStart } },
        }),
        // API calls this month
        prisma.auditLog.count({
          where: { action: 'API_CALL', timestamp: { gte: monthStart } },
        }),
        // Recent signups (last 7 days)
        prisma.user.count({
          where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
        }),
        // Unresolved abuse flags
        prisma.abuseFlag.count({ where: { resolved: false } }),
      ])

      // Usage trend (daily API calls for last 14 days)
      const usageTrend = await prisma.$queryRaw`
        SELECT 
          DATE("timestamp") as date,
          COUNT(*)::int as calls
        FROM "AuditLog"
        WHERE action = 'API_CALL' AND "timestamp" >= ${new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)}
        GROUP BY DATE("timestamp")
        ORDER BY date ASC
      `

      // Revenue summary (based on plan pricing * active tenants)
      const revenueData = await prisma.$queryRaw`
        SELECT 
          p.code,
          p."priceMonthly",
          COUNT(DISTINCT t.id)::int as active_tenants,
          (p."priceMonthly" * COUNT(DISTINCT t.id))::float as monthly_revenue
        FROM "Plan" p
        JOIN "Tenant" t ON t."planId" = p.id
        WHERE t."subscriptionStatus" IN ('ACTIVE', 'TRIAL')
        GROUP BY p.code, p."priceMonthly"
      `

      const totalRevenue = revenueData.reduce((sum, r) => sum + (r.monthly_revenue || 0), 0)

      res.json({
        users: {
          total: totalUsers,
          active: activeUsers,
          suspended: suspendedUsers,
          banned: bannedUsers,
          recentSignups,
        },
        plans: planCounts,
        subscriptions: subStatusCounts,
        apiCalls: {
          today: apiCallsToday,
          month: apiCallsMonth,
        },
        revenue: {
          monthly: totalRevenue,
          breakdown: revenueData,
        },
        usageTrend,
        abuseFlags,
      })
    } catch (error) {
      console.error('Admin stats error:', error.message)
      res.status(500).json({ error: 'Failed to fetch admin stats' })
    }
  })

  // ========================================================================
  // USER LIST  (GET /api/admin/users)
  // ========================================================================
  router.get('/users', async (req, res) => {
    try {
      const {
        page = 1,
        limit = 25,
        plan,
        status,       // active, suspended, banned
        role,         // SUPER_ADMIN, ADMIN, USER
        search,       // email search
        sort = 'createdAt',
        order = 'desc',
      } = req.query

      const where = {}

      if (status === 'suspended') where.isSuspended = true
      else if (status === 'banned') where.isBanned = true
      else if (status === 'active') {
        where.isSuspended = false
        where.isBanned = false
      }

      if (role) where.systemRole = role

      if (search) {
        where.email = { contains: search, mode: 'insensitive' }
      }

      // Filter by plan requires a join
      let planFilter = undefined
      if (plan) {
        planFilter = plan
      }

      const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10)
      const take = parseInt(limit, 10)

      const orderBy = {}
      orderBy[sort] = order === 'asc' ? 'asc' : 'desc'

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          skip,
          take,
          orderBy,
          include: {
            tenants: {
              include: {
                tenant: {
                  include: { plan: true },
                },
              },
            },
          },
        }),
        prisma.user.count({ where }),
      ])

      // Post-filter by plan if needed
      let filtered = users
      if (planFilter) {
        filtered = users.filter(u =>
          u.tenants.some(tu => tu.tenant.plan.code === planFilter)
        )
      }

      const result = filtered.map(u => ({
        id: u.id,
        firebaseUid: u.firebaseUid,
        email: u.email,
        provider: u.provider,
        systemRole: u.systemRole,
        isSuspended: u.isSuspended,
        isBanned: u.isBanned,
        suspendReason: u.suspendReason,
        banReason: u.banReason,
        lastLoginAt: u.lastLoginAt,
        loginCount: u.loginCount,
        createdAt: u.createdAt,
        tenant: u.tenants[0] ? {
          id: u.tenants[0].tenant.id,
          name: u.tenants[0].tenant.name,
          role: u.tenants[0].role,
          plan: u.tenants[0].tenant.plan.code,
          planName: u.tenants[0].tenant.plan.name,
          subscriptionStatus: u.tenants[0].tenant.subscriptionStatus,
          trialEndsAt: u.tenants[0].tenant.trialEndsAt,
        } : null,
      }))

      res.json({
        users: result,
        pagination: {
          total,
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
          totalPages: Math.ceil(total / take),
        },
      })
    } catch (error) {
      console.error('Admin users list error:', error.message)
      res.status(500).json({ error: 'Failed to fetch users' })
    }
  })

  // ========================================================================
  // GET SINGLE USER  (GET /api/admin/users/:id)
  // ========================================================================
  router.get('/users/:id', async (req, res) => {
    try {
      const userId = parseInt(req.params.id, 10)
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          tenants: {
            include: {
              tenant: { include: { plan: true } },
            },
          },
          faceSearchRequests: {
            take: 10,
            orderBy: { createdAt: 'desc' },
            select: { id: true, type: true, status: true, createdAt: true },
          },
        },
      })

      if (!user) {
        return res.status(404).json({ error: 'User not found' })
      }

      // Get usage stats
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)

      const [apiCallsToday, totalRequests, abuseFlags] = await Promise.all([
        prisma.auditLog.count({
          where: { userId: user.id, action: 'API_CALL', timestamp: { gte: todayStart } },
        }),
        prisma.faceSearchRequest.count({ where: { userId: user.id } }),
        prisma.abuseFlag.findMany({
          where: { userId: user.id },
          orderBy: { createdAt: 'desc' },
          take: 10,
        }),
      ])

      res.json({
        ...user,
        stats: {
          apiCallsToday,
          totalRequests,
          abuseFlags,
        },
      })
    } catch (error) {
      console.error('Admin get user error:', error.message)
      res.status(500).json({ error: 'Failed to fetch user' })
    }
  })

  // ========================================================================
  // CHANGE PLAN  (POST /api/admin/users/:id/change-plan)
  // ========================================================================
  router.post('/users/:id/change-plan', async (req, res) => {
    try {
      const userId = parseInt(req.params.id, 10)
      const { planCode } = req.body

      if (!planCode) {
        return res.status(400).json({ error: 'planCode is required' })
      }

      const plan = await prisma.plan.findUnique({ where: { code: planCode } })
      if (!plan) {
        return res.status(400).json({ error: 'Invalid plan code' })
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { tenants: { include: { tenant: true } } },
      })

      if (!user) return res.status(404).json({ error: 'User not found' })

      const tenantLink = user.tenants[0]
      if (!tenantLink) return res.status(400).json({ error: 'User has no tenant' })

      const oldPlan = tenantLink.tenant.planId

      await prisma.tenant.update({
        where: { id: tenantLink.tenant.id },
        data: {
          planId: plan.id,
          subscriptionStatus: plan.code === 'FREE' ? 'TRIAL' : 'ACTIVE',
        },
      })

      // Invalidate Redis usage cache so new limits take effect immediately
      try {
        const redis = await getRedisClient()
        const now = new Date()
        const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
        const today = now.toISOString().slice(0, 10)
        await redis.del([
          `usage:tenant:${tenantLink.tenant.id}:month:${ym}`,
          `usage:tenant:${tenantLink.tenant.id}:day:${today}`,
          `video:tenant:${tenantLink.tenant.id}:month:${ym}`,
        ])
      } catch (redisErr) {
        console.error('Redis cache invalidation failed (non-fatal):', redisErr.message)
      }

      await auditLog(prisma, {
        userId: req.saas.user.id,
        tenantId: tenantLink.tenant.id,
        action: 'PLAN_CHANGE',
        endpoint: req.path,
        method: 'POST',
        ip: req.ip,
        meta: { targetUserId: userId, oldPlanId: oldPlan, newPlanCode: planCode },
      })

      res.json({ success: true, message: `Plan changed to ${planCode}` })
    } catch (error) {
      console.error('Change plan error:', error.message)
      res.status(500).json({ error: 'Failed to change plan' })
    }
  })

  // ========================================================================
  // CHANGE ROLE  (POST /api/admin/users/:id/change-role)
  // ========================================================================
  router.post('/users/:id/change-role', async (req, res) => {
    try {
      const userId = parseInt(req.params.id, 10)
      const { systemRole } = req.body

      if (!['USER', 'ADMIN', 'SUPER_ADMIN'].includes(systemRole)) {
        return res.status(400).json({ error: 'Invalid systemRole' })
      }

      // Only SUPER_ADMIN can promote to SUPER_ADMIN
      if (systemRole === 'SUPER_ADMIN' && req.saas.user.systemRole !== 'SUPER_ADMIN') {
        return res.status(403).json({ error: 'Only SUPER_ADMIN can promote to SUPER_ADMIN' })
      }

      const user = await prisma.user.findUnique({ where: { id: userId } })
      if (!user) return res.status(404).json({ error: 'User not found' })

      // Prevent SUPER_ADMIN from demoting themselves
      if (userId === req.saas.user.id && req.saas.user.systemRole === 'SUPER_ADMIN' && systemRole !== 'SUPER_ADMIN') {
        return res.status(403).json({ error: 'SUPER_ADMIN cannot demote themselves' })
      }

      const oldRole = user.systemRole

      await prisma.user.update({
        where: { id: userId },
        data: { systemRole },
      })

      await auditLog(prisma, {
        userId: req.saas.user.id,
        action: 'ROLE_CHANGE',
        endpoint: req.path,
        method: 'POST',
        ip: req.ip,
        meta: { targetUserId: userId, oldRole, newRole: systemRole },
      })

      res.json({ success: true, message: `Role changed to ${systemRole}` })
    } catch (error) {
      console.error('Change role error:', error.message)
      res.status(500).json({ error: 'Failed to change role' })
    }
  })

  // ========================================================================
  // SUSPEND USER  (POST /api/admin/users/:id/suspend)
  // ========================================================================
  router.post('/users/:id/suspend', async (req, res) => {
    try {
      const userId = parseInt(req.params.id, 10)
      const { reason } = req.body || {}

      const user = await prisma.user.findUnique({ where: { id: userId } })
      if (!user) return res.status(404).json({ error: 'User not found' })

      // SUPER_ADMIN cannot be suspended
      if (user.systemRole === 'SUPER_ADMIN') {
        return res.status(403).json({ error: 'SUPER_ADMIN cannot be suspended' })
      }

      await prisma.user.update({
        where: { id: userId },
        data: {
          isSuspended: true,
          suspendedAt: new Date(),
          suspendReason: reason || 'Suspended by admin',
        },
      })

      // Also suspend their tenant
      const tenantLink = await prisma.tenantUser.findFirst({ where: { userId } })
      if (tenantLink) {
        await prisma.tenant.update({
          where: { id: tenantLink.tenantId },
          data: { subscriptionStatus: 'SUSPENDED' },
        })
      }

      await auditLog(prisma, {
        userId: req.saas.user.id,
        action: 'USER_SUSPEND',
        endpoint: req.path,
        method: 'POST',
        ip: req.ip,
        meta: { targetUserId: userId, reason },
      })

      res.json({ success: true, message: 'User suspended' })
    } catch (error) {
      console.error('Suspend user error:', error.message)
      res.status(500).json({ error: 'Failed to suspend user' })
    }
  })

  // ========================================================================
  // UNSUSPEND USER  (POST /api/admin/users/:id/unsuspend)
  // ========================================================================
  router.post('/users/:id/unsuspend', async (req, res) => {
    try {
      const userId = parseInt(req.params.id, 10)

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { tenants: { include: { tenant: { include: { plan: true } } } } },
      })
      if (!user) return res.status(404).json({ error: 'User not found' })

      await prisma.user.update({
        where: { id: userId },
        data: {
          isSuspended: false,
          suspendedAt: null,
          suspendReason: null,
        },
      })

      // Restore tenant status
      const tenantLink = user.tenants[0]
      if (tenantLink) {
        const plan = tenantLink.tenant.plan
        await prisma.tenant.update({
          where: { id: tenantLink.tenant.id },
          data: {
            subscriptionStatus: plan.code === 'FREE' ? 'TRIAL' : 'ACTIVE',
          },
        })
      }

      await auditLog(prisma, {
        userId: req.saas.user.id,
        action: 'USER_UNSUSPEND',
        endpoint: req.path,
        method: 'POST',
        ip: req.ip,
        meta: { targetUserId: userId },
      })

      res.json({ success: true, message: 'User unsuspended' })
    } catch (error) {
      console.error('Unsuspend user error:', error.message)
      res.status(500).json({ error: 'Failed to unsuspend user' })
    }
  })

  // ========================================================================
  // BAN USER  (POST /api/admin/users/:id/ban)
  // ========================================================================
  router.post('/users/:id/ban', async (req, res) => {
    try {
      const userId = parseInt(req.params.id, 10)
      const { reason } = req.body || {}

      const user = await prisma.user.findUnique({ where: { id: userId } })
      if (!user) return res.status(404).json({ error: 'User not found' })

      // SUPER_ADMIN cannot be banned
      if (user.systemRole === 'SUPER_ADMIN') {
        return res.status(403).json({ error: 'SUPER_ADMIN cannot be banned' })
      }

      await prisma.user.update({
        where: { id: userId },
        data: {
          isBanned: true,
          bannedAt: new Date(),
          banReason: reason || 'Banned by admin',
          isSuspended: false, // ban overrides suspend
        },
      })

      // Disable Firebase account
      try {
        const { admin, initializeFirebaseAdmin } = require('../lib/firebase-admin')
        initializeFirebaseAdmin()
        await admin.auth().updateUser(user.firebaseUid, { disabled: true })
        await admin.auth().revokeRefreshTokens(user.firebaseUid)
        console.log(`Firebase account disabled for UID: ${user.firebaseUid}`)
      } catch (fbErr) {
        console.error('Firebase ban error (non-fatal):', fbErr.message)
      }

      // Suspend tenant
      const tenantLink = await prisma.tenantUser.findFirst({ where: { userId } })
      if (tenantLink) {
        await prisma.tenant.update({
          where: { id: tenantLink.tenantId },
          data: { subscriptionStatus: 'CANCELED' },
        })
      }

      await auditLog(prisma, {
        userId: req.saas.user.id,
        action: 'USER_BAN',
        endpoint: req.path,
        method: 'POST',
        ip: req.ip,
        meta: { targetUserId: userId, reason },
      })

      res.json({ success: true, message: 'User banned and Firebase account disabled' })
    } catch (error) {
      console.error('Ban user error:', error.message)
      res.status(500).json({ error: 'Failed to ban user' })
    }
  })

  // ========================================================================
  // UNBAN USER  (POST /api/admin/users/:id/unban)
  // ========================================================================
  router.post('/users/:id/unban', async (req, res) => {
    try {
      const userId = parseInt(req.params.id, 10)

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { tenants: { include: { tenant: { include: { plan: true } } } } },
      })
      if (!user) return res.status(404).json({ error: 'User not found' })

      await prisma.user.update({
        where: { id: userId },
        data: {
          isBanned: false,
          bannedAt: null,
          banReason: null,
        },
      })

      // Re-enable Firebase account
      try {
        const { admin, initializeFirebaseAdmin } = require('../lib/firebase-admin')
        initializeFirebaseAdmin()
        await admin.auth().updateUser(user.firebaseUid, { disabled: false })
        console.log(`Firebase account re-enabled for UID: ${user.firebaseUid}`)
      } catch (fbErr) {
        console.error('Firebase unban error (non-fatal):', fbErr.message)
      }

      // Restore tenant
      const tenantLink = user.tenants[0]
      if (tenantLink) {
        const plan = tenantLink.tenant.plan
        await prisma.tenant.update({
          where: { id: tenantLink.tenant.id },
          data: {
            subscriptionStatus: plan.code === 'FREE' ? 'TRIAL' : 'ACTIVE',
          },
        })
      }

      await auditLog(prisma, {
        userId: req.saas.user.id,
        action: 'USER_UNBAN',
        endpoint: req.path,
        method: 'POST',
        ip: req.ip,
        meta: { targetUserId: userId },
      })

      res.json({ success: true, message: 'User unbanned' })
    } catch (error) {
      console.error('Unban user error:', error.message)
      res.status(500).json({ error: 'Failed to unban user' })
    }
  })

  // ========================================================================
  // EXTEND TRIAL  (POST /api/admin/users/:id/extend-trial)
  // ========================================================================
  router.post('/users/:id/extend-trial', async (req, res) => {
    try {
      const userId = parseInt(req.params.id, 10)
      const { days = 14 } = req.body || {}

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { tenants: { include: { tenant: true } } },
      })
      if (!user) return res.status(404).json({ error: 'User not found' })

      const tenantLink = user.tenants[0]
      if (!tenantLink) return res.status(400).json({ error: 'User has no tenant' })

      const current = tenantLink.tenant.trialEndsAt
      const newEnd = new Date(Math.max(current.getTime(), Date.now()) + days * 24 * 60 * 60 * 1000)

      await prisma.tenant.update({
        where: { id: tenantLink.tenant.id },
        data: {
          trialEndsAt: newEnd,
          subscriptionStatus: 'TRIAL',
        },
      })

      await auditLog(prisma, {
        userId: req.saas.user.id,
        action: 'TRIAL_EXTEND',
        endpoint: req.path,
        method: 'POST',
        ip: req.ip,
        meta: { targetUserId: userId, days, newTrialEnd: newEnd },
      })

      res.json({ success: true, message: `Trial extended by ${days} days`, trialEndsAt: newEnd })
    } catch (error) {
      console.error('Extend trial error:', error.message)
      res.status(500).json({ error: 'Failed to extend trial' })
    }
  })

  // ========================================================================
  // RESET USAGE  (POST /api/admin/users/:id/reset-usage)
  // ========================================================================
  router.post('/users/:id/reset-usage', async (req, res) => {
    try {
      const userId = parseInt(req.params.id, 10)

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { tenants: { include: { tenant: true } } },
      })
      if (!user) return res.status(404).json({ error: 'User not found' })

      const tenantLink = user.tenants[0]
      if (!tenantLink) return res.status(400).json({ error: 'User has no tenant' })

      // Clear Redis usage counters
      let deletedKeys = 0
      try {
        const redis = await getRedisClient()
        const pattern = `usage:${tenantLink.tenant.id}:*`
        const keys = []
        for await (const key of redis.scanIterator({ MATCH: pattern })) {
          keys.push(key)
        }
        if (keys.length > 0) {
          deletedKeys = await redis.del(keys)
        }

        // Also clear rate limit keys
        const rlPattern = `rate:tenant:${tenantLink.tenant.id}:*`
        const rlKeys = []
        for await (const key of redis.scanIterator({ MATCH: rlPattern })) {
          rlKeys.push(key)
        }
        if (rlKeys.length > 0) {
          deletedKeys += await redis.del(rlKeys)
        }
      } catch (redisErr) {
        console.error('Redis reset error (non-fatal):', redisErr.message)
      }

      await auditLog(prisma, {
        userId: req.saas.user.id,
        action: 'USAGE_RESET',
        endpoint: req.path,
        method: 'POST',
        ip: req.ip,
        meta: { targetUserId: userId, deletedRedisKeys: deletedKeys },
      })

      res.json({ success: true, message: 'Usage counters reset', deletedKeys })
    } catch (error) {
      console.error('Reset usage error:', error.message)
      res.status(500).json({ error: 'Failed to reset usage' })
    }
  })

  // ========================================================================
  // AUDIT LOGS  (GET /api/admin/audit-logs)
  // ========================================================================
  router.get('/audit-logs', async (req, res) => {
    try {
      const {
        page = 1,
        limit = 50,
        userId,
        tenantId,
        action,
        startDate,
        endDate,
        search,
        userEmail, // NEW: filter by user email
      } = req.query

      const where = {}

      // Filter by userId OR userEmail
      if (userId) {
        where.userId = parseInt(userId, 10)
      } else if (userEmail) {
        // Convert email to userId
        const user = await prisma.user.findFirst({
          where: { email: { contains: userEmail, mode: 'insensitive' } },
          select: { id: true },
        })
        if (user) where.userId = user.id
        else where.userId = -1 // No matching user, return empty results
      }

      if (tenantId) where.tenantId = parseInt(tenantId, 10)
      if (action) where.action = action

      if (startDate || endDate) {
        where.timestamp = {}
        if (startDate) where.timestamp.gte = new Date(startDate)
        if (endDate) where.timestamp.lte = new Date(endDate)
      }

      if (search) {
        where.OR = [
          { endpoint: { contains: search, mode: 'insensitive' } },
          { ipAddress: { contains: search } },
        ]
      }

      const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10)
      const take = parseInt(limit, 10)

      const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          skip,
          take,
          orderBy: { timestamp: 'desc' },
          include: {
            user: { select: { id: true, email: true, systemRole: true } },
          },
        }),
        prisma.auditLog.count({ where }),
      ])

      res.json({
        logs,
        pagination: {
          total,
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
          totalPages: Math.ceil(total / take),
        },
      })
    } catch (error) {
      console.error('Audit logs error:', error.message)
      res.status(500).json({ error: 'Failed to fetch audit logs' })
    }
  })

  // ========================================================================
  // ABUSE FLAGS  (GET /api/admin/abuse-flags)
  // ========================================================================
  router.get('/abuse-flags', async (req, res) => {
    try {
      const { resolved = 'false', severity, page = 1, limit = 25 } = req.query

      const where = {}
      if (resolved === 'false') where.resolved = false
      else if (resolved === 'true') where.resolved = true
      if (severity) where.severity = severity

      const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10)
      const take = parseInt(limit, 10)

      const [flags, total] = await Promise.all([
        prisma.abuseFlag.findMany({
          where,
          skip,
          take,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.abuseFlag.count({ where }),
      ])

      // Enrich flags with user info
      const userIds = [...new Set(flags.map(f => f.userId))]
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, email: true, systemRole: true },
      })
      const userMap = Object.fromEntries(users.map(u => [u.id, u]))

      const enriched = flags.map(f => ({
        ...f,
        user: userMap[f.userId] || null,
      }))

      res.json({
        flags: enriched,
        pagination: {
          total,
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
          totalPages: Math.ceil(total / take),
        },
      })
    } catch (error) {
      console.error('Abuse flags error:', error.message)
      res.status(500).json({ error: 'Failed to fetch abuse flags' })
    }
  })

  // ========================================================================
  // RESOLVE ABUSE FLAG  (POST /api/admin/abuse-flags/:id/resolve)
  // ========================================================================
  router.post('/abuse-flags/:id/resolve', async (req, res) => {
    try {
      const flag = await prisma.abuseFlag.findUnique({ where: { id: req.params.id } })
      if (!flag) return res.status(404).json({ error: 'Flag not found' })

      await prisma.abuseFlag.update({
        where: { id: req.params.id },
        data: {
          resolved: true,
          resolvedBy: req.saas.user.id,
          resolvedAt: new Date(),
        },
      })

      await auditLog(prisma, {
        userId: req.saas.user.id,
        action: 'ABUSE_FLAG',
        endpoint: req.path,
        method: 'POST',
        ip: req.ip,
        meta: { flagId: req.params.id, action: 'resolved' },
      })

      res.json({ success: true, message: 'Flag resolved' })
    } catch (error) {
      console.error('Resolve flag error:', error.message)
      res.status(500).json({ error: 'Failed to resolve flag' })
    }
  })

  // ========================================================================
  // RUN ABUSE SCAN  (POST /api/admin/abuse-scan)
  // ========================================================================
  router.post('/abuse-scan', async (req, res) => {
    try {
      const flags = await runAbuseScan(prisma)
      
      await auditLog(prisma, {
        userId: req.saas.user.id,
        action: 'ABUSE_FLAG',
        endpoint: req.path,
        method: 'POST',
        ip: req.ip,
        meta: { manual: true, newFlags: flags.length },
      })

      res.json({ success: true, newFlags: flags.length, flags })
    } catch (error) {
      console.error('Manual abuse scan error:', error.message)
      res.status(500).json({ error: 'Failed to run abuse scan' })
    }
  })

  // ========================================================================
  // PLANS LIST  (GET /api/admin/plans)
  // ========================================================================
  router.get('/plans', async (req, res) => {
    try {
      const plans = await prisma.plan.findMany({
        orderBy: { id: 'asc' },
        include: { _count: { select: { tenants: true } } },
      })
      res.json({ plans })
    } catch (error) {
      console.error('Admin plans error:', error.message)
      res.status(500).json({ error: 'Failed to fetch plans' })
    }
  })

  return router
}

module.exports = { createAdminRouter }
