/**
 * Public API v1 Routes
 *
 * Clean, well-documented endpoints for programmatic access.
 * All routes require API key authentication (not Firebase).
 *
 * Endpoints:
 *   POST /faces/compare   — 1:1 face verification
 *   POST /faces/search    — 1:N face search
 *   POST /faces/batch     — N:N batch comparison
 *   POST /videos/analyze  — Submit video for processing
 *   GET  /videos/:jobId   — Check video processing status
 */

const express = require('express')
const multer = require('multer')
const frsClient = require('../lib/frs-client')
const { enforceUsage } = require('../middleware/usageLimits')
const { enforceRateLimits } = require('../middleware/rateLimits')
const axios = require('axios')
const FormData = require('form-data')

// ──────────────────────────────────────────────────────────────────────
// Multer config (same limits as dashboard routes)
// ──────────────────────────────────────────────────────────────────────

const MAX_IMAGE_SIZE = 2 * 1024 * 1024 // 2MB
const MAX_VIDEO_SIZE = 500 * 1024 * 1024 // 500MB
const ALLOWED_IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const ALLOWED_VIDEO_MIMES = new Set(['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'])

const uploadImages = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_SIZE },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_IMAGE_MIMES.has(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error(`Invalid image type: ${file.mimetype}. Allowed: JPEG, PNG, WebP, GIF`))
    }
  },
})

const uploadVideo = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_VIDEO_SIZE },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_VIDEO_MIMES.has(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error(`Invalid video type: ${file.mimetype}. Allowed: MP4, WebM, MOV, AVI`))
    }
  },
})

// ──────────────────────────────────────────────────────────────────────
// Video API config (internal service)
// ──────────────────────────────────────────────────────────────────────

const VIDEO_API_BASE = process.env.VIDEO_API_BASE || process.env.FRS_BASE_URL || 'http://72.60.223.48'
const VIDEO_API_TOKEN = process.env.VIDEO_API_TOKEN || process.env.FRS_API_TOKEN || ''
const EVENTS_API_BASE = process.env.EVENTS_API_BASE || process.env.FRS_BASE_URL || 'http://72.60.223.48'
const EVENTS_API_TOKEN = process.env.EVENTS_API_TOKEN || process.env.FRS_API_TOKEN || ''

// ──────────────────────────────────────────────────────────────────────
// Error helpers
// ──────────────────────────────────────────────────────────────────────

function validationError(res, message, field) {
  return res.status(400).json({
    code: 'VALIDATION_ERROR',
    message,
    ...(field && { field }),
  })
}

function internalError(res, message) {
  return res.status(500).json({
    code: 'INTERNAL_ERROR',
    message: message || 'An unexpected error occurred. Please try again later.',
  })
}

function multerErrorHandler(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        code: 'FILE_TOO_LARGE',
        message: 'File size exceeds the allowed limit (2MB for images, 500MB for videos).',
      })
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        code: 'UNEXPECTED_FIELD',
        message: `Unexpected field: "${err.field}". Check the API documentation for the correct field names.`,
      })
    }
    return res.status(400).json({ code: 'UPLOAD_ERROR', message: err.message })
  }
  if (err) {
    return res.status(400).json({ code: 'UPLOAD_ERROR', message: err.message })
  }
  next()
}

// ──────────────────────────────────────────────────────────────────────
// Router factory
// ──────────────────────────────────────────────────────────────────────

