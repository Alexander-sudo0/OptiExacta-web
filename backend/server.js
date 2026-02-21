require('dotenv').config()

const express = require('express')
const helmet = require('helmet')
const cors = require('cors')
const { PrismaClient } = require('@prisma/client')
const multer = require('multer')
const { verifyAuth } = require('./middleware/verifyAuth')
const { attachTenantContext } = require('./middleware/tenantContext')
const { enforceUsage, enforceImageSize } = require('./middleware/usageLimits')
const { enforceRateLimits } = require('./middleware/rateLimits')
const { requireSuperAdmin } = require('./middleware/adminAuth')
const { auditMiddleware } = require('./lib/audit')
const { createAdminRouter } = require('./routes/admin')
const { createPaymentRouter } = require('./routes/payments')
const { startAbuseScanner } = require('./lib/abuse-detection')
const frsClient = require('./lib/frs-client')
const shareTokens = require('./lib/share-tokens')
const axios = require('axios')
const FormData = require('form-data')
const { getRedisClient } = require('./lib/redis')

const app = express()
const port = Number(process.env.PORT || 3000)
const prisma = new PrismaClient()

// --- Security hardening ---
app.set('trust proxy', 1) // Trust first proxy hop (nginx/Docker)
app.use(helmet())

// Multer config for file uploads (2MB limit)
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const ALLOWED_VIDEO_MIMES = new Set(['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'])

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_IMAGE_MIMES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid image type: ${file.mimetype}. Allowed: JPEG, PNG, WebP, GIF`));
    }
  },
});

const MAX_VIDEO_SIZE = 500 * 1024 * 1024; // 500MB hard limit (plan.maxVideoSize enforced per-route)
const uploadVideo = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_VIDEO_SIZE },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_VIDEO_MIMES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid video type: ${file.mimetype}. Allowed: MP4, WebM, MOV, AVI`));
    }
  },
});

// Error handler for multer
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ code: 'FILE_TOO_LARGE', error: 'File size exceeds the allowed limit' });
    }
    return res.status(400).json({ error: err.message });
  }
  if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
};

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3002',
  credentials: true,
}))
app.use(express.json({ limit: '1mb' }))

const VIDEO_API_BASE = process.env.VIDEO_API_BASE || process.env.FRS_BASE_URL || 'http://72.60.223.48'
const VIDEO_API_TOKEN = process.env.VIDEO_API_TOKEN || process.env.FRS_API_TOKEN || ''
const EVENTS_API_BASE = process.env.EVENTS_API_BASE || process.env.FRS_BASE_URL || 'http://72.60.223.48'
const EVENTS_API_TOKEN = process.env.EVENTS_API_TOKEN || process.env.FRS_API_TOKEN || ''

const videoApi = axios.create({
  baseURL: VIDEO_API_BASE,
  timeout: 60_000,
})

const eventsApi = axios.create({
  baseURL: EVENTS_API_BASE,
  timeout: 60_000,
})

const normalizeDetectionId = (id) => {
  if (!id) return null
  if (id.startsWith('detection:')) return id
  if (id.includes(':')) return id
  return `detection:${id}`
}

// ============================================================================
// AUDIT MIDDLEWARE — must be BEFORE all routes so res.on('finish') fires
// ============================================================================

app.use(auditMiddleware(prisma))

// ============================================================================
// HEALTH CHECKS
// ============================================================================

app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.get('/db/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`
    res.json({ status: 'ok' })
  } catch (error) {
    res.status(500).json({ status: 'error' })
  }
})

// ============================================================================
// FAILED LOGIN MONITORING (called by frontend on failed Firebase auth)
// ============================================================================

const FAILED_LOGIN_THRESHOLD = 10 // abuse flag after this many failures
const FAILED_LOGIN_LOCKOUT = 20   // temporary IP lockout after this many

app.post('/api/auth/login-failed', async (req, res) => {
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || '0.0.0.0'
  const { email } = req.body || {}

  try {
    const redis = await getRedisClient()
    const dayKey = `failed-login:${ip}:${new Date().toISOString().slice(0, 10)}`
    const count = await redis.incr(dayKey)
    if (count === 1) await redis.expire(dayKey, 86_400)

    // Temporary lockout
    if (count >= FAILED_LOGIN_LOCKOUT) {
      return res.status(429).json({
        code: 'LOGIN_LOCKED',
        message: 'Too many failed login attempts. Try again later.',
      })
    }

    // Create abuse flag at threshold
    if (count === FAILED_LOGIN_THRESHOLD) {
      await prisma.abuseFlag.create({
        data: {
          reason: `${count} failed login attempts from IP ${ip} (email: ${email || 'unknown'})`,
          severity: 'HIGH',
          meta: { ip, email, count },
        },
      }).catch(() => {})
    }
  } catch {
    // Redis down — still respond OK
  }

  res.json({ ok: true })
})

