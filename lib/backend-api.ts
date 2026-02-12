/**
 * Backend API Client
 * 
 * Handles all communication with our backend (which then proxies to FRS).
 * SECURITY: This client only talks to our backend, never directly to FRS.
 */

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

interface RequestOptions {
  method?: string;
  body?: FormData | string;
  headers?: Record<string, string>;
}

/**
 * Get the current user's Firebase ID token
 */
async function getIdToken(): Promise<string | null> {
  // In development mode, allow bypassing auth if SKIP_AUTH_IN_DEV is set
  if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_SKIP_AUTH_IN_DEV === 'true') {
    return null; // No token needed in dev bypass mode
  }
  
  try {
    // Dynamic import to avoid SSR issues
    const { auth } = await import('@/lib/firebase');
    const user = auth.currentUser;
    if (!user) return null;
    return user.getIdToken();
  } catch (error) {
    console.warn('Failed to get ID token:', error);
    return null;
  }
}

/**
 * Make an authenticated request to the backend
 */
export async function backendRequest<T = any>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const token = await getIdToken();
  
  const headers: Record<string, string> = {
    ...options.headers,
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  // Don't set Content-Type for FormData (browser will set with boundary)
  if (options.body && typeof options.body === 'string') {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${BACKEND_URL}${endpoint}`, {
    method: options.method || 'GET',
    headers,
    body: options.body,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

// ============================================================================
// FRS Proxy Endpoints
// ============================================================================

/**
 * Detect faces in an image via our backend proxy
 */
export async function detectFace(file: File): Promise<{
  objects?: { 
    face?: Array<{
      id: string;
      bbox: { left: number; top: number; right: number; bottom: number };
      attributes?: any;
    }>;
  };
}> {
  const formData = new FormData();
  formData.append('photo', file);
  
  return backendRequest('/api/frs/detect', {
    method: 'POST',
    body: formData,
  });
}

/**
 * Verify two faces via our backend proxy
 */
export async function verifyFaces(
  faceId1: string,
  faceId2: string
): Promise<{ confidence: number }> {
  const formatId = (id: string) => 
    id.startsWith('detection:') || id.startsWith('faceevent:') 
      ? id 
      : `detection:${id}`;

  return backendRequest(`/api/frs/verify?object1=${encodeURIComponent(formatId(faceId1))}&object2=${encodeURIComponent(formatId(faceId2))}`);
}

// ============================================================================
// Face Search Endpoints
// ============================================================================

export interface OneToOneResult {
  id: string;
  source: {
    faceId: string;
    bbox: { left: number; top: number; right: number; bottom: number };
  };
  target: {
    faceId: string;
    bbox: { left: number; top: number; right: number; bottom: number };
  };
  verification: any;
  confidence: number;
  match: boolean;
  createdAt: string;
  expiresAt: string;
}

/**
 * Perform 1:1 face verification
 */
export async function faceSearch1to1(
  sourceFile: File,
  targetFile: File
): Promise<OneToOneResult> {
  const formData = new FormData();
  formData.append('source', sourceFile);
  formData.append('target', targetFile);
  
  return backendRequest('/api/face-search/one-to-one', {
    method: 'POST',
    body: formData,
  });
}

export interface OneToNMatch {
  targetIndex: number;
  targetFilename: string;
  faceId: string;
  bbox: { left: number; top: number; right: number; bottom: number };
  confidence: number;
  match: boolean;
}

export interface OneToNResult {
  id: string;
  source: {
    faceId: string;
    bbox: { left: number; top: number; right: number; bottom: number };
  };
  matches: OneToNMatch[];
  results?: Array<{
    index: number;
    filename: string;
    face: {
      faceId: string;
      bbox: { left: number; top: number; right: number; bottom: number };
    } | null;
    confidence: number | null;
    match: boolean;
    error: string | null;
  }>;
  totalTargets: number;
  matchCount: number;
  createdAt: string;
  expiresAt: string;
}

/**
 * Perform 1:N face verification
 */
export async function faceSearch1toN(
  sourceFile: File,
  targetFiles: File[]
): Promise<OneToNResult> {
  const formData = new FormData();
  formData.append('source', sourceFile);
  targetFiles.forEach(file => {
    formData.append('targets', file);
  });
  
  return backendRequest('/api/face-search/one-to-n', {
    method: 'POST',
    body: formData,
  });
}

export interface NToNMatch {
  setAIndex: number;
  setBIndex: number;
  setAFilename: string;
  setBFilename: string;
  faceAIndex?: number;
  faceBIndex?: number;
  faceAId?: string;
  faceBId?: string;
  faceABbox?: { left: number; top: number; right: number; bottom: number };
  faceBBbox?: { left: number; top: number; right: number; bottom: number };
  confidence: number;
  match?: boolean;
}

export interface NToNResult {
  id: string;
  setACount?: number;
  setBCount?: number;
  matchingPairs: NToNMatch[];
  set1?: Array<{
    index: number;
    filename: string;
    face: {
      faceId: string;
      bbox: { left: number; top: number; right: number; bottom: number };
    } | null;
    error: string | null;
  }>;
  set2?: Array<{
    index: number;
    filename: string;
    face: {
      faceId: string;
      bbox: { left: number; top: number; right: number; bottom: number };
    } | null;
    error: string | null;
  }>;
  comparisons?: Array<{
    source: { index: number; filename: string };
    target: { index: number; filename: string };
    confidence: number | null;
    match: boolean;
    error: string | null;
  }>;
  summary?: {
    totalComparisons: number;
    matches: number;
    nonMatches: number;
    errors: number;
  };
  createdAt: string;
  expiresAt: string;
}

/**
 * Perform N:N face search
 */
export async function faceSearchNtoN(
  set1Files: File[],
  set2Files: File[]
): Promise<NToNResult> {
  const formData = new FormData();
  set1Files.forEach(file => {
    formData.append('set1', file);
  });
  set2Files.forEach(file => {
    formData.append('set2', file);
  });
  
  return backendRequest('/api/face-search/n-to-n', {
    method: 'POST',
    body: formData,
  });
}

// ============================================================================
// Request History CRUD
// ============================================================================

export interface FaceSearchRequestSummary {
  id: string;
  type: 'ONE_TO_ONE' | 'ONE_TO_N' | 'N_TO_N';
  status: string;
  createdAt: string;
  expiresAt: string;
  requestData: any;
}

export interface StoreFaceSearchResultResponse {
  id: string;
  createdAt: string;
  expiresAt: string;
}

export interface RequestListResponse {
  requests: FaceSearchRequestSummary[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

/**
 * List face search requests
 */
export async function listFaceSearchRequests(
  options: { type?: string; limit?: number; offset?: number } = {}
): Promise<RequestListResponse> {
  const params = new URLSearchParams();
  if (options.type) params.set('type', options.type);
  if (options.limit) params.set('limit', String(options.limit));
  if (options.offset) params.set('offset', String(options.offset));
  
  const query = params.toString();
  return backendRequest(`/api/face-search/requests${query ? `?${query}` : ''}`);
}

/**
 * Get a single face search request with full result
 */
export async function getFaceSearchRequest(id: string): Promise<any> {
  return backendRequest(`/api/face-search/requests/${id}`);
}

/**
 * Delete a face search request
 */
export async function deleteFaceSearchRequest(id: string): Promise<{ success: boolean }> {
  return backendRequest(`/api/face-search/requests/${id}`, {
    method: 'DELETE',
  });
}

/**
 * Store client-computed face search result (dev/testing)
 */
export async function storeFaceSearchResult(params: {
  type: 'ONE_TO_ONE' | 'ONE_TO_N' | 'N_TO_N';
  requestData: any;
  resultData: any;
}): Promise<StoreFaceSearchResultResponse> {
  return backendRequest('/api/face-search/store-result', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

// ============================================================================
// Share Tokens
// ============================================================================

export interface ShareTokenResponse {
  id: string;
  token: string;
  curl: string;
  expiresAt: string;
  expiresInHours: number;
}

/**
 * Generate encrypted share token for a request
 */
export async function generateShareToken(requestId: string): Promise<ShareTokenResponse> {
  return backendRequest('/api/share', {
    method: 'POST',
    body: JSON.stringify({ requestId }),
  });
}

export interface ShareTokenInfo {
  id: string;
  apiType: string;
  createdAt: string;
  expiresAt: string;
  lastAccessedAt: string | null;
  accessCount: number;
  faceSearchRequestId: string;
}

/**
 * List share tokens
 */
export async function listShareTokens(): Promise<{ tokens: ShareTokenInfo[] }> {
  return backendRequest('/api/share/tokens');
}

/**
 * Revoke a share token
 */
export async function revokeShareToken(id: string): Promise<{ success: boolean }> {
  return backendRequest(`/api/share/tokens/${id}`, {
    method: 'DELETE',
  });
}

// ============================================================================
// User Info
// ============================================================================

export interface UserInfo {
  user: {
    id: number;
    email: string;
    provider: string;
  };
  tenant: {
    id: number;
    name: string;
    subscriptionStatus: string;
    trialEndsAt: string;
  };
  role: string;
  plan: {
    code: string;
    name: string;
    dailyRequestLimit: number;
    allowFaceSearchOneToOne: boolean;
    allowFaceSearchOneToN: boolean;
    allowFaceSearchNToN: boolean;
  };
}

/**
 * Get current user info
 */
export async function getCurrentUser(): Promise<UserInfo> {
  return backendRequest('/api/me');
}
