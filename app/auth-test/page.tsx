'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/context/auth-context'

export default function AuthTestPage() {
  const { user, isAuthenticated, isLoading, idToken } = useAuth()
  const [cookies, setCookies] = useState('')
  const [authStatus, setAuthStatus] = useState<any>({})

  useEffect(() => {
    setCookies(document.cookie)
    
    // Test session API
    fetch('/api/auth/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'test-token' })
    }).then(res => res.json()).then(data => {
      setAuthStatus(prev => ({ ...prev, sessionTest: data }))
    })
  }, [])

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">Auth Diagnostics</h1>
        
        <div className="bg-card border border-border rounded-lg p-6 space-y-4">
          <h2 className="text-xl font-semibold">Auth Context State</h2>
          <div className="space-y-2 font-mono text-sm">
            <div>isLoading: <span className={isLoading ? 'text-yellow-500' : 'text-green-500'}>{String(isLoading)}</span></div>
            <div>isAuthenticated: <span className={isAuthenticated ? 'text-green-500' : 'text-red-500'}>{String(isAuthenticated)}</span></div>
            <div>user: {user ? JSON.stringify(user, null, 2) : 'null'}</div>
            <div>has idToken: {idToken ? '✅ Yes' : '❌ No'}</div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-6 space-y-4">
          <h2 className="text-xl font-semibold">Browser Cookies</h2>
          <div className="font-mono text-sm break-all">
            {cookies || 'No cookies found'}
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-6 space-y-4">
          <h2 className="text-xl font-semibold">Environment</h2>
          <div className="space-y-2 font-mono text-sm">
            <div>NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: {process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN}</div>
            <div>NEXT_PUBLIC_BACKEND_URL: {process.env.NEXT_PUBLIC_BACKEND_URL}</div>
            <div>Current URL: {typeof window !== 'undefined' ? window.location.href : 'N/A'}</div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-6 space-y-4">
          <h2 className="text-xl font-semibold">Session API Test</h2>
          <pre className="font-mono text-sm overflow-auto">
            {JSON.stringify(authStatus, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  )
}
