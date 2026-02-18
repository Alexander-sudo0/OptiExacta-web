# 📊 OptiExacta Database Schema Guide

## 🎯 Quick Overview

OptiExacta uses a **multi-tenant SaaS architecture** with two separate role systems.

## 🔐 Two Role Systems (Important!)

### 1️⃣ **System Role** (Platform-wide)
Lives on the `User` table → Controls admin panel access

| Role | Who | Access |
|------|-----|--------|
| `SUPER_ADMIN` | **You** (platform owner) | Full admin panel + all features |
| `ADMIN` | Platform moderator | Limited admin access |
| `USER` | Regular customer | No admin access (default) |

### 2️⃣ **Tenant Role** (Organization-level)
Lives on the `TenantUser` join table → Controls team permissions

| Role | Who | Access |
|------|-----|--------|
| `ADMIN` | Team owner | Manage team + billing |
| `MEMBER` | Team member | Use API features |
| `VIEWER` | Read-only user | View results only |

> ⚠️ **Key Point:** A SUPER_ADMIN still has a tenant and subscription plan!  
> `systemRole` controls admin panel access, NOT subscription features.

---

## 🏗️ Core Models

### User
**Who:** Individual people (you, your customers, team members)

**Key Fields:**
- `firebaseUid` → Links to Firebase Auth (unique identifier)
- `email` → User's email
- `systemRole` → USER / ADMIN / SUPER_ADMIN
- `isSuspended` → Admin temporarily blocked this user
- `isBanned` → Admin permanently blocked (Firebase account disabled)

**Example:**
```
You: 
  email: "yourname@example.com"
  systemRole: "SUPER_ADMIN"  ← Can access /admin panel
  isSuspended: false
  isBanned: false
```

### Tenant
**Who:** Organizations/Customers (each paying customer = 1 tenant)

**Key Fields:**
- `name` → Organization name ("acme-corp-tenant")
- `plan` → FREE / PRO / ENTERPRISE
- `subscriptionStatus` → TRIAL / ACTIVE / CANCELED / SUSPENDED
- `trialEndsAt` → When free trial expires

**Example:**
```
Your Tenant:
  name: "yourname-tenant"
  plan: "FREE"  ← You're on free plan despite being SUPER_ADMIN
  subscriptionStatus: "TRIAL"
  trialEndsAt: "2026-03-04"
```

### TenantUser (Join Table)
**Links:** Users ↔️ Tenants with a role

**Key Fields:**
- `userId` → Which user
- `tenantId` → Which organization
- `role` → ADMIN / MEMBER / VIEWER

**Example:**
```
You in your tenant:
  user: You (SUPER_ADMIN)
  tenant: yourname-tenant
  role: ADMIN  ← You're also the org owner
```

### Plan
**What:** Subscription tiers with features + limits

| Plan | Monthly Requests | Price | Features |
|------|------------------|-------|----------|
| FREE | 100 | $0 | Basic 1:1 search |
| PRO | 10,000 | $49/mo | All search types |
| ENTERPRISE | Unlimited | $299/mo | + Video processing |

---

## 📝 Common Scenarios

### ✅ New User Signs Up
1. User registers with Firebase (email + password)
2. Backend creates:
   - `User` record (systemRole=USER by default)
   - `Tenant` record (plan=FREE, status=TRIAL)
   - `TenantUser` link (role=ADMIN - they're the org owner)
3. They get 14 days free trial

### ✅ You (SUPER_ADMIN) Access Admin Panel
1. You navigate to `/admin`
2. Backend checks: `user.systemRole === 'SUPER_ADMIN'` ✅
3. You see admin panel with all users

### ✅ Regular User Tries to Access Admin Panel
1. They navigate to `/admin`
2. Backend checks: `user.systemRole === 'USER'` ❌
3. They get 403 Forbidden → redirected to dashboard

### ✅ Upgrading a Customer to PRO
1. Open admin panel → Users → Find customer
2. Click "Change Plan" → Select PRO → Confirm
3. Their `tenant.planId` changes to PRO plan
4. They get 10,000 requests/month instead of 100

### ✅ Suspending an Abusive User
1. Open admin panel → Users → Find user
2. Click "Suspend" → Enter reason → Confirm
3. Sets `user.isSuspended = true`
4. Backend blocks all their API requests

---

## 🔍 Viewing Your Data

### Option 1: Prisma Studio (Visual)
```bash
cd backend
npx prisma studio
```
Opens http://localhost:5555 — click tables to view/edit data

### Option 2: Admin Panel (Your UI)
Navigate to http://localhost:3007/admin

---

## 🛠️ Common Tasks

### Make Yourself SUPER_ADMIN
```bash
# Option 1: Prisma Studio
cd backend && npx prisma studio
# → Open User table
# → Click your user
# → Change systemRole to "SUPER_ADMIN"
# → Save

# Option 2: SQL (if you know your user ID)
npx prisma db execute --stdin <<< "UPDATE \"User\" SET \"systemRole\" = 'SUPER_ADMIN' WHERE id = 1;"
```

### Reset Database (Start Fresh)
```bash
cd backend
npx prisma migrate reset  # ⚠️ DELETES ALL DATA
```

### Check What Plans Exist
```bash
cd backend
npx prisma studio
# → Click "Plan" table
# → Should see: FREE, PRO, ENTERPRISE
```

---

## 📊 Entity Relationship Diagram

```
┌─────────┐         ┌──────────┐         ┌────────┐
│  User   │────┬────│TenantUser│────┬────│ Tenant │
└─────────┘    │    └──────────┘    │    └────────┘
               │                     │         │
    systemRole │      role           │         │ plan
    (SUPER_ADMIN)     (ADMIN)        │         │
               │                     │         ▼
               │                     │    ┌────────┐
               │                     │    │  Plan  │
               │                     │    └────────┘
               │                     │    FREE/PRO/
               │                     │    ENTERPRISE
               ▼                     ▼
         ┌──────────────┐    ┌──────────────┐
         │ AuditLog     │    │ FaceSearch   │
         │              │    │ Request      │
         └──────────────┘    └──────────────┘
```

---

## 🚨 Troubleshooting

### "I'm SUPER_ADMIN but can't access /admin"
- Check your `systemRole` in Prisma Studio
- Make sure backend is running: `ss -tlnp | grep 3011`
- Check browser console for 403 errors

### "User shows systemRole=USER instead of SUPER_ADMIN"
- You edited the wrong user in Prisma Studio
- Find user by `firebaseUid` or `email`, not by `id`

### "Admin panel is empty (0 users)"
- Backend might not be running
- Check CORS: `.env` should have `FRONTEND_URL=http://localhost:3007`

---

Need more help? Ask me!