function createApiV1Router(prisma) {
  const router = express.Router()

  // ====================================================================
  // POST /faces/compare — 1:1 Face Verification
  // ====================================================================
  // Fields: source (1 image), target (1 image)
  // Returns: match result with confidence score
  // ====================================================================
  router.post(
    '/faces/compare',
    enforceRateLimits({ tenantPerMinute: 60 }),
    (req, res, next) => {
      uploadImages.fields([
        { name: 'source', maxCount: 1 },
        { name: 'target', maxCount: 1 },
      ])(req, res, (err) => multerErrorHandler(err, req, res, next))
    },
    enforceUsage(prisma, {
      allowColumn: 'allowFaceSearchOneToOne',
      featureKey: '1:1 Face Verification',
    }),
    async (req, res) => {
      try {
        const sourceFile = req.files?.source?.[0]
        const targetFile = req.files?.target?.[0]

        if (!sourceFile) return validationError(res, 'Source image is required.', 'source')
        if (!targetFile) return validationError(res, 'Target image is required.', 'target')

        const result = await frsClient.oneToOneVerification(
          sourceFile.buffer, sourceFile.originalname, sourceFile.mimetype,
          targetFile.buffer, targetFile.originalname, targetFile.mimetype
        )

        return res.json({
          success: true,
          data: {
            match: result.match,
            confidence: result.confidence,
            threshold: 0.72,
            source: {
              bbox: frsClient.normalizeBbox(result.source.bbox),
              attributes: result.source.attributes || {},
            },
            target: {
              bbox: frsClient.normalizeBbox(result.target.bbox),
              attributes: result.target.attributes || {},
            },
          },
        })
      } catch (err) {
        console.error('[API v1] faces/compare error:', err.message)
        if (err.message.includes('No face detected')) {
          return res.status(422).json({
            code: 'NO_FACE_DETECTED',
            message: err.message,
          })
        }
        return internalError(res)
      }
    }
  )

  // ====================================================================
  // POST /faces/search — 1:N Face Search
  // ====================================================================
  // Fields: source (1 image), targets (up to 20 images)
  // Returns: ranked list of matches
  // ====================================================================
  router.post(
    '/faces/search',
    enforceRateLimits({ tenantPerMinute: 30 }),
    (req, res, next) => {
      uploadImages.fields([
        { name: 'source', maxCount: 1 },
        { name: 'targets', maxCount: 20 },
      ])(req, res, (err) => multerErrorHandler(err, req, res, next))
    },
    enforceUsage(prisma, {
      allowColumn: 'allowFaceSearchOneToN',
      featureKey: '1:N Face Search',
    }),
    async (req, res) => {
      try {
        const sourceFile = req.files?.source?.[0]
        const targetFiles = req.files?.targets

        if (!sourceFile) return validationError(res, 'Source image is required.', 'source')
        if (!targetFiles || targetFiles.length === 0) {
          return validationError(res, 'At least one target image is required.', 'targets')
        }

        const targets = targetFiles.map((f) => ({
          buffer: f.buffer,
          filename: f.originalname,
          mimeType: f.mimetype,
        }))

        const result = await frsClient.oneToNVerification(
          { buffer: sourceFile.buffer, filename: sourceFile.originalname, mimeType: sourceFile.mimetype },
          targets
        )

        return res.json({
          success: true,
          data: {
            source: {
              bbox: frsClient.normalizeBbox(result.source.bbox),
              attributes: result.source.attributes || {},
            },
            totalTargets: result.totalTargets,
            matchCount: result.matchCount,
            results: result.results.map((r) => ({
              index: r.index,
              filename: r.filename,
              match: r.match,
              confidence: r.confidence,
              bbox: r.face ? frsClient.normalizeBbox(r.face.bbox) : null,
              error: r.error || null,
            })),
          },
        })
      } catch (err) {
        console.error('[API v1] faces/search error:', err.message)
        if (err.message.includes('No face detected')) {
          return res.status(422).json({
            code: 'NO_FACE_DETECTED',
            message: err.message,
          })
        }
        return internalError(res)
      }
    }
  )

  // ====================================================================
  // POST /faces/batch — N:N Batch Comparison
  // ====================================================================
  // Fields: set1 (up to 10 images), set2 (up to 10 images)
  // Returns: comparison matrix
  // ====================================================================
  router.post(
    '/faces/batch',
    enforceRateLimits({ tenantPerMinute: 10 }),
    (req, res, next) => {
      uploadImages.fields([
        { name: 'set1', maxCount: 10 },
        { name: 'set2', maxCount: 10 },
      ])(req, res, (err) => multerErrorHandler(err, req, res, next))
    },
    enforceUsage(prisma, {
      allowColumn: 'allowFaceSearchNToN',
      featureKey: 'N:N Batch Comparison',
    }),
    async (req, res) => {
      try {
        const set1Files = req.files?.set1
        const set2Files = req.files?.set2

        if (!set1Files || set1Files.length === 0) {
          return validationError(res, 'At least one image in set1 is required.', 'set1')
        }
        if (!set2Files || set2Files.length === 0) {
          return validationError(res, 'At least one image in set2 is required.', 'set2')
        }

        const set1 = set1Files.map((f) => ({
          buffer: f.buffer,
          filename: f.originalname,
          mimeType: f.mimetype,
        }))
        const set2 = set2Files.map((f) => ({
          buffer: f.buffer,
          filename: f.originalname,
          mimeType: f.mimetype,
        }))

        const result = await frsClient.nToNSearch(set1, set2)

        return res.json({
          success: true,
          data: {
            summary: result.summary,
            comparisons: result.comparisons.map((c) => ({
              source: {
                index: c.source.index,
                filename: c.source.filename,
                bbox: c.source.face ? frsClient.normalizeBbox(c.source.face.bbox) : null,
              },
              target: {
                index: c.target.index,
                filename: c.target.filename,
                bbox: c.target.face ? frsClient.normalizeBbox(c.target.face.bbox) : null,
              },
              match: c.match || false,
              confidence: c.confidence || null,
              error: c.error || null,
            })),
          },
        })
      } catch (err) {
        console.error('[API v1] faces/batch error:', err.message)
        return internalError(res)
      }
    }
  )

  // ====================================================================
  // POST /videos/analyze — Submit Video for Processing
  // ====================================================================
  // Field: file (1 video file)
  // Optional body (JSON or multipart fields): name, streamSettings
  // Returns: jobId for status polling
  // ====================================================================
  router.post(
    '/videos/analyze',
    enforceRateLimits({ tenantPerMinute: 10 }),
    (req, res, next) => {
      uploadVideo.single('file')(req, res, (err) => multerErrorHandler(err, req, res, next))
    },
    enforceUsage(prisma, {
      allowColumn: 'allowVideoProcessing',
      featureKey: 'Video Processing',
      isVideo: true,
    }),
    async (req, res) => {
      try {
        const videoFile = req.file
        if (!videoFile) return validationError(res, 'Video file is required.', 'file')

        // Check plan-level video size limit
        const plan = req.saas?.plan
        if (plan?.maxVideoSize) {
          const maxBytes = plan.maxVideoSize * 1024 * 1024
          if (videoFile.size > maxBytes) {
            return res.status(413).json({
              code: 'VIDEO_TOO_LARGE',
              message: `Video exceeds your plan limit of ${plan.maxVideoSize}MB.`,
              maxSizeMB: plan.maxVideoSize,
            })
          }
        }

        const name = req.body?.name || videoFile.originalname || 'API Upload'

        // Step 1: Create video entry
        const createRes = await axios.post(
          `${VIDEO_API_BASE}/videos/`,
          { name },
          { headers: { Authorization: `Token ${VIDEO_API_TOKEN}` }, timeout: 15000 }
        )
        const videoId = createRes.data.id

        // Step 2: Upload the video file
        const formData = new FormData()
        formData.append('file', videoFile.buffer, {
          filename: videoFile.originalname,
          contentType: videoFile.mimetype,
        })
        await axios.put(
          `${VIDEO_API_BASE}/videos/${videoId}/upload/source_file/`,
          formData,
          {
            headers: {
              Authorization: `Token ${VIDEO_API_TOKEN}`,
              ...formData.getHeaders(),
            },
            maxContentLength: MAX_VIDEO_SIZE,
            maxBodyLength: MAX_VIDEO_SIZE,
            timeout: 300000, // 5 min for upload
          }
        )

        // Step 3: Start processing
        await axios.post(
          `${VIDEO_API_BASE}/videos/${videoId}/process/`,
          {},
          { headers: { Authorization: `Token ${VIDEO_API_TOKEN}` }, timeout: 15000 }
        )

        return res.status(202).json({
          success: true,
          data: {
            jobId: String(videoId),
            status: 'processing',
            message: 'Video submitted for processing. Poll GET /videos/:jobId for status.',
          },
        })
      } catch (err) {
        console.error('[API v1] videos/analyze error:', err.message)
        if (err.response?.status === 413) {
          return res.status(413).json({
            code: 'VIDEO_TOO_LARGE',
            message: 'Video file is too large.',
          })
        }
        return internalError(res)
      }
    }
  )

  // ====================================================================
  // GET /videos/:jobId — Check Video Processing Status
  // ====================================================================
  // Returns: current status and results (if complete)
  // ====================================================================
  router.get(
    '/videos/:jobId',
    enforceRateLimits({ tenantPerMinute: 120 }),
    enforceUsage(prisma, {
      allowColumn: 'allowVideoProcessing',
      featureKey: 'Video Processing',
    }),
    async (req, res) => {
      try {
        const { jobId } = req.params

        // Get video status
        const videoRes = await axios.get(
          `${VIDEO_API_BASE}/videos/${jobId}/`,
          { headers: { Authorization: `Token ${VIDEO_API_TOKEN}` }, timeout: 15000 }
        )
        const video = videoRes.data

        const response = {
          success: true,
          data: {
            jobId,
            status: normalizeVideoStatus(video.status),
            name: video.name,
            createdAt: video.created,
            duration: video.duration || null,
          },
        }

        // If processing is complete, include face/cluster data
        if (video.status === 'finished' || video.status === 'FINISHED') {
          try {
            const [facesRes, clustersRes] = await Promise.all([
              axios.get(`${EVENTS_API_BASE}/events/faces/`, {
                params: { video_archive: jobId, limit: 500, ordering: '-id' },
                headers: { Authorization: `Token ${EVENTS_API_TOKEN}` },
                timeout: 15000,
              }),
              axios.get(`${EVENTS_API_BASE}/clusters/faces/`, {
                params: { video_archive: jobId },
                headers: { Authorization: `Token ${EVENTS_API_TOKEN}` },
                timeout: 15000,
              }),
            ])

            response.data.faces = (facesRes.data.results || facesRes.data || []).map((f) => ({
              id: f.id,
              bbox: f.bbox,
              thumbnail: f.thumbnail,
              timestamp: f.timestamp,
              clusterId: f.cluster,
            }))
            response.data.clusters = (clustersRes.data.results || clustersRes.data || []).map((c) => ({
              id: c.id,
              faceCount: c.faces_count || c.count,
              thumbnail: c.face,
            }))
            response.data.totalFaces = response.data.faces.length
            response.data.totalClusters = response.data.clusters.length
          } catch (detailErr) {
            console.error('[API v1] Failed to fetch video details:', detailErr.message)
            // Still return video status even if detail fetch fails
            response.data.faces = []
            response.data.clusters = []
          }
        }

        return res.json(response)
      } catch (err) {
        console.error('[API v1] videos/:jobId error:', err.message)
        if (err.response?.status === 404) {
          return res.status(404).json({
            code: 'VIDEO_NOT_FOUND',
            message: `No video found with jobId: ${req.params.jobId}`,
          })
        }
        return internalError(res)
      }
    }
  )

  return router
}

// ──────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────

function normalizeVideoStatus(raw) {
  const map = {
    created: 'pending',
    queued: 'processing',
    processing: 'processing',
    PROCESSING: 'processing',
    finished: 'completed',
    FINISHED: 'completed',
    failed: 'failed',
    FAILED: 'failed',
  }
  return map[raw] || raw
}

module.exports = { createApiV1Router }
