'use client'

import React from "react"
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/auth-context'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'

export default function FaceSearch1ToNPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuth()
  const [image, setImage] = useState<string | null>(null)
  const [results, setResults] = useState<any[] | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [searchProgress, setSearchProgress] = useState(0)
  const [databaseSize] = useState('2.5M')

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, isLoading, router])

  if (isLoading || !isAuthenticated) {
    return null
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        setImage(event.target?.result as string)
        setResults(null)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (event) => {
        setImage(event.target?.result as string)
        setResults(null)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSearch = async () => {
    if (!image) return

    setIsSearching(true)
    setSearchProgress(0)
    
    const interval = setInterval(() => {
      setSearchProgress(prev => {
        if (prev >= 95) {
          clearInterval(interval)
          return prev
        }
        return prev + Math.random() * 12
      })
    }, 150)

    setTimeout(() => {
      clearInterval(interval)
      setSearchProgress(100)
      setTimeout(() => {
        setResults([
          { id: 1, name: 'John Doe', confidence: 98.7, timestamp: '2026-02-09 14:32', location: 'Building A - Entrance' },
          { id: 2, name: 'Jane Smith', confidence: 87.3, timestamp: '2026-02-08 09:15', location: 'Building B - Floor 2' },
          { id: 3, name: 'Robert Johnson', confidence: 76.2, timestamp: '2026-02-07 16:45', location: 'Parking Lot C' },
          { id: 4, name: 'Emma Wilson', confidence: 65.8, timestamp: '2026-02-06 11:20', location: 'Cafeteria' },
          { id: 5, name: 'Michael Brown', confidence: 54.1, timestamp: '2026-02-05 13:00', location: 'Building A - Floor 5' }
        ])
        setIsSearching(false)
      }, 300)
    }, 2500)
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
                className="w-10 h-10 rounded-xl bg-gradient-to-br from-secondary/20 to-teal-500/20 flex items-center justify-center"
                whileHover={{ scale: 1.05, rotate: 5 }}
                whileTap={{ scale: 0.95 }}
              >
                <svg className="w-5 h-5 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </motion.div>
              <div>
                <h1 className="text-xl font-bold text-foreground">1:N Face Search</h1>
                <p className="text-xs text-muted-foreground">Search against {databaseSize} faces in database</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-full bg-secondary/10 text-secondary text-xs font-semibold border border-secondary/20 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
              Real-time Search
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] gap-8">
          {/* Left Column - Upload */}
          <div className="space-y-6">
            {/* Upload Section */}
            <motion.div 
              className="space-y-4"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">Search Image</h2>
                {image && (
                  <button
                    onClick={() => { setImage(null); setResults(null); }}
                    className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>

              <motion.div 
                className={`relative aspect-square rounded-2xl border-2 border-dashed transition-all overflow-hidden ${
                  image ? 'border-secondary/50 bg-card/50' : 'border-border hover:border-secondary/30 bg-card/30 hover:bg-card/50'
                }`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                whileHover={{ scale: image ? 1 : 1.01 }}
              >
                {image ? (
                  <>
                    <img src={image} alt="Search" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
                    
                    {/* Face detection overlay */}
                    <motion.div 
                      className="absolute inset-[20%] border-2 border-secondary rounded-full"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.2 }}
                    />
                    
                    {/* Scanning effect when searching */}
                    {isSearching && (
                      <motion.div 
                        className="absolute inset-0 bg-gradient-to-b from-secondary/20 via-transparent to-transparent"
                        animate={{ y: ['0%', '100%', '0%'] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      />
                    )}
                    
                    <motion.div 
                      className="absolute bottom-4 left-4 right-4 p-3 rounded-xl bg-card/90 backdrop-blur-sm border border-border/50"
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.3 }}
                    >
                      <div className="flex items-center gap-2 text-xs">
                        <svg className="w-4 h-4 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-muted-foreground">Face detected • Quality: Excellent</span>
                      </div>
                    </motion.div>
                  </>
                ) : (
                  <label className="cursor-pointer flex flex-col items-center justify-center h-full p-8 text-center">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-secondary/10 to-primary/10 flex items-center justify-center mb-4">
                      <svg className="w-10 h-10 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <p className="text-foreground font-semibold mb-2">Upload Face to Search</p>
                    <p className="text-sm text-muted-foreground mb-4">Drag & drop or click to browse</p>
                    <span className="text-xs text-muted-foreground px-3 py-1 rounded-full bg-muted/20">
                      JPG, PNG up to 10MB
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </motion.div>

              {/* Search Button */}
              <motion.button
                onClick={handleSearch}
                disabled={!image || isSearching}
                className="w-full py-4 bg-gradient-to-r from-secondary to-primary text-primary-foreground font-bold rounded-xl hover:shadow-lg hover:shadow-secondary/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {isSearching ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Searching {databaseSize} faces...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Search Database
                  </>
                )}
              </motion.button>

              {/* Progress bar when searching */}
              {isSearching && (
                <motion.div 
                  className="space-y-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Searching database...</span>
                    <span>{Math.round(searchProgress)}%</span>
                  </div>
                  <div className="h-2 bg-muted/20 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-gradient-to-r from-secondary to-primary"
                      initial={{ width: 0 }}
                      animate={{ width: `${searchProgress}%` }}
                    />
                  </div>
                </motion.div>
              )}

              {/* Database Info */}
              <div className="p-4 rounded-xl bg-card/30 border border-border space-y-3">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                  </svg>
                  Database Statistics
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 rounded-lg bg-card/50">
                    <p className="text-2xl font-bold text-secondary">{databaseSize}</p>
                    <p className="text-xs text-muted-foreground">Total Faces</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-card/50">
                    <p className="text-2xl font-bold text-primary">&lt;1s</p>
                    <p className="text-xs text-muted-foreground">Search Time</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Right Column - Results */}
          <motion.div 
            className="space-y-4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">
                Search Results
                {results && <span className="text-muted-foreground font-normal ml-2">({results.length} matches)</span>}
              </h2>
              {results && (
                <span className="text-xs text-muted-foreground">
                  Searched in 847ms
                </span>
              )}
            </div>

            <AnimatePresence mode="wait">
              {results ? (
                <motion.div 
                  className="space-y-3"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {results.map((result, i) => (
                    <motion.div 
                      key={result.id}
                      className="group rounded-xl border border-border bg-card/30 hover:bg-card/60 hover:border-secondary/30 transition-all overflow-hidden"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                    >
                      <div className="p-4">
                        <div className="flex items-center gap-4">
                          {/* Avatar */}
                          <div className="relative">
                            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center overflow-hidden">
                              <span className="text-2xl">👤</span>
                            </div>
                            {/* Confidence indicator */}
                            <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                              result.confidence >= 90 ? 'bg-secondary text-white' :
                              result.confidence >= 70 ? 'bg-primary text-white' :
                              'bg-muted text-foreground'
                            }`}>
                              {i + 1}
                            </div>
                          </div>
                          
                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-bold text-foreground group-hover:text-secondary transition-colors truncate">
                                {result.name}
                              </h4>
                              {result.confidence >= 90 && (
                                <span className="px-2 py-0.5 rounded-full bg-secondary/10 text-secondary text-[10px] font-semibold border border-secondary/20">
                                  HIGH MATCH
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">{result.location}</p>
                          </div>
                          
                          {/* Confidence */}
                          <div className="text-right">
                            <p className={`text-2xl font-bold ${
                              result.confidence >= 90 ? 'text-secondary' :
                              result.confidence >= 70 ? 'text-primary' :
                              'text-muted-foreground'
                            }`}>
                              {result.confidence.toFixed(1)}%
                            </p>
                            <p className="text-[10px] text-muted-foreground">confidence</p>
                          </div>
                        </div>
                        
                        {/* Progress bar */}
                        <div className="mt-3">
                          <div className="h-1.5 bg-muted/20 rounded-full overflow-hidden">
                            <motion.div 
                              className={`h-full rounded-full ${
                                result.confidence >= 90 ? 'bg-gradient-to-r from-secondary to-primary' :
                                result.confidence >= 70 ? 'bg-gradient-to-r from-primary to-secondary/50' :
                                'bg-muted-foreground'
                              }`}
                              initial={{ width: 0 }}
                              animate={{ width: `${result.confidence}%` }}
                              transition={{ duration: 0.8, delay: i * 0.1 + 0.3 }}
                            />
                          </div>
                        </div>
                        
                        {/* Footer */}
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {result.timestamp}
                          </p>
                          <button className="px-3 py-1.5 text-xs font-medium border border-primary/50 text-primary rounded-lg hover:bg-primary/10 transition-colors">
                            View Profile
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                <motion.div 
                  className="h-[500px] rounded-xl border-2 border-dashed border-border bg-card/20 flex flex-col items-center justify-center text-center p-8"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <div className="w-20 h-20 rounded-full bg-muted/10 flex items-center justify-center mb-4">
                    <svg className="w-10 h-10 text-muted-foreground/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">No Search Results Yet</h3>
                  <p className="text-sm text-muted-foreground max-w-xs">
                    Upload a face image and click "Search Database" to find matching identities
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* Info Section */}
        <motion.div 
          className="mt-8 p-6 rounded-2xl bg-card/30 border border-border"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            About 1:N Face Search
          </h3>
          <p className="text-muted-foreground mb-6">
            The 1:N face search identifies a person by comparing their facial image against a database of millions of faces. This is ideal for surveillance, access control, and identification purposes.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: '🔍', text: 'Search millions of faces', value: '2.5M+' },
              { icon: '⚡', text: 'Average response time', value: '<1 sec' },
              { icon: '🎯', text: 'Identification accuracy', value: '99.9%' },
              { icon: '🏆', text: 'NIST ranking', value: '#1' }
            ].map((item) => (
              <div key={item.text} className="text-center p-4 rounded-xl bg-card/50 border border-border/50">
                <span className="text-2xl">{item.icon}</span>
                <p className="text-xl font-bold text-foreground mt-2">{item.value}</p>
                <p className="text-xs text-muted-foreground">{item.text}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </main>
    </div>
  )
}