// Check if IP is login-locked (frontend can call before showing login form)
app.get('/api/auth/login-status', async (req, res) => {
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || '0.0.0.0'

  try {
    const redis = await getRedisClient()
    const dayKey = `failed-login:${ip}:${new Date().toISOString().slice(0, 10)}`
    const count = Number(await redis.get(dayKey)) || 0
    res.json({ locked: count >= FAILED_LOGIN_LOCKOUT, attempts: count })
  } catch {
    res.json({ locked: false, attempts: 0 })
  }
})

// Dev-only: reset rate limits for current tenant/IP
app.post('/api/dev/reset-rate-limits', verifyAuth, attachTenantContext(prisma), async (req, res) => {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(403).json({ error: 'forbidden' })
  }

  try {
    const redis = await getRedisClient()
    const tenantId = req.saas?.tenant?.id || 'unknown'
    const ip = req.ip || req.connection?.remoteAddress || 'unknown'

    const patterns = [
      `rate:tenant:${tenantId}:*`,
      `rate:ip:${ip}:*`,
    ]

    let deleted = 0
    for (const pattern of patterns) {
      const keys = []
      for await (const key of redis.scanIterator({ MATCH: pattern })) {
        keys.push(key)
      }
      if (keys.length) {
        deleted += await redis.del(keys)
      }
    }

    res.json({ success: true, deleted })
  } catch (error) {
    console.error('Reset rate limits error:', error.message)
    res.status(500).json({ error: 'Failed to reset rate limits' })
  }
})

// ============================================================================
// VIDEO PROCESSING PROXY
// ============================================================================

app.post(
  '/api/video-processing/videos',
  verifyAuth,
  attachTenantContext(prisma),
  enforceRateLimits({ tenantPerMinute: 20 }),
  enforceUsage(prisma, { allowColumn: 'allowVideoProcessing', featureKey: 'Video Processing' }),
  async (req, res) => {
    try {
      const { camera_group = 1, name, stream_settings } = req.body || {}

      if (!VIDEO_API_TOKEN) {
        return res.status(500).json({ error: 'Video API token is not configured' })
      }

      const response = await videoApi.post(
        '/videos/',
        {
          camera_group,
          name: name || 'Video Upload',
          ...(stream_settings ? { stream_settings } : {}),
        },
        { headers: { Authorization: `Token ${VIDEO_API_TOKEN}` } }
      )

      res.json(response.data)
    } catch (error) {
      console.error('Video create error:', error.message)
      res.status(500).json({
        error: 'Failed to create video entry',
        detail: error.response?.data || error.message,
      })
    }
  }
)

app.patch(
  '/api/video-processing/videos/:id',
  verifyAuth,
  attachTenantContext(prisma),
  enforceRateLimits({ tenantPerMinute: 20 }),
  enforceUsage(prisma, { allowColumn: 'allowVideoProcessing', featureKey: 'Video Processing' }),
  async (req, res) => {
    try {
      if (!VIDEO_API_TOKEN) {
        return res.status(500).json({ error: 'Video API token is not configured' })
      }

      const { id } = req.params
      const { stream_settings } = req.body || {}

      if (!stream_settings) {
        return res.status(400).json({ error: 'stream_settings is required' })
      }

      const response = await videoApi.patch(
        `/videos/${id}/`,
        { stream_settings },
        { headers: { Authorization: `Token ${VIDEO_API_TOKEN}` } }
      )

      res.json(response.data)
    } catch (error) {
      console.error('Video patch error:', error.message)
      res.status(500).json({
        error: 'Failed to update video settings',
        detail: error.response?.data || error.message,
      })
    }
  }
)

app.put(
  '/api/video-processing/videos/:id/upload/source_file',
  verifyAuth,
  attachTenantContext(prisma),
  enforceRateLimits({ tenantPerMinute: 10 }),
  enforceUsage(prisma, { allowColumn: 'allowVideoProcessing', featureKey: 'Video Processing', isVideo: true }),
  uploadVideo.single('file'),
  handleMulterError,
  async (req, res) => {
    try {
      if (!VIDEO_API_TOKEN) {
        return res.status(500).json({ error: 'Video API token is not configured' })
      }

      if (!req.file) {
        return res.status(400).json({ error: 'No video file provided' })
      }

      // Enforce video size limit: 500MB for superadmin, 50MB for others
      const isSuperAdmin = req.saas?.user?.systemRole === 'SUPER_ADMIN'
      const maxMB = isSuperAdmin ? 500 : 50
      if (req.file.size > maxMB * 1024 * 1024) {
        return res.status(413).json({
          code: 'VIDEO_TOO_LARGE',
          error: `Video exceeds your plan limit of ${maxMB}MB`,
        })
      }

      const { id } = req.params
      const response = await videoApi.put(
        `/videos/${id}/upload/source_file/`,
        req.file.buffer,
        {
          headers: {
            Authorization: `Token ${VIDEO_API_TOKEN}`,
            'Content-Type': req.file.mimetype || 'application/octet-stream',
            'Content-Length': req.file.size,
          },
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
        }
      )

      res.json(response.data)
    } catch (error) {
      console.error('Video upload error:', error.message)
      res.status(500).json({
        error: 'Failed to upload video',
        detail: error.response?.data || error.message,
      })
    }
  }
)

