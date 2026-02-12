/**
 * FRS (Face Recognition Service) Client Library
 * 
 * This module handles all communication with the upstream FRS API.
 * SECURITY: FRS_BASE_URL and FRS_API_TOKEN are NEVER exposed to clients.
 */

const axios = require('axios');
const FormData = require('form-data');

// Configuration from environment (never exposed)
const FRS_BASE_URL = process.env.FRS_BASE_URL || 'http://localhost:8001';
const FRS_API_TOKEN = process.env.FRS_API_TOKEN || '';

// Create axios instance with default config
const frsApi = axios.create({
  baseURL: FRS_BASE_URL,
  timeout: 30000,
  headers: {
    'Authorization': `Token ${FRS_API_TOKEN}`,
  },
});

/**
 * Detect faces in an image
 * @param {Buffer} imageBuffer - Image file buffer
 * @param {string} filename - Original filename
 * @param {string} mimeType - MIME type of the image
 * @returns {Promise<object>} Detection result with face IDs and bboxes
 */
async function detectFaces(imageBuffer, filename, mimeType) {
  const formData = new FormData();
  formData.append('photo', imageBuffer, {
    filename: filename,
    contentType: mimeType,
  });
  formData.append('attributes', JSON.stringify({ face: {} }));

  const response = await frsApi.post('/detect', formData, {
    headers: {
      ...formData.getHeaders(),
    },
  });

  return response.data;
}

/**
 * Verify if two face IDs belong to the same person
 * @param {string} faceId1 - First face ID (from detection)
 * @param {string} faceId2 - Second face ID (from detection)
 * @returns {Promise<object>} Verification result with confidence score
 */
async function verifyFaces(faceId1, faceId2) {
  // Ensure proper format for face IDs
  const formatId = (id) => {
    if (id.startsWith('detection:') || id.startsWith('faceevent:')) {
      return id;
    }
    return `detection:${id}`;
  };

  const response = await frsApi.get('/verify', {
    params: {
      object1: formatId(faceId1),
      object2: formatId(faceId2),
    },
  });

  return response.data;
}

/**
 * Perform 1:1 verification (detect + verify)
 * @param {Buffer} sourceBuffer - Source image buffer
 * @param {string} sourceFilename - Source filename
 * @param {string} sourceMimeType - Source MIME type
 * @param {Buffer} targetBuffer - Target image buffer
 * @param {string} targetFilename - Target filename
 * @param {string} targetMimeType - Target MIME type
 * @returns {Promise<object>} Full verification result
 */
async function oneToOneVerification(
  sourceBuffer, sourceFilename, sourceMimeType,
  targetBuffer, targetFilename, targetMimeType
) {
  // Detect faces in both images
  const [sourceDetection, targetDetection] = await Promise.all([
    detectFaces(sourceBuffer, sourceFilename, sourceMimeType),
    detectFaces(targetBuffer, targetFilename, targetMimeType),
  ]);

  const sourceFace = sourceDetection.objects?.face?.[0];
  const targetFace = targetDetection.objects?.face?.[0];

  if (!sourceFace?.id) {
    throw new Error('No face detected in source image');
  }
  if (!targetFace?.id) {
    throw new Error('No face detected in target image');
  }

  // Verify the faces
  const verifyResult = await verifyFaces(sourceFace.id, targetFace.id);

  return {
    source: {
      faceId: sourceFace.id,
      bbox: sourceFace.bbox,
      attributes: sourceFace.attributes,
    },
    target: {
      faceId: targetFace.id,
      bbox: targetFace.bbox,
      attributes: targetFace.attributes,
    },
    verification: verifyResult,
    confidence: verifyResult.confidence,
    match: verifyResult.confidence >= 0.72, // 72% threshold for confirmed match
  };
}

/**
 * Perform 1:N verification (one source against multiple targets)
 * @param {object} source - { buffer, filename, mimeType }
 * @param {Array<object>} targets - Array of { buffer, filename, mimeType }
 * @returns {Promise<object>} Results for each target
 */
async function oneToNVerification(source, targets) {
  // First detect face in source
  const sourceDetection = await detectFaces(
    source.buffer,
    source.filename,
    source.mimeType
  );
  const sourceFace = sourceDetection.objects?.face?.[0];

  if (!sourceFace?.id) {
    throw new Error('No face detected in source image');
  }

  // Detect faces in all targets
  const targetDetections = await Promise.all(
    targets.map(async (target, index) => {
      try {
        const detection = await detectFaces(
          target.buffer,
          target.filename,
          target.mimeType
        );
        const face = detection.objects?.face?.[0];
        return {
          index,
          filename: target.filename,
          face: face ? {
            faceId: face.id,
            bbox: face.bbox,
            attributes: face.attributes,
          } : null,
          error: face ? null : 'No face detected',
        };
      } catch (err) {
        return {
          index,
          filename: target.filename,
          face: null,
          error: err.message,
        };
      }
    })
  );

  // Verify source against each target that has a detected face
  const results = await Promise.all(
    targetDetections.map(async (targetResult) => {
      if (!targetResult.face) {
        return {
          ...targetResult,
          verification: null,
          confidence: null,
          match: false,
        };
      }

      try {
        const verifyResult = await verifyFaces(sourceFace.id, targetResult.face.faceId);
        return {
          ...targetResult,
          verification: verifyResult,
          confidence: verifyResult.confidence,
          match: verifyResult.confidence >= 0.72,
        };
      } catch (err) {
        return {
          ...targetResult,
          verification: null,
          confidence: null,
          match: false,
          error: err.message,
        };
      }
    })
  );

  return {
    source: {
      faceId: sourceFace.id,
      bbox: sourceFace.bbox,
      attributes: sourceFace.attributes,
    },
    results: results.sort((a, b) => (b.confidence || 0) - (a.confidence || 0)),
    totalTargets: targets.length,
    matchCount: results.filter(r => r.match).length,
  };
}

