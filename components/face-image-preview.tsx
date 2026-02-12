'use client';

import { useState, useEffect } from 'react';

interface BBox {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

interface FaceImagePreviewProps {
  src: string;
  bbox?: BBox | null;
  alt?: string;
  className?: string;
  showBboxOverlay?: boolean;
  bboxColor?: string;
  bboxStrokeWidth?: number;
  onLoad?: (dimensions: { width: number; height: number }) => void;
}

/**
 * Image preview component with optional face bounding box overlay
 */
export default function FaceImagePreview({
  src,
  bbox,
  alt = 'Face image',
  className = '',
  showBboxOverlay = true,
  bboxColor = '#22c55e',
  bboxStrokeWidth = 2,
  onLoad,
}: FaceImagePreviewProps) {
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);
    setDimensions(null);
  }, [src]);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const dims = { width: img.naturalWidth, height: img.naturalHeight };
    setDimensions(dims);
    setLoaded(true);
    onLoad?.(dims);
  };

  return (
    <div className={`relative inline-block ${className}`}>
      <img
        src={src}
        alt={alt}
        className="max-w-full h-auto block"
        onLoad={handleImageLoad}
      />
      
      {/* SVG overlay for bounding box */}
      {loaded && dimensions && bbox && showBboxOverlay && (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Bounding box rectangle */}
          <rect
            x={bbox.left}
            y={bbox.top}
            width={bbox.right - bbox.left}
            height={bbox.bottom - bbox.top}
            fill="none"
            stroke={bboxColor}
            strokeWidth={bboxStrokeWidth}
            strokeDasharray="none"
          />
          
          {/* Corner markers for better visibility */}
          <CornerMarkers
            bbox={bbox}
            color={bboxColor}
            size={Math.min(20, (bbox.right - bbox.left) * 0.15)}
            strokeWidth={bboxStrokeWidth + 1}
          />
        </svg>
      )}
    </div>
  );
}

/**
 * Corner markers for bbox (L-shaped corners)
 */
function CornerMarkers({
  bbox,
  color,
  size,
  strokeWidth,
}: {
  bbox: BBox;
  color: string;
  size: number;
  strokeWidth: number;
}) {
  const corners = [
    // Top-left
    { x: bbox.left, y: bbox.top, dx: size, dy: size },
    // Top-right
    { x: bbox.right, y: bbox.top, dx: -size, dy: size },
    // Bottom-left
    { x: bbox.left, y: bbox.bottom, dx: size, dy: -size },
    // Bottom-right
    { x: bbox.right, y: bbox.bottom, dx: -size, dy: -size },
  ];

  return (
    <>
      {corners.map((c, i) => (
        <g key={i}>
          <line
            x1={c.x}
            y1={c.y}
            x2={c.x + c.dx}
            y2={c.y}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          <line
            x1={c.x}
            y1={c.y}
            x2={c.x}
            y2={c.y + c.dy}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        </g>
      ))}
    </>
  );
}

/**
 * Compact thumbnail preview with face crop
 */
export function FaceThumbnail({
  src,
  bbox,
  size = 64,
  className = '',
}: {
  src: string;
  bbox?: BBox | null;
  size?: number;
  className?: string;
}) {
  const [thumbnail, setThumbnail] = useState<string | null>(null);

  useEffect(() => {
    if (!bbox) {
      setThumbnail(null);
      return;
    }

    const img = new Image();
    img.onload = () => {
      try {
        const faceW = bbox.right - bbox.left;
        const faceH = bbox.bottom - bbox.top;
        const scale = Math.min(size / faceW, size / faceH);
        
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(faceW * scale);
        canvas.height = Math.round(faceH * scale);
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        ctx.drawImage(
          img,
          bbox.left, bbox.top, faceW, faceH,
          0, 0, canvas.width, canvas.height
        );
        
        setThumbnail(canvas.toDataURL('image/jpeg', 0.9));
      } catch (e) {
        console.error('Thumbnail creation error:', e);
      }
    };
    img.src = src;
  }, [src, bbox, size]);

  if (thumbnail) {
    return (
      <img
        src={thumbnail}
        alt="Face"
        className={`object-cover rounded ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <img
      src={src}
      alt="Face"
      className={`object-cover rounded ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

/**
 * Loading skeleton for image preview
 */
export function ImagePreviewSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-slate-200 dark:bg-slate-700 rounded ${className}`} />
  );
}
