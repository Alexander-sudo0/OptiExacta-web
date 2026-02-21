'use client'

import React, { useState, useEffect } from "react"
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/context/auth-context'
import { backendRequest } from '@/lib/backend-api'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { idToken, isLoading: authLoading, isAuthenticated } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)

  useEffect(() => {
    if (authLoading) return
    if (!isAuthenticated) {
      router.replace('/login')
      return
    }

    // Check if user has SUPER_ADMIN role
    async function checkAccess() {
      try {
        const data = await backendRequest('/api/admin/stats')
        if (data) {
          setAuthorized(true)
        } else {
          router.replace('/dashboard')
        }
      } catch (err: any) {
        if (err?.message?.includes('403') || err?.message?.includes('401')) {
          router.replace('/dashboard')
        } else {
          router.replace('/dashboard')
        }
      } finally {
        setLoading(false)
      }
    }
    
    checkAccess()
  }, [isAuthenticated, authLoading, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!authorized) {
    return null
  }

  const navItems = [
    {
      label: 'Dashboard',
      href: '/admin',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      ),
    },
    {
      label: 'Users',
      href: '/admin/users',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
    {
      label: 'Audit Logs',
      href: '/admin/audit-logs',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      label: 'API Keys',
      href: '/admin/api-keys',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
        </svg>
      ),
    },
    {
      label: 'Abuse Flags',
      href: '/admin/abuse-flags',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
    },
  ]

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin'
    return pathname.startsWith(href)
  }

  return (
    <div className="flex h-screen bg-[#0a0a0f] text-white overflow-hidden">
      <aside className={`${sidebarOpen ? 'w-64' : 'w-16'} transition-all duration-300 border-r border-blue-900/20 bg-[#0d0d14] flex flex-col`}>
        <div className="p-4 border-b border-blue-900/20 flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-8 h-8 bg-red-500/20 border border-red-500/30 rounded flex items-center justify-center hover:bg-red-500/30 transition"
          >
            <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </button>
          {sidebarOpen && (
            <div>
              <h1 className="font-bold text-sm text-red-400">Admin Panel</h1>
              <p className="text-[10px] text-gray-500">SUPER_ADMIN</p>
            </div>
          )}
        </div>

        <nav className="flex-1 p-2 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                isActive(item.href)
                  ? 'bg-blue-500/15 text-blue-400 border border-blue-500/20'
                  : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
              }`}
            >
              {item.icon}
              {sidebarOpen && <span>{item.label}</span>}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-blue-900/20">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-300 transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
            </svg>
            {sidebarOpen && 'Back to Dashboard'}
          </Link>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="border-b border-blue-900/20 px-6 py-3 bg-[#0d0d14]/80 backdrop-blur flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono bg-red-500/10 text-red-400 px-2 py-0.5 rounded border border-red-500/20">
              ADMIN
            </span>
            <span className="text-sm text-gray-400">
              {navItems.find(i => isActive(i.href))?.label || 'Admin'}
            </span>
          </div>
          <span className="text-xs text-gray-500">VisionEra</span>
        </header>

        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
