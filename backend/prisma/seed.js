/**
 * Prisma seed script — idempotent plan upserts
 *
 * Run: npx prisma db seed
 * Or:  node prisma/seed.js
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const plans = [
  {
    code: 'FREE',
    name: 'Free',
    trialDays: 14,
    dailyRequestLimit: 15,
    softDailyLimit: false,
    monthlyRequestLimit: 200,
    monthlyVideoLimit: 3,
    maxImageSize: 2,       // 2 MB
    priceMonthly: 0,
    priceYearly: 0,
    allowFaceSearchOneToOne: true,
    allowFaceSearchOneToN: true,
    allowFaceSearchNToN: true,
    allowVideoProcessing: true,
    maxVideoSize: 50,      // 50 MB
  },
  {
    code: 'PRO',
    name: 'Pro',
    trialDays: 14,
    dailyRequestLimit: 200,
    softDailyLimit: true,   // Soft limit — warn but don't block
    monthlyRequestLimit: 500,
    monthlyVideoLimit: 0,   // Unlimited
    maxImageSize: 10,       // 10 MB
    priceMonthly: 49.99,
    priceYearly: 479.88,
    allowFaceSearchOneToOne: true,
    allowFaceSearchOneToN: true,
    allowFaceSearchNToN: true,
    allowVideoProcessing: true,
    maxVideoSize: 500,      // 500 MB
  },
  {
    code: 'ENTERPRISE',
    name: 'Enterprise',
    trialDays: 30,
    dailyRequestLimit: 0,   // Unlimited
    softDailyLimit: false,
    monthlyRequestLimit: 5000,
    monthlyVideoLimit: 0,   // Unlimited
    maxImageSize: 20,       // 20 MB
    priceMonthly: 199.99,
    priceYearly: 1919.88,
    allowFaceSearchOneToOne: true,
    allowFaceSearchOneToN: true,
    allowFaceSearchNToN: true,
    allowVideoProcessing: true,
    maxVideoSize: 2048,     // 2 GB
  },
  {
    code: 'UNLIMITED',
    name: 'Unlimited (Super Admin)',
    trialDays: 0,           // No trial needed for super admins
    dailyRequestLimit: 0,   // Unlimited
    softDailyLimit: false,
    monthlyRequestLimit: 0, // Unlimited
    monthlyVideoLimit: 0,   // Unlimited
    maxImageSize: 100,      // 100 MB
    priceMonthly: 0,        // Free for super admins
    priceYearly: 0,
    allowFaceSearchOneToOne: true,
    allowFaceSearchOneToN: true,
    allowFaceSearchNToN: true,
    allowVideoProcessing: true,
    maxVideoSize: 10240,    // 10 GB
  },
]

async function main() {
  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { code: plan.code },
      update: plan,
      create: plan,
    })
    console.log(`✓ Plan ${plan.code} upserted`)
  }
  console.log('Seed complete.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
