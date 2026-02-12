'use client'

import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/auth-context'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { listFaceSearchRequests, listShareTokens, FaceSearchRequestSummary } from '@/lib/backend-api'

type AnalyticsStats = {
  totalRequests: number
  completionRate: number
  avgFacesPerRequest: number
  activeShareTokens: number
}

const EMPTY_ANALYTICS: AnalyticsStats = {
  totalRequests: 0,
  completionRate: 0,
  avgFacesPerRequest: 0,
  activeShareTokens: 0,
}

const countFacesFromRequest = (request: FaceSearchRequestSummary) => {
  const data = request.requestData || {}

  if (request.type === 'ONE_TO_ONE') {
    return 2
  }

  if (request.type === 'ONE_TO_N') {
    const targets = Array.isArray(data.targets) ? data.targets.length : 0
    return 1 + targets
  }

  if (request.type === 'N_TO_N') {
    const set1 = Array.isArray(data.set1) ? data.set1.length : 0
    const set2 = Array.isArray(data.set2) ? data.set2.length : 0
    return set1 + set2
  }

  return 0
}

const typeLabel = (type: string) => {
  if (type === 'ONE_TO_ONE') return '1:1 Search'
  if (type === 'ONE_TO_N') return '1:N Search'
  if (type === 'N_TO_N') return 'N:N Search'
  return type
}

