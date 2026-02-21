'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { backendRequest } from '@/lib/backend-api'

/* ═══════════ Types ═══════════ */

type KeyStatus = 'active' | 'revoked' | 'expired'

type ApiKeyRow = {
  id: string
  name: string
  keyPrefix: string
  status: KeyStatus
  scopes: string[]
  createdAt: string
  lastUsedAt: string | null
  expiresAt: string | null
  revokedAt: string | null
  user: { id: number; email: string | null; username: string | null; role: string }
  tenant: { id: number; name: string; plan: string; planName: string }
  stats: { totalCalls: number; callsToday: number; callsMonth: number; lastCallAt: string | null }
}

type Summary = {
  totalKeys: number
  activeKeys: number
  revokedKeys: number
  callsToday: number
  callsMonth: number
}

type KeyDetail = {
  key: ApiKeyRow & { tenant: ApiKeyRow['tenant'] & { totalKeys: number }; user: any }
  stats: { totalCalls: number; successCalls: number; errorCalls: number; successRate: number }
  callsPerDay: Array<{ date: string; calls: number; successful: number; errors: number }>
  callsByEndpoint: Array<{ endpoint: string; calls: number; successful: number; avg_status: number }>
  callsByHour: Array<{ hour: number; calls: number }>
  recentCalls: Array<{ id: string; endpoint: string; method: string; ipAddress: string; userAgent: string; responseStatus: number; timestamp: string }>
}

/* ═══════════ Helpers ═══════════ */

function fmt(n: number) { return n.toLocaleString() }
function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
function fmtTime(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}
function timeAgo(d: string | null) {
  if (!d) return 'Never'
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000)
  if (s < 60) return 'Just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`
  return fmtDate(d)
}

/* ═══════════ Sub-components ═══════════ */

