require('dotenv').config()

const express = require('express')
const cors = require('cors')
const { PrismaClient } = require('@prisma/client')
const multer = require('multer')
const { verifyAuth } = require('./middleware/verifyAuth')
const { attachTenantContext } = require('./middleware/tenantContext')
const { enforceUsage } = require('./middleware/usageLimits')
const { enforceRateLimits } = require('./middleware/rateLimits')
const frsClient = require('./lib/frs-client')
const shareTokens = require('./lib/share-tokens')

const app = express()
const port = Number(process.env.PORT || 3000)
const prisma = new PrismaClient()

// Multer config for file uploads (2MB limit)
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// Error handler for multer
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File size exceeds 2MB limit' });
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
app.use(express.json())

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
// USER INFO
// ============================================================================

app.get(
  '/api/me',
  verifyAuth,
  attachTenantContext(prisma),
  enforceRateLimits({ tenantPerMinute: 60, ipPerMinute: 60 }),
  (req, res) => {
    const { user, tenant, role, plan } = req.saas
    res.json({
      user: {
        id: user.id,
        email: user.email,
        provider: user.provider
      },
      tenant: {
        id: tenant.id,
        name: tenant.name,
        subscriptionStatus: tenant.subscriptionStatus,
        trialEndsAt: tenant.trialEndsAt
      },
      role,
      plan: {
        code: plan.code,
        name: plan.name,
        dailyRequestLimit: plan.dailyRequestLimit,
        allowFaceSearchOneToOne: plan.allowFaceSearchOneToOne,
        allowFaceSearchOneToN: plan.allowFaceSearchOneToN,
        allowFaceSearchNToN: plan.allowFaceSearchNToN
      }
    })
  }
)

// ============================================================================
// FRS PROXY - DETECT (proxies to upstream FRS, hides credentials)
// ============================================================================

app.post(
  '/api/frs/detect',
  upload.single('photo'),
  handleMulterError,
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No image file provided' });
      }

      const result = await frsClient.detectFaces(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype
      );

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
  enforceRateLimits({ tenantPerMinute: 60, ipPerMinute: 60 }),
  enforceUsage(prisma, {
    featureKey: 'FACE_SEARCH_ONE_TO_ONE',
    allowColumn: 'allowFaceSearchOneToOne'
  }),
  upload.fields([
    { name: 'source', maxCount: 1 },
    { name: 'target', maxCount: 1 }
  ]),
  handleMulterError,
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
  enforceRateLimits({ tenantPerMinute: 30, ipPerMinute: 30 }),
  enforceUsage(prisma, {
    featureKey: 'FACE_SEARCH_ONE_TO_N',
    allowColumn: 'allowFaceSearchOneToN'
  }),
  upload.fields([
    { name: 'source', maxCount: 1 },
    { name: 'targets', maxCount: 50 }
  ]),
  handleMulterError,
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
  enforceRateLimits({ tenantPerMinute: 10, ipPerMinute: 10 }),
  enforceUsage(prisma, {
    featureKey: 'FACE_SEARCH_N_TO_N',
    allowColumn: 'allowFaceSearchNToN'
  }),
  upload.fields([
    { name: 'set1', maxCount: 20 },
    { name: 'set2', maxCount: 20 }
  ]),
  handleMulterError,
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
  enforceRateLimits({ tenantPerMinute: 120, ipPerMinute: 60 }),
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
  enforceRateLimits({ tenantPerMinute: 120, ipPerMinute: 60 }),
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
  enforceRateLimits({ tenantPerMinute: 60, ipPerMinute: 30 }),
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
  enforceRateLimits({ tenantPerMinute: 60, ipPerMinute: 30 }),
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
  enforceRateLimits({ tenantPerMinute: 30, ipPerMinute: 30 }),
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
  enforceRateLimits({ tenantPerMinute: 60, ipPerMinute: 30 }),
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
  enforceRateLimits({ tenantPerMinute: 60, ipPerMinute: 30 }),
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
// SERVER START
// ============================================================================

app.listen(port, '0.0.0.0', () => {
  console.log(`Backend listening on ${port}`)
})