app.post(
  '/api/video-processing/videos/:id/process',
  verifyAuth,
  attachTenantContext(prisma),
  enforceRateLimits({ tenantPerMinute: 20 }),
  enforceUsage(prisma, { allowColumn: 'allowVideoProcessing', featureKey: 'Video Processing' }),
  async (req, res) => {
    try {
      if (!VIDEO_API_TOKEN) {
        return res.status(500).json({ error: 'Video API token is not configured' })
      }

      const { id } = req.params
      const response = await videoApi.post(
        `/videos/${id}/process/`,
        null,
        { headers: { Authorization: `Token ${VIDEO_API_TOKEN}` } }
      )

      res.json(response.data)
    } catch (error) {
      console.error('Video process error:', error.message)
      res.status(500).json({
        error: 'Failed to start processing',
        detail: error.response?.data || error.message,
      })
    }
  }
)

app.get(
  '/api/video-processing/videos/:id',
  verifyAuth,
  attachTenantContext(prisma),
  enforceRateLimits({ tenantPerMinute: 60 }),
  enforceUsage(prisma, { allowColumn: 'allowVideoProcessing', featureKey: 'Video Processing' }),
  async (req, res) => {
    try {
      if (!VIDEO_API_TOKEN) {
        return res.status(500).json({ error: 'Video API token is not configured' })
      }

      const { id } = req.params
      const response = await videoApi.get(
        `/videos/${id}/`,
        { headers: { Authorization: `Token ${VIDEO_API_TOKEN}` } }
      )

      res.json(response.data)
    } catch (error) {
      console.error('Video status error:', error.message)
      res.status(500).json({
        error: 'Failed to fetch video status',
        detail: error.response?.data || error.message,
      })
    }
  }
)

app.get(
  '/api/video-processing/faces',
  verifyAuth,
  attachTenantContext(prisma),
  enforceRateLimits({ tenantPerMinute: 60 }),
  enforceUsage(prisma, { allowColumn: 'allowVideoProcessing', featureKey: 'Video Processing' }),
  async (req, res) => {
    try {
      if (!EVENTS_API_TOKEN) {
        return res.status(500).json({ error: 'Events API token is not configured' })
      }

      const { video_archive } = req.query
      if (!video_archive) {
        return res.status(400).json({ error: 'video_archive query param is required' })
      }

      const response = await eventsApi.get(
        '/events/faces/',
        {
          headers: { Authorization: `Token ${EVENTS_API_TOKEN}` },
          params: { video_archive: String(video_archive) },
        }
      )

      res.json(response.data)
    } catch (error) {
      console.error('Video faces list error:', error.message)
      res.status(500).json({
        error: 'Failed to fetch video faces',
        detail: error.response?.data || error.message,
      })
    }
  }
)

app.get(
  '/api/video-processing/clusters',
  verifyAuth,
  attachTenantContext(prisma),
  enforceRateLimits({ tenantPerMinute: 60 }),
  enforceUsage(prisma, { allowColumn: 'allowVideoProcessing', featureKey: 'Video Processing' }),
  async (req, res) => {
    try {
      if (!EVENTS_API_TOKEN) {
        return res.status(500).json({ error: 'Events API token is not configured' })
      }

      const { video_archive } = req.query
      if (!video_archive) {
        return res.status(400).json({ error: 'video_archive query param is required' })
      }

      const response = await eventsApi.get(
        '/clusters/faces/',
        {
          headers: { Authorization: `Token ${EVENTS_API_TOKEN}` },
          params: { video_archive: String(video_archive) },
        }
      )

      res.json(response.data)
    } catch (error) {
      console.error('Video clusters list error:', error.message)
      res.status(500).json({
        error: 'Failed to fetch video clusters',
        detail: error.response?.data || error.message,
      })
    }
  }
)

app.get(
  '/api/video-processing/events',
  verifyAuth,
  attachTenantContext(prisma),
  enforceRateLimits({ tenantPerMinute: 60 }),
  enforceUsage(prisma, { allowColumn: 'allowVideoProcessing', featureKey: 'Video Processing' }),
  async (req, res) => {
    try {
      if (!EVENTS_API_TOKEN) {
        return res.status(500).json({ error: 'Events API token is not configured' })
      }

      const { video_archive, limit = 10 } = req.query
      if (!video_archive) {
        return res.status(400).json({ error: 'video_archive query param is required' })
      }

      const response = await eventsApi.get(
        '/events/faces/',
        {
          headers: { Authorization: `Token ${EVENTS_API_TOKEN}` },
          params: {
            video_archive: String(video_archive),
            limit: Number(limit),
            ordering: '-id',
          },
        }
      )

      res.json(response.data)
    } catch (error) {
      console.error('Video events list error:', error.message)
      res.status(500).json({
        error: 'Failed to fetch video events',
        detail: error.response?.data || error.message,
      })
    }
  }
)

