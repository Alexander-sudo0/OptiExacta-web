'use client'

import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/auth-context'
import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'

export default function VideoProcessingPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuth()
  const [videoUrl, setVideoUrl] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingProgress, setProcessingProgress] = useState(0)
  const [results, setResults] = useState<any[] | null>(null)
  const [selectedSource, setSelectedSource] = useState<'url' | 'upload' | 'stream'>('url')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, isLoading, router])

  if (isLoading || !isAuthenticated) {
    return null
  }

  const handleProcess = async () => {
    if (!videoUrl && selectedSource === 'url') {
      return
    }

    setIsProcessing(true)
    setProcessingProgress(0)

    // Simulate progress
    const interval = setInterval(() => {
      setProcessingProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval)
          return 100
        }
        return prev + Math.random() * 15
      })
    }, 300)

    setTimeout(() => {
      clearInterval(interval)
      setProcessingProgress(100)
      setResults([
        { frame: 1, time: '0:00', faces: 2, confidence: 98.5, matchedIds: ['ID-001', 'ID-002'] },
        { frame: 15, time: '0:15', faces: 1, confidence: 95.2, matchedIds: ['ID-001'] },
        { frame: 30, time: '0:30', faces: 3, confidence: 92.8, matchedIds: ['ID-001', 'ID-003', 'ID-004'] },
        { frame: 45, time: '0:45', faces: 2, confidence: 97.1, matchedIds: ['ID-002', 'ID-003'] },
        { frame: 60, time: '1:00', faces: 4, confidence: 94.6, matchedIds: ['ID-001', 'ID-002', 'ID-003', 'ID-004'] }
      ])
      setIsProcessing(false)
    }, 3500)
  }

  const totalFaces = results?.reduce((sum, r) => sum + r.faces, 0) || 0
  const avgConfidence = results ? (results.reduce((sum, r) => sum + r.confidence, 0) / results.length).toFixed(1) : 0

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
              <h1 className="text-xl font-bold text-foreground">Video Processing</h1>
              <p className="text-xs text-muted-foreground">Frame-by-frame facial analysis</p>
            </div>
          </div>
          <Link 
            href="/dashboard"
            className="px-4 py-2 border border-border text-foreground text-sm font-medium rounded-xl hover:bg-card/50 transition-colors"
          >
            ← Back
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Input */}
          <motion.div 
            className="lg:col-span-1 space-y-6"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Source Selection */}
            <div className="p-5 rounded-xl border border-border bg-card/30">
              <h3 className="font-semibold text-foreground mb-4">Video Source</h3>
              <div className="space-y-2">
                {[
                  { id: 'url', icon: '🔗', label: 'URL / Stream' },
                  { id: 'upload', icon: '📤', label: 'Upload File' },
                  { id: 'stream', icon: '📹', label: 'Live Camera' }
                ].map(source => (
                  <button
                    key={source.id}
                    onClick={() => setSelectedSource(source.id as any)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all ${
                      selectedSource === source.id 
                        ? 'border-primary bg-primary/10 text-foreground' 
                        : 'border-border hover:bg-card/50 text-muted-foreground'
                    }`}
                  >
                    <span className="text-xl">{source.icon}</span>
                    <span className="font-medium text-sm">{source.label}</span>
                    {selectedSource === source.id && (
                      <svg className="w-4 h-4 ml-auto text-primary" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Input Field */}
            <div className="p-5 rounded-xl border border-border bg-card/30">
              <h3 className="font-semibold text-foreground mb-4">
                {selectedSource === 'url' && 'Enter Video URL'}
                {selectedSource === 'upload' && 'Upload Video File'}
                {selectedSource === 'stream' && 'Camera Settings'}
              </h3>

              {selectedSource === 'url' && (
                <input
                  type="text"
                  placeholder="https://example.com/video.mp4"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-sm"
                />
              )}

              {selectedSource === 'upload' && (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary/50 transition-colors cursor-pointer"
                >
                  <svg className="w-10 h-10 mx-auto text-muted-foreground mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="text-sm text-muted-foreground">Click to browse or drag file</p>
                  <p className="text-xs text-muted-foreground mt-1">MP4, MOV, AVI up to 500MB</p>
                  <input ref={fileInputRef} type="file" accept="video/*" className="hidden" />
                </div>
              )}

              {selectedSource === 'stream' && (
                <div className="space-y-3">
                  <select className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm">
                    <option>Select Camera</option>
                    <option>Camera 1 - Main Entrance</option>
                    <option>Camera 2 - Lobby</option>
                    <option>Camera 3 - Parking</option>
                  </select>
                </div>
              )}

              <button
                onClick={handleProcess}
                disabled={isProcessing || (!videoUrl && selectedSource === 'url')}
                className="w-full mt-4 py-3 bg-gradient-to-r from-primary to-secondary text-primary-foreground font-bold rounded-xl hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Processing...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Start Processing
                  </>
                )}
              </button>
            </div>

            {/* Processing Progress */}
            <AnimatePresence>
              {isProcessing && (
                <motion.div 
                  className="p-5 rounded-xl border border-primary/30 bg-primary/5"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-foreground">Processing Video</span>
                    <span className="text-sm text-primary font-bold">{Math.min(Math.round(processingProgress), 100)}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-border overflow-hidden">
                    <motion.div 
                      className="h-full bg-gradient-to-r from-primary to-secondary"
                      animate={{ width: `${Math.min(processingProgress, 100)}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                  <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    Analyzing frames...
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Right Panel - Preview & Results */}
          <motion.div 
            className="lg:col-span-2 space-y-6"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            {/* Video Preview */}
            <div className="rounded-xl border border-border bg-card/30 overflow-hidden">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <h3 className="font-semibold text-foreground">Video Preview</h3>
                <div className="flex items-center gap-2 text-xs">
                  <span className={`w-2 h-2 rounded-full ${isProcessing ? 'bg-red-500 animate-pulse' : 'bg-muted-foreground'}`} />
                  <span className="text-muted-foreground">{isProcessing ? 'Live Processing' : 'Ready'}</span>
                </div>
              </div>
              <div className="aspect-video flex items-center justify-center bg-black/20 relative">
                {isProcessing ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-20 h-20 rounded-full border-4 border-primary/30 border-t-primary animate-spin mx-auto mb-4" />
                      <p className="text-foreground font-medium">Analyzing Frames</p>
                      <p className="text-sm text-muted-foreground">Frame {Math.round(processingProgress * 0.6)} of 60</p>
                    </div>
                    {/* Scanning lines effect */}
                    <motion.div 
                      className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50"
                      animate={{ top: ['0%', '100%', '0%'] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    />
                  </div>
                ) : (
                  <div className="text-center">
                    <svg className="w-16 h-16 mx-auto text-muted-foreground/50 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <p className="text-muted-foreground">Video preview will appear here</p>
                  </div>
                )}
              </div>
            </div>

            {/* Results */}
            <AnimatePresence>
              {results && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { label: 'Frames Analyzed', value: results.length * 15, icon: '📊', color: 'from-primary to-cyan-500' },
                      { label: 'Faces Detected', value: totalFaces, icon: '👥', color: 'from-secondary to-teal-500' },
                      { label: 'Avg Confidence', value: `${avgConfidence}%`, icon: '⭐', color: 'from-yellow-500 to-orange-500' },
                      { label: 'Processing Time', value: '3.5s', icon: '⏱️', color: 'from-purple-500 to-pink-500' }
                    ].map((stat, i) => (
                      <motion.div 
                        key={stat.label} 
                        className="p-4 rounded-xl border border-border bg-card/30"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                      >
                        <span className="text-2xl mb-2 block">{stat.icon}</span>
                        <p className={`text-2xl font-bold bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>
                          {stat.value}
                        </p>
                        <p className="text-xs text-muted-foreground">{stat.label}</p>
                      </motion.div>
                    ))}
                  </div>

                  {/* Frame Results */}
                  <div className="rounded-xl border border-border bg-card/30 overflow-hidden">
                    <div className="p-4 border-b border-border">
                      <h3 className="font-semibold text-foreground">Detection Timeline</h3>
                    </div>
                    <div className="divide-y divide-border">
                      {results.map((result, idx) => (
                        <motion.div 
                          key={idx}
                          className="p-4 hover:bg-card/50 transition-colors"
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.2 + idx * 0.05 }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-sm font-bold text-foreground">
                                #{result.frame}
                              </div>
                              <div>
                                <p className="font-medium text-foreground">{result.time} - {result.faces} face(s)</p>
                                <p className="text-xs text-muted-foreground">IDs: {result.matchedIds.join(', ')}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className={`text-lg font-bold ${
                                result.confidence >= 95 ? 'text-green-400' : 
                                result.confidence >= 90 ? 'text-yellow-400' : 'text-orange-400'
                              }`}>
                                {result.confidence}%
                              </span>
                              <p className="text-xs text-muted-foreground">confidence</p>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* Features */}
        <motion.div 
          className="bg-card/30 rounded-xl border border-border p-8 mt-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <h3 className="text-lg font-bold text-foreground mb-6 flex items-center gap-2">
            <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Video Processing Features
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: '⚡', title: 'Real-time Processing', desc: 'Live video stream analysis' },
              { icon: '🎯', title: 'Frame Analysis', desc: 'Detailed tracking per frame' },
              { icon: '📁', title: 'Multi-format', desc: 'MP4, MOV, AVI, WebM' },
              { icon: '📦', title: 'Batch Processing', desc: 'Process multiple files' },
            ].map((feature, i) => (
              <motion.div 
                key={feature.title}
                className="flex items-start gap-3 p-4 rounded-lg border border-border/50 bg-background/30"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + i * 0.1 }}
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
    </div>
  )
}
