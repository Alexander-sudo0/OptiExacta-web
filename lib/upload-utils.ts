/**
 * Upload Utilities
 * 
 * File validation, image processing, and upload helpers.
 */

// Maximum file size: 2MB
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

/**
 * Validation result for image files
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate an image file for upload
 */
export function validateImageFile(file: File): ValidationResult {
  // Check file type
  if (!file.type.startsWith('image/')) {
    return { valid: false, error: 'Only image files are allowed' };
  }

  // Check file size (2MB limit)
  if (file.size > MAX_IMAGE_BYTES) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
    return { 
      valid: false, 
      error: `File size (${sizeMB}MB) exceeds 2MB limit` 
    };
  }

  return { valid: true };
}

/**
 * Validate multiple image files
 */
export function validateImageFiles(files: File[]): ValidationResult {
  for (const file of files) {
    const result = validateImageFile(file);
    if (!result.valid) {
      return { ...result, error: `${file.name}: ${result.error}` };
    }
  }
  return { valid: true };
}

/**
 * Convert AVIF to JPEG (browser compatibility)
 */
export async function convertAvifToJpeg(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      canvas.toBlob((blob) => {
        if (blob) {
          const newFile = new File(
            [blob],
            file.name.replace(/\.avif$/i, '.jpg'),
            { type: 'image/jpeg' }
          );
          resolve(newFile);
        } else {
          reject(new Error('AVIF conversion failed'));
        }
      }, 'image/jpeg', 0.9);
    };
    img.onerror = (e) => reject(e);
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Prepare file for upload (convert if needed)
 */
export async function prepareFileForUpload(file: File): Promise<File> {
  // Validate first
  const validation = validateImageFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // Convert AVIF if needed
  if (file.type === 'image/avif' || file.name.toLowerCase().endsWith('.avif')) {
    try {
      return await convertAvifToJpeg(file);
    } catch (e) {
      console.warn('AVIF conversion failed, using original:', e);
    }
  }

  return file;
}

/**
 * Read file as data URL for preview
 */
export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Load image and get dimensions
 */
export function loadImageMeta(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.width, height: img.height });
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Fetch a URL as a File object (for sample images)
 */
export async function fetchAsFile(url: string, fileName?: string): Promise<File> {
  const res = await fetch(url);
  const blob = await res.blob();
  return new File([blob], fileName || url.split('/').pop() || 'image', { type: blob.type });
}

/**
 * Create thumbnail from image URL with bbox crop
 */
export async function createFaceThumbnail(
  imageUrl: string,
  bbox: { left: number; top: number; right: number; bottom: number },
  maxSize = 200
): Promise<string | null> {
  return new Promise((resolve) => {
    if (!bbox) return resolve(null);
    
    const img = new Image();
    img.onload = () => {
      try {
        const faceW = bbox.right - bbox.left;
        const faceH = bbox.bottom - bbox.top;
        const scale = Math.min(maxSize / faceW, maxSize / faceH);
        
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(faceW * scale);
        canvas.height = Math.round(faceH * scale);
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(null);
        
        ctx.drawImage(
          img,
          bbox.left, bbox.top, faceW, faceH,
          0, 0, canvas.width, canvas.height
        );
        
        resolve(canvas.toDataURL('image/jpeg', 0.9));
      } catch (e) {
        console.error('Thumbnail creation error:', e);
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = imageUrl;
  });
}

/**
 * Normalize bbox to standard format
 */
export function normalizeBbox(bbox: any): { left: number; top: number; right: number; bottom: number } | null {
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

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Get confidence level information
 */
export function getConfidenceLevel(confidence: number): {
  label: string;
  message: string;
  color: 'green' | 'orange' | 'yellow' | 'red';
  isMatch: boolean;
} {
  const pct = confidence * 100;
  
  if (pct >= 72) {
    return {
      label: 'Confirmed Match',
      message: 'The photos belong to the same person.',
      color: 'green',
      isMatch: true,
    };
  }
  
  if (pct >= 68) {
    return {
      label: 'Inconclusive',
      message: 'Additional verification recommended.',
      color: 'orange',
      isMatch: false,
    };
  }
  
  if (pct >= 65) {
    return {
      label: 'Weak Match',
      message: 'Unlikely to be the same person.',
      color: 'yellow',
      isMatch: false,
    };
  }
  
  return {
    label: 'No Match',
    message: 'The photos do not belong to the same person.',
    color: 'red',
    isMatch: false,
  };
}