app.post(
  '/api/video-processing/faces/search',
  verifyAuth,
  attachTenantContext(prisma),
  enforceRateLimits({ tenantPerMinute: 30 }),
  enforceUsage(prisma, { allowColumn: 'allowVideoProcessing', featureKey: 'Video Processing' }),
  upload.single('file'),
  handleMulterError,
  enforceImageSize(),
  async (req, res) => {
    try {
      if (!EVENTS_API_TOKEN) {
        return res.status(500).json({ error: 'Events API token is not configured' })
      }

      if (!req.file) {
        return res.status(400).json({ error: 'No query face provided' })
      }

      const detection = await frsClient.detectFaces(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype
      )

      const faceId = detection.objects?.face?.[0]?.id
      if (!faceId) {
        return res.status(400).json({ error: 'No face detected in query image' })
      }

      const looksLike = normalizeDetectionId(faceId)
      const threshold = req.query.threshold ? Number(req.query.threshold) : 0.7
      const limit = req.query.limit ? Number(req.query.limit) : 10
      const ordering = req.query.ordering ? String(req.query.ordering) : '-looks_like_confidence'
      const videoArchive = req.query.video_archive ? String(req.query.video_archive) : undefined

      if (!videoArchive) {
        return res.status(400).json({ error: 'video_archive query param is required' })
      }

      const response = await eventsApi.get(
        '/clusters/faces/',
        {
          headers: { Authorization: `Token ${EVENTS_API_TOKEN}` },
          params: {
            looks_like: looksLike,
            threshold,
            limit,
            ordering,
            video_archive: videoArchive,
          },
        }
      )

      if (Array.isArray(response.data?.results) && response.data.results.length > 0) {
        return res.json(response.data)
      }

      const fallback = await eventsApi.get(
        '/events/faces/',
        {
          headers: { Authorization: `Token ${EVENTS_API_TOKEN}` },
          params: {
            looks_like: looksLike,
            threshold,
            limit,
            ordering,
            video_archive: videoArchive,
          },
        }
      )

      res.json(fallback.data)
    } catch (error) {
      console.error('Video faces search error:', error.message)
      res.status(500).json({
        error: 'Failed to search video faces',
        detail: error.response?.data || error.message,
      })
    }
  }
)

app.post(
  '/api/video-processing/faces/verify',
  verifyAuth,
  attachTenantContext(prisma),
  enforceRateLimits({ tenantPerMinute: 30 }),
  enforceUsage(prisma, { allowColumn: 'allowVideoProcessing', featureKey: 'Video Processing' }),
  upload.fields([
    { name: 'image1', maxCount: 1 },
    { name: 'image2', maxCount: 1 },
  ]),
  handleMulterError,
  enforceImageSize(),
  async (req, res) => {
    try {
      if (!VIDEO_API_TOKEN) {
        return res.status(500).json({ error: 'Video API token is not configured' })
      }

      const image1 = req.files?.image1?.[0]
      const image2 = req.files?.image2?.[0]

      if (!image1 || !image2) {
        return res.status(400).json({ error: 'Both image1 and image2 are required' })
      }

      const form = new FormData()
      form.append('image1', image1.buffer, {
        filename: image1.originalname,
        contentType: image1.mimetype,
      })
      form.append('image2', image2.buffer, {
        filename: image2.originalname,
        contentType: image2.mimetype,
      })

      const response = await videoApi.post(
        '/faces/verify/',
        form,
        {
          headers: {
            Authorization: `Token ${VIDEO_API_TOKEN}`,
            ...form.getHeaders(),
          },
        }
      )

      res.json(response.data)
    } catch (error) {
      console.error('Video faces verify error:', error.message)
      res.status(500).json({
        error: 'Failed to verify faces',
        detail: error.response?.data || error.message,
      })
    }
  }
)

// ============================================================================
// USER INFO
// ============================================================================

app.get(
  '/api/me',
  verifyAuth,
  attachTenantContext(prisma),
  enforceRateLimits({ tenantPerMinute: 60 }),
  (req, res) => {
    const { user, tenant, role, plan } = req.saas
    res.json({
      user: {
        id: user.id,
        email: user.email,
        provider: user.provider,
        systemRole: user.systemRole // USER / ADMIN / SUPER_ADMIN
      },
      tenant: {
        id: tenant.id,
        name: tenant.name,
        subscriptionStatus: tenant.subscriptionStatus,
        trialEndsAt: tenant.trialEndsAt
      },
      role, // Tenant-level role (ADMIN/MEMBER from TenantUser)
      plan: {
        code: plan.code,
        name: plan.name,
        dailyRequestLimit: plan.dailyRequestLimit,
        softDailyLimit: plan.softDailyLimit,
        monthlyRequestLimit: plan.monthlyRequestLimit,
        monthlyVideoLimit: plan.monthlyVideoLimit,
        maxImageSize: plan.maxImageSize,
        maxVideoSize: plan.maxVideoSize,
        allowFaceSearchOneToOne: plan.allowFaceSearchOneToOne,
        allowFaceSearchOneToN: plan.allowFaceSearchOneToN,
        allowFaceSearchNToN: plan.allowFaceSearchNToN,
        allowVideoProcessing: plan.allowVideoProcessing,
      }
    })
  }
)

