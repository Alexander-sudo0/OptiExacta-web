/**
 * audit — Structured audit logging
 *
 * Writes to the AuditLog table for security-critical events.
 *
 * Exports:
 *   auditLog(prisma, { ... })        — Direct write (for explicit events)
 *   auditMiddleware(prisma)           — Express middleware (logs on res.finish)
 *                                       MUST be mounted BEFORE routes
 *
 * AuditAction enum values:
 *   LOGIN, LOGOUT, SIGNUP, PLAN_CHANGE, ROLE_CHANGE, USER_SUSPEND,
 *   USER_BAN, USER_DELETE, API_CALL, RATE_LIMIT_HIT, ADMIN_ACCESS,
 *   SETTINGS_CHANGE
 */

function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim()
    || req.ip
    || req.connection?.remoteAddress
    || null
}

/**
 * Direct audit log write.
 *
 * @param {PrismaClient} prisma
 * @param {Object}  params
 * @param {string}  params.action    — AuditAction enum value
 * @param {string}  [params.userId]  — User performing the action
 * @param {string}  [params.tenantId]
 * @param {string}  [params.targetUserId]
 * @param {string}  [params.ip]
 * @param {object}  [params.meta]    — Extra JSON metadata
 */
async function auditLog(prisma, { action, userId, tenantId, targetUserId, ip, meta }) {
  try {
    // Extract fields that have dedicated columns
    const method = meta?.method || null
    const endpoint = meta?.path || null
    const responseStatus = meta?.status || null
    const userAgent = meta?.userAgent || null

    // Merge targetUserId into meta if provided (AuditLog table has no targetUserId column)
    const mergedDetail = targetUserId
      ? { ...meta, targetUserId }
      : meta

    await prisma.auditLog.create({
      data: {
        action,
        userId:       userId       || null,
        tenantId:     tenantId     || null,
        ipAddress:    ip           || null,
        method,
        endpoint,
        responseStatus,
        userAgent,
        detail:       mergedDetail || null,
      },
    })
  } catch (err) {
    console.error('[audit] Failed to write audit log:', err.message)
  }
}

/**
 * auditMiddleware — logs every request on response finish.
 *
 * Mount BEFORE all routes:
 *   app.use(auditMiddleware(prisma))
 *   // ... then mount routes
 *
 * Only logs authenticated requests (req.saas must exist).
 * Skips health-check endpoints to reduce noise.
 */
function auditMiddleware(prisma) {
  const SKIP_PATHS = new Set(['/health', '/api/health', '/favicon.ico'])

  return (req, res, next) => {
    const start = Date.now()

    res.on('finish', () => {
      // Only log authenticated requests
      if (!req.saas?.user) return
      // Skip noise
      if (SKIP_PATHS.has(req.path)) return
      // Skip API-key requests — apiKeyAuth middleware logs these with apiKeyId
      if (req._isApiKeyRequest) return
      // Skip GET requests to reduce volume (optional — remove if you want full logging)
      // if (req.method === 'GET') return

      const duration = Date.now() - start
      const ip = getClientIp(req)

      auditLog(prisma, {
        action: 'API_CALL',
        userId: req.saas.user.id,
        tenantId: req.saas.tenant?.id,
        ip,
        meta: {
          method: req.method,
          path: req.originalUrl || req.path,
          status: res.statusCode,
          duration,
          userAgent: req.headers['user-agent'],
        },
      })

      // Also log rate-limit hits specifically
      if (res.statusCode === 429) {
        auditLog(prisma, {
          action: 'RATE_LIMIT_HIT',
          userId: req.saas.user.id,
          tenantId: req.saas.tenant?.id,
          ip,
          meta: {
            path: req.originalUrl || req.path,
          },
        })
      }
    })

    next()
  }
}

module.exports = { auditLog, auditMiddleware }
