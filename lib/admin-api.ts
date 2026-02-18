/**
 * Admin API Client
 * 
 * All admin endpoints require SUPER_ADMIN system role.
 * Uses the same backendRequest helper as the main API client.
 */

import { backendRequest } from './backend-api'

// ============================================================================
// Types
// ============================================================================

export interface AdminStats {
  users: {
    total: number
    active: number
    suspended: number
    banned: number
    recentSignups: number
  }
  plans: Array<{ code: string; name: string; count: number }>
  subscriptions: Array<{ status: string; count: number }>
  apiCalls: {
    today: number
    month: number
  }
  revenue: {
    monthly: number
    breakdown: Array<{ code: string; priceMonthly: number; active_tenants: number; monthly_revenue: number }>
  }
  usageTrend: Array<{ date: string; calls: number }>
  abuseFlags: number
}

export interface AdminUser {
  id: number
  firebaseUid: string
  email: string | null
  provider: string | null
  systemRole: 'USER' | 'ADMIN' | 'SUPER_ADMIN'
  isSuspended: boolean
  isBanned: boolean
  suspendReason: string | null
  banReason: string | null
  lastLoginAt: string | null
  loginCount: number
  createdAt: string
  tenant: {
    id: number
    name: string
    role: string
    plan: string
    planName: string
    subscriptionStatus: string
    trialEndsAt: string
  } | null
}

export interface AuditLogEntry {
  id: string
  userId: number | null
  tenantId: number | null
  action: string
  endpoint: string | null
  method: string | null
  ipAddress: string | null
  userAgent: string | null
  requestSize: number | null
  responseStatus: number | null
  detail: any
  timestamp: string
  user?: { id: number; email: string; systemRole: string } | null
}

export interface AbuseFlag {
  id: string
  userId: number
  tenantId: number | null
  reason: string
  severity: string
  details: any
  resolved: boolean
  resolvedBy: number | null
  resolvedAt: string | null
  createdAt: string
  user?: { id: number; email: string; systemRole: string } | null
}

export interface PaginatedResponse<T> {
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
  [key: string]: any
}

// ============================================================================
// Dashboard
// ============================================================================

export async function getAdminStats(): Promise<AdminStats> {
  return backendRequest('/api/admin/stats')
}

// ============================================================================
// User Management
// ============================================================================

export async function getAdminUsers(params: {
  page?: number
  limit?: number
  plan?: string
  status?: string
  role?: string
  search?: string
  sort?: string
  order?: string
} = {}): Promise<{ users: AdminUser[]; pagination: PaginatedResponse<AdminUser>['pagination'] }> {
  const searchParams = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '') searchParams.set(k, String(v))
  })
  return backendRequest(`/api/admin/users?${searchParams.toString()}`)
}

export async function getAdminUser(id: number): Promise<any> {
  return backendRequest(`/api/admin/users/${id}`)
}

export async function changePlan(userId: number, planCode: string): Promise<{ success: boolean; message: string }> {
  return backendRequest(`/api/admin/users/${userId}/change-plan`, {
    method: 'POST',
    body: JSON.stringify({ planCode }),
  })
}

export async function changeRole(userId: number, systemRole: string): Promise<{ success: boolean; message: string }> {
  return backendRequest(`/api/admin/users/${userId}/change-role`, {
    method: 'POST',
    body: JSON.stringify({ systemRole }),
  })
}

export async function suspendUser(userId: number, reason?: string): Promise<{ success: boolean }> {
  return backendRequest(`/api/admin/users/${userId}/suspend`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  })
}

export async function unsuspendUser(userId: number): Promise<{ success: boolean }> {
  return backendRequest(`/api/admin/users/${userId}/unsuspend`, {
    method: 'POST',
    body: JSON.stringify({}),
  })
}

export async function banUser(userId: number, reason?: string): Promise<{ success: boolean }> {
  return backendRequest(`/api/admin/users/${userId}/ban`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  })
}

export async function unbanUser(userId: number): Promise<{ success: boolean }> {
  return backendRequest(`/api/admin/users/${userId}/unban`, {
    method: 'POST',
    body: JSON.stringify({}),
  })
}

export async function extendTrial(userId: number, days: number = 14): Promise<{ success: boolean; trialEndsAt: string }> {
  return backendRequest(`/api/admin/users/${userId}/extend-trial`, {
    method: 'POST',
    body: JSON.stringify({ days }),
  })
}

export async function resetUsage(userId: number): Promise<{ success: boolean; deletedKeys: number }> {
  return backendRequest(`/api/admin/users/${userId}/reset-usage`, {
    method: 'POST',
    body: JSON.stringify({}),
  })
}

// ============================================================================
// Audit Logs
// ============================================================================

export async function getAuditLogs(params: {
  page?: number
  limit?: number
  userId?: number
  action?: string
  startDate?: string
  endDate?: string
  search?: string
} = {}): Promise<{ logs: AuditLogEntry[]; pagination: PaginatedResponse<AuditLogEntry>['pagination'] }> {
  const searchParams = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '') searchParams.set(k, String(v))
  })
  return backendRequest(`/api/admin/audit-logs?${searchParams.toString()}`)
}

// ============================================================================
// Abuse Flags
// ============================================================================

export async function getAbuseFlags(params: {
  resolved?: string
  severity?: string
  page?: number
  limit?: number
} = {}): Promise<{ flags: AbuseFlag[]; pagination: PaginatedResponse<AbuseFlag>['pagination'] }> {
  const searchParams = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '') searchParams.set(k, String(v))
  })
  return backendRequest(`/api/admin/abuse-flags?${searchParams.toString()}`)
}

export async function resolveAbuseFlag(flagId: string): Promise<{ success: boolean }> {
  return backendRequest(`/api/admin/abuse-flags/${flagId}/resolve`, {
    method: 'POST',
    body: JSON.stringify({}),
  })
}

export async function runAbuseScan(): Promise<{ success: boolean; newFlags: number; flags: AbuseFlag[] }> {
  return backendRequest('/api/admin/abuse-scan', {
    method: 'POST',
    body: JSON.stringify({}),
  })
}

// ============================================================================
// Plans
// ============================================================================

export async function getAdminPlans(): Promise<{ plans: any[] }> {
  return backendRequest('/api/admin/plans')
}