// ============================================================================
// USAGE STATS - Get API usage statistics from Redis
// ============================================================================

app.get(
  '/api/usage/stats',
  verifyAuth,
  attachTenantContext(prisma),
  enforceRateLimits({ tenantPerMinute: 60 }),
  async (req, res) => {
    try {
      const { tenant, plan } = req.saas
      const redis = await getRedisClient()

      // Get today's usage
      const now = new Date()
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
      const dayKey = `usage:tenant:${tenant.id}:day:${today}`
      
      // Get this month's usage
      const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      const monthKey = `usage:tenant:${tenant.id}:month:${yearMonth}`

      const [dailyUsage, monthlyUsage] = await Promise.all([
        redis.get(dayKey).catch(() => null),
        redis.get(monthKey).catch(() => null),
      ])

      const apiCallsToday = parseInt(dailyUsage || '0', 10)
      const monthRequests = parseInt(monthlyUsage || '0', 10)

      res.json({
        apiCallsToday,
        monthRequests,
        dailyLimit: plan.dailyRequestLimit || 0,
        monthlyLimit: plan.monthlyRequestLimit || 0,
        systemStatus: 'Online',
      })
    } catch (error) {
      console.error('Usage stats error:', error.message)
      res.status(500).json({ error: 'Failed to fetch usage stats' })
    }
  }
)

// ============================================================================
// FRS PROXY - DETECT (proxies to upstream FRS, hides credentials)
// ============================================================================

app.post(
  '/api/frs/detect',
  verifyAuth,
  attachTenantContext(prisma),
  enforceRateLimits({ tenantPerMinute: 30 }),
  enforceUsage(prisma, { allowColumn: 'allowFaceSearchOneToOne', featureKey: 'Face Search' }),
  upload.single('photo'),
  handleMulterError,
  enforceImageSize(),
  async (req, res) => {
    console.log('📸 Face detection request received:', req.file?.originalname);
    try {
      if (!req.file) {
        console.log('❌ No file in request');
        return res.status(400).json({ error: 'No image file provided' });
      }

      console.log('🔍 Detecting faces in image...');
      const result = await frsClient.detectFaces(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype
      );
      console.log('✅ Detection result:', result.objects?.face?.length || 0, 'faces found');

      // Normalize bbox in response
      if (result.objects?.face) {
        result.objects.face = result.objects.face.map(face => ({
          ...face,
          bbox: frsClient.normalizeBbox(face.bbox),
        }));
      }

      res.json(result);
    } catch (error) {
      console.error('FRS detect error:', error.message);
      console.error('FRS detect error details:', error.response?.data);
      res.status(500).json({ 
        error: 'Face detection failed',
        detail: error.response?.data?.detail || error.response?.data || error.message 
      });
    }
  }
)

// ============================================================================
// FRS PROXY - VERIFY (proxies to upstream FRS, hides credentials)
// ============================================================================

app.get(
  '/api/frs/verify',
  verifyAuth,
  attachTenantContext(prisma),
  enforceRateLimits({ tenantPerMinute: 30 }),
  enforceUsage(prisma, { allowColumn: 'allowFaceSearchOneToOne', featureKey: 'Face Verification' }),
  async (req, res) => {
    try {
      const { object1, object2 } = req.query;
      
      if (!object1 || !object2) {
        return res.status(400).json({ error: 'Both object1 and object2 are required' });
      }

      const result = await frsClient.verifyFaces(object1, object2);
      res.json(result);
    } catch (error) {
      console.error('FRS verify error:', error.message);
      console.error('FRS verify error details:', error.response?.data);
      res.status(500).json({ 
        error: 'Face verification failed',
        detail: error.response?.data?.detail || error.response?.data || error.message 
      });
    }
  }
)

// ============================================================================
// 1:1 VERIFICATION - Full flow with result storage
// ============================================================================

app.post(
  '/api/face-search/one-to-one',
  verifyAuth,
  attachTenantContext(prisma),
  enforceRateLimits({ tenantPerMinute: 60 }),
  enforceUsage(prisma, {
    featureKey: 'FACE_SEARCH_ONE_TO_ONE',
    allowColumn: 'allowFaceSearchOneToOne'
  }),
  upload.fields([
    { name: 'source', maxCount: 1 },
    { name: 'target', maxCount: 1 }
  ]),
  handleMulterError,
  enforceImageSize(),
  async (req, res) => {
    try {
      const sourceFile = req.files?.source?.[0];
      const targetFile = req.files?.target?.[0];

      if (!sourceFile || !targetFile) {
        return res.status(400).json({ error: 'Both source and target images are required' });
      }

      // Perform 1:1 verification
      const result = await frsClient.oneToOneVerification(
        sourceFile.buffer, sourceFile.originalname, sourceFile.mimetype,
        targetFile.buffer, targetFile.originalname, targetFile.mimetype
      );

      // Store result in database
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30); // 30 days retention

      const faceSearchRequest = await prisma.faceSearchRequest.create({
        data: {
          tenantId: req.saas.tenant.id,
          userId: req.saas.user.id,
          type: 'ONE_TO_ONE',
          requestData: {
            source: { filename: sourceFile.originalname, size: sourceFile.size },
            target: { filename: targetFile.originalname, size: targetFile.size },
          },
          resultData: result,
          status: 'completed',
          expiresAt,
        },
      });

      res.json({
        id: faceSearchRequest.id,
        ...result,
        createdAt: faceSearchRequest.createdAt,
        expiresAt: faceSearchRequest.expiresAt,
      });
    } catch (error) {
      console.error('1:1 verification error:', error.message);
      res.status(500).json({ 
        error: error.message || 'Verification failed'
      });
    }
  }
)

