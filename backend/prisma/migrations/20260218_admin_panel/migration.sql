-- Add ENTERPRISE to PlanCode enum and SUSPENDED to SubscriptionStatus  
ALTER TYPE "PlanCode" ADD VALUE IF NOT EXISTS 'ENTERPRISE';
ALTER TYPE "SubscriptionStatus" ADD VALUE IF NOT EXISTS 'SUSPENDED';

-- Create new enums
DO $$ BEGIN
  CREATE TYPE "SystemRole" AS ENUM ('USER', 'ADMIN', 'SUPER_ADMIN');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "AuditAction" AS ENUM ('USER_LOGIN', 'USER_SIGNUP', 'USER_LOGOUT', 'PLAN_CHANGE', 'ROLE_CHANGE', 'USER_SUSPEND', 'USER_UNSUSPEND', 'USER_BAN', 'USER_UNBAN', 'TRIAL_EXTEND', 'USAGE_RESET', 'API_CALL', 'RATE_LIMIT_HIT', 'ABUSE_FLAG', 'ADMIN_ACCESS', 'SETTINGS_CHANGE');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Migrate PRO_PLUS -> ENTERPRISE
UPDATE "Plan" SET code = 'ENTERPRISE', name = 'Enterprise' WHERE code = 'PRO_PLUS';

-- Add new columns to User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "systemRole" "SystemRole" NOT NULL DEFAULT 'USER';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isSuspended" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isBanned" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "suspendedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "bannedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "suspendReason" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "banReason" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "loginCount" INTEGER NOT NULL DEFAULT 0;

-- Add new columns to Plan
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "monthlyRequestLimit" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "priceMonthly" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "priceYearly" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "allowVideoProcessing" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "maxVideoSize" INTEGER NOT NULL DEFAULT 100;

-- Create AuditLog table
CREATE TABLE IF NOT EXISTS "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" INTEGER,
    "tenantId" INTEGER,
    "action" "AuditAction" NOT NULL,
    "endpoint" TEXT,
    "method" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "requestSize" INTEGER,
    "responseStatus" INTEGER,
    "detail" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- Create AbuseFlag table
CREATE TABLE IF NOT EXISTS "AbuseFlag" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "tenantId" INTEGER,
    "reason" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'medium',
    "details" JSONB,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedBy" INTEGER,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AbuseFlag_pkey" PRIMARY KEY ("id")
);

-- Add foreign keys
DO $$ BEGIN
  ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS "AuditLog_userId_idx" ON "AuditLog"("userId");
CREATE INDEX IF NOT EXISTS "AuditLog_tenantId_idx" ON "AuditLog"("tenantId");
CREATE INDEX IF NOT EXISTS "AuditLog_action_idx" ON "AuditLog"("action");
CREATE INDEX IF NOT EXISTS "AuditLog_timestamp_idx" ON "AuditLog"("timestamp");
CREATE INDEX IF NOT EXISTS "AuditLog_ipAddress_idx" ON "AuditLog"("ipAddress");
CREATE INDEX IF NOT EXISTS "AbuseFlag_userId_idx" ON "AbuseFlag"("userId");
CREATE INDEX IF NOT EXISTS "AbuseFlag_severity_idx" ON "AbuseFlag"("severity");
CREATE INDEX IF NOT EXISTS "AbuseFlag_resolved_idx" ON "AbuseFlag"("resolved");
CREATE INDEX IF NOT EXISTS "AbuseFlag_createdAt_idx" ON "AbuseFlag"("createdAt");

-- Make the dev-user a SUPER_ADMIN
UPDATE "User" SET "systemRole" = 'SUPER_ADMIN' WHERE "firebaseUid" = 'dev-user';

-- Update plan features
UPDATE "Plan" SET "allowFaceSearchOneToN" = true, "allowFaceSearchNToN" = true, "allowVideoProcessing" = true WHERE code = 'PRO';
UPDATE "Plan" SET "allowFaceSearchOneToN" = true, "allowFaceSearchNToN" = true, "allowVideoProcessing" = true, "dailyRequestLimit" = 0 WHERE code = 'ENTERPRISE';
