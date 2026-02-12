'use client'

import React from "react"
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/auth-context'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { validateImageFile, readFileAsDataUrl, loadImageMeta, normalizeBbox, getConfidenceLevel, MAX_IMAGE_BYTES } from '@/lib/upload-utils'
import { detectFace, verifyFaces, generateShareToken, storeFaceSearchResult, type OneToOneResult } from '@/lib/backend-api'
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

const initialFaceState: FaceState = {
  file: null,
  preview: '',
  faceId: null,
  bbox: null,
  dimensions: null,
  detecting: false,
  error: null,
}

export default function FaceSearch1To1Page() {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuth()
  const [face1, setFace1] = useState<FaceState>(initialFaceState)
  const [face2, setFace2] = useState<FaceState>(initialFaceState)
  const [result, setResult] = useState<OneToOneResult | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)
  const [threshold, setThreshold] = useState(0.75)
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

  const handleDetection = useCallback(async (
    file: File,
    setState: React.Dispatch<React.SetStateAction<FaceState>>
  ) => {
    setState(prev => ({ ...prev, detecting: true, error: null }))
    
    try {
      const result = await detectFace(file)
      const faces = result.objects?.face || []

      if (faces.length === 0) {
        setState(prev => ({
          ...prev,
          detecting: false,
          faceId: null,
          bbox: null,
          error: 'No face detected in image',
        }))
        return
      }

      if (faces.length > 1) {
        setState(prev => ({
          ...prev,
          detecting: false,
          faceId: null,
          bbox: null,
          error: 'Only one person is allowed in the image',
        }))
        return
      }

      const face = faces[0]
      const bbox = normalizeBbox(face.bbox)
      setState(prev => ({
        ...prev,
        faceId: face.id,
        bbox,
        detecting: false,
      }))
    } catch (err: any) {
      setState(prev => ({
        ...prev,
        detecting: false,
        error: err.message || 'Face detection failed',
      }))
    }
  }, [])

  const handleFileUpload = useCallback(async (
    file: File,
    setState: React.Dispatch<React.SetStateAction<FaceState>>
  ) => {
    // Validate file
    const validation = validateImageFile(file)
    if (!validation.valid) {
      setState(prev => ({ ...prev, error: validation.error || 'Invalid file' }))
      return
    }

    // Read file and get preview
    const preview = await readFileAsDataUrl(file)
    const dimensions = await loadImageMeta(preview)
    
    setState({
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
    
    // Start face detection
    handleDetection(file, setState)
  }, [handleDetection])

  const handleImageInput = (e: React.ChangeEvent<HTMLInputElement>, imageNum: 1 | 2) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileUpload(file, imageNum === 1 ? setFace1 : setFace2)
    }
  }

  const handleDrop = (e: React.DragEvent, imageNum: 1 | 2) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith('image/')) {
      handleFileUpload(file, imageNum === 1 ? setFace1 : setFace2)
    }
  }

  const handleVerify = async () => {
    if (!face1.file || !face2.file) {
      setError('Please upload both images')
      return
    }

    if (!face1.faceId || !face2.faceId) {
      setError('Waiting for face detection to complete')
      return
    }

    setIsVerifying(true)
    setError(null)
    setShareToken(null)

    try {
      // Use simple verify endpoint with detected face IDs
      const verifyResult = await verifyFaces(face1.faceId!, face2.faceId!)
      const confidence = verifyResult.confidence
      const match = confidence >= threshold // Use dynamic threshold
      
      setResult({
        id: `${Date.now()}`,
        source: {
          faceId: face1.faceId!,
          bbox: face1.bbox!,
        },
        target: {
          faceId: face2.faceId!,
          bbox: face2.bbox!,
        },
        verification: verifyResult,
        confidence,
        match,
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
          type: 'ONE_TO_ONE',
          requestData: {
            source: { filename: face1.file?.name || 'source', size: face1.file?.size || 0 },
            target: { filename: face2.file?.name || 'target', size: face2.file?.size || 0 },
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

  const resetFace = (imageNum: 1 | 2) => {
    if (imageNum === 1) {
      setFace1(initialFaceState)
    } else {
      setFace2(initialFaceState)
    }
    setResult(null)
    setShareToken(null)
    setShareRequestId(null)
    setError(null)
  }

  if (isLoading || !isAuthenticated) {
    return null
  }

  const confidenceLevel = result?.confidence ? getConfidenceLevel(result.confidence, threshold) : null

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
              Max {MAX_IMAGE_BYTES / (1024 * 1024)}MB
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

        {/* Visual comparison area */}
        <motion.div 
          className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-6 items-start mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Image 1 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">1</span>
                Source Face
              </h2>
              {face1.preview && (
                <button
                  onClick={() => resetFace(1)}
                  className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                >
                  Remove
                </button>
              )}
            </div>
            <motion.div 
              className={`relative aspect-square rounded-2xl border-2 border-dashed transition-all overflow-hidden ${
                face1.preview ? 'border-primary/50 bg-card/50' : 'border-border hover:border-primary/30 bg-card/30 hover:bg-card/50'
              }`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDrop(e, 1)}
              whileHover={{ scale: face1.preview ? 1 : 1.01 }}
            >
              {face1.preview ? (
                <>
                  <FaceImagePreview
                    src={face1.preview}
                    bbox={face1.bbox}
                    className="w-full h-full"
                    bboxColor="#3b82f6"
                    showBboxOverlay={!!face1.bbox}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent pointer-events-none" />
                  
                  {/* Status overlay */}
                  <motion.div 
                    className="absolute bottom-4 left-4 right-4 p-3 rounded-xl bg-card/80 backdrop-blur-sm border border-border/50"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    {face1.detecting ? (
                      <div className="flex items-center gap-2 text-xs text-blue-500">
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Detecting face...
                      </div>
                    ) : face1.error ? (
                      <div className="flex items-center gap-2 text-xs text-destructive">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        {face1.error}
                      </div>
                    ) : face1.faceId ? (
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
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center mb-4">
                    <svg className="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-foreground font-semibold mb-2">Upload Source Face</p>
                  <p className="text-sm text-muted-foreground mb-4">Drag & drop or click to browse</p>
                  <span className="text-xs text-muted-foreground px-3 py-1 rounded-full bg-muted/20">
                    JPG, PNG up to 2MB
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageInput(e, 1)}
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
                result && confidenceLevel
                  ? confidenceLevel.isMatch
                    ? 'bg-secondary/20 text-secondary border border-secondary/30' 
                    : confidenceLevel.isInconclusive
                    ? 'bg-orange-500/20 text-orange-500 border border-orange-500/30'
                    : 'bg-destructive/20 text-destructive border border-destructive/30'
                  : 'bg-gradient-to-br from-primary/20 to-secondary/20 text-foreground border border-primary/30'
              }`}
              animate={isVerifying ? { rotate: [0, 5, -5, 0] } : {}}
              transition={{ duration: 0.5, repeat: isVerifying ? Infinity : 0 }}
            >
              {isVerifying ? (
                <svg className="w-8 h-8 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : result && confidenceLevel ? (
                confidenceLevel.isMatch ? '✓' : confidenceLevel.isInconclusive ? '⚠' : '✗'
              ) : 'VS'}
            </motion.div>
            {isVerifying && (
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Verifying...</p>
              </div>
            )}
          </div>

          {/* Image 2 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-secondary/10 text-secondary flex items-center justify-center text-sm font-bold">2</span>
                Target Face
              </h2>
              {face2.preview && (
                <button
                  onClick={() => resetFace(2)}
                  className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                >
                  Remove
                </button>
              )}
            </div>
            <motion.div 
              className={`relative aspect-square rounded-2xl border-2 border-dashed transition-all overflow-hidden ${
                face2.preview ? 'border-secondary/50 bg-card/50' : 'border-border hover:border-secondary/30 bg-card/30 hover:bg-card/50'
              }`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDrop(e, 2)}
              whileHover={{ scale: face2.preview ? 1 : 1.01 }}
            >
              {face2.preview ? (
                <>
                  <FaceImagePreview
                    src={face2.preview}
                    bbox={face2.bbox}
                    className="w-full h-full"
                    bboxColor="#22c55e"
                    showBboxOverlay={!!face2.bbox}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent pointer-events-none" />
                  
                  <motion.div 
                    className="absolute bottom-4 left-4 right-4 p-3 rounded-xl bg-card/80 backdrop-blur-sm border border-border/50"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    {face2.detecting ? (
                      <div className="flex items-center gap-2 text-xs text-blue-500">
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Detecting face...
                      </div>
                    ) : face2.error ? (
                      <div className="flex items-center gap-2 text-xs text-destructive">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        {face2.error}
                      </div>
                    ) : face2.faceId ? (
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
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-foreground font-semibold mb-2">Upload Target Face</p>
                  <p className="text-sm text-muted-foreground mb-4">Drag & drop or click to browse</p>
                  <span className="text-xs text-muted-foreground px-3 py-1 rounded-full bg-muted/20">
                    JPG, PNG up to 2MB
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageInput(e, 2)}
                    className="hidden"
                  />
                </label>
              )}
            </motion.div>
          </div>
        </motion.div>

        {/* Threshold Slider */}
        <motion.div 
          className="mb-6 p-5 rounded-xl border border-border bg-card/30"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-semibold text-foreground">Match Threshold</label>
            <span className="text-lg font-bold text-primary font-mono">{threshold.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min="0.5"
            max="0.95"
            step="0.01"
            value={threshold}
            onChange={(e) => setThreshold(parseFloat(e.target.value))}
            className="w-full h-2 bg-border rounded-lg appearance-none cursor-pointer accent-primary"
          />
          <p className="text-xs text-muted-foreground mt-2">
            Confidence score must be ≥ {(threshold * 100).toFixed(0)}% to be considered a match
          </p>
        </motion.div>

        {/* Verify Button */}
        <motion.button
          onClick={handleVerify}
          disabled={!face1.faceId || !face2.faceId || isVerifying || face1.detecting || face2.detecting}
          className="w-full py-4 bg-gradient-to-r from-primary to-secondary text-primary-foreground font-bold rounded-xl hover:shadow-lg hover:shadow-primary/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
        >
          {isVerifying ? (
            <>
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Verifying Faces...
            </>
          ) : (
            <>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Verify Faces
            </>
          )}
        </motion.button>

        {/* Results */}
        <AnimatePresence>
          {result && confidenceLevel && (
            <motion.div 
              className={`mt-8 rounded-2xl border-2 overflow-hidden ${
                confidenceLevel?.isMatch
                  ? 'bg-secondary/5 border-secondary/30' 
                  : confidenceLevel?.isInconclusive
                  ? 'bg-orange-500/5 border-orange-500/30'
                  : 'bg-destructive/5 border-destructive/30'
              }`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {/* Result header */}
              <div className={`p-6 ${
                confidenceLevel?.isMatch
                  ? 'bg-secondary/10' 
                  : confidenceLevel?.isInconclusive
                  ? 'bg-orange-500/10'
                  : 'bg-destructive/10'
              }`}>
                <div className="flex items-center gap-4">
                  <motion.div 
                    className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl ${
                      confidenceLevel?.isMatch
                        ? 'bg-secondary/20' 
                        : confidenceLevel?.isInconclusive
                        ? 'bg-orange-500/20'
                        : 'bg-destructive/20'
                    }`}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
                  >
                    {confidenceLevel?.isMatch ? '✅' : confidenceLevel?.isInconclusive ? '⚠️' : '❌'}
                  </motion.div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-foreground">
                      {confidenceLevel?.label}
                    </h3>
                    <p className={`text-lg font-semibold ${
                      confidenceLevel?.isMatch
                        ? 'text-secondary' 
                        : confidenceLevel?.isInconclusive
                        ? 'text-orange-500'
                        : 'text-destructive'
                    }`}>
                      {(result.confidence * 100).toFixed(2)}% Similarity
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">{confidenceLevel?.message}</p>
                  </div>
                </div>
              </div>

              {/* Confidence bar */}
              <div className="px-6 py-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Confidence Score</span>
                  <span className="font-bold text-foreground">{(result.confidence * 100).toFixed(2)}%</span>
                </div>
                <div className="h-3 bg-muted/20 rounded-full overflow-hidden">
                  <motion.div 
                    className={`h-full rounded-full ${
                      confidenceLevel?.isMatch
                        ? 'bg-gradient-to-r from-secondary to-primary' 
                        : confidenceLevel?.isInconclusive
                        ? 'bg-gradient-to-r from-orange-400 to-orange-600'
                        : 'bg-gradient-to-r from-destructive/60 to-destructive'
                    }`}
                    initial={{ width: 0 }}
                    animate={{ width: `${result.confidence * 100}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                  />
                </div>
              </div>

              {/* Face thumbnails comparison */}
              <div className="px-6 py-4 border-t border-border/30">
                <div className="flex items-center justify-center gap-8">
                  <div className="text-center">
                    <FaceThumbnail src={face1.preview} bbox={face1.bbox} size={80} className="mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">Source</p>
                  </div>
                  <div className={`px-4 py-2 rounded-full text-sm font-bold ${
                    confidenceLevel?.isMatch
                      ? 'bg-secondary/20 text-secondary' 
                      : confidenceLevel?.isInconclusive
                      ? 'bg-orange-500/20 text-orange-500'
                      : 'bg-destructive/20 text-destructive'
                  }`}>
                    {confidenceLevel?.isMatch ? 'MATCH' : confidenceLevel?.isInconclusive ? 'INCONCLUSIVE' : 'NO MATCH'}
                  </div>
                  <div className="text-center">
                    <FaceThumbnail src={face2.preview} bbox={face2.bbox} size={80} className="mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">Target</p>
                  </div>
                </div>
              </div>

              {/* Share token section */}
              {true && (
              <div className="px-6 py-4 border-t border-border/30">
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
                    <p className="text-xs text-muted-foreground">
                      This encrypted token replays the exact result without making new API calls. Token expires in 24 hours.
                    </p>
                  </div>
                )}
              </div>
              )}
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
            Face verification compares two facial images to determine if they belong to the same person. 
            Results are stored and can be replayed via encrypted shareable links for 24 hours.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { icon: '🎯', text: 'Real-time face detection with bbox overlay' },
              { icon: '🔐', text: 'Encrypted result sharing (24h validity)' },
              { icon: '📊', text: 'Detailed confidence scoring' },
              { icon: '💾', text: 'Results stored for 30 days' }
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