// ============================================================================
// 1:N VERIFICATION - One source against multiple targets
// ============================================================================

app.post(
  '/api/face-search/one-to-n',
  verifyAuth,
  attachTenantContext(prisma),
  enforceRateLimits({ tenantPerMinute: 30 }),
  enforceUsage(prisma, {
    featureKey: 'FACE_SEARCH_ONE_TO_N',
    allowColumn: 'allowFaceSearchOneToN'
  }),
  upload.fields([
    { name: 'source', maxCount: 1 },
    { name: 'targets', maxCount: 50 }
  ]),
  handleMulterError,
  enforceImageSize(),
  async (req, res) => {
    try {
      const sourceFile = req.files?.source?.[0];
      const targetFiles = req.files?.targets || [];

      if (!sourceFile) {
        return res.status(400).json({ error: 'Source image is required' });
      }
      if (targetFiles.length === 0) {
        return res.status(400).json({ error: 'At least one target image is required' });
      }

      // Perform 1:N verification
      const result = await frsClient.oneToNVerification(
        {
          buffer: sourceFile.buffer,
          filename: sourceFile.originalname,
          mimeType: sourceFile.mimetype,
        },
        targetFiles.map(f => ({
          buffer: f.buffer,
          filename: f.originalname,
          mimeType: f.mimetype,
        }))
      );

      // Store result in database
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      const faceSearchRequest = await prisma.faceSearchRequest.create({
        data: {
          tenantId: req.saas.tenant.id,
          userId: req.saas.user.id,
          type: 'ONE_TO_N',
          requestData: {
            source: { filename: sourceFile.originalname, size: sourceFile.size },
            targets: targetFiles.map(f => ({ filename: f.originalname, size: f.size })),
          },
          resultData: result,
          status: 'completed',
          expiresAt,
        },
      });

      res.json({
        id: faceSearchRequest.id,
        ...result,
        createdAt: faceSearchRequest.createdAt,
        expiresAt: faceSearchRequest.expiresAt,
      });
    } catch (error) {
      console.error('1:N verification error:', error.message);
      res.status(500).json({ 
        error: error.message || 'Verification failed'
      });
    }
  }
)

// ============================================================================
// N:N SEARCH - All combinations between two sets
// ============================================================================

app.post(
  '/api/face-search/n-to-n',
  verifyAuth,
  attachTenantContext(prisma),
  enforceRateLimits({ tenantPerMinute: 10 }),
  enforceUsage(prisma, {
    featureKey: 'FACE_SEARCH_N_TO_N',
    allowColumn: 'allowFaceSearchNToN'
  }),
  upload.fields([
    { name: 'set1', maxCount: 20 },
    { name: 'set2', maxCount: 20 }
  ]),
  handleMulterError,
  enforceImageSize(),
  async (req, res) => {
    try {
      const set1Files = req.files?.set1 || [];
      const set2Files = req.files?.set2 || [];

      if (set1Files.length === 0) {
        return res.status(400).json({ error: 'Set 1 requires at least one image' });
      }
      if (set2Files.length === 0) {
        return res.status(400).json({ error: 'Set 2 requires at least one image' });
      }

      // Perform N:N search
      const result = await frsClient.nToNSearch(
        set1Files.map(f => ({
          buffer: f.buffer,
          filename: f.originalname,
          mimeType: f.mimetype,
        })),
        set2Files.map(f => ({
          buffer: f.buffer,
          filename: f.originalname,
          mimeType: f.mimetype,
        }))
      );

      // Store result in database
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      const faceSearchRequest = await prisma.faceSearchRequest.create({
        data: {
          tenantId: req.saas.tenant.id,
          userId: req.saas.user.id,
          type: 'N_TO_N',
          requestData: {
            set1: set1Files.map(f => ({ filename: f.originalname, size: f.size })),
            set2: set2Files.map(f => ({ filename: f.originalname, size: f.size })),
          },
          resultData: result,
          status: 'completed',
          expiresAt,
        },
      });

      res.json({
        id: faceSearchRequest.id,
        ...result,
        createdAt: faceSearchRequest.createdAt,
        expiresAt: faceSearchRequest.expiresAt,
      });
    } catch (error) {
      console.error('N:N search error:', error.message);
      res.status(500).json({ 
        error: error.message || 'Search failed'
      });
    }
  }
)

// ============================================================================
// FACE SEARCH REQUESTS - CRUD Operations
// ============================================================================