function SCard({ label, value, sub, color = 'blue' }: { label: string; value: string | number; sub?: string; color?: string }) {
  const c: Record<string, string> = {
    blue:   'border-blue-500/20   bg-blue-500/5   text-blue-400',
    green:  'border-green-500/20  bg-green-500/5  text-green-400',
    red:    'border-red-500/20    bg-red-500/5    text-red-400',
    purple: 'border-purple-500/20 bg-purple-500/5 text-purple-400',
    amber:  'border-amber-500/20  bg-amber-500/5  text-amber-400',
  }
  const cls = c[color] || c.blue
  return (
    <div className={`rounded-xl border p-5 ${cls}`}>
      <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-3xl font-bold ${cls.split(' ')[2]}`}>{typeof value === 'number' ? fmt(value) : value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  )
}

function StatusBadge({ status }: { status: KeyStatus }) {
  const cfg = {
    active:  'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    revoked: 'bg-red-500/10    text-red-400    border-red-500/20',
    expired: 'bg-amber-500/10  text-amber-400  border-amber-500/20',
  }
  const dot = { active: 'bg-emerald-400 animate-pulse', revoked: 'bg-red-400', expired: 'bg-amber-400' }
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${cfg[status]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot[status]}`} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

function PlanBadge({ plan }: { plan: string }) {
  const cfg: Record<string, string> = {
    FREE:       'bg-gray-700 text-gray-300',
    PRO:        'bg-blue-500/20 text-blue-400',
    ENTERPRISE: 'bg-purple-500/20 text-purple-400',
    UNLIMITED:  'bg-emerald-500/20 text-emerald-400',
  }
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${cfg[plan] || cfg.FREE}`}>
      {plan}
    </span>
  )
}

/* ─── Mini call-per-day sparkline (pure divs) ─── */
function Sparkline({ data }: { data: number[] }) {
  if (!data || data.length === 0) return <span className="text-gray-600 text-xs">No data</span>
  const max = Math.max(...data, 1)
  return (
    <div className="flex items-end gap-px h-8">
      {data.map((v, i) => (
        <div
          key={i}
          className="w-1.5 rounded-t bg-blue-500/60 min-h-[2px] flex-shrink-0"
          style={{ height: `${Math.round((v / max) * 100)}%` }}
          title={`${v} calls`}
        />
      ))}
    </div>
  )
}

/* ═══════════ Expanded Key Detail ═══════════ */

function KeyDetailPanel({ keyId, onRevoke }: { keyId: string; onRevoke: () => void }) {
  const [detail, setDetail] = useState<KeyDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [revoking, setRevoking] = useState(false)
  const [confirmRevoke, setConfirmRevoke] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'calls' | 'endpoints'>('overview')

  useEffect(() => {
    setLoading(true)
    backendRequest(`/api/admin/api-keys/${keyId}`)
      .then((data: any) => setDetail(data))
      .catch((e: any) => setError(e.message))
      .finally(() => setLoading(false))
  }, [keyId])

  const handleRevoke = async () => {
    try {
      setRevoking(true)
      await backendRequest(`/api/admin/api-keys/${keyId}`, { method: 'DELETE' })
      onRevoke()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setRevoking(false)
      setConfirmRevoke(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-10">
      <div className="w-7 h-7 animate-spin rounded-full border-2 border-gray-700 border-t-blue-500" />
    </div>
  )
  if (error) return <p className="text-red-400 text-sm py-5 text-center">{error}</p>
  if (!detail) return null

  const { key, stats, callsPerDay, callsByEndpoint, callsByHour, recentCalls } = detail
  const sparkData = callsPerDay.map((d) => d.calls)

  return (
    <div className="p-5 bg-[#0a0a14] border border-blue-900/20 rounded-xl mt-1 space-y-5">
      {/* ── Top: user + key + stats row ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* User info */}
        <div className="bg-gray-900/50 border border-gray-800/60 rounded-xl p-4">
          <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-3">Owner</h4>
          <div className="space-y-2">
            <div>
              <p className="text-white font-semibold text-sm">{key.user.email || key.user.username || 'Unknown'}</p>
              <p className="text-gray-500 text-xs">User ID #{key.user.id}</p>
            </div>
            <div className="flex flex-wrap gap-1.5 text-xs text-gray-400">
              <span className="px-2 py-0.5 bg-gray-800 rounded">{key.user.role}</span>
              {key.user.loginCount !== undefined && (
                <span className="px-2 py-0.5 bg-gray-800 rounded">{fmt(key.user.loginCount)} logins</span>
              )}
            </div>
            {key.user.lastLoginAt && (
              <p className="text-gray-600 text-xs">Last login: {timeAgo(key.user.lastLoginAt)}</p>
            )}
          </div>
        </div>

        {/* Key info */}
        <div className="bg-gray-900/50 border border-gray-800/60 rounded-xl p-4">
          <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-3">Key Details</h4>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">Prefix</span>
              <code className="text-gray-300 font-mono">{key.keyPrefix}•••</code>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Status</span>
              <StatusBadge status={key.status} />
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Created</span>
              <span className="text-gray-300">{fmtDate(key.createdAt)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Expires</span>
              <span className={`${key.status === 'expired' ? 'text-amber-400' : 'text-gray-300'}`}>
                {key.expiresAt ? fmtDate(key.expiresAt) : 'Never'}
              </span>
            </div>
            {key.revokedAt && (
              <div className="flex justify-between">
                <span className="text-gray-500">Revoked</span>
                <span className="text-red-400">{fmtDate(key.revokedAt)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500">Tenant</span>
              <span className="text-gray-300">{key.tenant.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Plan</span>
              <PlanBadge plan={key.tenant.plan} />
            </div>
          </div>
        </div>

        {/* Call stats */}
        <div className="bg-gray-900/50 border border-gray-800/60 rounded-xl p-4">
          <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-3">Usage Stats</h4>
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Total calls</span>
              <span className="text-white font-bold">{fmt(stats.totalCalls)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Successful</span>
              <span className="text-emerald-400">{fmt(stats.successCalls)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Errors</span>
              <span className="text-red-400">{fmt(stats.errorCalls)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Success rate</span>
              <span className="text-blue-400 font-semibold">{stats.successRate}%</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Last call</span>
              <span className="text-gray-300">{timeAgo(key.lastUsedAt)}</span>
            </div>
          </div>

          {/* Sparkline */}
          {sparkData.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-800">
              <p className="text-[10px] text-gray-600 mb-1">Last {sparkData.length} days</p>
              <Sparkline data={sparkData} />
            </div>
          )}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 bg-gray-900/60 rounded-xl p-1 w-fit">
        {(['overview', 'calls', 'endpoints'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
              activeTab === t ? 'bg-blue-500/20 text-blue-400' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {t === 'overview' ? 'Daily Calls' : t === 'calls' ? 'Recent Calls' : 'Endpoints'}
          </button>
        ))}
      </div>

      {/* ── Daily Calls chart ── */}
      {activeTab === 'overview' && (
        <div>
          {callsPerDay.length === 0 ? (
            <p className="text-gray-600 text-sm text-center py-8">No recorded calls in the last 30 days.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left py-2 px-3 text-gray-500 font-medium">Date</th>
                    <th className="text-right py-2 px-3 text-gray-500 font-medium">Total</th>
                    <th className="text-right py-2 px-3 text-gray-500 font-medium">Success</th>
                    <th className="text-right py-2 px-3 text-gray-500 font-medium">Errors</th>
                    <th className="py-2 px-3 text-gray-500 font-medium">Bar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/40">
                  {callsPerDay.map((d) => {
                    const pct = stats.totalCalls > 0 ? Math.round((d.calls / Math.max(...callsPerDay.map(x => x.calls), 1)) * 100) : 0
                    return (
                      <tr key={String(d.date)} className="hover:bg-white/2">
                        <td className="py-2 px-3 text-gray-300">{fmtDate(String(d.date))}</td>
                        <td className="py-2 px-3 text-right font-semibold text-white">{fmt(d.calls)}</td>
                        <td className="py-2 px-3 text-right text-emerald-400">{fmt(d.successful)}</td>
                        <td className="py-2 px-3 text-right text-red-400">{fmt(d.errors)}</td>
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-800 rounded-full h-1.5">
                              <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Recent Calls ── */}
      {activeTab === 'calls' && (
        <div>
          {recentCalls.length === 0 ? (
            <p className="text-gray-600 text-sm text-center py-8">No recorded calls yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left py-2 px-3 text-gray-500 font-medium">Time</th>
                    <th className="text-left py-2 px-3 text-gray-500 font-medium">Method</th>
                    <th className="text-left py-2 px-3 text-gray-500 font-medium">Endpoint</th>
                    <th className="text-left py-2 px-3 text-gray-500 font-medium">Status</th>
                    <th className="text-left py-2 px-3 text-gray-500 font-medium">IP</th>
                    <th className="text-left py-2 px-3 text-gray-500 font-medium">User Agent</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/40">
                  {recentCalls.map((c) => (
                    <tr key={c.id} className="hover:bg-white/2">
                      <td className="py-2 px-3 text-gray-400 whitespace-nowrap">{fmtTime(c.timestamp)}</td>
                      <td className="py-2 px-3">
                        <span className="px-1.5 py-0.5 bg-blue-500/10 text-blue-400 rounded font-mono">{c.method}</span>
                      </td>
                      <td className="py-2 px-3 font-mono text-gray-300 max-w-[180px] truncate">{c.endpoint}</td>
                      <td className="py-2 px-3">
                        <span className={`font-semibold ${c.responseStatus < 400 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {c.responseStatus}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-gray-500 font-mono">{c.ipAddress || '—'}</td>
                      <td className="py-2 px-3 text-gray-600 max-w-[200px] truncate" title={c.userAgent}>{c.userAgent || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Endpoint breakdown ── */}
      {activeTab === 'endpoints' && (
        <div>
          {callsByEndpoint.length === 0 ? (
            <p className="text-gray-600 text-sm text-center py-8">No endpoint data yet.</p>
          ) : (
            <div className="space-y-2">
              {callsByEndpoint.map((ep) => {
                const maxCalls = Math.max(...callsByEndpoint.map(e => e.calls), 1)
                const pct = Math.round((ep.calls / maxCalls) * 100)
                return (
                  <div key={ep.endpoint} className="flex items-center gap-4 bg-gray-900/40 rounded-lg px-4 py-3">
                    <code className="text-gray-300 text-xs font-mono w-48 flex-shrink-0 truncate">{ep.endpoint}</code>
                    <div className="flex-1 bg-gray-800 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0 text-xs">
                      <span className="text-white font-bold w-14 text-right">{fmt(ep.calls)} calls</span>
                      <span className="text-emerald-400 w-20 text-right">{fmt(ep.successful)} ok</span>
                      <span className={`w-10 text-right font-semibold ${ep.avg_status >= 400 ? 'text-red-400' : 'text-gray-500'}`}>
                        {ep.avg_status}
                      </span>
                    </div>
                  </div>
                )
              })}

              {/* Calls by hour heatmap */}
              {callsByHour.length > 0 && (
                <div className="mt-4 bg-gray-900/40 rounded-lg px-4 py-4">
                  <p className="text-[11px] text-gray-500 font-medium uppercase tracking-widest mb-3">Calls by Hour (last 7 days)</p>
                  <div className="flex items-end gap-1">
                    {Array.from({ length: 24 }, (_, h) => {
                      const entry = callsByHour.find(d => d.hour === h)
                      const count = entry?.calls || 0
                      const max = Math.max(...callsByHour.map(d => d.calls), 1)
                      const pct = Math.round((count / max) * 100)
                      return (
                        <div key={h} className="flex flex-col items-center gap-1 flex-1">
                          <div
                            className={`w-full rounded-t min-h-[3px] ${count > 0 ? 'bg-blue-500/70' : 'bg-gray-800'}`}
                            style={{ height: `${Math.max(pct * 0.5, count > 0 ? 3 : 3)}px` }}
                            title={`${h}:00 — ${count} calls`}
                          />
                          {h % 6 === 0 && <span className="text-[9px] text-gray-600">{h}h</span>}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Admin revoke ── */}
      {key.status === 'active' && (
        <div className="pt-3 border-t border-gray-800/60 flex items-center gap-3">
          {!confirmRevoke ? (
            <button
              onClick={() => setConfirmRevoke(true)}
              className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-600/30 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
              Admin Revoke Key
            </button>
          ) : (
            <>
              <span className="text-xs text-red-400">Force-revoke this key permanently?</span>
              <button
                onClick={handleRevoke}
                disabled={revoking}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-semibold disabled:opacity-50 flex items-center gap-1.5"
              >
                {revoking && <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                Confirm Revoke
              </button>
              <button onClick={() => setConfirmRevoke(false)} className="px-3 py-1.5 text-gray-400 hover:text-white text-xs">
                Cancel
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

/* ═══════════ Main Page ═══════════ */

export default function AdminApiKeysPage() {
  const [keys, setKeys] = useState<ApiKeyRow[]>([])
  const [summary, setSummary] = useState<Summary>({ totalKeys: 0, activeKeys: 0, revokedKeys: 0, callsToday: 0, callsMonth: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [planFilter, setPlanFilter] = useState('')
  const [sortField, setSortField] = useState('lastUsedAt')
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  const [expandedId, setExpandedId] = useState<string | null>(null)

  const loadKeys = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const params = new URLSearchParams({ page: String(page), sort: sortField, order: sortOrder, limit: '25' })
      if (search) params.set('search', search)
      if (statusFilter) params.set('status', statusFilter)
      if (planFilter) params.set('plan', planFilter)
      const data: any = await backendRequest(`/api/admin/api-keys?${params}`)
      setKeys(data.data || [])
      setSummary(data.summary || {})
      setTotalPages(data.pagination?.totalPages || 1)
      setTotal(data.pagination?.total || 0)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [page, search, statusFilter, planFilter, sortField, sortOrder])

  useEffect(() => { loadKeys() }, [loadKeys])

  // Reset page on filter change
  useEffect(() => { setPage(1) }, [search, statusFilter, planFilter])

  const toggleExpand = (id: string) => setExpandedId(prev => prev === id ? null : id)

  const handleSort = (field: string) => {
    if (sortField === field) setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')
    else { setSortField(field); setSortOrder('desc') }
  }

  const SortIcon = ({ field }: { field: string }) => (
    sortField !== field ? (
      <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
      </svg>
    ) : (
      <svg className={`w-3 h-3 text-blue-400 ${sortOrder === 'asc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    )
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">API Keys Monitor</h1>
          <p className="text-gray-500 text-sm mt-0.5">All API keys across all tenants — usage, calls, and management</p>
        </div>
        <button
          onClick={loadKeys}
          className="px-3 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 rounded-lg text-sm transition-colors flex items-center gap-2"
        >
          <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <SCard label="Total Keys" value={summary.totalKeys} color="blue" />
        <SCard label="Active Keys" value={summary.activeKeys} color="green" sub={`${summary.revokedKeys} revoked`} />
        <SCard label="Revoked" value={summary.revokedKeys} color="red" />
        <SCard label="API Calls Today" value={summary.callsToday} color="purple" />
        <SCard label="API Calls (30d)" value={summary.callsMonth} color="amber" />
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by key name, prefix, or email…"
            className="w-full bg-gray-800/60 border border-gray-700/40 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-gray-800/60 border border-gray-700/40 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="revoked">Revoked</option>
          <option value="expired">Expired</option>
        </select>

        <select
          value={planFilter}
          onChange={(e) => setPlanFilter(e.target.value)}
          className="bg-gray-800/60 border border-gray-700/40 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
        >
          <option value="">All Plans</option>
          <option value="FREE">Free</option>
          <option value="PRO">Pro</option>
          <option value="ENTERPRISE">Enterprise</option>
          <option value="UNLIMITED">Unlimited</option>
        </select>

        <span className="text-gray-500 text-xs">{fmt(total)} keys</span>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* ── Table ── */}
      <div className="bg-[#0d0d14] border border-blue-900/20 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-blue-900/20 bg-blue-900/5">
            <tr>
              <th className="text-left py-3 px-4 text-gray-500 font-medium text-xs">
                <button onClick={() => handleSort('name')} className="flex items-center gap-1.5 hover:text-gray-300">
                  Key <SortIcon field="name" />
                </button>
              </th>
              <th className="text-left py-3 px-4 text-gray-500 font-medium text-xs">User / Tenant</th>
              <th className="text-left py-3 px-4 text-gray-500 font-medium text-xs">Plan</th>
              <th className="text-left py-3 px-4 text-gray-500 font-medium text-xs">Status</th>
              <th className="text-right py-3 px-4 text-gray-500 font-medium text-xs">
                <button onClick={() => handleSort('createdAt')} className="flex items-center gap-1.5 hover:text-gray-300 ml-auto">
                  Total Calls <SortIcon field="createdAt" />
                </button>
              </th>
              <th className="text-right py-3 px-4 text-gray-500 font-medium text-xs">Today</th>
              <th className="text-right py-3 px-4 text-gray-500 font-medium text-xs">30d</th>
              <th className="text-left py-3 px-4 text-gray-500 font-medium text-xs">
                <button onClick={() => handleSort('lastUsedAt')} className="flex items-center gap-1.5 hover:text-gray-300">
                  Last Used <SortIcon field="lastUsedAt" />
                </button>
              </th>
              <th className="text-left py-3 px-4 text-gray-500 font-medium text-xs">
                <button onClick={() => handleSort('createdAt')} className="flex items-center gap-1.5 hover:text-gray-300">
                  Created <SortIcon field="createdAt" />
                </button>
              </th>
              <th className="py-3 px-4" />
            </tr>
          </thead>
          <tbody className="divide-y divide-blue-900/10">
            {loading ? (
              <tr>
                <td colSpan={10} className="text-center py-12">
                  <div className="inline-block w-8 h-8 border-2 border-gray-700 border-t-blue-500 rounded-full animate-spin" />
                </td>
              </tr>
            ) : keys.length === 0 ? (
              <tr>
                <td colSpan={10} className="text-center py-12 text-gray-500">
                  No API keys found.
                </td>
              </tr>
            ) : (
              keys.map((k) => (
                <React.Fragment key={k.id}>
                  <tr
                    className={`hover:bg-blue-900/5 cursor-pointer transition-colors ${expandedId === k.id ? 'bg-blue-900/5' : ''}`}
                    onClick={() => toggleExpand(k.id)}
                  >
                    {/* Key */}
                    <td className="py-3 px-4">
                      <div>
                        <p className="text-white font-medium text-sm">{k.name}</p>
                        <code className="text-gray-600 text-[11px] font-mono">{k.keyPrefix}•••</code>
                      </div>
                    </td>
                    {/* User / Tenant */}
                    <td className="py-3 px-4">
                      <p className="text-gray-300 text-xs">{k.user.email || k.user.username || `#${k.user.id}`}</p>
                      <p className="text-gray-600 text-[11px]">{k.tenant.name}</p>
                    </td>
                    {/* Plan */}
                    <td className="py-3 px-4">
                      <PlanBadge plan={k.tenant.plan} />
                    </td>
                    {/* Status */}
                    <td className="py-3 px-4">
                      <StatusBadge status={k.status} />
                    </td>
                    {/* Total calls */}
                    <td className="py-3 px-4 text-right font-semibold text-white">
                      {fmt(k.stats.totalCalls)}
                    </td>
                    {/* Today */}
                    <td className="py-3 px-4 text-right text-blue-400">
                      {fmt(k.stats.callsToday)}
                    </td>
                    {/* 30d */}
                    <td className="py-3 px-4 text-right text-blue-300">
                      {fmt(k.stats.callsMonth)}
                    </td>
                    {/* Last used */}
                    <td className="py-3 px-4 text-gray-400 text-xs">
                      {timeAgo(k.lastUsedAt)}
                    </td>
                    {/* Created */}
                    <td className="py-3 px-4 text-gray-500 text-xs">
                      {fmtDate(k.createdAt)}
                    </td>
                    {/* Expand chevron */}
                    <td className="py-3 px-4 text-right">
                      <svg className={`w-4 h-4 text-gray-500 transition-transform ${expandedId === k.id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </td>
                  </tr>

                  {/* Expanded detail row */}
                  {expandedId === k.id && (
                    <tr>
                      <td colSpan={10} className="px-4 pb-4">
                        <KeyDetailPanel
                          keyId={k.id}
                          onRevoke={() => { loadKeys(); setExpandedId(null) }}
                        />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">Page {page} of {totalPages}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-gray-300 rounded text-xs"
            >
              ← Prev
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              const p = i + 1
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-8 h-8 rounded text-xs font-medium ${page === p ? 'bg-blue-600 text-white' : 'bg-gray-800 hover:bg-gray-700 text-gray-400'}`}
                >
                  {p}
                </button>
              )
            })}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-gray-300 rounded text-xs"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
