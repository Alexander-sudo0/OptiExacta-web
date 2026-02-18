'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { getAuditLogs, type AuditLogEntry } from '@/lib/admin-api'

const ACTIONS = [
  'USER_LOGIN', 'USER_SIGNUP', 'PLAN_CHANGE', 'ROLE_CHANGE',
  'USER_SUSPENDED', 'USER_UNSUSPENDED', 'USER_BANNED', 'USER_UNBANNED',
  'TRIAL_EXTENDED', 'USAGE_RESET', 'ABUSE_FLAG_CREATED', 'ABUSE_FLAG_RESOLVED',
  'API_KEY_CREATED', 'API_KEY_REVOKED', 'SETTINGS_CHANGED', 'ADMIN_ACTION',
]

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 30, totalPages: 1 })
  const [filters, setFilters] = useState({ action: '', search: '', startDate: '', endDate: '' })
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const load = useCallback(async (page = 1) => {
    setLoading(true)
    try {
      const res = await getAuditLogs({ ...filters, page, limit: pagination.limit })
      setLogs(res.logs)
      setPagination(res.pagination)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [filters, pagination.limit])

  useEffect(() => { load() }, [load])

  function methodColor(m: string | null) {
    if (!m) return 'text-gray-500'
    switch (m) {
      case 'GET': return 'text-green-400'
      case 'POST': return 'text-blue-400'
      case 'PUT': return 'text-yellow-400'
      case 'DELETE': return 'text-red-400'
      default: return 'text-gray-400'
    }
  }

  function statusColor(s: number | null) {
    if (!s) return 'text-gray-500'
    if (s < 300) return 'text-green-400'
    if (s < 400) return 'text-yellow-400'
    return 'text-red-400'
  }

  return (
    <div className="max-w-7xl space-y-4">
      <h1 className="text-2xl font-bold">Audit Logs</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search endpoint / IP…"
          value={filters.search}
          onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
          className="px-3 py-1.5 text-sm rounded-lg bg-[#0d0d14] border border-blue-900/20 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/40 w-56"
        />
        <select value={filters.action} onChange={e => setFilters(f => ({ ...f, action: e.target.value }))} className="px-3 py-1.5 text-sm rounded-lg bg-[#0d0d14] border border-blue-900/20 text-gray-300">
          <option value="">All Actions</option>
          {ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <input
          type="date"
          value={filters.startDate}
          onChange={e => setFilters(f => ({ ...f, startDate: e.target.value }))}
          className="px-3 py-1.5 text-sm rounded-lg bg-[#0d0d14] border border-blue-900/20 text-gray-300"
          title="Start date"
        />
        <input
          type="date"
          value={filters.endDate}
          onChange={e => setFilters(f => ({ ...f, endDate: e.target.value }))}
          className="px-3 py-1.5 text-sm rounded-lg bg-[#0d0d14] border border-blue-900/20 text-gray-300"
          title="End date"
        />
      </div>

      {/* Log Table */}
      <div className="rounded-xl border border-blue-900/20 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-[#0d0d14] text-xs text-gray-400 uppercase tracking-wider">
              <th className="text-left p-3">Timestamp</th>
              <th className="text-left p-3">User</th>
              <th className="text-left p-3">Action</th>
              <th className="text-left p-3">Method</th>
              <th className="text-left p-3">Endpoint</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">IP</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center p-8 text-gray-500">Loading…</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={7} className="text-center p-8 text-gray-500">No audit logs found</td></tr>
            ) : logs.map(log => (
              <React.Fragment key={log.id}>
                <tr
                  className="border-t border-blue-900/10 hover:bg-blue-500/5 transition-colors cursor-pointer"
                  onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                >
                  <td className="p-3 text-xs text-gray-400 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="p-3 text-sm text-white">
                    {log.user?.email || `#${log.userId}` || '—'}
                  </td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      {log.action}
                    </span>
                  </td>
                  <td className={`p-3 text-xs font-mono ${methodColor(log.method)}`}>{log.method || '—'}</td>
                  <td className="p-3 text-xs text-gray-300 font-mono max-w-[200px] truncate">{log.endpoint || '—'}</td>
                  <td className={`p-3 text-xs font-mono ${statusColor(log.responseStatus)}`}>{log.responseStatus || '—'}</td>
                  <td className="p-3 text-xs text-gray-500 font-mono">{log.ipAddress || '—'}</td>
                </tr>
                {expandedId === log.id && log.detail && (
                  <tr className="border-t border-blue-900/10">
                    <td colSpan={7} className="p-4 bg-[#0a0a0f]">
                      <p className="text-xs text-gray-400 mb-1">Detail:</p>
                      <pre className="text-xs text-gray-300 bg-[#0d0d14] p-3 rounded-lg overflow-auto max-h-40">
                        {JSON.stringify(log.detail, null, 2)}
                      </pre>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-400">
          <span>{pagination.total} entries</span>
          <div className="flex gap-2">
            <button
              disabled={pagination.page <= 1}
              onClick={() => load(pagination.page - 1)}
              className="px-3 py-1 rounded bg-blue-500/10 hover:bg-blue-500/20 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Prev
            </button>
            <span className="px-3 py-1">Page {pagination.page} / {pagination.totalPages}</span>
            <button
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => load(pagination.page + 1)}
              className="px-3 py-1 rounded bg-blue-500/10 hover:bg-blue-500/20 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