// List requests (with pagination and filtering)
app.get(
  '/api/face-search/requests',
  verifyAuth,
  attachTenantContext(prisma),
  enforceRateLimits({ tenantPerMinute: 120 }),
  async (req, res) => {
    try {
      const { type, limit = 50, offset = 0, sort = 'desc' } = req.query;
      
      const where = {
        tenantId: req.saas.tenant.id,
        ...(req.saas.role !== 'ADMIN' && { userId: req.saas.user.id }),
        ...(type && { type: type.toUpperCase() }),
      };

      const [requests, total] = await Promise.all([
        prisma.faceSearchRequest.findMany({
          where,
          orderBy: { createdAt: sort === 'asc' ? 'asc' : 'desc' },
          take: parseInt(limit, 10),
          skip: parseInt(offset, 10),
          select: {
            id: true,
            type: true,
            status: true,
            createdAt: true,
            expiresAt: true,
            requestData: true,
            // Omit full resultData for list view
            resultData: false,
          },
        }),
        prisma.faceSearchRequest.count({ where }),
      ]);

      res.json({
        requests,
        pagination: {
          total,
          limit: parseInt(limit, 10),
          offset: parseInt(offset, 10),
        },
      });
    } catch (error) {
      console.error('List requests error:', error.message);
      res.status(500).json({ error: 'Failed to fetch requests' });
    }
  }
)

// Get single request with full result
app.get(
  '/api/face-search/requests/:id',
  verifyAuth,
  attachTenantContext(prisma),
  enforceRateLimits({ tenantPerMinute: 120 }),
  async (req, res) => {
    try {
      const request = await prisma.faceSearchRequest.findFirst({
        where: {
          id: req.params.id,
          tenantId: req.saas.tenant.id,
          ...(req.saas.role !== 'ADMIN' && { userId: req.saas.user.id }),
        },
      });

      if (!request) {
        return res.status(404).json({ error: 'Request not found' });
      }

      res.json(request);
    } catch (error) {
      console.error('Get request error:', error.message);
      res.status(500).json({ error: 'Failed to fetch request' });
    }
  }
)

// Delete request
app.delete(
  '/api/face-search/requests/:id',
  verifyAuth,
  attachTenantContext(prisma),
  enforceRateLimits({ tenantPerMinute: 60 }),
  async (req, res) => {
    try {
      const request = await prisma.faceSearchRequest.findFirst({
        where: {
          id: req.params.id,
          tenantId: req.saas.tenant.id,
          ...(req.saas.role !== 'ADMIN' && { userId: req.saas.user.id }),
        },
      });

      if (!request) {
        return res.status(404).json({ error: 'Request not found' });
      }

      await prisma.faceSearchRequest.delete({
        where: { id: req.params.id },
      });

      res.json({ success: true, message: 'Request deleted' });
    } catch (error) {
      console.error('Delete request error:', error.message);
      res.status(500).json({ error: 'Failed to delete request' });
    }
  }
)

// Store client-computed result (for share token testing)
app.post(
  '/api/face-search/store-result',
  verifyAuth,
  attachTenantContext(prisma),
  enforceRateLimits({ tenantPerMinute: 60 }),
  enforceUsage(prisma),
  async (req, res) => {
    try {
      const { type, requestData, resultData } = req.body || {};

      if (!type || !requestData || !resultData) {
        return res.status(400).json({ error: 'type, requestData, and resultData are required' });
      }

      const normalizedType = String(type).toUpperCase();
      const allowedTypes = ['ONE_TO_ONE', 'ONE_TO_N', 'N_TO_N'];
      if (!allowedTypes.includes(normalizedType)) {
        return res.status(400).json({ error: 'Invalid type' });
      }

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      const faceSearchRequest = await prisma.faceSearchRequest.create({
        data: {
          tenantId: req.saas.tenant.id,
          userId: req.saas.user.id,
          type: normalizedType,
          requestData,
          resultData,
          status: 'completed',
          expiresAt,
        },
      });

      res.json({
        id: faceSearchRequest.id,
        createdAt: faceSearchRequest.createdAt,
        expiresAt: faceSearchRequest.expiresAt,
      });
    } catch (error) {
      console.error('Store result error:', error.message);
      res.status(500).json({ error: 'Failed to store result' });
    }
  }
)

// ============================================================================
// SHARE TOKENS - Generate encrypted curl for result replay
// ============================================================================

