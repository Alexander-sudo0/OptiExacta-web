'use client'

import React, { useEffect, useState } from 'react'
import { getAdminStats, type AdminStats } from '@/lib/admin-api'

function StatCard({ label, value, sub, color = 'blue' }: { label: string; value: string | number; sub?: string; color?: string }) {
  const colors: Record<string, string> = {
    blue: 'text-blue-400 border-blue-500/20 bg-blue-500/5',
    green: 'text-green-400 border-green-500/20 bg-green-500/5',
    red: 'text-red-400 border-red-500/20 bg-red-500/5',
    yellow: 'text-yellow-400 border-yellow-500/20 bg-yellow-500/5',
    purple: 'text-purple-400 border-purple-500/20 bg-purple-500/5',
  }
  return (
    <div className={`p-5 rounded-xl border ${colors[color] || colors.blue}`}>
      <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-3xl font-bold ${colors[color]?.split(' ')[0]}`}>{value}</p>
      {sub && <p className="text-gray-500 text-xs mt-1">{sub}</p>}
    </div>
  )
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    getAdminStats()
      .then(setStats)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const freeUsers = stats?.plans.find(p => p.code === 'FREE')?.count || 0
  const proUsers = stats?.plans.find(p => p.code === 'PRO')?.count || 0
  const entUsers = stats?.plans.find(p => p.code === 'ENTERPRISE')?.count || 0
  const trialCount = stats?.subscriptions.find(s => s.status === 'TRIAL')?.count || 0
  const canceledCount = stats?.subscriptions.find(s => s.status === 'CANCELED')?.count || 0

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
        Error loading admin stats: {error}
      </div>
    )
  }

  if (!stats) {
    return null
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">System Overview</h1>
        <span className="text-xs text-gray-500">Last updated: {new Date().toLocaleTimeString()}</span>
      </div>

      {/* Primary metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Users" value={stats.users.total} sub={`+${stats.users.recentSignups} this week`} color="blue" />
        <StatCard label="Active Users" value={stats.users.active} sub="Last 30 days" color="green" />
        <StatCard label="API Calls Today" value={stats.apiCalls.today.toLocaleString()} color="purple" />
        <StatCard label="API Calls Month" value={stats.apiCalls.month.toLocaleString()} color="blue" />
      </div>

      {/* Secondary metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard label="Free Users" value={freeUsers} color="blue" />
        <StatCard label="Pro Users" value={proUsers} color="green" />
        <StatCard label="Enterprise" value={entUsers} color="purple" />
        <StatCard label="Suspended" value={stats.users.suspended} color="yellow" />
        <StatCard label="Banned" value={stats.users.banned} color="red" />
      </div>

      {/* Subscription & Revenue */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="p-5 rounded-xl border border-blue-900/20 bg-[#0d0d14]">
          <h2 className="text-sm font-semibold text-gray-300 mb-4">Subscription Status</h2>
          <div className="space-y-3">
            {stats.subscriptions.map((s) => (
              <div key={s.status} className="flex items-center justify-between">
                <span className="text-sm text-gray-400">{s.status}</span>
                <span className="text-sm font-mono text-white">{s.count}</span>
              </div>
            ))}
            {stats.subscriptions.length === 0 && (
              <p className="text-gray-500 text-sm">No subscription data</p>
            )}
          </div>
        </div>

        <div className="p-5 rounded-xl border border-blue-900/20 bg-[#0d0d14]">
          <h2 className="text-sm font-semibold text-gray-300 mb-4">Revenue Summary</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">Monthly Total</span>
              <span className="text-2xl font-bold text-green-400">${stats.revenue.monthly.toFixed(2)}</span>
            </div>
            {stats.revenue.breakdown.map((b) => (
              <div key={b.code} className="flex items-center justify-between text-sm">
                <span className="text-gray-400">{b.code} ({b.active_tenants} tenants)</span>
                <span className="text-gray-300">${b.monthly_revenue.toFixed(2)}/mo</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Usage Trend */}
      <div className="p-5 rounded-xl border border-blue-900/20 bg-[#0d0d14]">
        <h2 className="text-sm font-semibold text-gray-300 mb-4">API Usage Trend (14 days)</h2>
        {stats?.usageTrend && stats.usageTrend.length > 0 ? (
          <div className="flex items-end gap-1 h-32">
            {stats.usageTrend.map((day, i) => {
              const max = Math.max(...stats.usageTrend.map(d => d.calls), 1)
              const height = (day.calls / max) * 100
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[9px] text-gray-500">{day.calls}</span>
                  <div
                    className="w-full bg-blue-500/30 rounded-t min-h-[2px]"
                    style={{ height: `${Math.max(height, 2)}%` }}
                  />
                  <span className="text-[8px] text-gray-600">
                    {new Date(day.date).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No usage data yet</p>
        )}
      </div>

      {/* Abuse flags alert */}
      {stats?.abuseFlags && stats.abuseFlags > 0 && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="text-red-400 text-sm font-medium">
              {stats.abuseFlags} unresolved abuse flag{stats.abuseFlags !== 1 ? 's' : ''}
            </span>
          </div>
          <a href="/admin/abuse-flags" className="text-xs text-red-400 hover:text-red-300 underline">
            View flags →
          </a>
        </div>
      )}
    </div>
  )
}
