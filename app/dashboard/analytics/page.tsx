'use client'

import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/auth-context'
import { useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'

export default function AnalyticsPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuth()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, isLoading, router])

  if (isLoading || !isAuthenticated) {
    return null
  }

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
            { label: 'API Calls', value: '125,420', change: '+12.5%', icon: '📞' },
            { label: 'Accuracy Rate', value: '99.87%', change: '+0.12%', icon: '⭐' },
            { label: 'Avg Response', value: '47ms', change: '-3ms', icon: '⚡' },
            { label: 'Success Rate', value: '99.94%', change: '+0.05%', icon: '✅' }
          ].map((kpi) => (
            <div key={kpi.label} className="p-6 rounded-lg border border-border bg-card/30">
              <div className="flex items-center justify-between mb-2">
                <p className="text-muted-foreground text-sm">{kpi.label}</p>
                <span className="text-2xl">{kpi.icon}</span>
              </div>
              <p className="text-3xl font-bold text-transparent bg-gradient-to-r from-primary to-secondary bg-clip-text mb-2">
                {kpi.value}
              </p>
              <p className="text-xs text-secondary">{kpi.change} vs last month</p>
            </div>
          ))}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Chart 1 */}
          <div className="rounded-lg border border-border bg-card/30 p-6">
            <h3 className="text-lg font-bold text-foreground mb-4">API Usage Trend</h3>
            <div className="h-64 flex items-center justify-center bg-card/50 rounded">
              <div className="text-center">
                <div className="text-4xl mb-2">📊</div>
                <p className="text-muted-foreground">Usage chart</p>
              </div>
            </div>
          </div>

          {/* Chart 2 */}
          <div className="rounded-lg border border-border bg-card/30 p-6">
            <h3 className="text-lg font-bold text-foreground mb-4">Feature Distribution</h3>
            <div className="h-64 flex items-center justify-center bg-card/50 rounded">
              <div className="text-center">
                <div className="text-4xl mb-2">🎯</div>
                <p className="text-muted-foreground">Distribution chart</p>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Reports */}
        <div className="rounded-lg border border-border bg-card/30 p-6">
          <h3 className="text-lg font-bold text-foreground mb-6">Recent Activity</h3>
          <div className="space-y-4">
            {[
              { type: '1:1 Search', count: 342, accuracy: '99.9%', time: '2 hours ago' },
              { type: '1:N Search', count: 128, accuracy: '99.8%', time: '1 hour ago' },
              { type: 'Watchlist Detection', count: 54, accuracy: '99.7%', time: '30 min ago' },
              { type: 'Video Processing', count: 23, accuracy: '99.6%', time: '15 min ago' }
            ].map((activity, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-card/50">
                <div>
                  <p className="font-semibold text-foreground">{activity.type}</p>
                  <p className="text-sm text-muted-foreground">{activity.count} operations</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-transparent bg-gradient-to-r from-primary to-secondary bg-clip-text">
                    {activity.accuracy}
                  </p>
                  <p className="text-xs text-muted-foreground">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
