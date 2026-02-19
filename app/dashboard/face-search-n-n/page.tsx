'use client'

import React from "react"
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/auth-context'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { validateImageFile, validateImageFiles, readFileAsDataUrl, getConfidenceLevel, MAX_IMAGE_BYTES } from '@/lib/upload-utils'
import { detectFace, verifyFaces, generateBatchId, generateShareToken, storeFaceSearchResult, type NToNResult, type NToNMatch } from '@/lib/backend-api'
import FaceImagePreview, { FaceThumbnail } from '@/components/face-image-preview'

interface ImageItem {
  id: string
  file: File
  preview: string
  filename: string
}

export default function FaceSearchNNPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuth()
  const [setA, setSetA] = useState<ImageItem[]>([])
  const [setB, setSetB] = useState<ImageItem[]>([])
  const [previewA, setPreviewA] = useState<Array<{ id: string; filename: string; faces: Array<{ faceIndex: number; faceId: string; bbox: { left: number; top: number; right: number; bottom: number } }> }>>([])
  const [previewB, setPreviewB] = useState<Array<{ id: string; filename: string; faces: Array<{ faceIndex: number; faceId: string; bbox: { left: number; top: number; right: number; bottom: number } }> }>>([])
  const [isDetecting, setIsDetecting] = useState(false)
  const [matchThreshold, setMatchThreshold] = useState(0.72)
  const [isComparing, setIsComparing] = useState(false)
  const [result, setResult] = useState<NToNResult | null>(null)
  const [shareToken, setShareToken] = useState<{ curl: string; expiresAt: string } | null>(null)
  const [shareRequestId, setShareRequestId] = useState<string | null>(null)
  const [copySuccess, setCopySuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Skip auth redirect in development bypass mode
    if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_SKIP_AUTH_IN_DEV === 'true') {
      return
    }
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, isLoading, router])

  const handleUpload = useCallback(async (files: FileList | null, target: 'A' | 'B') => {
    if (!files || files.length === 0) return

    const fileArray = Array.from(files)
    
    // Limit to 5 images per set for free tier
    const MAX_IMAGES = 5
    const currentSet = target === 'A' ? setA : setB
    if (currentSet.length + fileArray.length > MAX_IMAGES) {
      setError(`Maximum ${MAX_IMAGES} images allowed per set`)
      return
    }
    
    const validation = validateImageFiles(fileArray)
    if (!validation.valid) {
      setError(validation.error || 'Invalid files')
      return
    }

    const newItems: ImageItem[] = await Promise.all(
      fileArray.map(async (file) => ({
        id: `${target}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file,
        preview: await readFileAsDataUrl(file),
        filename: file.name,
      }))
    )

    if (target === 'A') {
      setSetA(prev => [...prev, ...newItems])
      setPreviewA([])
    } else {
      setSetB(prev => [...prev, ...newItems])
      setPreviewB([])
    }

    setResult(null)
    setShareToken(null)
    setShareRequestId(null)
    setShareRequestId(null)
    setError(null)
  }, [])

  const removeImage = (id: string, target: 'A' | 'B') => {
    if (target === 'A') {
      setSetA(prev => prev.filter(i => i.id !== id))
      setPreviewA(prev => prev.filter(i => i.id !== id))
    } else {
      setSetB(prev => prev.filter(i => i.id !== id))
      setPreviewB(prev => prev.filter(i => i.id !== id))
    }
    setResult(null)
    setShareToken(null)
    setShareRequestId(null)
  }

  const handleDetectFaces = async () => {
    if (setA.length === 0 || setB.length === 0) {
      setError('Please upload images to both sets before detecting faces')
      return
    }

    setIsDetecting(true)
    setError(null)

    try {
      const detectSet = async (items: ImageItem[]) => {
        return Promise.all(
          items.map(async (item) => {
            try {
              const result = await detectFace(item.file)
              const faces = result.objects?.face || []
              return {
                id: item.id,
                filename: item.filename,
                faces: faces.map((face, faceIndex) => ({
                  faceIndex,
                  faceId: face.id,
                  bbox: face.bbox,
                })),
              }
            } catch {
              return { id: item.id, filename: item.filename, faces: [] }
            }
          })
        )
      }

      const [facesA, facesB] = await Promise.all([
        detectSet(setA),
        detectSet(setB),
      ])

      setPreviewA(facesA)
      setPreviewB(facesB)
    } catch (err: any) {
      setError(err.message || 'Face detection failed')
    } finally {
      setIsDetecting(false)
    }
  }

  const handleCompare = async () => {
    if (setA.length === 0 || setB.length === 0) {
      setError('Please upload images to both sets')
      return
    }

    setIsComparing(true)
    setError(null)
    setShareToken(null)

    // Single batch ID for the entire compare operation (counts as 1 API call)
    const batchId = generateBatchId()

    try {
      // Detect faces in both sets (all faces per image)
      const detectSet = async (items: ImageItem[]) => {
        return Promise.all(
          items.map(async (item) => {
            try {
              const result = await detectFace(item.file, batchId)
              const faces = result.objects?.face || []
              return {
                id: item.id,
                filename: item.filename,
                faces: faces.map((face, faceIndex) => ({
                  faceIndex,
                  faceId: face.id,
                  bbox: face.bbox,
                })),
              }
            } catch {
              return { id: item.id, filename: item.filename, faces: [] }
            }
          })
        )
      }

      const [facesA, facesB] = await Promise.all([
        detectSet(setA),
        detectSet(setB),
      ])

      // Cross-verify all face pairs across images
      const comparisons: any[] = []
      for (const imageA of facesA) {
        for (const imageB of facesB) {
          for (const faceA of imageA.faces) {
            for (const faceB of imageB.faces) {
              try {
                const verifyResult = await verifyFaces(faceA.faceId, faceB.faceId, batchId)
                const confidence = verifyResult.confidence
                comparisons.push({
                  setAIndex: setA.findIndex(i => i.id === imageA.id),
                  setBIndex: setB.findIndex(i => i.id === imageB.id),
                  setAFilename: imageA.filename,
                  setBFilename: imageB.filename,
                  faceAIndex: faceA.faceIndex,
                  faceBIndex: faceB.faceIndex,
                  faceAId: faceA.faceId,
                  faceBId: faceB.faceId,
                  faceABbox: faceA.bbox,
                  faceBBbox: faceB.bbox,
                  confidence,
                  match: confidence >= matchThreshold,
                })
              } catch {
                // Skip failed verifications
              }
            }
          }
        }
      }

      const matchingPairs = comparisons.filter(pair => pair.match)

      // Sort by confidence descending
      comparisons.sort((a, b) => b.confidence - a.confidence)
      matchingPairs.sort((a, b) => b.confidence - a.confidence)

      setResult({
        id: `${Date.now()}`,
        setACount: setA.length,
        setBCount: setB.length,
        matches: matchingPairs,
        matchingPairs,
        comparisons,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      } as any)
      setShareRequestId(null)
    } catch (err: any) {
      setError(err.message || 'Comparison failed')
    } finally {
      setIsComparing(false)
    }
  }

  const handleGenerateShare = async () => {
    if (!result?.id) return

    try {
      let requestId = shareRequestId
      if (!requestId) {
        const stored = await storeFaceSearchResult({
          type: 'N_TO_N',
          requestData: {
            set1: setA.map(i => ({ filename: i.file?.name || i.filename, size: i.file?.size || 0 })),
            set2: setB.map(i => ({ filename: i.file?.name || i.filename, size: i.file?.size || 0 })),
          },
          resultData: result,
        })
        requestId = stored.id
        setShareRequestId(requestId)
        setResult(prev => prev ? { ...prev, id: requestId } : prev)
      }

      const share = await generateShareToken(requestId)
      setShareToken({
        curl: share.curl,
        expiresAt: share.expiresAt,
      })
    } catch (err: any) {
      setError(err.message || 'Failed to generate share token')
    }
  }

  const handleCopyCurl = async () => {
    if (!shareToken?.curl) return
    await navigator.clipboard.writeText(shareToken.curl)
    setCopySuccess(true)
    setTimeout(() => setCopySuccess(false), 2000)
  }

  const clearAll = () => {
    setSetA([])
    setSetB([])
    setPreviewA([])
    setPreviewB([])
    setResult(null)
    setShareToken(null)
    setShareRequestId(null)
    setError(null)
  }

  // Calculate statistics
  const totalMatches = result?.matchingPairs.length || 0
  const avgConfidence = result && result.matchingPairs.length > 0
    ? (result.matchingPairs.reduce((sum, p) => sum + p.confidence, 0) / result.matchingPairs.length * 100).toFixed(1)
    : '-'

  if (isLoading || !isAuthenticated) {
    return null
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
                className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center"
                whileHover={{ scale: 1.05, rotate: 5 }}
                whileTap={{ scale: 0.95 }}
              >
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </motion.div>
              <div>
                <h1 className="text-xl font-bold text-foreground">N:N Face Matching</h1>
                <p className="text-xs text-muted-foreground">Batch compare multiple sets</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold border border-primary/20">
              Max 5 per set
            </span>
            <span className="px-3 py-1.5 rounded-full bg-secondary/10 text-secondary text-xs font-semibold border border-secondary/20">
              {MAX_IMAGE_BYTES / (1024 * 1024)}MB per file
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Error display */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive"
            >
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats Row */}
        <motion.div 
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {[
            { label: 'Set A Images', value: setA.length, icon: '📸', color: 'from-primary to-cyan-500' },
            { label: 'Set B Images', value: setB.length, icon: '📷', color: 'from-secondary to-teal-500' },
            { label: 'Matching Pairs', value: totalMatches, icon: '✓', color: 'from-green-500 to-emerald-500' },
            { label: 'Avg Confidence', value: avgConfidence !== '-' ? `${avgConfidence}%` : '-', icon: '⭐', color: 'from-yellow-500 to-orange-500' },
          ].map((stat) => (
            <div key={stat.label} className="p-4 rounded-xl border border-border bg-card/30">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">{stat.icon}</span>
                <span className="text-xs text-muted-foreground">{stat.label}</span>
              </div>
              <p className={`text-2xl font-bold bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>
                {stat.value}
              </p>
            </div>
          ))}
        </motion.div>

        {/* Upload Areas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Set A */}
          <motion.div
            className="space-y-4"
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
                <div className="flex items-center gap-2">
                  {setA.length > 0 && (
                    <button
                      onClick={() => { setSetA([]); setResult(null); setShareToken(null); }}
                      className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                    >
                      Clear
                    </button>
                  )}
                  <label className="px-4 py-2 bg-gradient-to-r from-primary to-cyan-500 text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity cursor-pointer">
                    + Add
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) => handleUpload(e.target.files, 'A')}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {setA.length === 0 ? (
                <label className="block cursor-pointer">
                  <div className="py-12 text-center">
                    <svg className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-muted-foreground font-medium">Upload Set A Images</p>
                    <p className="text-xs text-muted-foreground mt-2">Multiple images supported</p>
                  </div>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => handleUpload(e.target.files, 'A')}
                    className="hidden"
                  />
                </label>
              ) : (
                <div className="grid grid-cols-3 gap-3 max-h-80 overflow-y-auto">
                  {setA.map((img, idx) => (
                    <motion.div
                      key={img.id}
                      className="relative group aspect-square rounded-xl overflow-hidden border-2 border-border bg-card"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.03 }}
                    >
                      <img src={img.preview} alt={img.filename} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => removeImage(img.id, 'A')}
                          className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center text-xs hover:bg-red-600"
                        >
                          ×
                        </button>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 p-2 bg-black/60 text-white text-xs truncate">
                        {img.filename}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>

          {/* Set B */}
          <motion.div
            className="space-y-4"
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
                <div className="flex items-center gap-2">
                  {setB.length > 0 && (
                    <button
                      onClick={() => { setSetB([]); setResult(null); setShareToken(null); }}
                      className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                    >
                      Clear
                    </button>
                  )}
                  <label className="px-4 py-2 bg-gradient-to-r from-secondary to-teal-500 text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity cursor-pointer">
                    + Add
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) => handleUpload(e.target.files, 'B')}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {setB.length === 0 ? (
                <label className="block cursor-pointer">
                  <div className="py-12 text-center">
                    <svg className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-muted-foreground font-medium">Upload Set B Images</p>
                    <p className="text-xs text-muted-foreground mt-2">Multiple images supported</p>
                  </div>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => handleUpload(e.target.files, 'B')}
                    className="hidden"
                  />
                </label>
              ) : (
                <div className="grid grid-cols-3 gap-3 max-h-80 overflow-y-auto">
                  {setB.map((img, idx) => (
                    <motion.div
                      key={img.id}
                      className="relative group aspect-square rounded-xl overflow-hidden border-2 border-border bg-card"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.03 }}
                    >
                      <img src={img.preview} alt={img.filename} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => removeImage(img.id, 'B')}
                          className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center text-xs hover:bg-red-600"
                        >
                          ×
                        </button>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 p-2 bg-black/60 text-white text-xs truncate">
                        {img.filename}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Face Preview and Threshold */}
        <motion.div
          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <div className="lg:col-span-2 p-6 rounded-2xl border border-border bg-card/30">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Face Preview</h3>
                <p className="text-xs text-muted-foreground">Verify detected faces before matching</p>
              </div>
              <button
                onClick={handleDetectFaces}
                disabled={isDetecting || setA.length === 0 || setB.length === 0}
                className="px-4 py-2 rounded-xl border border-primary/30 text-primary hover:bg-primary/10 transition-colors text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDetecting ? 'Detecting...' : 'Detect Faces'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-muted-foreground">Set A</h4>
                {previewA.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No preview yet</p>
                ) : (
                  previewA.map((img) => (
                    <div key={img.id} className="p-3 rounded-lg border border-border bg-muted/10">
                      <p className="text-xs font-medium text-foreground truncate mb-2">{img.filename}</p>
                      {img.faces.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No faces detected</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {img.faces.map((face) => (
                            <div key={`${img.id}-${face.faceIndex}`} className="flex flex-col items-center gap-1">
                              <FaceThumbnail
                                src={setA.find(i => i.id === img.id)?.preview || ''}
                                bbox={face.bbox}
                                size={56}
                                className="border border-primary"
                              />
                              <span className="text-[10px] text-muted-foreground">Face #{face.faceIndex + 1}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-muted-foreground">Set B</h4>
                {previewB.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No preview yet</p>
                ) : (
                  previewB.map((img) => (
                    <div key={img.id} className="p-3 rounded-lg border border-border bg-muted/10">
                      <p className="text-xs font-medium text-foreground truncate mb-2">{img.filename}</p>
                      {img.faces.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No faces detected</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {img.faces.map((face) => (
                            <div key={`${img.id}-${face.faceIndex}`} className="flex flex-col items-center gap-1">
                              <FaceThumbnail
                                src={setB.find(i => i.id === img.id)?.preview || ''}
                                bbox={face.bbox}
                                size={56}
                                className="border border-secondary"
                              />
                              <span className="text-[10px] text-muted-foreground">Face #{face.faceIndex + 1}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="p-6 rounded-2xl border border-border bg-card/30">
            <h3 className="text-lg font-semibold text-foreground mb-4">Match Threshold</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Sensitivity</span>
                <span className="font-semibold text-foreground">{Math.round(matchThreshold * 100)}%</span>
              </div>
              <input
                type="range"
                min={0.5}
                max={0.95}
                step={0.01}
                value={matchThreshold}
                onChange={(e) => setMatchThreshold(Number(e.target.value))}
                className="w-full accent-secondary"
              />
              <p className="text-xs text-muted-foreground">
                Higher values require closer matches. Default is 72%.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Compare Button */}
        <motion.div
          className="flex gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <button
            onClick={handleCompare}
            disabled={setA.length === 0 || setB.length === 0 || isComparing}
            className="flex-1 py-4 bg-gradient-to-r from-primary via-secondary to-primary text-primary-foreground font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg shadow-primary/20 hover:shadow-xl"
          >
            {isComparing ? (
              <>
                <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Comparing {setA.length} × {setB.length} Faces...
              </>
            ) : (
              <>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Compare Sets ({setA.length} × {setB.length})
              </>
            )}
          </button>
          {(setA.length > 0 || setB.length > 0) && (
            <button
              onClick={clearAll}
              className="px-6 py-4 border border-border rounded-xl text-foreground hover:bg-card/50 transition-colors"
            >
              Clear All
            </button>
          )}
        </motion.div>

        {/* Results */}
        <AnimatePresence mode="wait">
          {result && (
            <motion.div 
              className="space-y-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              {/* Results Header */}
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-foreground flex items-center gap-3">
                  <svg className="w-6 h-6 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Comparison Results
                </h2>
                <span className="text-sm text-muted-foreground">
                  {(result.setACount || 0) * (result.setBCount || 0)} comparisons • {(result as any).matches?.length ?? (result as any).matchingPairs?.length ?? 0} matches
                </span>
              </div>

              {/* Matching Pairs */}
              {(((result as any).matches && (result as any).matches.length) || ((result as any).matchingPairs && (result as any).matchingPairs.length)) ? (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-secondary flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Face Matches Found ({(result as any).matches?.length ?? (result as any).matchingPairs?.length ?? 0})
                  </h3>
                  
                  {((result as any).matches ?? (result as any).matchingPairs).map((match: any, idx: number) => {
                    const setAImage = setA[match.setAIndex]
                    const setBImage = setB[match.setBIndex]
                    if (!setAImage || !setBImage) return null
                    
                    const level = getConfidenceLevel(match.confidence, matchThreshold)
                    const isMatch = match.match === true
                    
                    return (
                      <motion.div
                        key={`${setAImage.id}-${setBImage.id}-${idx}`}
                        className="bg-gradient-to-r from-secondary/10 to-primary/10 rounded-xl border border-secondary/30 overflow-hidden shadow-lg"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.15 }}
                      >
                        {/* Match header */}
                        <div className="p-4 bg-secondary/20 border-b border-secondary/30">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-3 h-3 rounded-full bg-secondary"></div>
                              <span className="text-lg font-bold text-secondary">
                                Face Match #{idx + 1}
                              </span>
                            </div>
                            <div className="text-right">
                              <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-secondary text-white">
                                ✓ VERIFIED
                              </div>
                              <p className="text-sm font-bold text-secondary mt-1">
                                {(match.confidence * 100).toFixed(1)}% confidence
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        {/* Side by side face thumbnails */}
                        <div className="relative p-6">
                          <div className="flex items-center justify-center gap-8">
                            {/* Set A face thumbnail */}
                            <div className="text-center space-y-3">
                              <h4 className="text-sm font-semibold text-muted-foreground">
                                SET A - IMAGE #{match.setAIndex + 1} • FACE #{(match.faceAIndex ?? 0) + 1}
                              </h4>
                              <div className="relative">
                                <FaceThumbnail
                                  src={setAImage.preview}
                                  bbox={match.faceABbox}
                                  size={120}
                                  className="border-3 border-primary shadow-lg"
                                />
                                <div className="absolute -top-2 -right-2 px-2 py-1 bg-primary rounded-full text-white text-xs font-bold">
                                  A
                                </div>
                              </div>
                              <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground truncate">
                                  {setAImage.filename}
                                </p>
                                {match.faceAId && (
                                  <div className="px-2 py-1 bg-muted/30 rounded text-xs font-mono text-muted-foreground">
                                    ID: {match.faceAId.slice(-8)}
                                  </div>
                                )}
                                {match.faceABbox && (
                                  <div className="text-xs text-muted-foreground bg-muted/20 rounded p-2">
                                    <p className="font-semibold mb-1">Coordinates:</p>
                                    <p className="font-mono text-[10px]">
                                      ({match.faceABbox.left.toFixed(1)}, {match.faceABbox.top.toFixed(1)}) → 
                                      ({match.faceABbox.right.toFixed(1)}, {match.faceABbox.bottom.toFixed(1)})
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {/* Match arrow */}
                            <div className="flex flex-col items-center gap-2">
                              <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center shadow-xl border-4 border-white">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              </div>
                              <span className="text-xs font-bold text-secondary">
                                {(match.confidence * 100).toFixed(1)}%
                              </span>
                            </div>
                            
                            {/* Set B face thumbnail */}
                            <div className="text-center space-y-3">
                              <h4 className="text-sm font-semibold text-muted-foreground">
                                SET B - IMAGE #{match.setBIndex + 1} • FACE #{(match.faceBIndex ?? 0) + 1}
                              </h4>
                              <div className="relative">
                                <FaceThumbnail
                                  src={setBImage.preview}
                                  bbox={match.faceBBbox}
                                  size={120}
                                  className="border-3 border-secondary shadow-lg"
                                />
                                <div className="absolute -top-2 -right-2 px-2 py-1 bg-secondary rounded-full text-white text-xs font-bold">
                                  B
                                </div>
                              </div>
                              <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground truncate">
                                  {setBImage.filename}
                                </p>
                                {match.faceBId && (
                                  <div className="px-2 py-1 bg-muted/30 rounded text-xs font-mono text-muted-foreground">
                                    ID: {match.faceBId.slice(-8)}
                                  </div>
                                )}
                                {match.faceBBbox && (
                                  <div className="text-xs text-muted-foreground bg-muted/20 rounded p-2">
                                    <p className="font-semibold mb-1">Coordinates:</p>
                                    <p className="font-mono text-[10px]">
                                      ({match.faceBBbox.left.toFixed(1)}, {match.faceBBbox.top.toFixed(1)}) → 
                                      ({match.faceBBbox.right.toFixed(1)}, {match.faceBBbox.bottom.toFixed(1)})
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Match details */}
                        <div className="p-4 bg-muted/30 border-t border-border">
                          <div className="grid grid-cols-2 gap-6">
                            <div>
                              <p className="text-sm font-semibold text-muted-foreground mb-2">Match Details</p>
                              <p className="text-xs text-muted-foreground">
                                Set A Image #{match.setAIndex + 1} ↔ Set B Image #{match.setBIndex + 1}
                              </p>
                            </div>
                            <div className="text-right">
                              <div className="space-y-2">
                                  <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-secondary/20 text-secondary">
                                    ✓ VERIFIED MATCH
                                  </div>
                                <div>
                                  <p className="text-xl font-bold text-secondary">
                                    {(match.confidence * 100).toFixed(1)}%
                                  </p>
                                  {level && (
                                    <p className={`text-sm ${level.color} font-medium`}>
                                      {level.label}
                                    </p>
                                  )}
                                </div>
                                {/* Confidence progress bar */}
                                <div className="w-full h-2 bg-muted/30 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-secondary rounded-full transition-all duration-1000"
                                    style={{ width: `${match.confidence * 100}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-muted/20 flex items-center justify-center">
                    <svg className="w-10 h-10 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-muted-foreground mb-3">
                    No Face Matches Found
                  </h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    No matching faces were found between Set A and Set B. 
                    Try uploading different images or adjusting face angles for better detection.
                  </p>
                </div>
              )}

              {/* Share Token Section */}
              {true && (
              <div className="p-4 rounded-xl bg-card/30 border border-border">
                {!shareToken ? (
                  <button
                    onClick={handleGenerateShare}
                    className="w-full py-3 rounded-xl border border-primary/30 text-primary hover:bg-primary/10 transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                    Generate Shareable Link (24h validity)
                  </button>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">Encrypted cURL Command</span>
                      <span className="text-xs text-muted-foreground">
                        Expires: {new Date(shareToken.expiresAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="relative">
                      <pre className="p-3 rounded-lg bg-muted/20 text-xs overflow-x-auto text-muted-foreground font-mono whitespace-pre-wrap break-words max-w-full">
                        {shareToken.curl}
                      </pre>
                      <button
                        onClick={handleCopyCurl}
                        className="absolute top-2 right-2 p-2 rounded-md bg-card hover:bg-muted transition-colors"
                      >
                        {copySuccess ? (
                          <svg className="w-4 h-4 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Info Section */}
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
          <p className="text-muted-foreground mb-6">
            Compare all faces in Set A against all faces in Set B to find matching pairs. Ideal for batch processing and finding duplicates across datasets.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: '🔄', text: 'Batch processing', value: 'All pairs' },
              { icon: '⚡', text: 'Processing speed', value: 'Parallel' },
              { icon: '🔐', text: 'Share results', value: '24h tokens' },
              { icon: '💾', text: 'Result retention', value: '30 days' }
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
