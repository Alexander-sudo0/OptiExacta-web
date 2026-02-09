'use client'

import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/auth-context'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface FaceImage {
  id: string
  preview: string
  file?: File
  name: string
}

interface SearchResult {
  groupId: string
  matchCount: number
  confidence: number
  matches: Array<{
    sourceId: string
    targetId: string
    confidence: number
  }>
}

export default function FaceSearchNNPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuth()
  const [image1Set, setImage1Set] = useState<FaceImage[]>([])
  const [image2Set, setImage2Set] = useState<FaceImage[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchProgress, setSearchProgress] = useState(0)
  const [results, setResults] = useState<SearchResult[] | null>(null)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, isLoading, router])

  if (isLoading || !isAuthenticated) {
    return null
  }

  const handleFileUpload = (files: FileList | null, setNumber: 1 | 2) => {
    if (!files) return

    const newImages: FaceImage[] = Array.from(files).map((file, idx) => ({
      id: `${setNumber}-${Date.now()}-${idx}`,
      preview: URL.createObjectURL(file),
      file,
      name: file.name
    }))

    if (setNumber === 1) {
      setImage1Set(prev => [...prev, ...newImages])
    } else {
      setImage2Set(prev => [...prev, ...newImages])
    }
  }

  const removeImage = (id: string, setNumber: 1 | 2) => {
    if (setNumber === 1) {
      setImage1Set(prev => prev.filter(img => img.id !== id))
    } else {
      setImage2Set(prev => prev.filter(img => img.id !== id))
    }
  }

  const handleSearch = async () => {
    if (image1Set.length === 0 || image2Set.length === 0) {
      return
    }

    setIsSearching(true)
    setSearchProgress(0)
    setResults(null)

    // Simulate progress
    const interval = setInterval(() => {
      setSearchProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval)
          return 100
        }
        return prev + Math.random() * 10
      })
    }, 200)

    // Simulate API call
    setTimeout(() => {
      clearInterval(interval)
      setSearchProgress(100)
      
      // Generate mock results
      const mockResults: SearchResult[] = []
      const matchCount = Math.min(image1Set.length, image2Set.length)
      
      for (let i = 0; i < matchCount; i++) {
        const matches = []
        const numMatches = Math.floor(Math.random() * 3) + 1
        
        for (let j = 0; j < numMatches && j < image2Set.length; j++) {
          matches.push({
            sourceId: image1Set[i].id,
            targetId: image2Set[j].id,
            confidence: 85 + Math.random() * 14
          })
        }
        
        if (matches.length > 0) {
          mockResults.push({
            groupId: `group-${i}`,
            matchCount: matches.length,
            confidence: matches.reduce((sum, m) => sum + m.confidence, 0) / matches.length,
            matches
          })
        }
      }
      
      setResults(mockResults)
      setIsSearching(false)
    }, 3000)
  }

  const clearAll = () => {
    setImage1Set([])
    setImage2Set([])
    setResults(null)
    setSearchProgress(0)
  }

  const totalMatches = results?.reduce((sum, r) => sum + r.matchCount, 0) || 0
  const avgConfidence = results && results.length > 0 
    ? (results.reduce((sum, r) => sum + r.confidence, 0) / results.length).toFixed(1)
    : 0

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">N:N Face Matching</h1>
              <p className="text-muted-foreground">Compare multiple faces against multiple faces for batch matching</p>
            </div>
            {(image1Set.length > 0 || image2Set.length > 0) && (
              <button
                onClick={clearAll}
                className="px-4 py-2 border border-border rounded-xl text-foreground hover:bg-card/50 transition-colors text-sm"
              >
                Clear All
              </button>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
            {[
              { label: 'Set A Images', value: image1Set.length, icon: '📸' },
              { label: 'Set B Images', value: image2Set.length, icon: '📷' },
              { label: 'Total Matches', value: totalMatches, icon: '✓' },
              { label: 'Avg Confidence', value: results ? `${avgConfidence}%` : '-', icon: '⭐' }
            ].map((stat, i) => (
              <div key={stat.label} className="p-3 rounded-xl border border-border bg-card/30">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl">{stat.icon}</span>
                  <span className="text-xs text-muted-foreground">{stat.label}</span>
                </div>
                <p className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Upload Areas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Set 1 */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="p-6 rounded-2xl border-2 border-dashed border-primary/30 bg-card/30 hover:border-primary/50 transition-all">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-cyan-500 flex items-center justify-center text-sm font-bold text-white">A</span>
                  Source Set
                </h2>
                <label className="px-4 py-2 bg-gradient-to-r from-primary to-secondary text-primary-foreground text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity cursor-pointer">
                  + Add Images
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e.target.files, 1)}
                    className="hidden"
                  />
                </label>
              </div>

              {image1Set.length === 0 ? (
                <label className="block cursor-pointer">
                  <div className="py-12 text-center">
                    <svg className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-muted-foreground font-medium">Click or drag to upload Set A</p>
                    <p className="text-xs text-muted-foreground mt-2">Upload multiple images at once</p>
                  </div>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e.target.files, 1)}
                    className="hidden"
                  />
                </label>
              ) : (
                <div className="grid grid-cols-3 gap-3 max-h-96 overflow-y-auto">
                  {image1Set.map((img, idx) => (
                    <motion.div
                      key={img.id}
                      className="relative group aspect-square rounded-xl overflow-hidden border-2 border-border bg-card"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      <img src={img.preview} alt={img.name} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => removeImage(img.id, 1)}
                          className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center text-xs hover:bg-red-600"
                        >
                          ×
                        </button>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 p-2 bg-black/60 text-white text-xs truncate">
                        {img.name}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>

          {/* Set 2 */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="p-6 rounded-2xl border-2 border-dashed border-secondary/30 bg-card/30 hover:border-secondary/50 transition-all">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-secondary to-teal-500 flex items-center justify-center text-sm font-bold text-white">B</span>
                  Target Set
                </h2>
                <label className="px-4 py-2 bg-gradient-to-r from-secondary to-teal-500 text-primary-foreground text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity cursor-pointer">
                  + Add Images
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e.target.files, 2)}
                    className="hidden"
                  />
                </label>
              </div>

              {image2Set.length === 0 ? (
                <label className="block cursor-pointer">
                  <div className="py-12 text-center">
                    <svg className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-muted-foreground font-medium">Click or drag to upload Set B</p>
                    <p className="text-xs text-muted-foreground mt-2">Upload multiple images at once</p>
                  </div>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e.target.files, 2)}
                    className="hidden"
                  />
                </label>
              ) : (
                <div className="grid grid-cols-3 gap-3 max-h-96 overflow-y-auto">
                  {image2Set.map((img, idx) => (
                    <motion.div
                      key={img.id}
                      className="relative group aspect-square rounded-xl overflow-hidden border-2 border-border bg-card"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      <img src={img.preview} alt={img.name} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => removeImage(img.id, 2)}
                          className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center text-xs hover:bg-red-600"
                        >
                          ×
                        </button>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 p-2 bg-black/60 text-white text-xs truncate">
                        {img.name}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Search Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <button
            onClick={handleSearch}
            disabled={image1Set.length === 0 || image2Set.length === 0 || isSearching}
            className="w-full py-4 bg-gradient-to-r from-primary via-secondary to-primary bg-size-200 bg-pos-0 hover:bg-pos-100 text-primary-foreground font-bold rounded-xl transition-all duration-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg shadow-primary/20"
          >
            {isSearching ? (
              <>
                <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Matching {image1Set.length} × {image2Set.length} Faces...
              </>
            ) : (
              <>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Compare Sets ({image1Set.length} vs {image2Set.length})
              </>
            )}
          </button>
        </motion.div>

        {/* Progress */}
        <AnimatePresence>
          {isSearching && (
            <motion.div
              className="p-5 rounded-xl border border-primary/30 bg-primary/5"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground">Processing Batch Comparison</span>
                <span className="text-sm text-primary font-bold">{Math.min(Math.round(searchProgress), 100)}%</span>
              </div>
              <div className="h-2 rounded-full bg-border overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-primary to-secondary"
                  animate={{ width: `${Math.min(searchProgress, 100)}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Analyzing {image1Set.length * image2Set.length} potential matches...
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results */}
        <AnimatePresence>
          {results && results.length > 0 && (
            <motion.div
              className="space-y-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h2 className="text-2xl font-bold text-foreground flex items-center gap-3">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Match Results
              </h2>

              <div className="grid gap-4">
                {results.map((result, idx) => (
                  <motion.div
                    key={result.groupId}
                    className="p-5 rounded-xl border border-border bg-card/30 hover:bg-card/50 transition-all"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold">
                          {idx + 1}
                        </span>
                        <div>
                          <h3 className="font-bold text-foreground">Match Group {idx + 1}</h3>
                          <p className="text-sm text-muted-foreground">{result.matchCount} matches found</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-2xl font-bold ${
                          result.confidence >= 95 ? 'text-green-400' :
                          result.confidence >= 85 ? 'text-yellow-400' : 'text-orange-400'
                        }`}>
                          {result.confidence.toFixed(1)}%
                        </div>
                        <p className="text-xs text-muted-foreground">Avg Confidence</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {result.matches.map((match, mIdx) => (
                        <div
                          key={`${match.sourceId}-${match.targetId}`}
                          className="flex items-center gap-3 p-3 rounded-lg bg-background/50 border border-border/50"
                        >
                          <div className="flex items-center gap-2 flex-1">
                            <span className="text-xs text-muted-foreground">Set A</span>
                            <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                            <span className="text-xs text-muted-foreground">Set B</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-bold ${
                              match.confidence >= 95 ? 'text-green-400' :
                              match.confidence >= 90 ? 'text-yellow-400' : 'text-orange-400'
                            }`}>
                              {match.confidence.toFixed(1)}%
                            </span>
                            <div className="w-20 h-1.5 rounded-full bg-border overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-primary to-secondary"
                                style={{ width: `${match.confidence}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Info */}
        <motion.div
          className="p-6 rounded-xl border border-border bg-card/30"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            About N:N Matching
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { icon: '🔄', title: 'Batch Processing', desc: 'Compare entire sets of faces simultaneously' },
              { icon: '⚡', title: 'Fast Matching', desc: 'Optimized algorithms for large-scale comparison' },
              { icon: '📊', title: 'Group Results', desc: 'Organized results by match groups' },
              { icon: '🎯', title: 'High Accuracy', desc: 'Same 99.9% accuracy as 1:1 matching' },
            ].map((feature) => (
              <div key={feature.title} className="flex items-start gap-3 p-4 rounded-lg border border-border/50 bg-background/30">
                <span className="text-2xl">{feature.icon}</span>
                <div>
                  <h4 className="font-semibold text-foreground text-sm">{feature.title}</h4>
                  <p className="text-xs text-muted-foreground">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
