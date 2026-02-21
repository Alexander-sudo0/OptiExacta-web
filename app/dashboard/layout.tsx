'use client'

import React from "react"
import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/context/auth-context'
import { backendRequest } from '@/lib/backend-api'

type SubStatus = {
  subscription: {
    status: string
    trialEndsAt: string | null
    plan: { code: string; name: string; priceMonthly: number; priceYearly: number }
  }
  limits: {
    dailyRequestLimit: number
    monthlyRequestLimit: number
    monthlyVideoLimit: number
    maxImageSize: number
    maxVideoSize: number
    softDailyLimit: boolean
  }
  usage: { monthRequests: number; dayRequests: number; monthVideos: number }
  features: Record<string, boolean>
}

type UserRole = {
  systemRole: 'SUPER_ADMIN' | 'USER'
  email: string
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [userRole, setUserRole] = useState<UserRole | null>(null)
  const [subStatus, setSubStatus] = useState<SubStatus | null>(null)
  const pathname = usePathname()
  const router = useRouter()
  const { logout, idToken, user, isLoading, isAuthenticated } = useAuth()

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, isLoading, router])

  // Load subscription status + user role from backend using backendRequest (handles auth automatically)
  useEffect(() => {
    if (!isAuthenticated) return

    // Get user role from /api/me
    backendRequest('/api/me')
      .then((data: any) => {
        if (data) {
          console.log('[layout] /api/me response:', data.user?.systemRole, data.user?.email)
          setUserRole({
            systemRole: data.user?.systemRole || 'USER',
            email: data.user?.email || '',
          })
        }
      })
      .catch((err: any) => {
        console.error('[layout] /api/me failed:', err)
        setUserRole(null)
      })

    // Get subscription/plan status
    backendRequest('/api/payments/status')
      .then((data: any) => {
        console.log('[layout] /api/payments/status response:', data?.subscription?.plan?.code)
        if (data) setSubStatus(data)
      })
      .catch((err: any) => {
        console.error('[layout] /api/payments/status failed:', err)
      })
  }, [isAuthenticated])

  const navItems = [
    { 
      label: 'Dashboard', 
      href: '/dashboard',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      )
    },
    { 
      label: '1:1 Search', 
      href: '/dashboard/face-search-1-1',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      )
    },
    { 
      label: '1:N Search', 
      href: '/dashboard/face-search-1-n',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      )
    },
    { 
      label: 'N:N Search', 
      href: '/dashboard/face-search-n-n',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      )
    },
    { 
      label: 'Video Processing', 
      href: '/dashboard/video-processing',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      )
    },
    { 
      label: 'API Keys', 
      href: '/dashboard/api-keys',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
        </svg>
      )
    },
  ]

  const isAdmin = userRole?.systemRole === 'SUPER_ADMIN'
  const planCode = subStatus?.subscription?.plan?.code || 'FREE'
  const planName = subStatus?.subscription?.plan?.name || 'Free'
  const subStatusLabel = subStatus?.subscription?.status || 'TRIAL'
  const monthUsage = subStatus?.usage?.monthRequests || 0
  const monthLimit = subStatus?.limits?.monthlyRequestLimit || 0
  const usagePct = monthLimit > 0 ? Math.min(100, Math.round((monthUsage / monthLimit) * 100)) : 0
  const isUnlimited = monthLimit === 0 || monthLimit === -1 || isAdmin

  const planColors: Record<string, string> = {
    FREE: 'from-gray-500 to-gray-600',
    PRO: 'from-primary to-cyan-400',
    ENTERPRISE: 'from-purple-500 to-pink-500',
  }

  const roleBadge = userRole?.systemRole === 'SUPER_ADMIN' ? 'SUPER ADMIN' : 'USER'
  const roleBadgeColor = userRole?.systemRole === 'SUPER_ADMIN' ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-blue-500/20 text-blue-400 border-blue-500/30'

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 rounded-xl border-4 border-border border-t-primary animate-spin" />
      </div>
    )
  }

  if (!isAuthenticated) return null

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <AnimatePresence mode="wait">
        {sidebarOpen && (
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="w-72 border-r border-border bg-card/50 backdrop-blur-xl flex flex-col"
          >
            {/* Logo */}
            <div className="p-6 border-b border-border">
              <Link href="/" className="flex items-center gap-3 group">
                <div className="relative">
                  <Image 
                    src="/images/visionera-logo-white.png"
                    alt="VisionEra"
                    width={40}
                    height={40}
                    className="w-10 h-10 object-contain group-hover:scale-110 transition-transform"
                  />
                  <div className="absolute inset-0 rounded-lg bg-primary/20 blur-xl group-hover:bg-primary/30 transition-colors" />
                </div>
                <div>
                  <span className="text-lg font-bold text-foreground block">VisionEra</span>
                  <span className="text-[10px] text-muted-foreground font-medium tracking-wider">FACIAL RECOGNITION</span>
                </div>
              </Link>
            </div>

            {/* User Profile */}
            <div className="px-4 pt-4 pb-2">
              <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-card/60 border border-border">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-sm font-bold shrink-0">
                  {(user?.displayName || user?.email || '?').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{user?.displayName || user?.email || 'User'}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${roleBadgeColor}`}>{roleBadge}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
              {navItems.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`group flex items-center gap-3 px-4 py-3 rounded-xl transition-all relative ${
                      isActive 
                        ? 'bg-gradient-to-r from-primary to-secondary text-primary-foreground shadow-lg shadow-primary/20' 
                        : 'text-muted-foreground hover:text-foreground hover:bg-card/80'
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute inset-0 bg-gradient-to-r from-primary to-secondary rounded-xl"
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                      />
                    )}
                    <span className={`relative z-10 ${isActive ? 'text-white' : 'text-muted-foreground group-hover:text-primary'} transition-colors`}>
                      {item.icon}
                    </span>
                    <span className={`relative z-10 font-medium text-sm ${isActive ? 'text-white' : ''}`}>
                      {item.label}
                    </span>
                    {isActive && (
                      <motion.span 
                        className="ml-auto text-white text-xs"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                      >
                        ●
                      </motion.span>
                    )}
                  </Link>
                )
              })}
            </nav>

            {/* Bottom Actions */}
            <div className="p-4 border-t border-border space-y-3">
              {/* Current Plan */}
              <div className={`px-4 py-3 rounded-xl bg-gradient-to-r ${planColors[planCode] || planColors.FREE} bg-opacity-10 border border-white/10`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-white/90 uppercase tracking-wider">
                    {isAdmin ? 'Super Admin' : `${planName} Plan`}
                  </span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    subStatusLabel === 'ACTIVE' ? 'bg-green-500/20 text-green-300' :
                    subStatusLabel === 'TRIAL' ? 'bg-yellow-500/20 text-yellow-300' :
                    'bg-red-500/20 text-red-300'
                  }`}>{isAdmin ? 'UNLIMITED' : subStatusLabel}</span>
                </div>
                {isUnlimited ? (
                  <div className="mt-2">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                      </svg>
                      <span className="text-[10px] text-white/70">Unlimited Usage</span>
                    </div>
                  </div>
                ) : monthLimit > 0 ? (
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-[10px] text-white/70 mb-1">
                      <span>{monthUsage} / {monthLimit} requests</span>
                      <span>{usagePct}%</span>
                    </div>
                    <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${usagePct > 90 ? 'bg-red-400' : usagePct > 70 ? 'bg-yellow-400' : 'bg-white/80'}`}
                        style={{ width: `${usagePct}%` }}
                      />
                    </div>
                  </div>
                ) : null}
                {planCode === 'FREE' && !isAdmin && (
                  <Link href="/pricing" className="block mt-2 text-[10px] text-white/80 hover:text-white font-semibold underline underline-offset-2">
                    Upgrade Plan →
                  </Link>
                )}
              </div>

              {isAdmin && (
                <Link
                  href="/admin"
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-red-500/10 to-blue-500/10 border border-red-500/20 hover:border-red-500/40 text-red-400 hover:text-red-300 transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                  <span className="font-semibold text-sm">Admin Panel</span>
                  <span className="ml-auto text-xs bg-red-500/20 px-2 py-0.5 rounded-full">ADMIN</span>
                </Link>
              )}
              
              <button
                onClick={logout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="font-medium text-sm">Logout</span>
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="border-b border-border px-6 py-4 bg-card/30 backdrop-blur-xl flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)} 
              className="w-10 h-10 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-card/50 transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            
            {!sidebarOpen && (
              <Link href="/" className="flex items-center gap-2">
                <Image 
                  src="/images/visionera-logo-white.png"
                  alt="VisionEra"
                  width={32}
                  height={32}
                  className="w-8 h-8 object-contain"
                />
                <span className="font-bold text-foreground">VisionEra</span>
              </Link>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Link
              href={isAdmin ? '/admin' : '/pricing'}
              className={`px-4 py-2 rounded-xl bg-gradient-to-r ${isAdmin ? 'from-red-500 to-pink-500' : planColors[planCode] || planColors.FREE} text-white text-xs font-semibold flex items-center gap-2`}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              {isAdmin ? 'Super Admin' : `${planName} Plan`}
            </Link>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
