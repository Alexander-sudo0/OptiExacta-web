/**
 * subscription — Subscription lifecycle state machine
 *
 * Valid transitions:
 *   TRIAL       → ACTIVE (payment received)
 *   TRIAL       → PAST_DUE (trial expired, auto via tenantContext)
 *   TRIAL       → CANCELED (user cancels during trial)
 *   ACTIVE      → PAST_DUE (payment failed)
 *   ACTIVE      → CANCELED (user cancels)
 *   ACTIVE      → SUSPENDED (admin action)
 *   PAST_DUE    → ACTIVE (payment recovered)
 *   PAST_DUE    → CANCELED (grace period expired / user cancels)
 *   PAST_DUE    → SUSPENDED (admin action)
 *   SUSPENDED   → ACTIVE (admin reinstates)
 *   CANCELED    → ACTIVE (user re-subscribes with payment)
 *   CANCELED    → TRIAL (admin grants new trial)
 *
 * Exports:
 *   transitionSubscription(prisma, redis, tenantId, newStatus, opts?)
 *   isValidTransition(from, to)
 *   VALID_TRANSITIONS
 */

const VALID_TRANSITIONS = {
  TRIAL:     ['ACTIVE', 'PAST_DUE', 'CANCELED'],
  ACTIVE:    ['PAST_DUE', 'CANCELED', 'SUSPENDED'],
  PAST_DUE:  ['ACTIVE', 'CANCELED', 'SUSPENDED'],
  SUSPENDED: ['ACTIVE'],
  CANCELED:  ['ACTIVE', 'TRIAL'],
}

function isValidTransition(from, to) {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false
}

/**
 * Perform a subscription status transition with side-effects:
 *   - Validates the transition
 *   - Updates the tenant record
 *   - Optiionally updates trialEndsAt / planId
 *   - Invalidates Redis usage cache on plan change
 *   - Returns { ok, tenant, error? }
 */
async function transitionSubscription(prisma, redis, tenantId, newStatus, opts = {}) {
  const { newPlanCode, trialDays, reason, adminUserId } = opts

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: { plan: true },
  })
  if (!tenant) {
    return { ok: false, error: 'Tenant not found' }
  }

  const from = tenant.subscriptionStatus
  if (!isValidTransition(from, newStatus)) {
    return {
      ok: false,
      error: `Invalid transition: ${from} → ${newStatus}`,
      validTargets: VALID_TRANSITIONS[from] || [],
    }
  }

  const updateData = { subscriptionStatus: newStatus }

  // Handle plan change
  if (newPlanCode) {
    const plan = await prisma.plan.findUnique({ where: { code: newPlanCode } })
    if (!plan) return { ok: false, error: `Plan '${newPlanCode}' not found` }
    updateData.planId = plan.id
  }

  // Handle trial grant
  if (newStatus === 'TRIAL' && trialDays) {
    const trialEnd = new Date()
    trialEnd.setDate(trialEnd.getDate() + trialDays)
    updateData.trialEndsAt = trialEnd
  }

  const updated = await prisma.tenant.update({
    where: { id: tenantId },
    data: updateData,
    include: { plan: true },
  })

  // Invalidate Redis usage cache when plan changes
  if (redis && newPlanCode) {
    try {
      const now = new Date()
      const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      const today = now.toISOString().slice(0, 10)

      const keysToDelete = [
        `usage:tenant:${tenantId}:month:${ym}`,
        `usage:tenant:${tenantId}:day:${today}`,
        `video:tenant:${tenantId}:month:${ym}`,
      ]
      await redis.del(keysToDelete)
    } catch (err) {
      console.error('[subscription] Redis cache invalidation failed:', err.message)
    }
  }

  return { ok: true, tenant: updated, from, to: newStatus }
}

module.exports = { transitionSubscription, isValidTransition, VALID_TRANSITIONS }
