'use client'

import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/auth-context'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { listFaceSearchRequests, listShareTokens, FaceSearchRequestSummary } from '@/lib/backend-api'

type DashboardStats = {
  apiCallsToday: number
  facesProcessedToday: number
  activeShareTokens: number
  systemStatus: 'Online' | 'Degraded'
  monthRequests: number
  monthFacesProcessed: number
  completionRate: number
  totalRequests: number
}

const EMPTY_STATS: DashboardStats = {
  apiCallsToday: 0,
  facesProcessedToday: 0,
  activeShareTokens: 0,
  systemStatus: 'Degraded',
  monthRequests: 0,
  monthFacesProcessed: 0,
  completionRate: 0,
  totalRequests: 0,
}

const isSameDay = (a: Date, b: Date) => (
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate()
)

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

export default function DashboardPage() {
  const router = useRouter()
  const { user, isAuthenticated, logout, isLoading } = useAuth()
  const [stats, setStats] = useState<DashboardStats>(EMPTY_STATS)
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
    const loadStats = async () => {
      try {
        setStatsLoading(true)
        setStatsError(null)

        const [requestList, shareTokens] = await Promise.all([
          listFaceSearchRequests({ limit: 200, offset: 0 }),
          listShareTokens(),
        ])

        if (!isMounted) return

        const now = new Date()
        const monthAgo = new Date()
        monthAgo.setDate(monthAgo.getDate() - 30)

        let apiCallsToday = 0
        let facesProcessedToday = 0
        let monthRequests = 0
        let monthFacesProcessed = 0
        let completedRequests = 0

        requestList.requests.forEach((request) => {
          const createdAt = new Date(request.createdAt)
          const faces = countFacesFromRequest(request)

          if (isSameDay(createdAt, now)) {
            apiCallsToday += 1
            facesProcessedToday += faces
          }

          if (createdAt >= monthAgo) {
            monthRequests += 1
            monthFacesProcessed += faces
          }

          if (String(request.status).toLowerCase() === 'completed') {
            completedRequests += 1
          }
        })

        const activeShareTokens = shareTokens.tokens.filter((token) => (
          new Date(token.expiresAt) > now
        )).length

        const completionRate = requestList.requests.length > 0
          ? (completedRequests / requestList.requests.length) * 100
          : 0

        setStats({
          apiCallsToday,
          facesProcessedToday,
          activeShareTokens,
          systemStatus: 'Online',
          monthRequests,
          monthFacesProcessed,
          completionRate,
          totalRequests: requestList.pagination.total,
        })
      } catch (error: any) {
        if (!isMounted) return
        setStatsError(error?.message || 'Failed to load dashboard stats')
        setStats(EMPTY_STATS)
      } finally {
        if (isMounted) {
          setStatsLoading(false)
        }
      }
    }

    loadStats()
    return () => {
      isMounted = false
    }
  }, [isAuthenticated])

  // Define all hooks BEFORE conditional returns (React rules of hooks)
  const features = [
    {
      id: '1-to-1',
      name: '1:1 Face Verification',
      description: 'Compare two facial images for identity verification and authentication',
      href: '/dashboard/face-search-1-1',
      icon: (
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      stats: '99.9% Accuracy',
      color: 'from-primary to-cyan-400'
    },
    {
      id: '1-to-n',
      name: '1:N Face Search',
      description: 'Search a face against your database of millions of identities',
      href: '/dashboard/face-search-1-n',
      icon: (
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      ),
      stats: 'Real-time',
      color: 'from-secondary to-teal-400'
    },

    {
      id: 'video',
      name: 'Video Processing',
      description: 'Process video streams frame-by-frame for continuous monitoring',
      href: '/dashboard/video-processing',
      icon: (
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      ),
      stats: 'Live Streaming',
      color: 'from-purple-500 to-pink-500'
    },
    {
      id: 'analytics',
      name: 'Analytics Dashboard',
      description: 'Comprehensive insights and reporting on facial recognition events',
      href: '/dashboard/analytics',
      icon: (
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      stats: 'Real-time Data',
      color: 'from-blue-500 to-indigo-500'
    },

  ]

  const quickStats = useMemo(() => (
    [
      { label: 'API Calls Today', value: stats.apiCallsToday.toLocaleString(), icon: '📡', change: statsLoading ? 'Loading' : 'Live' },
      { label: 'Faces Processed Today', value: stats.facesProcessedToday.toLocaleString(), icon: '👤', change: statsLoading ? 'Loading' : 'Live' },
      { label: 'API Calls (30d)', value: stats.monthRequests.toLocaleString(), icon: '📊', change: statsLoading ? 'Loading' : `${stats.totalRequests.toLocaleString()} total` },
      { label: 'Completion Rate', value: `${stats.completionRate.toFixed(1)}%`, icon: '✅', change: statsLoading ? 'Loading' : 'Completed' },
    ]
  ), [stats, statsLoading])

  // Conditional returns AFTER all hooks
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl border-4 border-border border-t-primary animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Welcome Section */}
        <motion.div 
          className="mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
            Welcome back, <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">{user?.displayName || 'User'}</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Access OptiExacta's powerful facial recognition features
          </p>
        </motion.div>

        {/* Quick Stats */}
        <motion.div 
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {quickStats.map((stat, i) => (
            <motion.div 
              key={stat.label}
              className="p-4 rounded-xl border border-border bg-card/30 hover:bg-card/50 transition-colors"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 + i * 0.05 }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">{stat.icon}</span>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-secondary/10 text-secondary">
                  {stat.change}
                </span>
              </div>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Features Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            Recognition Tools
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((feature, i) => (
              <motion.div
                key={feature.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.3 + i * 0.08 }}
              >
                <Link
                  href={feature.href}
                  className="group block p-6 rounded-2xl border border-border bg-card/30 hover:bg-card/60 transition-all hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 relative overflow-hidden"
                >
                  {/* Gradient background on hover */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-5 transition-opacity`} />
                  
                  <div className="relative">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} bg-opacity-20 flex items-center justify-center text-white group-hover:scale-110 transition-transform`}>
                        {feature.icon}
                      </div>
                      <span className="text-xs font-semibold px-3 py-1 rounded-full bg-card border border-border text-muted-foreground group-hover:border-primary/30 group-hover:text-primary transition-colors">
                        {feature.stats}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                      {feature.name}
                    </h3>
                    <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                      {feature.description}
                    </p>
                    <div className="flex items-center gap-2 text-primary text-sm font-semibold group-hover:gap-3 transition-all">
                      Open Tool
                      <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Platform Stats */}
        <motion.div 
          className="mt-12 pt-8 border-t border-border"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <h3 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
            <svg className="w-5 h-5 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Platform Performance
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {[
              { label: 'API Calls (30d)', value: stats.monthRequests.toLocaleString(), trend: statsLoading ? 'Loading' : `${stats.totalRequests.toLocaleString()} total` },
              { label: 'Faces Processed (30d)', value: stats.monthFacesProcessed.toLocaleString(), trend: statsLoading ? 'Loading' : 'Based on requests' },
              { label: 'Completion Rate', value: `${stats.completionRate.toFixed(1)}%`, trend: statsLoading ? 'Loading' : 'Completed' },
            ].map((stat, i) => (
              <motion.div 
                key={stat.label} 
                className="p-5 rounded-xl border border-border bg-card/30"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 + i * 0.1 }}
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <span className="text-xs font-medium text-secondary">{stat.trend}</span>
                </div>
                <p className="text-3xl font-bold text-transparent bg-gradient-to-r from-primary to-secondary bg-clip-text">
                  {stat.value}
                </p>
              </motion.div>
            ))}
          </div>
          {statsError && (
            <p className="mt-4 text-sm text-destructive">{statsError}</p>
          )}
        </motion.div>
      </main>
    </div>
  )
}
