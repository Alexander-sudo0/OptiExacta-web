/**
 * adminAuth — RBAC enforcement for admin routes
 *
 * Exports:
 *   requireSuperAdmin  — Only SUPER_ADMIN
 *   requireAdmin       — SUPER_ADMIN or ADMIN
 *   blockRestricted    — Block suspended / banned users (mount early in chain)
 */

function requireSuperAdmin(req, res, next) {
  const role = req.saas?.user?.systemRole
  if (role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'forbidden', message: 'Super-admin access required' })
  }
  return next()
}

function requireAdmin(req, res, next) {
  const role = req.saas?.user?.systemRole
  if (role !== 'SUPER_ADMIN' && role !== 'ADMIN') {
    return res.status(403).json({ error: 'forbidden', message: 'Admin access required' })
  }
  return next()
}

/**
 * blockRestricted — mount BEFORE all authenticated routes.
 * SUPER_ADMIN is never blocked (prevents self-lockout).
 */
function blockRestricted(req, res, next) {
  const user = req.saas?.user
  if (!user) return next() // no context yet — let downstream handle

  // SUPER_ADMIN bypass — never blocked
  if (user.systemRole === 'SUPER_ADMIN') return next()

  if (user.isBanned) {
    return res.status(403).json({
      error: 'account_banned',
      message: user.banReason || 'Your account has been banned',
    })
  }
  if (user.isSuspended) {
    return res.status(403).json({
      error: 'account_suspended',
      message: user.suspendReason || 'Your account has been suspended',
    })
  }
  return next()
}

module.exports = { requireSuperAdmin, requireAdmin, blockRestricted }