export default function AnalyticsPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuth()
  const [requests, setRequests] = useState<FaceSearchRequestSummary[]>([])
  const [stats, setStats] = useState<AnalyticsStats>(EMPTY_ANALYTICS)
  const [statsError, setStatsError] = useState<string | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, isLoading, router])

  useEffect(() => {
    if (!isAuthenticated) return

    let isMounted = true
    const loadAnalytics = async () => {
      try {
        setStatsLoading(true)
        setStatsError(null)

        const [requestList, shareTokens] = await Promise.all([
          listFaceSearchRequests({ limit: 200, offset: 0 }),
          listShareTokens(),
        ])

        if (!isMounted) return

        const now = new Date()
        const completedRequests = requestList.requests.filter(
          (request) => String(request.status).toLowerCase() === 'completed'
        ).length

        const facesProcessed = requestList.requests.reduce(
          (sum, request) => sum + countFacesFromRequest(request),
          0
        )

        const activeShareTokens = shareTokens.tokens.filter((token) => (
          new Date(token.expiresAt) > now
        )).length

        const completionRate = requestList.requests.length > 0
          ? (completedRequests / requestList.requests.length) * 100
          : 0

        const avgFacesPerRequest = requestList.requests.length > 0
          ? facesProcessed / requestList.requests.length
          : 0

        setRequests(requestList.requests)
        setStats({
          totalRequests: requestList.pagination.total,
          completionRate,
          avgFacesPerRequest,
          activeShareTokens,
        })
      } catch (error: any) {
        if (!isMounted) return
        setStatsError(error?.message || 'Failed to load analytics')
        setStats(EMPTY_ANALYTICS)
        setRequests([])
      } finally {
        if (isMounted) {
          setStatsLoading(false)
        }
      }
    }

    loadAnalytics()
    return () => {
      isMounted = false
    }
  }, [isAuthenticated])

  if (isLoading || !isAuthenticated) {
    return null
  }

  const usageTrend = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - (6 - i))
      return date
    })

    return days.map((date) => {
      const count = requests.filter((request) => {
        const createdAt = new Date(request.createdAt)
        return (
          createdAt.getFullYear() === date.getFullYear() &&
          createdAt.getMonth() === date.getMonth() &&
          createdAt.getDate() === date.getDate()
        )
      }).length

      return {
        label: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        count,
      }
    })
  }, [requests])

  const featureDistribution = useMemo(() => {
    const counts = requests.reduce((acc, request) => {
      acc[request.type] = (acc[request.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return [
      { label: '1:1', value: counts.ONE_TO_ONE || 0 },
      { label: '1:N', value: counts.ONE_TO_N || 0 },
      { label: 'N:N', value: counts.N_TO_N || 0 },
    ]
  }, [requests])

  const recentActivity = useMemo(() => {
    return [...requests]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 6)
      .map((request) => ({
        id: request.id,
        type: typeLabel(request.type),
        status: request.status,
        time: new Date(request.createdAt).toLocaleString(),
      }))
  }, [requests])

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/30 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="hover:opacity-80 transition-opacity">
              <Image 
                src="/images/logo-white.png"
                alt="OptiExacta"
                width={40}
                height={40}
                className="w-10 h-10 object-contain"
              />
            </Link>
            <h1 className="text-2xl font-bold text-foreground">Analytics Dashboard</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {[
            { label: 'Total Requests', value: stats.totalRequests.toLocaleString(), change: statsLoading ? 'Loading' : 'All time', icon: '📞' },
            { label: 'Completion Rate', value: `${stats.completionRate.toFixed(1)}%`, change: statsLoading ? 'Loading' : 'Last 200', icon: '✅' },
            { label: 'Avg Faces/Request', value: stats.avgFacesPerRequest.toFixed(2), change: statsLoading ? 'Loading' : 'Last 200', icon: '⚡' },
            { label: 'Active Share Tokens', value: stats.activeShareTokens.toLocaleString(), change: statsLoading ? 'Loading' : 'Active', icon: '🔗' }
          ].map((kpi) => (
            <div key={kpi.label} className="p-6 rounded-lg border border-border bg-card/30">
              <div className="flex items-center justify-between mb-2">
                <p className="text-muted-foreground text-sm">{kpi.label}</p>
                <span className="text-2xl">{kpi.icon}</span>
              </div>
              <p className="text-3xl font-bold text-transparent bg-gradient-to-r from-primary to-secondary bg-clip-text mb-2">
                {kpi.value}
              </p>
              <p className="text-xs text-secondary">{kpi.change}</p>
            </div>
          ))}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Chart 1 */}
          <div className="rounded-lg border border-border bg-card/30 p-6">
            <h3 className="text-lg font-bold text-foreground mb-4">API Usage Trend</h3>
            <div className="h-64 bg-card/50 rounded p-4 flex flex-col justify-end gap-2">
              {usageTrend.map((day) => (
                <div key={day.label} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-16">{day.label}</span>
                  <div className="flex-1 h-2 bg-border rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-secondary"
                      style={{ width: `${Math.min(100, day.count * 10)}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground w-8 text-right">{day.count}</span>
                </div>
              ))}
              {usageTrend.length === 0 && (
                <p className="text-sm text-muted-foreground">No recent requests.</p>
              )}
            </div>
          </div>

          {/* Chart 2 */}
          <div className="rounded-lg border border-border bg-card/30 p-6">
            <h3 className="text-lg font-bold text-foreground mb-4">Feature Distribution</h3>
            <div className="h-64 bg-card/50 rounded p-4 flex flex-col justify-end gap-4">
              {featureDistribution.map((item) => (
                <div key={item.label}>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span>{item.label}</span>
                    <span>{item.value}</span>
                  </div>
                  <div className="h-2 bg-border rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-secondary to-teal-400"
                      style={{ width: `${Math.min(100, item.value * 10)}%` }}
                    />
                  </div>
                </div>
              ))}
              {featureDistribution.every(item => item.value === 0) && (
                <p className="text-sm text-muted-foreground">No requests to summarize.</p>
              )}
            </div>
          </div>
        </div>

        {/* Detailed Reports */}
        <div className="rounded-lg border border-border bg-card/30 p-6">
          <h3 className="text-lg font-bold text-foreground mb-6">Recent Activity</h3>
          <div className="space-y-4">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-card/50">
                <div>
                  <p className="font-semibold text-foreground">{activity.type}</p>
                  <p className="text-sm text-muted-foreground">Status: {activity.status}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-transparent bg-gradient-to-r from-primary to-secondary bg-clip-text">
                    Request
                  </p>
                  <p className="text-xs text-muted-foreground">{activity.time}</p>
                </div>
              </div>
            ))}
            {recentActivity.length === 0 && (
              <p className="text-sm text-muted-foreground">No recent requests found.</p>
            )}
          </div>
        </div>
        {statsError && (
          <p className="mt-6 text-sm text-destructive">{statsError}</p>
        )}
      </main>
    </div>
  )
}
