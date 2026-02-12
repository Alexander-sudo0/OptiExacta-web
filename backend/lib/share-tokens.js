/**
 * Share Token Utilities
 * 
 * Implements secure encrypted token generation for result replay.
 * Uses AES-256-GCM encryption for token payload.
 * 
 * SECURITY REQUIREMENTS:
 * - Tokens are encrypted and non-guessable
 * - Token never exposes internal secrets
 * - Tokens expire after 24 hours
 * - Token hash stored in DB (not the actual token)
 */

const crypto = require('crypto');

// Encryption key from environment (32 bytes for AES-256)
const ENCRYPTION_KEY = process.env.SHARE_TOKEN_SECRET || 
  crypto.randomBytes(32).toString('hex').slice(0, 32);

// Token configuration
const TOKEN_EXPIRY_HOURS = 24;
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Generate a secure token for accessing verification results
 * @param {object} payload - Token payload { requestId, userId, tenantId, apiType }
 * @returns {object} { token, tokenHash, expiresAt }
 */
function generateShareToken(payload) {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + TOKEN_EXPIRY_HOURS);

  // Create token payload
  const tokenPayload = {
    requestId: payload.requestId,
    userId: payload.userId,
    tenantId: payload.tenantId,
    apiType: payload.apiType,
    createdAt: new Date().toISOString(),
    expiresAt: expiresAt.toISOString(),
    nonce: crypto.randomBytes(16).toString('hex'),
  };

  // Encrypt the payload
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = Buffer.from(ENCRYPTION_KEY, 'utf-8').slice(0, 32);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(JSON.stringify(tokenPayload), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  // Combine IV + authTag + encrypted data into final token
  const token = Buffer.concat([
    iv,
    authTag,
    Buffer.from(encrypted, 'hex'),
  ]).toString('base64url');

  // Generate hash for DB storage (we never store the actual token)
  const tokenHash = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

  return {
    token,
    tokenHash,
    expiresAt,
    payload: tokenPayload,
  };
}

/**
 * Decrypt and validate a share token
 * @param {string} token - Encrypted token
 * @returns {object|null} Decrypted payload or null if invalid
 */
function decryptShareToken(token) {
  try {
    const data = Buffer.from(token, 'base64url');
    
    // Extract components
    const iv = data.slice(0, IV_LENGTH);
    const authTag = data.slice(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = data.slice(IV_LENGTH + AUTH_TAG_LENGTH);

    // Decrypt
    const key = Buffer.from(ENCRYPTION_KEY, 'utf-8').slice(0, 32);
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, undefined, 'utf8');
    decrypted += decipher.final('utf8');

    return JSON.parse(decrypted);
  } catch (error) {
    console.error('Token decryption failed:', error.message);
    return null;
  }
}

/**
 * Hash a token for DB lookup
 * @param {string} token - Raw token
 * @returns {string} SHA-256 hash
 */
function hashToken(token) {
  return crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
}

/**
 * Check if a token is expired
 * @param {string|Date} expiresAt - Expiry timestamp
 * @returns {boolean}
 */
function isTokenExpired(expiresAt) {
  const expiry = new Date(expiresAt);
  return expiry < new Date();
}

/**
 * Generate curl command for result replay
 * @param {string} token - Encrypted token
 * @param {string} baseUrl - Public API base URL
 * @returns {string} Curl command
 */
function generateCurlCommand(token, baseUrl = 'https://www.optiexacta.com') {
  return `curl -X GET "${baseUrl}/api/result" \\
  -H "Authorization: Bearer ${token}"`;
}

/**
 * Parse Bearer token from Authorization header
 * @param {string} authHeader - Authorization header value
 * @returns {string|null} Token or null
 */
function parseAuthorizationHeader(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.slice(7);
}

/**
 * Validate token and get associated request
 * @param {string} token - Raw token from request
 * @param {object} prisma - Prisma client instance
 * @returns {Promise<object>} { valid, expired, payload, shareToken, faceSearchRequest }
 */
async function validateAndGetResult(token, prisma) {
  // Decrypt token
  const payload = decryptShareToken(token);
  if (!payload) {
    return { valid: false, error: 'Invalid token format' };
  }

  // Check expiry from token payload
  if (isTokenExpired(payload.expiresAt)) {
    return { valid: false, expired: true, error: 'Token expired' };
  }

  // Look up token in DB by hash
  const tokenHash = hashToken(token);
  const shareToken = await prisma.shareToken.findUnique({
    where: { tokenHash },
    include: {
      faceSearchRequest: true,
    },
  });

  if (!shareToken) {
    return { valid: false, error: 'Token not found' };
  }

  // Double-check DB expiry (in case token was manually invalidated)
  if (isTokenExpired(shareToken.expiresAt)) {
    return { valid: false, expired: true, error: 'Token expired' };
  }

  // Update access stats
  await prisma.shareToken.update({
    where: { id: shareToken.id },
    data: {
      lastAccessedAt: new Date(),
      accessCount: { increment: 1 },
    },
  });

  return {
    valid: true,
    payload,
    shareToken,
    faceSearchRequest: shareToken.faceSearchRequest,
  };
}

module.exports = {
  generateShareToken,
  decryptShareToken,
  hashToken,
  isTokenExpired,
  generateCurlCommand,
  parseAuthorizationHeader,
  validateAndGetResult,
  TOKEN_EXPIRY_HOURS,
};
