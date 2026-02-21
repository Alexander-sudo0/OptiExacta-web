'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/auth-context'
import { backendRequest } from '@/lib/backend-api'
import { motion, AnimatePresence } from 'framer-motion'

/* ═══════════ Types ═══════════ */

type ApiKeyItem = {
  id: string
  name: string
  keyPrefix: string
  maskedKey: string
  scopes: string[]
  lastUsedAt: string | null
  expiresAt: string | null
  revokedAt: string | null
  isActive: boolean
  isExpired: boolean
  createdAt: string
  createdBy: string
}

type KeysMeta = { keysUsed: number; keysLimit: number; planCode: string }

/* ═══════════ Constants ═══════════ */

const EXPIRY_OPTIONS = [
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
  { value: '180d', label: '6 months' },
  { value: '365d', label: '1 year' },
  { value: 'never', label: 'No expiry' },
]

/* ═══════════ Main Component ═══════════ */

export default function ApiKeysPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuth()

  const [keys, setKeys] = useState<ApiKeyItem[]>([])
  const [meta, setMeta] = useState<KeysMeta>({ keysUsed: 0, keysLimit: 1, planCode: 'FREE' })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [showCreate, setShowCreate] = useState(false)
  const [keyName, setKeyName] = useState('')
  const [expiry, setExpiry] = useState('90d')
  const [creating, setCreating] = useState(false)

  const [newKeyData, setNewKeyData] = useState<{ key: string; name: string; id: string } | null>(null)
  const [newKeyCopied, setNewKeyCopied] = useState(false)

  const [revealedKeys, setRevealedKeys] = useState<Record<string, string>>({})
  const [revealingId, setRevealingId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const [revokeTarget, setRevokeTarget] = useState<ApiKeyItem | null>(null)
  const [revoking, setRevoking] = useState(false)

  const [activeTab, setActiveTab] = useState(0)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push('/login')
  }, [isAuthenticated, isLoading, router])

  const loadKeys = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res: any = await backendRequest('/api/api-keys')
      setKeys(res.data || [])
      if (res.meta) setMeta(res.meta)
    } catch (err: any) {
      setError(err.message || 'Failed to load API keys')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isAuthenticated) loadKeys()
  }, [isAuthenticated, loadKeys])

  /* ── Actions ── */

  const handleCreate = async () => {
    if (!keyName.trim()) return
    try {
      setCreating(true)
      setError(null)
      const res: any = await backendRequest('/api/api-keys', {
        method: 'POST',
        body: JSON.stringify({ name: keyName.trim(), expiry }),
      })
      setNewKeyData({ key: res.data.key, name: res.data.name, id: res.data.id })
      setKeyName('')
      setExpiry('90d')
      setShowCreate(false)
      loadKeys()
    } catch (err: any) {
      setError(err.message || 'Failed to create API key')
    } finally {
      setCreating(false)
    }
  }

  const handleReveal = async (keyId: string) => {
    if (revealedKeys[keyId]) {
      setRevealedKeys((prev) => { const n = { ...prev }; delete n[keyId]; return n })
      return
    }
    try {
      setRevealingId(keyId)
      const res: any = await backendRequest(`/api/api-keys/${keyId}/reveal`)
      setRevealedKeys((prev) => ({ ...prev, [keyId]: res.data.key }))
    } catch (err: any) {
      setError(err.message || 'Failed to reveal key')
    } finally {
      setRevealingId(null)
    }
  }

  const handleRevoke = async () => {
    if (!revokeTarget) return
    try {
      setRevoking(true)
      await backendRequest(`/api/api-keys/${revokeTarget.id}`, { method: 'DELETE' })
      const id = revokeTarget.id
      setRevokeTarget(null)
      setRevealedKeys((prev) => { const n = { ...prev }; delete n[id]; return n })
      loadKeys()
    } catch (err: any) {
      setError(err.message || 'Failed to revoke key')
    } finally {
      setRevoking(false)
    }
  }

  const copyText = async (text: string, id?: string) => {
    try { await navigator.clipboard.writeText(text) } catch {
      const ta = document.createElement('textarea'); ta.value = text; ta.style.cssText = 'position:fixed;opacity:0'
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta)
    }
    if (id) { setCopiedId(id); setTimeout(() => setCopiedId(null), 2000) }
    else { setNewKeyCopied(true); setTimeout(() => setNewKeyCopied(false), 2000) }
  }

  /* ── Derived ── */

  const activeKeys = keys.filter((k) => k.isActive)
  const inactiveKeys = keys.filter((k) => !k.isActive && !k.revokedAt)  // Only expired, not revoked
  const canCreate = meta.keysUsed < meta.keysLimit
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com'

  const curlExamples = [
    {
      label: '1:1 Compare',
      desc: 'Compare two face images for identity verification',
      curl: `curl -X POST ${baseUrl}/api/v1/faces/compare \\
  -H "Authorization: Bearer vra_live_YOUR_API_KEY" \\
  -F "source=@person1.jpg" \\
  -F "target=@person2.jpg"`,
    },
    {
      label: '1:N Search',
      desc: 'Search one face against up to 20 target images',
      curl: `curl -X POST ${baseUrl}/api/v1/faces/search \\
  -H "Authorization: Bearer vra_live_YOUR_API_KEY" \\
  -F "source=@probe.jpg" \\
  -F "targets=@suspect1.jpg" \\
  -F "targets=@suspect2.jpg" \\
  -F "targets=@suspect3.jpg"`,
    },
    {
      label: 'N:N Batch',
      desc: 'Compare two sets of faces against each other (up to 10 each)',
      curl: `curl -X POST ${baseUrl}/api/v1/faces/batch \\
  -H "Authorization: Bearer vra_live_YOUR_API_KEY" \\
  -F "set1=@photo_a.jpg" \\
  -F "set1=@photo_b.jpg" \\
  -F "set2=@target_x.jpg" \\
  -F "set2=@target_y.jpg"`,
    },
    {
      label: 'Video Analyze',
      desc: 'Submit a video file for face detection & processing',
      curl: `curl -X POST ${baseUrl}/api/v1/videos/analyze \\
  -H "Authorization: Bearer vra_live_YOUR_API_KEY" \\
  -F "file=@surveillance.mp4"`,
    },
    {
      label: 'Video Status',
      desc: 'Check the processing status of a submitted video job',
      curl: `curl -X GET ${baseUrl}/api/v1/videos/JOB_ID_HERE \\
  -H "Authorization: Bearer vra_live_YOUR_API_KEY"`,
    },
  ]

  /* ── Loading ── */

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 rounded-xl border-4 border-gray-700 border-t-primary animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* ══════ Header ══════ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-1">
              API Keys
            </h1>
            <p className="text-gray-400 text-base">
              Manage your API keys for programmatic access to VisionEra&apos;s face recognition services.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            {/* Plan & usage pill */}
            <div className="flex items-center gap-2 bg-gray-800/80 border border-gray-700/60 rounded-full px-4 py-2">
              <span className={`text-[11px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${
                meta.planCode === 'FREE' ? 'bg-gray-700 text-gray-300' :
                meta.planCode === 'PRO' ? 'bg-primary/20 text-primary' :
                meta.planCode === 'ENTERPRISE' ? 'bg-purple-500/20 text-purple-400' :
                'bg-emerald-500/20 text-emerald-400'
              }`}>
                {meta.planCode}
              </span>
              <div className="w-px h-4 bg-gray-700" />
              <span className="text-sm text-gray-300">
                <span className={`font-semibold ${meta.keysUsed >= meta.keysLimit ? 'text-red-400' : 'text-white'}`}>
                  {meta.keysUsed}
                </span>
                <span className="text-gray-500">/{meta.keysLimit}</span>
                <span className="text-gray-500 ml-1">keys</span>
              </span>
            </div>

            <button
              onClick={() => { setShowCreate(true); setNewKeyData(null) }}
              disabled={!canCreate}
              className="px-5 py-2.5 bg-gradient-to-r from-primary to-cyan-500 hover:from-primary/90 hover:to-cyan-500/90 text-white rounded-full font-semibold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-primary/20"
              title={!canCreate ? `${meta.planCode} plan limit reached` : ''}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              Create Key
            </button>
          </div>
        </div>
      </motion.div>

      {/* ══════ Plan limit warning ══════ */}
      {!canCreate && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-500/5 border border-amber-500/20 rounded-xl px-5 py-4 flex items-center gap-4"
        >
          <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div>
            <p className="text-amber-300 font-medium text-sm">API key limit reached</p>
            <p className="text-gray-400 text-xs mt-0.5">
              Your {meta.planCode} plan allows {meta.keysLimit} active key{meta.keysLimit > 1 ? 's' : ''}.
              {meta.planCode === 'FREE' && ' Upgrade to Pro for up to 5 keys.'}
              {meta.planCode !== 'FREE' && ' Revoke unused keys or contact support to upgrade.'}
            </p>
          </div>
        </motion.div>
      )}

      {/* ══════ Error banner ══════ */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="bg-red-500/5 border border-red-500/20 rounded-xl px-5 py-3 text-red-400 text-sm flex items-center gap-3"
          >
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="flex-1">{error}</span>
            <button onClick={() => setError(null)} className="text-red-400/50 hover:text-red-300 p-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════ Newly created key banner ══════ */}
      <AnimatePresence>
        {newKeyData && (
          <motion.div
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="bg-gradient-to-r from-green-500/5 to-emerald-500/5 border border-green-500/20 rounded-2xl p-6"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-green-400 font-bold text-lg">&ldquo;{newKeyData.name}&rdquo; created</h3>
                <p className="text-gray-400 text-sm mt-1 mb-4">
                  Copy your API key now. You can also reveal it later from below.
                </p>
                <div className="flex items-center gap-2 bg-black/40 rounded-xl p-1.5 border border-gray-700/40">
                  <code className="flex-1 text-green-300 px-4 py-2.5 font-mono text-sm break-all select-all leading-relaxed">
                    {newKeyData.key}
                  </code>
                  <button
                    onClick={() => copyText(newKeyData.key)}
                    className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 flex-shrink-0 ${
                      newKeyCopied ? 'bg-green-500/20 text-green-400' : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                    }`}
                  >
                    <CopyIcon copied={newKeyCopied} />
                    {newKeyCopied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
              <button onClick={() => setNewKeyData(null)} className="text-gray-600 hover:text-gray-300 p-1 flex-shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════ Create key form ══════ */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6">
              <h3 className="text-white font-bold text-lg mb-5 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/20 to-cyan-500/20 flex items-center justify-center">
                  <svg className="w-4.5 h-4.5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                </div>
                Create New API Key
              </h3>
              <div className="grid gap-5 md:grid-cols-[1fr,180px]">
                <div>
                  <label className="block text-xs text-gray-400 mb-2 font-semibold uppercase tracking-wider">Key Name</label>
                  <input
                    type="text"
                    value={keyName}
                    onChange={(e) => setKeyName(e.target.value)}
                    placeholder="e.g., Production Server, Mobile App, CI/CD"
                    className="w-full bg-gray-900/70 border border-gray-600/40 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                    maxLength={100}
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-2 font-semibold uppercase tracking-wider">Expires In</label>
                  <select
                    value={expiry}
                    onChange={(e) => setExpiry(e.target.value)}
                    className="w-full bg-gray-900/70 border border-gray-600/40 rounded-xl px-4 py-3 text-white text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none cursor-pointer"
                  >
                    {EXPIRY_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-3 mt-5 pt-5 border-t border-gray-700/30">
                <button
                  onClick={handleCreate}
                  disabled={creating || !keyName.trim()}
                  className="px-6 py-2.5 bg-gradient-to-r from-primary to-cyan-500 text-white rounded-xl font-semibold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-primary/20"
                >
                  {creating ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                    </svg>
                  )}
                  Generate Key
                </button>
                <button
                  onClick={() => { setShowCreate(false); setKeyName(''); setExpiry('90d') }}
                  className="px-5 py-2.5 text-gray-400 hover:text-white text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════ Keys Section ══════ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-10 h-10 rounded-xl border-4 border-gray-700 border-t-primary animate-spin" />
          </div>
        ) : keys.length === 0 ? (
          /* Empty state */
          <div className="border-2 border-dashed border-gray-700/60 rounded-2xl py-20 px-8 text-center">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-gray-800 to-gray-800/50 flex items-center justify-center mx-auto mb-5 border border-gray-700/40">
              <svg className="w-10 h-10 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <h3 className="text-white text-xl font-bold">No API keys yet</h3>
            <p className="text-gray-500 text-sm mt-2 max-w-md mx-auto leading-relaxed">
              Generate your first API key to start integrating VisionEra&apos;s face recognition into your applications.
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="mt-6 px-6 py-3 bg-gradient-to-r from-primary to-cyan-500 text-white rounded-full font-semibold text-sm transition-all inline-flex items-center gap-2 shadow-lg shadow-primary/20"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              Create Your First Key
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {activeKeys.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">
                  Active Keys ({activeKeys.length})
                </h3>
                {activeKeys.map((k, i) => (
                  <motion.div
                    key={k.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <KeyCard
                      item={k}
                      revealedKey={revealedKeys[k.id]}
                      isRevealing={revealingId === k.id}
                      copiedId={copiedId}
                      onReveal={() => handleReveal(k.id)}
                      onCopy={(text) => copyText(text, k.id)}
                      onRevoke={() => setRevokeTarget(k)}
                    />
                  </motion.div>
                ))}
              </div>
            )}

            {inactiveKeys.length > 0 && (
              <div className="mt-8 space-y-3">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest px-1">
                  Inactive Keys ({inactiveKeys.length})
                </h3>
                <div className="space-y-3 opacity-50">
                  {inactiveKeys.map((k) => (
                    <KeyCard
                      key={k.id}
                      item={k}
                      revealedKey={undefined}
                      isRevealing={false}
                      copiedId={null}
                      onReveal={() => {}}
                      onCopy={() => {}}
                      onRevoke={() => {}}
                      disabled
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* ══════ API Documentation ══════ */}
      {!loading && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="bg-gray-800/30 border border-gray-700/40 rounded-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-gray-700/40 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
              </div>
              <div>
                <h3 className="text-white font-bold text-lg">API Reference</h3>
                <p className="text-gray-500 text-xs">Quick start guide with cURL examples for every endpoint</p>
              </div>
            </div>
            <code className="text-primary bg-primary/5 border border-primary/10 px-3 py-1.5 rounded-lg text-xs font-mono hidden sm:block">
              {baseUrl}/api/v1
            </code>
          </div>

          {/* Endpoint overview grid */}
          <div className="px-6 pt-5 pb-2">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Endpoints</h4>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { m: 'POST', p: '/faces/compare', d: '1:1 — Verify two faces', f: 'source, target' },
                { m: 'POST', p: '/faces/search', d: '1:N — Search against targets', f: 'source, targets[]' },
                { m: 'POST', p: '/faces/batch', d: 'N:N — Batch cross-compare', f: 'set1[], set2[]' },
                { m: 'POST', p: '/videos/analyze', d: 'Submit video for processing', f: 'file' },
                { m: 'GET',  p: '/videos/:jobId', d: 'Check video job status', f: '—' },
              ].map((ep) => (
                <div key={ep.p} className="bg-gray-900/40 border border-gray-700/25 rounded-xl p-3 flex items-start gap-3">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase mt-0.5 flex-shrink-0 ${
                    ep.m === 'GET' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-blue-500/10 text-blue-400'
                  }`}>
                    {ep.m}
                  </span>
                  <div className="min-w-0">
                    <code className="text-white text-xs font-mono leading-tight">{ep.p}</code>
                    <p className="text-gray-500 text-[11px] mt-0.5">{ep.d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tabbed cURL examples */}
          <div className="px-6 pt-5 pb-6">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">cURL Examples</h4>

            {/* Tabs */}
            <div className="flex gap-1 bg-gray-900/60 rounded-xl p-1 mb-4 overflow-x-auto">
              {curlExamples.map((ex, i) => (
                <button
                  key={i}
                  onClick={() => setActiveTab(i)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                    activeTab === i
                      ? 'bg-primary/20 text-primary shadow-sm'
                      : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'
                  }`}
                >
                  {ex.label}
                </button>
              ))}
            </div>

            {/* Active tab content */}
            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <p className="text-gray-400 text-xs">{curlExamples[activeTab].desc}</p>
                <button
                  onClick={() => copyText(curlExamples[activeTab].curl, `curl-${activeTab}`)}
                  className="text-gray-500 hover:text-white text-xs flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-gray-700/50 transition-all"
                >
                  <CopyIcon copied={copiedId === `curl-${activeTab}`} />
                  {copiedId === `curl-${activeTab}` ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <pre className="bg-gray-950/70 rounded-xl p-5 text-[13px] text-gray-300 overflow-x-auto font-mono leading-relaxed border border-gray-800/60">
                {curlExamples[activeTab].curl}
              </pre>
            </div>
          </div>

          {/* Auth note */}
          <div className="px-6 pb-5">
            <div className="bg-blue-500/5 border border-blue-500/15 rounded-xl p-4 flex items-start gap-3">
              <svg className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-xs text-gray-400 leading-relaxed">
                <span className="text-blue-300 font-semibold">Authentication:</span> Include your API key in every request using the{' '}
                <code className="text-blue-300 bg-blue-500/10 px-1.5 py-0.5 rounded">Authorization: Bearer vra_live_...</code> header.
                Keys beginning with <code className="text-gray-300 bg-gray-700/50 px-1.5 py-0.5 rounded">vra_live_</code> are production keys.
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ══════ Revoke modal ══════ */}
      <AnimatePresence>
        {revokeTarget && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => !revoking && setRevokeTarget(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-gray-800 border border-gray-700 rounded-2xl p-7 max-w-md w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg">Revoke API Key</h3>
                  <p className="text-gray-500 text-sm">{revokeTarget.name}</p>
                </div>
              </div>
              <div className="bg-red-500/5 border border-red-500/15 rounded-xl p-4 mb-5">
                <p className="text-red-300/90 text-sm leading-relaxed">
                  This action is <strong>permanent</strong> and cannot be undone. Any application using this key will immediately lose access.
                </p>
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setRevokeTarget(null)}
                  disabled={revoking}
                  className="px-5 py-2.5 text-gray-400 hover:text-white text-sm font-medium transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRevoke}
                  disabled={revoking}
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-red-600/20"
                >
                  {revoking && <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />}
                  Revoke Key
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   KeyCard
   ═══════════════════════════════════════════════════════════════════ */

function KeyCard({
  item,
  revealedKey,
  isRevealing,
  copiedId,
  onReveal,
  onCopy,
  onRevoke,
  disabled = false,
}: {
  item: ApiKeyItem
  revealedKey?: string
  isRevealing: boolean
  copiedId: string | null
  onReveal: () => void
  onCopy: (text: string) => void
  onRevoke: () => void
  disabled?: boolean
}) {
  const isRevealed = !!revealedKey
  const isCopied = copiedId === item.id
  const displayKey = isRevealed ? revealedKey : item.maskedKey

  let statusColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
  let statusDot = 'bg-emerald-400'
  let statusText = 'Active'

  if (item.revokedAt) {
    statusColor = 'bg-red-500/10 text-red-400 border-red-500/20'
    statusDot = 'bg-red-400'
    statusText = 'Revoked'
  } else if (item.isExpired) {
    statusColor = 'bg-amber-500/10 text-amber-400 border-amber-500/20'
    statusDot = 'bg-amber-400'
    statusText = 'Expired'
  }

  return (
    <div className={`bg-gray-800/30 border border-gray-700/40 rounded-2xl p-5 transition-all group ${!disabled ? 'hover:border-gray-600/60 hover:bg-gray-800/40' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3.5">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            disabled ? 'bg-gray-700/40' : 'bg-gradient-to-br from-primary/15 to-cyan-500/15'
          }`}>
            <svg className={`w-5 h-5 ${disabled ? 'text-gray-600' : 'text-primary'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <div>
            <h4 className="text-white font-semibold text-[15px]">{item.name}</h4>
            <p className="text-gray-500 text-xs">{item.createdBy}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${statusColor}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${statusDot} ${item.isActive ? 'animate-pulse' : ''}`} />
            {statusText}
          </span>
          {!disabled && item.isActive && (
            <button
              onClick={onRevoke}
              className="text-gray-600 hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-red-500/10 opacity-0 group-hover:opacity-100"
              title="Revoke key"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Key display */}
      <div className="flex items-center gap-2 bg-gray-950/50 rounded-xl px-4 py-3 border border-gray-700/25">
        <code className={`flex-1 font-mono text-[13px] break-all select-all leading-relaxed ${isRevealed ? 'text-green-300' : 'text-gray-600'}`}>
          {displayKey}
        </code>
        {!disabled && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={onReveal}
              disabled={isRevealing}
              className={`p-2 rounded-lg transition-all disabled:opacity-50 ${
                isRevealed
                  ? 'text-primary bg-primary/10 hover:bg-primary/20'
                  : 'text-gray-500 hover:text-white hover:bg-gray-700/60'
              }`}
              title={isRevealed ? 'Hide key' : 'Reveal key'}
            >
              {isRevealing ? (
                <div className="w-4 h-4 animate-spin rounded-full border-2 border-gray-600 border-t-primary" />
              ) : isRevealed ? (
                <EyeOffIcon />
              ) : (
                <EyeIcon />
              )}
            </button>
            {isRevealed && (
              <button
                onClick={() => onCopy(revealedKey!)}
                className={`p-2 rounded-lg transition-all ${isCopied ? 'text-green-400 bg-green-500/10' : 'text-gray-500 hover:text-white hover:bg-gray-700/60'}`}
                title={isCopied ? 'Copied!' : 'Copy key'}
              >
                <CopyIcon copied={isCopied} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Footer meta */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3.5 text-xs text-gray-500 px-0.5">
        <span className="flex items-center gap-1.5">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Created {formatDate(item.createdAt)}
        </span>

        {item.expiresAt && (
          <span className={`flex items-center gap-1.5 ${item.isExpired ? 'text-amber-400' : ''}`}>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {item.isExpired ? 'Expired' : 'Expires'} {formatDate(item.expiresAt)}
          </span>
        )}
        {!item.expiresAt && !item.revokedAt && (
          <span className="text-gray-600 flex items-center gap-1.5">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            No expiry
          </span>
        )}

        {item.lastUsedAt && (
          <span className="flex items-center gap-1.5">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Last used {timeAgo(item.lastUsedAt)}
          </span>
        )}
        {!item.lastUsedAt && !item.revokedAt && (
          <span className="text-gray-600 flex items-center gap-1.5">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Never used
          </span>
        )}

        {item.revokedAt && (
          <span className="text-red-400/60 flex items-center gap-1.5">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
            Revoked {formatDate(item.revokedAt)}
          </span>
        )}
      </div>
    </div>
  )
}

/* ═══════════ Shared Icons ═══════════ */

const EyeIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
)

const EyeOffIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
  </svg>
)

const CopyIcon = ({ copied }: { copied: boolean }) =>
  copied ? (
    <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ) : (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  )

/* ═══════════ Helpers ═══════════ */

function timeAgo(dateStr: string): string {
  const s = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`
  return new Date(dateStr).toLocaleDateString()
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}