function addDays(date, days) {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

function deriveTenantName(email) {
  if (!email) {
    return 'New Tenant'
  }
  const localPart = email.split('@')[0]
  return `${localPart}-tenant`
}

function attachTenantContext(prisma) {
  return async (req, res, next) => {
    const { uid, email, provider } = req.auth

    const user = await prisma.user.findUnique({
      where: { firebaseUid: uid },
      include: {
        tenants: {
          include: {
            tenant: {
              include: { plan: true }
            }
          }
        }
      }
    })

    if (!user) {
      const plan = await prisma.plan.findUnique({
        where: { code: 'FREE' }
      })

      if (!plan) {
        return res.status(500).json({ error: 'default_plan_missing' })
      }

      const tenant = await prisma.tenant.create({
        data: {
          name: deriveTenantName(email),
          planId: plan.id,
          trialEndsAt: addDays(new Date(), plan.trialDays),
          subscriptionStatus: 'TRIAL'
        }
      })

      const newUser = await prisma.user.create({
        data: {
          firebaseUid: uid,
          email,
          provider
        }
      })

      const tenantUser = await prisma.tenantUser.create({
        data: {
          tenantId: tenant.id,
          userId: newUser.id,
          role: 'ADMIN'
        }
      })

      req.saas = {
        user: newUser,
        tenant,
        role: tenantUser.role,
        plan
      }

      return next()
    }

    const tenantLink = user.tenants[0]
    if (!tenantLink) {
      return res.status(500).json({ error: 'tenant_membership_missing' })
    }

    req.saas = {
      user,
      tenant: tenantLink.tenant,
      role: tenantLink.role,
      plan: tenantLink.tenant.plan
    }

    return next()
  }
}

module.exports = {
  attachTenantContext
}
