'use client'

import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/auth-context'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import {
  createVideoProcessingEntry,
  detectFace,
  generateBatchId,
  getVideoProcessingStatus,
  listVideoEvents,
  patchVideoProcessingEntry,
  searchVideoFaces,
  startVideoProcessing,
  uploadVideoProcessingSource,
  type VideoFaceResult,
  type VideoProcessingStatus,
} from '@/lib/backend-api'

interface QueryPhoto {
  id: string
  file: File
  preview: string
  isSearching: boolean
  faceDetected: boolean | null
  faceCount: number | null
  error: string | null
  result: VideoFaceResult | null
  isMatch: boolean | null
  isInconclusive: boolean | null
  matchScore: number | null
}

export default function VideoProcessingPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuth()
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingProgress, setProcessingProgress] = useState(0)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoId, setVideoId] = useState<number | null>(null)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const cameraGroup = 2
  const enableFaceDetector = true
  const [status, setStatus] = useState<VideoProcessingStatus | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [searchThreshold, setSearchThreshold] = useState(0.7)
  const [queryPhotos, setQueryPhotos] = useState<QueryPhoto[]>([])
  const [events, setEvents] = useState<VideoFaceResult[]>([])
  const [isLoadingEvents, setIsLoadingEvents] = useState(false)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [previewTitle, setPreviewTitle] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, isLoading, router])

  const resetAll = () => {
    setVideoFile(null)
    setVideoId(null)
    setStatus(null)
    setQueryPhotos([])
    setEvents([])
    setProcessingProgress(0)
    setError(null)
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }

  const handleLoadFaces = async () => {
    if (!videoId) return
    setIsLoadingEvents(true)

    try {
      const eventsResponse = await listVideoEvents(videoId, 20)
      setEvents(eventsResponse.results || [])
    } catch (err: any) {
      console.error('Failed to load events:', err)
    } finally {
      setIsLoadingEvents(false)
    }
  }

  useEffect(() => {
    if (status?.finished && videoId && events.length === 0 && !isLoadingEvents) {
      handleLoadFaces()
    }
  }, [status?.finished, videoId])

  const pollStatus = (id: number, batchId?: string) => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
    }

    pollRef.current = setInterval(async () => {
      try {
        const nextStatus = await getVideoProcessingStatus(id, batchId)
        setStatus(nextStatus)

        if (nextStatus.error) {
          setError(nextStatus.error)
        }

        if (nextStatus.finished) {
          setProcessingProgress(100)
          setIsProcessing(false)
          if (pollRef.current) {
            clearInterval(pollRef.current)
            pollRef.current = null
          }
        } else if (nextStatus.active) {
          setProcessingProgress(prev => Math.min(95, prev + 8))
        } else if (nextStatus.queued) {
          setProcessingProgress(prev => Math.max(prev, 10))
        }
      } catch (err: any) {
        setError(err.message || 'Failed to check video status')
        setIsProcessing(false)
        if (pollRef.current) {
          clearInterval(pollRef.current)
          pollRef.current = null
        }
      }
    }, 7000)
  }

  useEffect(() => {
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current)
      }
    }
  }, [])

  const handleProcess = async () => {
    if (!videoFile) {
      setError('Please upload a video file')
      return
    }

    setIsProcessing(true)
    setProcessingProgress(5)
    setError(null)

    // Generate a single batch ID for the entire process operation (counts as 1 API call)
    const batchId = generateBatchId()

    try {
      const created = await createVideoProcessingEntry({
        camera_group: cameraGroup,
        name: videoFile.name || 'Uploaded Video',
        stream_settings: {
          detectors: {
            face: {
              overall_only: true,
            },
          },
        },
      }, batchId)

      setVideoId(created.id)
      setStatus(created)

      await patchVideoProcessingEntry(created.id, {
        play_speed: playbackSpeed,
        detectors: {
          face: {
            overall_only: true,
          },
        },
      }, batchId)

      await uploadVideoProcessingSource(created.id, videoFile, batchId)
      setProcessingProgress(35)

      const started = await startVideoProcessing(created.id, batchId)
      setStatus(started)
      setProcessingProgress(45)

      pollStatus(created.id, batchId)
    } catch (err: any) {
      setError(err.message || 'Failed to start video processing')
      setIsProcessing(false)
    }
  }

  const handleAddPhotos = (files: FileList | null) => {
    if (!files || files.length === 0) return

    const newPhotos: QueryPhoto[] = Array.from(files).map((file) => ({
      id: Math.random().toString(36).substring(7),
      file,
      preview: URL.createObjectURL(file),
      isSearching: false,
      faceDetected: null,
      faceCount: null,
      error: null,
      result: null,
      isMatch: null,
      isInconclusive: null,
      matchScore: null,
    }))

    setQueryPhotos((prev) => [...prev, ...newPhotos])

    // Auto-detect faces on upload (like 1:1 page)
    newPhotos.forEach((photo) => {
      handleDetectFace(photo.id, photo.file)
    })
  }

  // Auto-detect face in uploaded query photo (similar to 1:1 page)
  const handleDetectFace = async (photoId: string, file: File) => {
    setQueryPhotos((prev) =>
      prev.map((p) =>
        p.id === photoId
          ? { ...p, isSearching: true, error: null }
          : p
      )
    )

    try {
      const detectResult = await detectFace(file)
      const faces = detectResult.objects?.face || []

      if (faces.length === 0) {
        setQueryPhotos((prev) =>
          prev.map((p) =>
            p.id === photoId
              ? { ...p, isSearching: false, faceDetected: false, faceCount: 0, error: 'No face detected' }
              : p
          )
        )
      } else if (faces.length > 1) {
        setQueryPhotos((prev) =>
          prev.map((p) =>
            p.id === photoId
              ? {
                  ...p,
                  isSearching: false,
                  faceDetected: false,
                  faceCount: faces.length,
                  error: `Multiple faces detected (${faces.length}). Please upload a photo with only one face.`,
                }
              : p
          )
        )
      } else {
        setQueryPhotos((prev) =>
          prev.map((p) =>
            p.id === photoId
              ? { ...p, isSearching: false, faceDetected: true, faceCount: 1 }
              : p
          )
        )
      }
    } catch (err: any) {
      setQueryPhotos((prev) =>
        prev.map((p) =>
          p.id === photoId
            ? { ...p, isSearching: false, error: err.message || 'Face detection failed' }
            : p
        )
      )
    }
  }

  const handleRemovePhoto = (id: string) => {
    setQueryPhotos((prev) => {
      const photo = prev.find((p) => p.id === id)
      if (photo) {
        URL.revokeObjectURL(photo.preview)
      }
      return prev.filter((p) => p.id !== id)
    })
  }

  const handleSearchPhoto = async (photoId: string) => {
    if (!videoId) {
      setError('Please process a video first')
      return
    }

    const photo = queryPhotos.find((p) => p.id === photoId)
    if (!photo) return

    // Generate a single batch ID for this search operation (detect + search = 1 API call)
    const batchId = generateBatchId()

    // Update photo state to searching
    setQueryPhotos((prev) =>
      prev.map((p) =>
        p.id === photoId
          ? { ...p, isSearching: true, error: null, faceDetected: null, faceCount: null }
          : p
      )
    )

    try {
      // Step 1: Detect faces in the query photo
      const detectResult = await detectFace(photo.file, batchId)
      const faces = detectResult.objects?.face || []

      if (faces.length === 0) {
        setQueryPhotos((prev) =>
          prev.map((p) =>
            p.id === photoId
              ? { ...p, isSearching: false, faceDetected: false, faceCount: 0, error: 'No face detected' }
              : p
          )
        )
        return
      }

      if (faces.length > 1) {
        setQueryPhotos((prev) =>
          prev.map((p) =>
            p.id === photoId
              ? {
                  ...p,
                  isSearching: false,
                  faceDetected: false,
                  faceCount: faces.length,
                  error: `Multiple faces detected (${faces.length}). Please upload a photo with only one face.`,
                }
              : p
          )
        )
        return
      }

      // Step 2: Search in video
      const searchResult = await searchVideoFaces(videoId, photo.file, {
        threshold: searchThreshold,
        limit: 1,
        batchId,
      })

      const bestResult = searchResult.results?.[0] || null
      const matchScore = bestResult
        ? (bestResult.looks_like_confidence ?? bestResult.similarity ?? bestResult.confidence ?? 0)
        : 0
      const matchPct = matchScore * 100
      const isMatch = matchScore >= searchThreshold
      const isInconclusive = matchPct >= 60 && matchPct <= 65

      setQueryPhotos((prev) =>
        prev.map((p) =>
          p.id === photoId
            ? {
                ...p,
                isSearching: false,
                faceDetected: true,
                faceCount: 1,
                result: bestResult,
                matchScore,
                isMatch,
                isInconclusive,
                error: null,
              }
            : p
        )
      )
    } catch (err: any) {
      setQueryPhotos((prev) =>
        prev.map((p) =>
          p.id === photoId
            ? { ...p, isSearching: false, error: err.message || 'Search failed' }
            : p
        )
      )
    }
  }

  const handleSearchAll = async () => {
    for (const photo of queryPhotos) {
      if (!photo.result && !photo.isSearching && !photo.error) {
        await handleSearchPhoto(photo.id)
      }
    }
  }

  const totalFaces = status?.face_count ?? 0
  const totalClusters = status?.face_cluster_count ?? 0
  const totalBodies = status?.body_count ?? 0
  const totalCars = status?.car_count ?? 0

  if (isLoading || !isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card/30 backdrop-blur-xl">
        <div className="max-w-[1600px] mx-auto px-6 py-4 flex items-center justify-between">
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
              <h1 className="text-xl font-bold text-foreground">Video Face Search</h1>
              <p className="text-xs text-muted-foreground">Process one video, search multiple faces</p>
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

      {/* Main Content - 2 Column Layout */}
      <main className="flex-1 max-w-[1600px] mx-auto px-6 py-6 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
          
          {/* LEFT COLUMN - Video Processing */}
          <div className="space-y-4">
            <motion.section
              className="p-5 rounded-2xl border border-border bg-card/30"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-foreground">Video Upload</h2>
                {status?.finished && (
                  <button
                    onClick={resetAll}
                    className="text-xs px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-card/50 transition-colors"
                  >
                    Process New Video
                  </button>
                )}
              </div>

              <div
                onClick={() => !status?.finished && fileInputRef.current?.click()}
                className={`border-2 border-dashed border-border rounded-xl p-4 text-center transition-colors ${
                  status?.finished ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary/50 cursor-pointer'
                }`}
              >
                <svg className="w-8 h-8 mx-auto text-muted-foreground mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-sm text-muted-foreground">
                  {videoFile ? videoFile.name : 'Click to upload video'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">MP4, MOV, AVI • Max 500MB</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  className="hidden"
                  disabled={!!status?.finished}
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      setVideoFile(file)
                      setError(null)
                    }
                  }}
                />
              </div>

              {!status?.finished && (
                <div className="space-y-3 mt-4">
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground">Playback Speed</label>
                    <select
                      value={playbackSpeed}
                      onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
                    >
                      <option value={1}>1x (Normal)</option>
                      <option value={2}>2x (Fast)</option>
                      <option value={4}>4x (Very Fast)</option>
                      <option value={-1}>Realtime</option>
                    </select>
                  </div>

                  <button
                    onClick={handleProcess}
                    disabled={isProcessing || !videoFile || !!status?.finished}
                    className="w-full py-3 bg-gradient-to-r from-primary to-secondary text-primary-foreground font-bold rounded-xl hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
                      'Start Processing'
                    )}
                  </button>
                </div>
              )}

              {error && (
                <p className="text-xs text-destructive mt-3">{error}</p>
              )}

              <AnimatePresence>
                {isProcessing && (
                  <motion.div
                    className="mt-4 p-3 rounded-xl border border-primary/30 bg-primary/5"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-foreground">Processing</span>
                      <span className="text-sm text-primary font-bold">{Math.min(Math.round(processingProgress), 100)}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-border overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-primary to-secondary"
                        animate={{ width: `${Math.min(processingProgress, 100)}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.section>

            {status?.finished && (
              <>
                <motion.section
                  className="grid grid-cols-2 gap-3"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="p-4 rounded-xl border border-border bg-card/30">
                    <span className="text-2xl mb-2 block">👥</span>
                    <p className="text-2xl font-bold bg-gradient-to-r from-secondary to-teal-500 bg-clip-text text-transparent">
                      {totalFaces}
                    </p>
                    <p className="text-xs text-muted-foreground">Faces Detected</p>
                  </div>
                  <div className="p-4 rounded-xl border border-border bg-card/30">
                    <span className="text-2xl mb-2 block">🧩</span>
                    <p className="text-2xl font-bold bg-gradient-to-r from-primary to-cyan-500 bg-clip-text text-transparent">
                      {totalClusters}
                    </p>
                    <p className="text-xs text-muted-foreground">Unique People</p>
                  </div>
                  <div className="p-4 rounded-xl border border-border bg-card/30">
                    <span className="text-2xl mb-2 block">🏃</span>
                    <p className="text-2xl font-bold bg-gradient-to-r from-yellow-500 to-orange-500 bg-clip-text text-transparent">
                      {totalBodies}
                    </p>
                    <p className="text-xs text-muted-foreground">Bodies Detected</p>
                  </div>
                  <div className="p-4 rounded-xl border border-border bg-card/30">
                    <span className="text-2xl mb-2 block">🚗</span>
                    <p className="text-2xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
                      {totalCars}
                    </p>
                    <p className="text-xs text-muted-foreground">Cars Detected</p>
                  </div>
                </motion.section>

                <motion.section
                  className="p-5 rounded-2xl border border-border bg-card/30"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-foreground">Detected Faces</h3>
                    <button
                      onClick={handleLoadFaces}
                      disabled={isLoadingEvents}
                      className="text-xs px-2 py-1 rounded border border-border text-muted-foreground hover:text-foreground hover:bg-card/50 transition-colors disabled:opacity-50"
                    >
                      {isLoadingEvents ? 'Loading...' : 'Refresh'}
                    </button>
                  </div>
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {isLoadingEvents ? (
                      <p className="text-xs text-muted-foreground text-center py-4">Loading faces...</p>
                    ) : events.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-4">No faces detected</p>
                    ) : (
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {events.map((event, index) => (
                          <div
                            key={event.id}
                            className="relative group cursor-pointer"
                            onClick={() => {
                              setPreviewImage(event.fullframe || event.thumbnail || null)
                              setPreviewTitle(`Face ${index + 1}`)
                            }}
                          >
                            {event.thumbnail ? (
                              <img
                                src={event.thumbnail}
                                alt={`Face ${index + 1}`}
                                className="w-full aspect-square rounded-lg object-cover border border-border/50 group-hover:border-primary/50 transition-colors"
                              />
                            ) : (
                              <div className="w-full aspect-square rounded-lg bg-muted/30 border border-border/50 flex items-center justify-center">
                                <span className="text-xs text-muted-foreground">No preview</span>
                              </div>
                            )}
                            <div className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">
                              #{index + 1}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.section>
              </>
            )}
          </div>

          {/* RIGHT COLUMN - Search Panel */}
          <div className="space-y-4">
            <motion.section
              className="p-5 rounded-2xl border border-border bg-card/30"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-foreground">Search Faces</h2>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Threshold: {searchThreshold.toFixed(2)}</span>
                  <input
                    type="range"
                    min="0.5"
                    max="0.95"
                    step="0.01"
                    value={searchThreshold}
                    onChange={(e) => setSearchThreshold(parseFloat(e.target.value))}
                    className="w-20"
                  />
                </div>
              </div>

              {!status?.finished ? (
                <div className="text-center py-12 text-muted-foreground">
                  <svg className="w-16 h-16 mx-auto mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <p className="text-sm">Process a video first to enable search</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div
                    onClick={() => searchInputRef.current?.click()}
                    className="border-2 border-dashed border-border rounded-xl p-4 text-center hover:border-primary/50 transition-colors cursor-pointer"
                  >
                    <svg className="w-8 h-8 mx-auto text-muted-foreground mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-sm text-muted-foreground">Upload face photos to search</p>
                    <p className="text-xs text-muted-foreground mt-1">One face per photo • Multiple photos for N:N search</p>
                    <input
                      ref={searchInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => handleAddPhotos(e.target.files)}
                    />
                  </div>

                  {queryPhotos.length > 0 && (
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">{queryPhotos.length} photo(s) uploaded</p>
                      <button
                        onClick={handleSearchAll}
                        disabled={queryPhotos.every(p => p.isSearching || p.result || p.error)}
                        className="text-xs px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
                      >
                        Search All
                      </button>
                    </div>
                  )}

                  {/* Query Photos List */}
                  <div className="space-y-3 max-h-[calc(100vh-400px)] overflow-y-auto pr-2">
                    {queryPhotos.map((photo) => (
                      <motion.div
                        key={photo.id}
                        className="p-3 rounded-xl border border-border bg-background/50"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                      >
                        <div className="flex gap-3">
                          <img
                            src={photo.preview}
                            alt="Query"
                            className="w-20 h-20 rounded-lg object-cover cursor-pointer flex-shrink-0"
                            onClick={() => {
                              setPreviewImage(photo.preview)
                              setPreviewTitle('Query Photo')
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between mb-2">
                              <p className="text-xs text-muted-foreground truncate">{photo.file.name}</p>
                              <button
                                onClick={() => handleRemovePhoto(photo.id)}
                                className="text-muted-foreground hover:text-destructive transition-colors"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>

                            {photo.isSearching && !photo.result && (
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                {photo.faceDetected === null ? 'Detecting face...' : 'Searching...'}
                              </div>
                            )}

                            {/* Face detection status (shown after auto-detect) */}
                            {!photo.isSearching && photo.faceDetected === true && !photo.result && !photo.error && (
                              <div className="flex items-center gap-1.5 mb-2">
                                <svg className="w-3.5 h-3.5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                                </svg>
                                <span className="text-xs text-green-500 font-medium">Face detected</span>
                              </div>
                            )}

                            {photo.error && (
                              <div className="space-y-2">
                                <p className="text-xs text-destructive">{photo.error}</p>
                                {photo.faceCount !== null && photo.faceCount !== 1 && (
                                  <button
                                    onClick={() => handleSearchPhoto(photo.id)}
                                    className="text-xs px-2 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20"
                                  >
                                    Retry
                                  </button>
                                )}
                              </div>
                            )}

                            {!photo.result && !photo.isSearching && !photo.error && photo.matchScore === undefined && (
                              <button
                                onClick={() => handleSearchPhoto(photo.id)}
                                className="text-xs px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90"
                              >
                                Search
                              </button>
                            )}

                            {photo.matchScore !== null && photo.matchScore !== undefined && photo.isMatch !== null && (
                              <div className={`mt-2 p-2 rounded-lg border ${
                                photo.isMatch
                                  ? 'border-green-500/40 bg-green-500/10'
                                  : photo.isInconclusive
                                  ? 'border-orange-500/40 bg-orange-500/10'
                                  : 'border-red-500/40 bg-red-500/10'
                              }`}>
                                <div className="flex items-center gap-2">
                                  {photo.result?.thumbnail && (
                                    <img
                                      src={photo.result.thumbnail}
                                      alt="Match"
                                      className="w-12 h-12 rounded object-cover cursor-pointer flex-shrink-0"
                                      onClick={() => {
                                        setPreviewImage(photo.result!.fullframe || photo.result!.thumbnail || null)
                                        setPreviewTitle('Match Result')
                                      }}
                                    />
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold text-foreground">
                                      {photo.result ? `${(photo.matchScore * 100).toFixed(1)}% Match` : 'No match found'}
                                    </p>
                                    <p className={`text-xs font-bold ${
                                      photo.isMatch
                                        ? 'text-green-400'
                                        : photo.isInconclusive
                                        ? 'text-orange-400'
                                        : 'text-red-400'
                                    }`}>
                                      {photo.isMatch ? '✓ MATCH' : photo.isInconclusive ? '⚠ INCONCLUSIVE' : '✗ NO MATCH'}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </motion.section>
          </div>
        </div>
      </main>

      {/* Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setPreviewImage(null)}>
          <div className="max-w-4xl w-full bg-card rounded-2xl border border-border overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground">{previewTitle}</h3>
              <button
                onClick={() => setPreviewImage(null)}
                className="text-xs px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground"
              >
                Close
              </button>
            </div>
            <div className="p-4 flex items-center justify-center bg-black/20">
              <img src={previewImage} alt={previewTitle} className="max-h-[80vh] w-auto rounded-lg" />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
