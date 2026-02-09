'use client'

import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/auth-context'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'

export default function WatchlistPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuth()
  const [showAddModal, setShowAddModal] = useState(false)
  const [watchlist, setWatchlist] = useState([
    { id: 1, name: 'Subject A', status: 'active', detected: true, lastSeen: '2 minutes ago', locations: 3, confidence: 98 },
    { id: 2, name: 'Subject B', status: 'active', detected: false, lastSeen: '1 hour ago', locations: 1, confidence: 85 },
    { id: 3, name: 'Subject C', status: 'inactive', detected: false, lastSeen: '3 days ago', locations: 0, confidence: 92 },
    { id: 4, name: 'Subject D', status: 'active', detected: true, lastSeen: '30 minutes ago', locations: 2, confidence: 94 }
  ])

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, isLoading, router])

  if (isLoading || !isAuthenticated) {
    return null
  }

  const activeCount = watchlist.filter(s => s.status === 'active').length
  const detectedCount = watchlist.filter(s => s.detected).length

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/30 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="hover:opacity-80 transition-opacity">
              <Image 
                src="/images/logo-white.png"
                alt="OptiExacta"
                width={40}
                height={40}
                className="w-10 h-10 object-contain"
              />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-foreground">Watchlist Monitoring</h1>
              <p className="text-xs text-muted-foreground">Real-time surveillance alerts</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link 
              href="/dashboard"
              className="px-4 py-2 border border-border text-foreground text-sm font-medium rounded-xl hover:bg-card/50 transition-colors"
            >
              ← Back
            </Link>
            <button 
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-gradient-to-r from-primary to-secondary text-primary-foreground text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Subject
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats */}
        <motion.div 
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {[
            { label: 'Active Subjects', value: activeCount.toString(), icon: '👁️', color: 'from-primary to-cyan-500' },
            { label: 'Detections Today', value: '42', icon: '🎯', color: 'from-secondary to-teal-500' },
            { label: 'Currently Detected', value: detectedCount.toString(), icon: '⚠️', color: 'from-orange-500 to-red-500' },
            { label: 'Monitoring Cameras', value: '12', icon: '🎥', color: 'from-purple-500 to-pink-500' }
          ].map((stat, i) => (
            <motion.div 
              key={stat.label} 
              className="p-5 rounded-xl border border-border bg-card/30 hover:bg-card/50 transition-all group"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 + i * 0.05 }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-2xl group-hover:scale-110 transition-transform">{stat.icon}</span>
                {stat.label === 'Currently Detected' && detectedCount > 0 && (
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                )}
              </div>
              <p className={`text-3xl font-bold bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>
                {stat.value}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Live Alerts */}
        {detectedCount > 0 && (
          <motion.div 
            className="mb-8 p-4 rounded-xl border border-orange-500/30 bg-orange-500/10"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-orange-500 animate-pulse" />
              <span className="font-semibold text-orange-400">Live Alert:</span>
              <span className="text-muted-foreground">{detectedCount} subject(s) currently detected in monitored areas</span>
            </div>
          </motion.div>
        )}

        {/* Watchlist Grid */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {watchlist.map((subject, i) => (
            <motion.div
              key={subject.id}
              className={`p-5 rounded-xl border bg-card/30 hover:bg-card/50 transition-all cursor-pointer group ${
                subject.detected ? 'border-orange-500/50' : 'border-border'
              }`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.05 }}
              whileHover={{ scale: 1.01 }}
            >
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className={`relative w-16 h-16 rounded-xl bg-gradient-to-br ${
                  subject.detected ? 'from-orange-500/30 to-red-500/30' : 'from-primary/30 to-secondary/30'
                } flex items-center justify-center`}>
                  <svg className="w-8 h-8 text-foreground/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  {subject.detected && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-orange-500 border-2 border-background animate-pulse" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-foreground">{subject.name}</h3>
                    <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                      subject.status === 'active' 
                        ? 'bg-secondary/20 text-secondary border border-secondary/30' 
                        : 'bg-muted/20 text-muted-foreground border border-muted/30'
                    }`}>
                      {subject.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                    <div>
                      <span className="text-muted-foreground">Last Seen: </span>
                      <span className={subject.detected ? 'text-orange-400 font-medium' : 'text-foreground'}>
                        {subject.lastSeen}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Locations: </span>
                      <span className="text-foreground font-medium">{subject.locations}</span>
                    </div>
                  </div>

                  {/* Confidence Bar */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Match Confidence</span>
                      <span className="text-foreground font-medium">{subject.confidence}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-border overflow-hidden">
                      <motion.div 
                        className="h-full rounded-full bg-gradient-to-r from-primary to-secondary"
                        initial={{ width: 0 }}
                        animate={{ width: `${subject.confidence}%` }}
                        transition={{ delay: 0.3 + i * 0.1, duration: 0.5 }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
                <button className="flex-1 text-xs px-3 py-2 border border-primary text-primary rounded-lg hover:bg-primary/10 transition-colors flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  View Details
                </button>
                <button className="flex-1 text-xs px-3 py-2 border border-border text-foreground rounded-lg hover:bg-card/50 transition-colors flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Track Location
                </button>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Features Section */}
        <motion.div 
          className="bg-card/30 rounded-xl border border-border p-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <h3 className="text-lg font-bold text-foreground mb-6 flex items-center gap-2">
            <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Monitoring Features
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { icon: '📡', title: 'Real-time Detection', desc: 'Continuous monitoring across all connected cameras' },
              { icon: '🔔', title: 'Instant Alerts', desc: 'Push notifications when subjects are detected' },
              { icon: '📍', title: 'Location Tracking', desc: 'Track movement patterns and location history' },
              { icon: '🎥', title: 'Multi-camera', desc: 'Coordinate across unlimited camera feeds' },
            ].map((feature, i) => (
              <motion.div 
                key={feature.title}
                className="flex items-start gap-3 p-4 rounded-lg border border-border/50 bg-background/30"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.1 }}
              >
                <span className="text-2xl">{feature.icon}</span>
                <div>
                  <h4 className="font-semibold text-foreground text-sm">{feature.title}</h4>
                  <p className="text-xs text-muted-foreground">{feature.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </main>

      {/* Add Subject Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowAddModal(false)}
          >
            <motion.div 
              className="bg-card border border-border rounded-2xl p-6 w-full max-w-md"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold text-foreground mb-4">Add to Watchlist</h3>
              <p className="text-muted-foreground text-sm mb-6">Upload a photo to add a new subject to your watchlist monitoring.</p>
              
              <div className="border-2 border-dashed border-border rounded-xl p-8 text-center mb-6 hover:border-primary/50 transition-colors cursor-pointer">
                <svg className="w-12 h-12 mx-auto text-muted-foreground mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-sm text-muted-foreground">Click or drag to upload image</p>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3 border border-border rounded-xl text-foreground hover:bg-card/50 transition-colors"
                >
                  Cancel
                </button>
                <button className="flex-1 py-3 bg-gradient-to-r from-primary to-secondary text-primary-foreground font-semibold rounded-xl hover:opacity-90 transition-opacity">
                  Add Subject
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
