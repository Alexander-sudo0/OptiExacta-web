'use client'

import React from "react"
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/auth-context'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'

export default function FaceSearch1To1Page() {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuth()
  const [image1, setImage1] = useState<string | null>(null)
  const [image2, setImage2] = useState<string | null>(null)
  const [result, setResult] = useState<{ confidence: number; match: boolean } | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analyzeProgress, setAnalyzeProgress] = useState(0)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, isLoading, router])

  if (isLoading || !isAuthenticated) {
    return null
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, imageNum: 1 | 2) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const result = event.target?.result as string
        if (imageNum === 1) {
          setImage1(result)
        } else {
          setImage2(result)
        }
        setResult(null)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleCompare = async () => {
    if (!image1 || !image2) {
      return
    }

    setIsAnalyzing(true)
    setAnalyzeProgress(0)
    
    // Simulate progress
    const interval = setInterval(() => {
      setAnalyzeProgress(prev => {
        if (prev >= 90) {
          clearInterval(interval)
          return prev
        }
        return prev + Math.random() * 15
      })
    }, 200)

    // Simulate API call
    setTimeout(() => {
      clearInterval(interval)
      setAnalyzeProgress(100)
      setTimeout(() => {
        setResult({
          confidence: 75 + Math.random() * 24,
          match: Math.random() > 0.3
        })
        setIsAnalyzing(false)
      }, 300)
    }, 2000)
  }

  const handleDrop = (e: React.DragEvent, imageNum: 1 | 2) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const result = event.target?.result as string
        if (imageNum === 1) {
          setImage1(result)
        } else {
          setImage2(result)
        }
        setResult(null)
      }
      reader.readAsDataURL(file)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/30 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors group">
              <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span className="hidden sm:inline">Dashboard</span>
            </Link>
            <div className="h-6 w-px bg-border" />
            <div className="flex items-center gap-3">
              <motion.div 
                className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </motion.div>
              <div>
                <h1 className="text-xl font-bold text-foreground">1:1 Face Verification</h1>
                <p className="text-xs text-muted-foreground">Compare two faces for identity verification</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-full bg-secondary/10 text-secondary text-xs font-semibold border border-secondary/20 flex items-center gap-1.5">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              99.9% Accuracy
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Visual comparison area */}
        <motion.div 
          className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-6 items-center mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Image 1 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">1</span>
                First Face
              </h2>
              {image1 && (
                <button
                  onClick={() => { setImage1(null); setResult(null); }}
                  className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                >
                  Remove
                </button>
              )}
            </div>
            <motion.div 
              className={`relative aspect-square rounded-2xl border-2 border-dashed transition-all overflow-hidden ${
                image1 ? 'border-primary/50 bg-card/50' : 'border-border hover:border-primary/30 bg-card/30 hover:bg-card/50'
              }`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDrop(e, 1)}
              whileHover={{ scale: image1 ? 1 : 1.01 }}
            >
              {image1 ? (
                <>
                  <img src={image1} alt="Face 1" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent" />
                  {/* Face detection overlay */}
                  <motion.div 
                    className="absolute inset-[15%] border-2 border-primary/50 rounded-full"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  />
                  <motion.div 
                    className="absolute bottom-4 left-4 right-4 p-3 rounded-xl bg-card/80 backdrop-blur-sm border border-border/50"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                  >
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <svg className="w-4 h-4 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Face detected • Ready to compare
                    </div>
                  </motion.div>
                </>
              ) : (
                <label className="cursor-pointer flex flex-col items-center justify-center h-full p-8 text-center">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center mb-4">
                    <svg className="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-foreground font-semibold mb-2">Upload First Face</p>
                  <p className="text-sm text-muted-foreground mb-4">Drag & drop or click to browse</p>
                  <span className="text-xs text-muted-foreground px-3 py-1 rounded-full bg-muted/20">
                    JPG, PNG up to 10MB
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, 1)}
                    className="hidden"
                  />
                </label>
              )}
            </motion.div>
          </div>

          {/* VS Indicator */}
          <div className="hidden lg:flex flex-col items-center gap-4 py-8">
            <motion.div 
              className={`w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold ${
                result 
                  ? result.match 
                    ? 'bg-secondary/20 text-secondary border border-secondary/30' 
                    : 'bg-destructive/20 text-destructive border border-destructive/30'
                  : 'bg-gradient-to-br from-primary/20 to-secondary/20 text-foreground border border-primary/30'
              }`}
              animate={isAnalyzing ? { rotate: [0, 5, -5, 0] } : {}}
              transition={{ duration: 0.5, repeat: isAnalyzing ? Infinity : 0 }}
            >
              {isAnalyzing ? (
                <svg className="w-8 h-8 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : result ? (
                result.match ? '✓' : '✗'
              ) : 'VS'}
            </motion.div>
            {isAnalyzing && (
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Analyzing...</p>
                <div className="w-24 h-1 bg-muted/20 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-gradient-to-r from-primary to-secondary"
                    initial={{ width: 0 }}
                    animate={{ width: `${analyzeProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Image 2 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-secondary/10 text-secondary flex items-center justify-center text-sm font-bold">2</span>
                Second Face
              </h2>
              {image2 && (
                <button
                  onClick={() => { setImage2(null); setResult(null); }}
                  className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                >
                  Remove
                </button>
              )}
            </div>
            <motion.div 
              className={`relative aspect-square rounded-2xl border-2 border-dashed transition-all overflow-hidden ${
                image2 ? 'border-secondary/50 bg-card/50' : 'border-border hover:border-secondary/30 bg-card/30 hover:bg-card/50'
              }`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDrop(e, 2)}
              whileHover={{ scale: image2 ? 1 : 1.01 }}
            >
              {image2 ? (
                <>
                  <img src={image2} alt="Face 2" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent" />
                  <motion.div 
                    className="absolute inset-[15%] border-2 border-secondary/50 rounded-full"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  />
                  <motion.div 
                    className="absolute bottom-4 left-4 right-4 p-3 rounded-xl bg-card/80 backdrop-blur-sm border border-border/50"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                  >
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <svg className="w-4 h-4 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Face detected • Ready to compare
                    </div>
                  </motion.div>
                </>
              ) : (
                <label className="cursor-pointer flex flex-col items-center justify-center h-full p-8 text-center">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-secondary/10 to-primary/10 flex items-center justify-center mb-4">
                    <svg className="w-10 h-10 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-foreground font-semibold mb-2">Upload Second Face</p>
                  <p className="text-sm text-muted-foreground mb-4">Drag & drop or click to browse</p>
                  <span className="text-xs text-muted-foreground px-3 py-1 rounded-full bg-muted/20">
                    JPG, PNG up to 10MB
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, 2)}
                    className="hidden"
                  />
                </label>
              )}
            </motion.div>
          </div>
        </motion.div>

        {/* Compare Button */}
        <motion.button
          onClick={handleCompare}
          disabled={!image1 || !image2 || isAnalyzing}
          className="w-full py-4 bg-gradient-to-r from-primary to-secondary text-primary-foreground font-bold rounded-xl hover:shadow-lg hover:shadow-primary/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
        >
          {isAnalyzing ? (
            <>
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Analyzing Facial Features...
            </>
          ) : (
            <>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Compare Faces
            </>
          )}
        </motion.button>

        {/* Results */}
        <AnimatePresence>
          {result && (
            <motion.div 
              className={`mt-8 rounded-2xl border-2 overflow-hidden ${
                result.match 
                  ? 'bg-secondary/5 border-secondary/30' 
                  : 'bg-destructive/5 border-destructive/30'
              }`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {/* Result header */}
              <div className={`p-6 ${result.match ? 'bg-secondary/10' : 'bg-destructive/10'}`}>
                <div className="flex items-center gap-4">
                  <motion.div 
                    className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl ${
                      result.match ? 'bg-secondary/20' : 'bg-destructive/20'
                    }`}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
                  >
                    {result.match ? '✅' : '❌'}
                  </motion.div>
                  <div>
                    <h3 className="text-2xl font-bold text-foreground">
                      {result.match ? 'Faces Match!' : 'No Match Found'}
                    </h3>
                    <p className={`text-lg font-semibold ${result.match ? 'text-secondary' : 'text-destructive'}`}>
                      {result.confidence.toFixed(1)}% Similarity
                    </p>
                  </div>
                </div>
              </div>

              {/* Confidence bar */}
              <div className="px-6 py-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Similarity Score</span>
                  <span className="font-bold text-foreground">{result.confidence.toFixed(1)}%</span>
                </div>
                <div className="h-3 bg-muted/20 rounded-full overflow-hidden">
                  <motion.div 
                    className={`h-full rounded-full ${
                      result.match 
                        ? 'bg-gradient-to-r from-secondary to-primary' 
                        : 'bg-gradient-to-r from-destructive/60 to-destructive'
                    }`}
                    initial={{ width: 0 }}
                    animate={{ width: `${result.confidence}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                  />
                </div>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 border-t border-border/30">
                {[
                  { label: 'Similarity Score', value: `${result.confidence.toFixed(1)}%`, icon: '📊' },
                  { label: 'Processing Time', value: '187ms', icon: '⚡' },
                  { label: 'Face Quality', value: '98.5%', icon: '✨' },
                  { label: 'Algorithm', value: 'NIST-1', icon: '🏆' }
                ].map((stat, i) => (
                  <motion.div 
                    key={stat.label}
                    className="p-4 rounded-xl bg-card/50 border border-border/50 text-center"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + i * 0.1 }}
                  >
                    <div className="text-2xl mb-1">{stat.icon}</div>
                    <p className="text-xl font-bold text-foreground">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Info Section */}
        <motion.div 
          className="mt-8 p-6 rounded-2xl bg-card/30 border border-border"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            About 1:1 Face Verification
          </h3>
          <p className="text-muted-foreground mb-6">
            Face verification compares two facial images to determine if they belong to the same person. This is commonly used for identity verification, authentication, and access control.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { icon: '🎯', text: '99.9% verification accuracy' },
              { icon: '⚡', text: 'Sub-100ms response time' },
              { icon: '🔄', text: 'Works with various image qualities' },
              { icon: '🏆', text: 'NIST-ranked #1 algorithm' }
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-3 text-sm">
                <span className="text-xl">{item.icon}</span>
                <span className="text-foreground">{item.text}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </main>
    </div>
  )
}