/**
 * Perform N:N search (all combinations between two sets)
 * @param {Array<object>} set1 - First set of { buffer, filename, mimeType }
 * @param {Array<object>} set2 - Second set of { buffer, filename, mimeType }
 * @returns {Promise<object>} Matrix of comparison results
 */
async function nToNSearch(set1, set2) {
  // Detect faces in all images from set1
  const set1Detections = await Promise.all(
    set1.map(async (img, index) => {
      try {
        const detection = await detectFaces(img.buffer, img.filename, img.mimeType);
        const face = detection.objects?.face?.[0];
        return {
          index,
          setNumber: 1,
          filename: img.filename,
          face: face ? {
            faceId: face.id,
            bbox: face.bbox,
            attributes: face.attributes,
          } : null,
          error: face ? null : 'No face detected',
        };
      } catch (err) {
        return {
          index,
          setNumber: 1,
          filename: img.filename,
          face: null,
          error: err.message,
        };
      }
    })
  );

  // Detect faces in all images from set2
  const set2Detections = await Promise.all(
    set2.map(async (img, index) => {
      try {
        const detection = await detectFaces(img.buffer, img.filename, img.mimeType);
        const face = detection.objects?.face?.[0];
        return {
          index,
          setNumber: 2,
          filename: img.filename,
          face: face ? {
            faceId: face.id,
            bbox: face.bbox,
            attributes: face.attributes,
          } : null,
          error: face ? null : 'No face detected',
        };
      } catch (err) {
        return {
          index,
          setNumber: 2,
          filename: img.filename,
          face: null,
          error: err.message,
        };
      }
    })
  );

  // Generate all pairwise comparisons
  const comparisons = [];
  for (const s1 of set1Detections) {
    for (const s2 of set2Detections) {
      if (s1.face && s2.face) {
        comparisons.push({
          source: s1,
          target: s2,
        });
      } else {
        comparisons.push({
          source: s1,
          target: s2,
          verification: null,
          confidence: null,
          match: false,
          error: s1.face ? s2.error : s1.error,
        });
      }
    }
  }

  // Perform verifications for valid pairs
  const results = await Promise.all(
    comparisons.map(async (comp) => {
      if (comp.verification !== undefined) {
        // Already marked as failed due to detection errors
        return comp;
      }

      try {
        const verifyResult = await verifyFaces(
          comp.source.face.faceId,
          comp.target.face.faceId
        );
        return {
          ...comp,
          verification: verifyResult,
          confidence: verifyResult.confidence,
          match: verifyResult.confidence >= 0.72,
        };
      } catch (err) {
        return {
          ...comp,
          verification: null,
          confidence: null,
          match: false,
          error: err.message,
        };
      }
    })
  );

  // Group results by match status
  const matches = results.filter(r => r.match);
  const nonMatches = results.filter(r => !r.match && !r.error);
  const errors = results.filter(r => r.error);

  return {
    set1: set1Detections,
    set2: set2Detections,
    comparisons: results.sort((a, b) => (b.confidence || 0) - (a.confidence || 0)),
    summary: {
      totalComparisons: results.length,
      matches: matches.length,
      nonMatches: nonMatches.length,
      errors: errors.length,
    },
  };
}

/**
 * Normalize bbox to standard format { left, top, right, bottom }
 * @param {any} bbox - Raw bbox from FRS API
 * @returns {object} Normalized bbox
 */
function normalizeBbox(bbox) {
  if (!bbox) return null;
  
  if (Array.isArray(bbox)) {
    const [l, t, r, b] = bbox;
    return { left: l, top: t, right: r, bottom: b };
  }
  if (bbox.left !== undefined) {
    return bbox;
  }
  if (bbox.x !== undefined && bbox.y !== undefined && bbox.w !== undefined && bbox.h !== undefined) {
    return {
      left: bbox.x,
      top: bbox.y,
      right: bbox.x + bbox.w,
      bottom: bbox.y + bbox.h,
    };
  }
  return bbox;
}

module.exports = {
  detectFaces,
  verifyFaces,
  oneToOneVerification,
  oneToNVerification,
  nToNSearch,
  normalizeBbox,
};
