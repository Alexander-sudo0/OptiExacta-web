'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { getAbuseFlags, resolveAbuseFlag, runAbuseScan, type AbuseFlag } from '@/lib/admin-api'

function severityBadge(sev: string) {
  const colors: Record<string, string> = {
    LOW: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    MEDIUM: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    HIGH: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    CRITICAL: 'bg-red-500/10 text-red-400 border-red-500/20',
  }
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border ${colors[sev] || colors.MEDIUM}`}>
      {sev}
    </span>
  )
}

export default function AbuseFlagsPage() {
  const [flags, setFlags] = useState<AbuseFlag[]>([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 })
  const [showResolved, setShowResolved] = useState(false)
  const [severity, setSeverity] = useState('')
  const [scanning, setScanning] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  const load = useCallback(async (page = 1) => {
    setLoading(true)
    try {
      const res = await getAbuseFlags({
        resolved: showResolved ? 'true' : 'false',
        severity: severity || undefined,
        page,
        limit: pagination.limit,
      })
      setFlags(res.flags)
      setPagination(res.pagination)
    } catch {
      setFeedback({ type: 'error', msg: 'Failed to load abuse flags' })
    } finally {
      setLoading(false)
    }
  }, [showResolved, severity, pagination.limit])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (feedback) {
      const t = setTimeout(() => setFeedback(null), 3000)
      return () => clearTimeout(t)
    }
  }, [feedback])

  async function handleResolve(flagId: string) {
    try {
      await resolveAbuseFlag(flagId)
      setFeedback({ type: 'success', msg: 'Flag resolved' })
      load(pagination.page)
    } catch (e: any) {
      setFeedback({ type: 'error', msg: e.message || 'Failed to resolve flag' })
    }
  }

  async function handleScan() {
    setScanning(true)
    try {
      const res = await runAbuseScan()
      setFeedback({ type: 'success', msg: `Scan complete — ${res.newFlags} new flag(s) found` })
      load()
    } catch (e: any) {
      setFeedback({ type: 'error', msg: e.message || 'Scan failed' })
    } finally {
      setScanning(false)
    }
  }

  return (
    <div className="max-w-7xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Abuse Flags</h1>
        <button
          onClick={handleScan}
          disabled={scanning}
          className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 rounded-lg font-medium disabled:opacity-50 flex items-center gap-2"
        >
          {scanning && <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full inline-block" />}
          {scanning ? 'Scanning…' : 'Run Abuse Scan'}
        </button>
      </div>

      {/* Feedback */}
      {feedback && (
        <div className={`p-3 rounded-lg text-sm ${feedback.type === 'success' ? 'bg-green-500/10 border border-green-500/20 text-green-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}>
          {feedback.msg}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
          <input type="checkbox" checked={showResolved} onChange={e => setShowResolved(e.target.checked)} className="accent-blue-500" />
          Show resolved
        </label>
        <select value={severity} onChange={e => setSeverity(e.target.value)} className="px-3 py-1.5 text-sm rounded-lg bg-[#0d0d14] border border-blue-900/20 text-gray-300">
          <option value="">All Severities</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="CRITICAL">Critical</option>
        </select>
      </div>

      {/* Flags */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
          </div>
        ) : flags.length === 0 ? (
          <div className="p-8 text-center text-gray-500 border border-blue-900/20 rounded-xl">
            No abuse flags found
          </div>
        ) : flags.map(flag => (
          <div key={flag.id} className={`p-4 rounded-xl border ${flag.resolved ? 'border-green-500/10 bg-green-500/5' : 'border-red-500/10 bg-red-500/5'}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {severityBadge(flag.severity)}
                  {flag.resolved && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-green-500/10 text-green-400 border border-green-500/20">
                      RESOLVED
                    </span>
                  )}
                </div>
                <p className="text-sm text-white font-medium mt-2">{flag.reason}</p>
                <p className="text-xs text-gray-400 mt-1">
                  User: {flag.user?.email || `#${flag.userId}`} — {new Date(flag.createdAt).toLocaleString()}
                </p>
                {flag.details && (
                  <pre className="text-[10px] text-gray-500 mt-2 bg-[#0d0d14] p-2 rounded max-h-20 overflow-auto">
                    {JSON.stringify(flag.details, null, 2)}
                  </pre>
                )}
                {flag.resolvedAt && (
                  <p className="text-[10px] text-green-500 mt-1">
                    Resolved {new Date(flag.resolvedAt).toLocaleString()}
                  </p>
                )}
              </div>
              {!flag.resolved && (
                <button
                  onClick={() => handleResolve(flag.id)}
                  className="px-3 py-1.5 text-xs bg-green-600/20 hover:bg-green-600/30 text-green-400 rounded-lg font-medium shrink-0"
                >
                  Resolve
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-400">
          <span>{pagination.total} flags</span>
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
