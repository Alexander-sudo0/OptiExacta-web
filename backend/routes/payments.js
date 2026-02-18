/**
 * payments — Razorpay webhook + subscription management routes
 *
 * POST /webhook/razorpay          — Razorpay webhook (signature-validated)
 * POST /subscribe                 — Create subscription / checkout session
 * POST /cancel                    — Cancel current subscription
 * GET  /status                    — Get current subscription status + usage
 *
 * Environment:
 *   RAZORPAY_KEY_ID        — Razorpay key ID
 *   RAZORPAY_KEY_SECRET    — Razorpay key secret
 *   RAZORPAY_WEBHOOK_SECRET — Webhook signature secret
 */

const express = require('express')
const crypto = require('crypto')
const { transitionSubscription } = require('../lib/subscription')
const { getRedisClient } = require('../lib/redis')

function createPaymentRouter(prisma) {
  const router = express.Router()

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // RAZORPAY WEBHOOK (no auth — uses signature validation)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  router.post('/webhook/razorpay', express.raw({ type: 'application/json' }), async (req, res) => {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET
    if (!secret) {
      console.error('[payments] RAZORPAY_WEBHOOK_SECRET not configured')
      return res.status(500).json({ error: 'Webhook not configured' })
    }

    // Verify signature
    const signature = req.headers['x-razorpay-signature']
    if (!signature) {
      return res.status(400).json({ error: 'Missing signature' })
    }

    const body = typeof req.body === 'string' ? req.body : req.body.toString('utf8')
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex')

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      console.warn('[payments] Invalid webhook signature')
      return res.status(400).json({ error: 'Invalid signature' })
    }

    // Parse and handle event
    let event
    try {
      event = JSON.parse(body)
    } catch {
      return res.status(400).json({ error: 'Invalid JSON' })
    }

    const eventType = event.event
    const payload = event.payload

    console.log(`[payments] Webhook event: ${eventType}`)

    let redis
    try { redis = await getRedisClient() } catch { redis = null }

    try {
      switch (eventType) {
        // ──────────────────────────────────────────────────────────────
        // Payment captured → activate subscription
        // ──────────────────────────────────────────────────────────────
        case 'payment.captured': {
          const paymentEntity = payload?.payment?.entity
          const tenantId = Number(paymentEntity?.notes?.tenant_id)
          const planCode = paymentEntity?.notes?.plan_code

          if (!tenantId) {
            console.warn('[payments] payment.captured missing tenant_id in notes')
            break
          }

          const result = await transitionSubscription(prisma, redis, tenantId, 'ACTIVE', {
            newPlanCode: planCode || undefined,
            reason: `Razorpay payment ${paymentEntity?.id}`,
          })

          if (!result.ok) {
            console.warn(`[payments] Transition failed for tenant ${tenantId}:`, result.error)
          } else {
            console.log(`[payments] Tenant ${tenantId} activated (${result.from} → ACTIVE)`)
          }
          break
        }

        // ──────────────────────────────────────────────────────────────
        // Payment failed → mark as past due
        // ──────────────────────────────────────────────────────────────
        case 'payment.failed': {
          const paymentEntity = payload?.payment?.entity
          const tenantId = Number(paymentEntity?.notes?.tenant_id)

          if (!tenantId) break

          const result = await transitionSubscription(prisma, redis, tenantId, 'PAST_DUE', {
            reason: `Payment failed: ${paymentEntity?.error_description || 'unknown'}`,
          })

          if (result.ok) {
            console.log(`[payments] Tenant ${tenantId} → PAST_DUE (payment failed)`)
          }
          break
        }

        // ──────────────────────────────────────────────────────────────
        // Subscription cancelled
        // ──────────────────────────────────────────────────────────────
        case 'subscription.cancelled': {
          const subEntity = payload?.subscription?.entity
          const tenantId = Number(subEntity?.notes?.tenant_id)

          if (!tenantId) break

          const result = await transitionSubscription(prisma, redis, tenantId, 'CANCELED', {
            reason: 'Razorpay subscription cancelled',
          })

          if (result.ok) {
            console.log(`[payments] Tenant ${tenantId} → CANCELED`)
          }
          break
        }

        // ──────────────────────────────────────────────────────────────
        // Subscription authenticated / activated
        // ──────────────────────────────────────────────────────────────
        case 'subscription.activated': {
          const subEntity = payload?.subscription?.entity
          const tenantId = Number(subEntity?.notes?.tenant_id)
          const planCode = subEntity?.notes?.plan_code

          if (!tenantId) break

          const result = await transitionSubscription(prisma, redis, tenantId, 'ACTIVE', {
            newPlanCode: planCode || undefined,
            reason: 'Razorpay subscription activated',
          })

          if (result.ok) {
            console.log(`[payments] Tenant ${tenantId} activated via subscription`)
          }
          break
        }

        default:
          console.log(`[payments] Unhandled webhook event: ${eventType}`)
      }
    } catch (err) {
      console.error(`[payments] Error processing webhook ${eventType}:`, err.message)
      // Still return 200 to prevent Razorpay retries on our errors
    }

    // Always acknowledge receipt
    res.json({ ok: true })
  })

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // GET /status — Current subscription + usage for authenticated user
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  router.get('/status', async (req, res) => {
    const { tenant, plan, user } = req.saas || {}
    if (!tenant || !plan) {
      return res.status(500).json({ code: 'CONTEXT_MISSING', message: 'Tenant context not loaded.' })
    }

    // Gather Redis usage counts
    let monthUsage = 0, dayUsage = 0, videoUsage = 0
    try {
      const redis = await getRedisClient()
      const now = new Date()
      const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      const today = now.toISOString().slice(0, 10)

      const [m, d, v] = await Promise.all([
        redis.get(`usage:tenant:${tenant.id}:month:${ym}`),
        redis.get(`usage:tenant:${tenant.id}:day:${today}`),
        redis.get(`video:tenant:${tenant.id}:month:${ym}`),
      ])
      monthUsage = Number(m) || 0
      dayUsage = Number(d) || 0
      videoUsage = Number(v) || 0
    } catch {
      // Redis down
    }

    res.json({
      subscription: {
        status: tenant.subscriptionStatus,
        trialEndsAt: tenant.trialEndsAt,
        plan: {
          code: plan.code,
          name: plan.name,
          priceMonthly: plan.priceMonthly,
          priceYearly: plan.priceYearly,
        },
      },
      limits: {
        dailyRequestLimit: plan.dailyRequestLimit,
        monthlyRequestLimit: plan.monthlyRequestLimit,
        monthlyVideoLimit: plan.monthlyVideoLimit,
        maxImageSize: plan.maxImageSize,
        maxVideoSize: plan.maxVideoSize,
        softDailyLimit: plan.softDailyLimit,
      },
      usage: {
        monthRequests: monthUsage,
        dayRequests: dayUsage,
        monthVideos: videoUsage,
      },
      features: {
        allowFaceSearchOneToOne: plan.allowFaceSearchOneToOne,
        allowFaceSearchOneToN: plan.allowFaceSearchOneToN,
        allowFaceSearchNToN: plan.allowFaceSearchNToN,
        allowVideoProcessing: plan.allowVideoProcessing,
      },
    })
  })

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // POST /subscribe — Initiate plan upgrade (scaffold for checkout)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  router.post('/subscribe', async (req, res) => {
    const { tenant, plan: currentPlan } = req.saas || {}
    if (!tenant) {
      return res.status(500).json({ code: 'CONTEXT_MISSING', message: 'Tenant context not loaded.' })
    }

    const { planCode, billing } = req.body || {}
    if (!planCode) {
      return res.status(400).json({ error: 'planCode is required' })
    }

    const targetPlan = await prisma.plan.findUnique({ where: { code: planCode } })
    if (!targetPlan) {
      return res.status(400).json({ error: `Plan '${planCode}' not found` })
    }

    // Prevent downgrade to same plan
    if (targetPlan.code === currentPlan?.code) {
      return res.status(400).json({ error: 'Already on this plan' })
    }

    // TODO: Integration with Razorpay Orders API
    // For now, return the plan details and a placeholder order
    const price = billing === 'yearly' ? targetPlan.priceYearly : targetPlan.priceMonthly

    res.json({
      message: 'Checkout session created (scaffold)',
      plan: {
        code: targetPlan.code,
        name: targetPlan.name,
        price,
        billing: billing || 'monthly',
      },
      tenant: {
        id: tenant.id,
        currentPlan: currentPlan?.code,
        subscriptionStatus: tenant.subscriptionStatus,
      },
      // TODO: Replace with real Razorpay order_id
      razorpay: {
        order_id: null,
        key_id: process.env.RAZORPAY_KEY_ID || null,
        notes: {
          tenant_id: tenant.id,
          plan_code: targetPlan.code,
        },
      },
    })
  })

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // POST /cancel — Cancel current subscription
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  router.post('/cancel', async (req, res) => {
    const { tenant } = req.saas || {}
    if (!tenant) {
      return res.status(500).json({ code: 'CONTEXT_MISSING', message: 'Tenant context not loaded.' })
    }

    let redis
    try { redis = await getRedisClient() } catch { redis = null }

    const result = await transitionSubscription(prisma, redis, tenant.id, 'CANCELED', {
      reason: req.body?.reason || 'User requested cancellation',
    })

    if (!result.ok) {
      return res.status(400).json({ code: 'INVALID_TRANSITION', message: result.error })
    }

    res.json({
      message: 'Subscription canceled',
      subscription: {
        status: result.tenant.subscriptionStatus,
        from: result.from,
      },
    })
  })

  return router
}

module.exports = { createPaymentRouter }
