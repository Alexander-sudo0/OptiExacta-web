/**
 * tenantContext — Loads user + tenant context into req.saas
 *
 * SECURITY RULES:
 *  1. Auto-provisions new User + Tenant + TenantUser on first login
 *  2. Checks isBanned / isSuspended and blocks immediately
 *  3. Records signup IP + user-agent for multi-account detection
 *  4. Updates lastLoginAt / loginCount
 *  5. If trial expired, auto-flips status to PAST_DUE
 *
 * After this middleware:
 *   req.saas = { user, tenant, role, plan }
 */

function addDays(date, days) {
  const r = new Date(date)
  r.setDate(r.getDate() + days)
  return r
}

function deriveTenantName(email) {
  if (!email) return 'New Tenant'
  return `${email.split('@')[0]}-tenant`
}

function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim()
    || req.ip
    || req.connection?.remoteAddress
    || null
}

function attachTenantContext(prisma) {
  return async (req, res, next) => {
    const { uid, email, provider } = req.auth
    const ip = getClientIp(req)
    const ua = req.headers['user-agent'] || null

    // ----------------------------------------------------------------
    // 1. Look up existing user
    // ----------------------------------------------------------------
    let user = await prisma.user.findUnique({
      where: { firebaseUid: uid },
      include: {
        tenants: {
          include: { tenant: { include: { plan: true } } },
        },
      },
    })

    // ----------------------------------------------------------------
    // 2. Auto-provision on first login
    // ----------------------------------------------------------------
    if (!user) {
      const plan = await prisma.plan.findUnique({ where: { code: 'FREE' } })
      if (!plan) return res.status(500).json({ error: 'default_plan_missing' })

      const tenant = await prisma.tenant.create({
        data: {
          name: deriveTenantName(email),
          planId: plan.id,
          trialEndsAt: addDays(new Date(), plan.trialDays),
          subscriptionStatus: 'TRIAL',
        },
      })

      user = await prisma.user.create({
        data: {
          firebaseUid: uid,
          email,
          provider,
          signupIp: ip,
          signupUserAgent: ua,
        },
        include: {
          tenants: {
            include: { tenant: { include: { plan: true } } },
          },
        },
      })

      await prisma.tenantUser.create({
        data: { tenantId: tenant.id, userId: user.id, role: 'MEMBER' },
      })

      // Re-fetch with tenant included
      user = await prisma.user.findUnique({
        where: { id: user.id },
        include: {
          tenants: {
            include: { tenant: { include: { plan: true } } },
          },
        },
      })
    }

    // ----------------------------------------------------------------
    // 3. Block banned / suspended users
    // ----------------------------------------------------------------
    if (user.isBanned) {
      return res.status(403).json({ error: 'account_banned', message: user.banReason || 'Your account has been banned' })
    }
    if (user.isSuspended) {
      return res.status(403).json({ error: 'account_suspended', message: user.suspendReason || 'Your account has been suspended' })
    }

    // ----------------------------------------------------------------
    // 4. Resolve tenant
    // ----------------------------------------------------------------
    const tenantLink = user.tenants[0]
    if (!tenantLink) {
      return res.status(500).json({ error: 'tenant_membership_missing' })
    }

    const { tenant } = tenantLink
    const plan = tenant.plan

    // ----------------------------------------------------------------
    // 5. Auto-expire trial
    // ----------------------------------------------------------------
    if (tenant.subscriptionStatus === 'TRIAL' && tenant.trialEndsAt < new Date()) {
      await prisma.tenant.update({
        where: { id: tenant.id },
        data: { subscriptionStatus: 'PAST_DUE' },
      })
      tenant.subscriptionStatus = 'PAST_DUE'
    }

    // ----------------------------------------------------------------
    // 6. Track login activity (fire-and-forget)
    //    Only count as a new login if there has been no activity in the
    //    last 30 minutes — avoids inflating the count on every API call.
    // ----------------------------------------------------------------
    const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000)
    const isNewSession = !user.lastLoginAt || user.lastLoginAt < thirtyMinsAgo
    prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        ...(isNewSession ? { loginCount: { increment: 1 } } : {}),
      },
    }).catch(() => {})

    // ----------------------------------------------------------------
    // 7. Set context
    // ----------------------------------------------------------------
    req.saas = { user, tenant, role: tenantLink.role, plan }
    return next()
  }
}

module.exports = { attachTenantContext }