// Generate share token for a request
app.post(
  '/api/share',
  verifyAuth,
  attachTenantContext(prisma),
  enforceRateLimits({ tenantPerMinute: 30 }),
  async (req, res) => {
    try {
      const { requestId } = req.body;

      if (!requestId) {
        return res.status(400).json({ error: 'requestId is required' });
      }

      // Verify request exists and belongs to user/tenant
      const faceSearchRequest = await prisma.faceSearchRequest.findFirst({
        where: {
          id: requestId,
          tenantId: req.saas.tenant.id,
          ...(req.saas.role !== 'ADMIN' && { userId: req.saas.user.id }),
        },
      });

      if (!faceSearchRequest) {
        return res.status(404).json({ error: 'Request not found' });
      }

      // Generate encrypted token
      const { token, tokenHash, expiresAt, payload } = shareTokens.generateShareToken({
        requestId: faceSearchRequest.id,
        userId: req.saas.user.id,
        tenantId: req.saas.tenant.id,
        apiType: faceSearchRequest.type,
      });

      // Store token hash in database
      const shareToken = await prisma.shareToken.create({
        data: {
          tenantId: req.saas.tenant.id,
          userId: req.saas.user.id,
          faceSearchRequestId: faceSearchRequest.id,
          tokenHash,
          apiType: faceSearchRequest.type,
          expiresAt,
        },
      });

      // Generate curl command. Prefer explicit PUBLIC_API_URL, otherwise derive from request host.
      const baseUrl = process.env.PUBLIC_API_URL || `${req.protocol}://${req.get('host')}` || 'https://www.optiexacta.com';
      const curlCommand = shareTokens.generateCurlCommand(token, baseUrl);

      res.json({
        id: shareToken.id,
        token, // Only returned once, never stored in plaintext
        curl: curlCommand,
        expiresAt,
        expiresInHours: shareTokens.TOKEN_EXPIRY_HOURS,
      });
    } catch (error) {
      console.error('Generate share token error:', error.message);
      res.status(500).json({ error: 'Failed to generate share token' });
    }
  }
)

// Result replay endpoint (public, uses Bearer token)
app.get('/api/result', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = shareTokens.parseAuthorizationHeader(authHeader);

    if (!token) {
      return res.status(401).json({ error: 'Authorization token required' });
    }

    // Validate token and get result
    const validation = await shareTokens.validateAndGetResult(token, prisma);

    if (!validation.valid) {
      if (validation.expired) {
        return res.status(401).json({ error: 'Token expired' });
      }
      return res.status(401).json({ error: validation.error || 'Invalid token' });
    }

    // Return the stored result (no new FRS API call)
    const { faceSearchRequest } = validation;
    
    res.json({
      id: faceSearchRequest.id,
      type: faceSearchRequest.type,
      status: faceSearchRequest.status,
      result: faceSearchRequest.resultData,
      createdAt: faceSearchRequest.createdAt,
      expiresAt: faceSearchRequest.expiresAt,
    });
  } catch (error) {
    console.error('Result replay error:', error.message);
    res.status(500).json({ error: 'Failed to retrieve result' });
  }
})

// List share tokens for current user
app.get(
  '/api/share/tokens',
  verifyAuth,
  attachTenantContext(prisma),
  enforceRateLimits({ tenantPerMinute: 60 }),
  async (req, res) => {
    try {
      const tokens = await prisma.shareToken.findMany({
        where: {
          tenantId: req.saas.tenant.id,
          ...(req.saas.role !== 'ADMIN' && { userId: req.saas.user.id }),
        },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          apiType: true,
          createdAt: true,
          expiresAt: true,
          lastAccessedAt: true,
          accessCount: true,
          faceSearchRequestId: true,
        },
      });

      res.json({ tokens });
    } catch (error) {
      console.error('List tokens error:', error.message);
      res.status(500).json({ error: 'Failed to fetch tokens' });
    }
  }
)

// Revoke (delete) share token
app.delete(
  '/api/share/tokens/:id',
  verifyAuth,
  attachTenantContext(prisma),
  enforceRateLimits({ tenantPerMinute: 60 }),
  async (req, res) => {
    try {
      const token = await prisma.shareToken.findFirst({
        where: {
          id: req.params.id,
          tenantId: req.saas.tenant.id,
          ...(req.saas.role !== 'ADMIN' && { userId: req.saas.user.id }),
        },
      });

      if (!token) {
        return res.status(404).json({ error: 'Token not found' });
      }

      await prisma.shareToken.delete({
        where: { id: req.params.id },
      });

      res.json({ success: true, message: 'Token revoked' });
    } catch (error) {
      console.error('Revoke token error:', error.message);
      res.status(500).json({ error: 'Failed to revoke token' });
    }
  }
)

// ============================================================================
// ADMIN ROUTES (protected: verifyAuth + tenantContext + SUPER_ADMIN)
// ============================================================================

app.use(
  '/api/admin',
  verifyAuth,
  attachTenantContext(prisma),
  enforceRateLimits({ tenantPerMinute: 30 }),
  requireSuperAdmin,
  createAdminRouter(prisma)
)

// ============================================================================
// PAYMENT / SUBSCRIPTION ROUTES
// ============================================================================

// Razorpay webhook — MUST be before verifyAuth (no auth, uses signature)
app.use('/api/payments/webhook', createPaymentRouter(prisma))

// Authenticated subscription endpoints
app.use(
  '/api/payments',
  verifyAuth,
  attachTenantContext(prisma),
  enforceRateLimits({ tenantPerMinute: 30 }),
  createPaymentRouter(prisma)
)

// ============================================================================
// SERVER START
// ============================================================================

app.listen(port, '0.0.0.0', () => {
  console.log(`Backend listening on ${port}`)
  // Start abuse detection scanner (every 5 minutes)
  startAbuseScanner(prisma, 5 * 60 * 1000)
})
