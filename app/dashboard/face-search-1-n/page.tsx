'use client'

import React from "react"
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/auth-context'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { validateImageFile, validateImageFiles, readFileAsDataUrl, loadImageMeta, normalizeBbox, getConfidenceLevel, MAX_IMAGE_BYTES } from '@/lib/upload-utils'
import { detectFace, verifyFaces, generateShareToken, storeFaceSearchResult, type OneToNResult, type OneToNMatch } from '@/lib/backend-api'
import FaceImagePreview, { FaceThumbnail } from '@/components/face-image-preview'

interface FaceState {
  file: File | null
  preview: string
  faceId: string | null
  bbox: { left: number; top: number; right: number; bottom: number } | null
  dimensions: { width: number; height: number } | null
  detecting: boolean
  error: string | null
}

interface TargetImage {
  id: string
  file: File
  preview: string
  filename: string
}

const initialSourceState: FaceState = {
  file: null,
  preview: '',
  faceId: null,
  bbox: null,
  dimensions: null,
  detecting: false,
  error: null,
}

export default function FaceSearch1ToNPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuth()
  const [source, setSource] = useState<FaceState>(initialSourceState)
  const [targets, setTargets] = useState<TargetImage[]>([])
  const [targetPreview, setTargetPreview] = useState<Array<{ id: string; filename: string; faces: Array<{ faceIndex: number; faceId: string; bbox: { left: number; top: number; right: number; bottom: number } }> }>>([])
  const [isDetectingTargets, setIsDetectingTargets] = useState(false)
  const [matchThreshold, setMatchThreshold] = useState(0.75)
  const [result, setResult] = useState<OneToNResult | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)
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

  const handleSourceDetection = useCallback(async (file: File) => {
    setSource(prev => ({ ...prev, detecting: true, error: null }))
    
    try {
      const result = await detectFace(file)
      const faces = result.objects?.face || []

      if (faces.length === 0) {
        setSource(prev => ({
          ...prev,
          detecting: false,
          faceId: null,
          bbox: null,
          error: 'No face detected in image',
        }))
        return
      }

      if (faces.length > 1) {
        setSource(prev => ({
          ...prev,
          detecting: false,
          faceId: null,
          bbox: null,
          error: 'Only one person is allowed in the source image',
        }))
        return
      }

      const face = faces[0]
      const bbox = normalizeBbox(face.bbox)
      setSource(prev => ({
        ...prev,
        faceId: face.id,
        bbox,
        detecting: false,
      }))
    } catch (err: any) {
      setSource(prev => ({
        ...prev,
        detecting: false,
        error: err.message || 'Face detection failed',
      }))
    }
  }, [])

  const handleSourceUpload = useCallback(async (file: File) => {
    const validation = validateImageFile(file)
    if (!validation.valid) {
      setSource(prev => ({ ...prev, error: validation.error || 'Invalid file' }))
      return
    }

    const preview = await readFileAsDataUrl(file)
    const dimensions = await loadImageMeta(preview)
    
    setSource({
      file,
      preview,
      faceId: null,
      bbox: null,
      dimensions,
      detecting: false,
      error: null,
    })
    
    setResult(null)
    setShareToken(null)
    setShareRequestId(null)
    setError(null)
    
    handleSourceDetection(file)
  }, [handleSourceDetection])

  const handleSourceInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleSourceUpload(file)
    }
  }

  const handleSourceDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith('image/')) {
      handleSourceUpload(file)
    }
  }

  const handleTargetsUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const fileArray = Array.from(files)
    
    // Limit to 5 images for free tier
    const MAX_IMAGES = 5
    if (targets.length + fileArray.length > MAX_IMAGES) {
      setError(`Maximum ${MAX_IMAGES} target images allowed`)
      return
    }
    
    const validation = validateImageFiles(fileArray)
    if (!validation.valid) {
      setError(validation.error || 'Invalid files')
      return
    }

    const newTargets: TargetImage[] = await Promise.all(
      fileArray.map(async (file) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file,
        preview: await readFileAsDataUrl(file),
        filename: file.name,
      }))
    )

    setTargets(prev => [...prev, ...newTargets])
    setTargetPreview([])
    setResult(null)
    setShareToken(null)
    setShareRequestId(null)
    setError(null)
  }

  const removeTarget = (id: string) => {
    setTargets(prev => prev.filter(t => t.id !== id))
    setTargetPreview(prev => prev.filter(t => t.id !== id))
    setResult(null)
    setShareToken(null)
    setShareRequestId(null)
  }

  const handleDetectTargets = async () => {
    if (targets.length === 0) {
      setError('Please upload at least one target image')
      return
    }

    setIsDetectingTargets(true)
    setError(null)

    try {
      const preview = await Promise.all(
        targets.map(async (t) => {
          try {
            const result = await detectFace(t.file)
            const faces = result.objects?.face || []
            return {
              id: t.id,
              filename: t.filename,
              faces: faces.map((face, faceIndex) => ({
                faceIndex,
                faceId: face.id,
                bbox: face.bbox,
              })),
            }
          } catch {
            return { id: t.id, filename: t.filename, faces: [] }
          }
        })
      )

      setTargetPreview(preview)
    } catch (err: any) {
      setError(err.message || 'Target face detection failed')
    } finally {
      setIsDetectingTargets(false)
    }
  }

  const handleVerify = async () => {
    if (!source.file) {
      setError('Please upload a source image')
      return
    }

    if (targets.length === 0) {
      setError('Please upload at least one target image')
      return
    }

    if (!source.faceId) {
      setError('Waiting for source face detection to complete')
      return
    }

    if (source.error) {
      setError(source.error)
      return
    }

    setIsVerifying(true)
    setError(null)
    setShareToken(null)

    try {
      // Detect faces in all target images
      const targetResults = await Promise.all(
        targets.map(async (t) => {
          try {
            const result = await detectFace(t.file)
            const faces = result.objects?.face || []
            return {
              id: t.id,
              filename: t.filename,
              faces: faces.map((face, faceIndex) => ({
                faceIndex,
                faceId: face.id,
                bbox: face.bbox,
              })),
            }
          } catch {
            return { id: t.id, filename: t.filename, faces: [] }
          }
        })
      )

      // Verify source against each detected target face
      const matches: OneToNMatch[] = []
      for (const target of targetResults) {
        if (target.faces.length === 0) {
          continue
        }

        let best: { faceId: string; bbox: { left: number; top: number; right: number; bottom: number }; confidence: number } | null = null
        for (const face of target.faces) {
          try {
            const verifyResult = await verifyFaces(source.faceId!, face.faceId)
            if (!best || verifyResult.confidence > best.confidence) {
              best = {
                faceId: face.faceId,
                bbox: face.bbox,
                confidence: verifyResult.confidence,
              }
            }
          } catch {
            // Skip failed verifications
          }
        }

        if (best) {
          matches.push({
            targetIndex: targets.findIndex(t => t.id === target.id),
            targetFilename: target.filename,
            faceId: best.faceId,
            bbox: best.bbox,
            confidence: best.confidence,
            match: best.confidence >= matchThreshold,
          })
        }
      }

      // Sort by confidence descending
      matches.sort((a, b) => b.confidence - a.confidence)

      setResult({
        id: `${Date.now()}`,
        source: {
          faceId: source.faceId!,
          bbox: source.bbox!,
        },
        matches,
        totalTargets: targets.length,
        matchCount: matches.filter(m => m.match).length,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })
      setShareRequestId(null)
    } catch (err: any) {
      setError(err.message || 'Verification failed')
    } finally {
      setIsVerifying(false)
    }
  }

  const handleGenerateShare = async () => {
    if (!result?.id) return

    try {
      let requestId = shareRequestId
      if (!requestId) {
        const stored = await storeFaceSearchResult({
          type: 'ONE_TO_N',
          requestData: {
            source: { filename: source.file?.name || 'source', size: source.file?.size || 0 },
            targets: targets.map(t => ({ filename: t.file?.name || t.filename, size: t.file?.size || 0 })),
          },
          resultData: result,
        })
        const storedId = stored.id
        requestId = storedId
        setShareRequestId(storedId)
        setResult(prev => (prev ? { ...prev, id: storedId } : prev))
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

  const resetAll = () => {
    setSource(initialSourceState)
    setTargets([])
    setTargetPreview([])
    setResult(null)
    setShareToken(null)
    setShareRequestId(null)
    setError(null)
  }

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
                className="w-10 h-10 rounded-xl bg-gradient-to-br from-secondary/20 to-teal-500/20 flex items-center justify-center"
                whileHover={{ scale: 1.05, rotate: 5 }}
                whileTap={{ scale: 0.95 }}
              >
                <svg className="w-5 h-5 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </motion.div>
              <div>
                <h1 className="text-xl font-bold text-foreground">1:N Face Verification</h1>
                <p className="text-xs text-muted-foreground">Compare one source against multiple targets</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold border border-primary/20">
              Max 5 targets
            </span>
            <span className="px-3 py-1.5 rounded-full bg-secondary/10 text-secondary text-xs font-semibold border border-secondary/20">
              {MAX_IMAGE_BYTES / (1024 * 1024)}MB per file
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Error display */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive"
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

        <div className="grid grid-cols-1 lg:grid-cols-[350px_1fr] gap-8">
          {/* Left Column - Source Upload */}
          <div className="space-y-6">
            <motion.div 
              className="space-y-4"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">Source Image</h2>
                {source.preview && (
                  <button
                    onClick={resetAll}
                    className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                  >
                    Reset All
                  </button>
                )}
              </div>

              <motion.div 
                className={`relative aspect-square rounded-2xl border-2 border-dashed transition-all overflow-hidden ${
                  source.preview ? 'border-secondary/50 bg-card/50' : 'border-border hover:border-secondary/30 bg-card/30 hover:bg-card/50'
                }`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleSourceDrop}
                whileHover={{ scale: source.preview ? 1 : 1.01 }}
              >
                {source.preview ? (
                  <>
                    <FaceImagePreview
                      src={source.preview}
                      bbox={source.bbox}
                      className="w-full h-full"
                      bboxColor="#22c55e"
                      showBboxOverlay={!!source.bbox}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent pointer-events-none" />
                    
                    {isVerifying && (
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
                      transition={{ delay: 0.2 }}
                    >
                      {source.detecting ? (
                        <div className="flex items-center gap-2 text-xs text-blue-500">
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Detecting face...
                        </div>
                      ) : source.error ? (
                        <div className="flex items-center gap-2 text-xs text-destructive">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          {source.error}
                        </div>
                      ) : source.faceId ? (
                        <div className="flex items-center gap-2 text-xs text-secondary">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Face detected • Ready
                        </div>
                      ) : null}
                    </motion.div>
                  </>
                ) : (
                  <label className="cursor-pointer flex flex-col items-center justify-center h-full p-8 text-center">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-secondary/10 to-primary/10 flex items-center justify-center mb-4">
                      <svg className="w-10 h-10 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <p className="text-foreground font-semibold mb-2">Upload Source Face</p>
                    <p className="text-sm text-muted-foreground mb-4">Drag & drop or click</p>
                    <span className="text-xs text-muted-foreground px-3 py-1 rounded-full bg-muted/20">
                      Max 2MB
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleSourceInput}
                      className="hidden"
                    />
                  </label>
                )}
              </motion.div>

              {/* Target Images Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">
                    Target Images ({targets.length})
                  </h3>
                  {targets.length > 0 && (
                    <button
                      onClick={() => { setTargets([]); setResult(null); setShareToken(null); }}
                      className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                    >
                      Clear All
                    </button>
                  )}
                </div>
                
                <label className="block p-4 rounded-xl border-2 border-dashed border-border hover:border-primary/30 bg-card/20 hover:bg-card/40 cursor-pointer transition-all">
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Target Images
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleTargetsUpload}
                    className="hidden"
                  />
                </label>

                {targets.length > 0 && (
                  <div className="grid grid-cols-4 gap-2">
                    {targets.map((target) => (
                      <div key={target.id} className="relative group">
                        <img
                          src={target.preview}
                          alt={target.filename}
                          className="w-full aspect-square object-cover rounded-lg"
                        />
                        <button
                          onClick={() => removeTarget(target.id)}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-destructive/80 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Target Face Preview */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">
                    Target Face Preview
                  </h3>
                  <button
                    onClick={handleDetectTargets}
                    disabled={targets.length === 0 || isDetectingTargets}
                    className="text-xs px-3 py-1.5 rounded-full border border-primary/30 text-primary hover:bg-primary/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isDetectingTargets ? 'Detecting...' : 'Detect Faces'}
                  </button>
                </div>

                {targetPreview.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No preview yet</p>
                ) : (
                  <div className="space-y-2">
                    {targetPreview.map((img) => (
                      <div key={img.id} className="p-3 rounded-lg border border-border bg-muted/10">
                        <p className="text-xs font-medium text-foreground truncate mb-2">{img.filename}</p>
                        {img.faces.length === 0 ? (
                          <p className="text-xs text-muted-foreground">No faces detected</p>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {img.faces.map((face) => (
                              <div key={`${img.id}-${face.faceIndex}`} className="flex flex-col items-center gap-1">
                                <FaceThumbnail
                                  src={targets.find(t => t.id === img.id)?.preview || ''}
                                  bbox={face.bbox}
                                  size={48}
                                  className="border border-secondary"
                                />
                                <span className="text-[10px] text-muted-foreground">Face #{face.faceIndex + 1}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Match Threshold */}
              <div className="p-4 rounded-xl border border-border bg-card/30">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-foreground">Match Threshold</h3>
                  <span className="text-sm font-semibold text-foreground">{Math.round(matchThreshold * 100)}%</span>
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
                <p className="text-xs text-muted-foreground mt-2">
                  Higher values require closer matches.
                </p>
              </div>

              {/* Verify Button */}
              <motion.button
                onClick={handleVerify}
                disabled={!source.faceId || targets.length === 0 || isVerifying || source.detecting}
                className="w-full py-4 bg-gradient-to-r from-secondary to-primary text-primary-foreground font-bold rounded-xl hover:shadow-lg hover:shadow-secondary/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {isVerifying ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Verifying {targets.length} images...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Verify Against {targets.length || 0} Target{targets.length !== 1 ? 's' : ''}
                  </>
                )}
              </motion.button>
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
                Verification Results
                {result && <span className="text-muted-foreground font-normal ml-2">({result.matchCount} matches of {result.totalTargets})</span>}
              </h2>
            </div>

            <AnimatePresence mode="wait">
              {result ? (
                <motion.div 
                  className="space-y-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {/* Summary Card */}
                  <div className="p-4 rounded-xl bg-card/50 border border-border">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold text-foreground">{result.totalTargets}</p>
                        <p className="text-xs text-muted-foreground">Total Targets</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-secondary">{result.matchCount}</p>
                        <p className="text-xs text-muted-foreground">Matches</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-destructive">{result.totalTargets - result.matchCount}</p>
                        <p className="text-xs text-muted-foreground">No Match</p>
                      </div>
                    </div>
                  </div>

                  {/* Match Results - Only show matched faces */}
                  <div className="space-y-4">
                    {result.matchCount > 0 ? (
                      <>
                        <h3 className="text-lg font-semibold text-secondary mb-4 flex items-center gap-2">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Face Matches Found ({result.matchCount})
                        </h3>
                        
                        {result.matches
                          .filter(match => match.match) // Only show actual matches
                          .map((match, matchIdx) => {
                            const targetIdx = match.targetIndex;
                            const target = targets[targetIdx];
                            if (!target) return null;
                            
                            const level = getConfidenceLevel(match.confidence, matchThreshold);
                            
                            return (
                              <motion.div
                                key={`match-${target.id}-${matchIdx}`}
                                className="bg-gradient-to-r from-secondary/10 to-primary/10 rounded-xl border border-secondary/30 overflow-hidden shadow-lg"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: matchIdx * 0.15 }}
                              >
                                {/* Match header */}
                                <div className="p-4 bg-secondary/20 border-b border-secondary/30">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <div className="w-3 h-3 bg-secondary rounded-full animate-pulse"></div>
                                      <span className="text-lg font-bold text-secondary">
                                        Match #{matchIdx + 1} - Target #{targetIdx + 1}
                                      </span>
                                    </div>
                                    <div className="text-right">
                                      <div className="inline-flex items-center px-3 py-1 bg-secondary text-white rounded-full text-sm font-bold">
                                        ✓ VERIFIED
                                      </div>
                                      <p className="text-sm font-bold text-secondary mt-1">
                                        {(match.confidence * 100).toFixed(1)}% confidence
                                      </p>
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Side by side comparison */}
                                <div className="relative p-6">
                                  <div className="flex items-center justify-center gap-8">
                                    {/* Source face thumbnail */}
                                    <div className="text-center space-y-3">
                                      <h4 className="text-sm font-semibold text-muted-foreground">
                                        SOURCE FACE
                                      </h4>
                                      <div className="relative">
                                        <FaceThumbnail
                                          src={source.preview}
                                          bbox={source.bbox}
                                          size={120}
                                          className="border-3 border-primary shadow-lg"
                                        />
                                        <div className="absolute -top-2 -right-2 px-2 py-1 bg-primary rounded-full text-white text-xs font-bold">
                                          SRC
                                        </div>
                                      </div>
                                      {source.faceId && (
                                        <div className="px-2 py-1 bg-muted/30 rounded text-xs font-mono text-muted-foreground">
                                          ID: {source.faceId.slice(-8)}
                                        </div>
                                      )}
                                      {source.bbox && (
                                        <div className="text-xs text-muted-foreground bg-muted/20 rounded p-2">
                                          <p className="font-semibold mb-1">Coordinates:</p>
                                          <p className="font-mono text-[10px]">
                                            ({source.bbox.left.toFixed(1)}, {source.bbox.top.toFixed(1)}) → 
                                            ({source.bbox.right.toFixed(1)}, {source.bbox.bottom.toFixed(1)})
                                          </p>
                                        </div>
                                      )}
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
                                    
                                    {/* Matched target face thumbnail */}
                                    <div className="text-center space-y-3">
                                      <h4 className="text-sm font-semibold text-muted-foreground">
                                        MATCHED FACE
                                      </h4>
                                      <div className="relative">
                                        <FaceThumbnail
                                          src={target.preview}
                                          bbox={match.bbox}
                                          size={120}
                                          className="border-3 border-secondary shadow-lg"
                                        />
                                        <div className="absolute -top-2 -right-2 px-2 py-1 bg-secondary rounded-full text-white text-xs font-bold">
                                          MATCH
                                        </div>
                                      </div>
                                      {match.faceId && (
                                        <div className="px-2 py-1 bg-muted/30 rounded text-xs font-mono text-muted-foreground">
                                          ID: {match.faceId.slice(-8)}
                                        </div>
                                      )}
                                      {match.bbox && (
                                        <div className="text-xs text-muted-foreground bg-muted/20 rounded p-2">
                                          <p className="font-semibold mb-1">Coordinates:</p>
                                          <p className="font-mono text-[10px]">
                                            ({match.bbox.left.toFixed(1)}, {match.bbox.top.toFixed(1)}) → 
                                            ({match.bbox.right.toFixed(1)}, {match.bbox.bottom.toFixed(1)})
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Match details */}
                                <div className="p-4 bg-muted/30 border-t border-border">
                                  <div className="grid grid-cols-2 gap-6">
                                    <div>
                                      <p className="text-sm font-semibold text-muted-foreground mb-2">Target Details</p>
                                      <p className="font-medium text-foreground">{target.filename}</p>
                                      <p className="text-xs text-muted-foreground mt-1">
                                        Image #{targetIdx + 1} from target set
                                      </p>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-sm font-semibold text-muted-foreground mb-2">Match Quality</p>
                                      <div className="space-y-2">
                                        <div className="inline-flex items-center px-3 py-1 bg-secondary/20 text-secondary rounded-full text-sm font-bold">
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
                            );
                          })
                        }
                      </>
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
                          The source face was not found in any of the {result.totalTargets} target images. 
                          Try uploading different images or adjusting face angles for better detection.
                        </p>
                      </div>
                    )}
                  </div>

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
                            Expires: {shareToken?.expiresAt ? new Date(shareToken!.expiresAt).toLocaleString() : ''}
                          </span>
                        </div>
                        <div className="relative">
                          <pre className="p-3 rounded-lg bg-muted/20 text-xs overflow-x-auto text-muted-foreground font-mono whitespace-pre-wrap break-words max-w-full">
                            {shareToken?.curl || ''}
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
              ) : (
                <motion.div 
                  className="h-[400px] rounded-xl border-2 border-dashed border-border bg-card/20 flex flex-col items-center justify-center text-center p-8"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <div className="w-20 h-20 rounded-full bg-muted/10 flex items-center justify-center mb-4">
                    <svg className="w-10 h-10 text-muted-foreground/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">No Results Yet</h3>
                  <p className="text-sm text-muted-foreground max-w-xs">
                    Upload a source face and target images, then click Verify to compare
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
            About 1:N Face Verification
          </h3>
          <p className="text-muted-foreground mb-6">
            Compare one source face against multiple target images to find matches. Each target is verified independently and results are sorted by confidence score.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: '🎯', text: 'Real-time detection', value: 'Live' },
              { icon: '📊', text: 'Confidence scoring', value: 'Per image' },
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
