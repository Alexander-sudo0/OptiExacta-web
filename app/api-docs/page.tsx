'use client'

import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { motion } from 'framer-motion'
import { useState } from 'react'
import Link from 'next/link'

const endpoints = [
  {
    method: 'POST',
    path: '/api/v1/faces/compare',
    title: '1:1 Face Verification',
    description: 'Compare two face images to determine if they belong to the same person. Returns a similarity score and match decision.',
    rateLimit: '60 requests/minute',
    maxFileSize: '2 MB per image',
    acceptedFormats: 'JPEG, PNG, WebP, GIF',
    params: [
      { name: 'image1', type: 'file', required: true, desc: 'First face image' },
      { name: 'image2', type: 'file', required: true, desc: 'Second face image' },
    ],
    curl: `curl -X POST https://visionera.live/api/v1/faces/compare \\
  -H "X-API-Key: your_api_key_here" \\
  -F "image1=@photo1.jpg" \\
  -F "image2=@photo2.jpg"`,
    response: `{
  "match": true,
  "similarity": 0.94,
  "confidence": "high",
  "faces_detected": {
    "image1": 1,
    "image2": 1
  }
}`,
  },
  {
    method: 'POST',
    path: '/api/v1/faces/search',
    title: '1:N Face Search',
    description: 'Search a probe face against all enrolled gallery faces. Returns top matches ranked by similarity.',
    rateLimit: '30 requests/minute',
    maxFileSize: '2 MB',
    acceptedFormats: 'JPEG, PNG, WebP, GIF',
    params: [
      { name: 'image', type: 'file', required: true, desc: 'Probe face image to search' },
      { name: 'limit', type: 'number', required: false, desc: 'Max results to return (default: 10)' },
    ],
    curl: `curl -X POST https://visionera.live/api/v1/faces/search \\
  -H "X-API-Key: your_api_key_here" \\
  -F "image=@probe.jpg" \\
  -F "limit=5"`,
    response: `{
  "results": [
    {
      "subject_id": "john_doe_001",
      "similarity": 0.96,
      "confidence": "high"
    },
    {
      "subject_id": "jane_doe_002",
      "similarity": 0.72,
      "confidence": "medium"
    }
  ],
  "total_searched": 1547
}`,
  },
  {
    method: 'POST',
    path: '/api/v1/faces/batch',
    title: 'N:N Batch Matching',
    description: 'Cross-match multiple probe images against multiple gallery images in a single request. Ideal for batch deduplication and investigations.',
    rateLimit: '10 requests/minute',
    maxFileSize: '2 MB per image',
    acceptedFormats: 'JPEG, PNG, WebP, GIF',
    params: [
      { name: 'probes', type: 'file[]', required: true, desc: 'Array of probe face images' },
      { name: 'gallery', type: 'file[]', required: true, desc: 'Array of gallery face images' },
    ],
    curl: `curl -X POST https://visionera.live/api/v1/faces/batch \\
  -H "X-API-Key: your_api_key_here" \\
  -F "probes=@suspect1.jpg" \\
  -F "probes=@suspect2.jpg" \\
  -F "gallery=@person_a.jpg" \\
  -F "gallery=@person_b.jpg"`,
    response: `{
  "matches": [
    {
      "probe": "suspect1.jpg",
      "gallery_match": "person_a.jpg",
      "similarity": 0.91
    }
  ],
  "total_comparisons": 4
}`,
  },
  {
    method: 'POST',
    path: '/api/v1/videos/analyze',
    title: 'Video Processing',
    description: 'Upload a video file, extract all unique faces frame-by-frame, then optionally search extracted faces against the enrolled gallery.',
    rateLimit: '10 requests/minute',
    maxFileSize: '500 MB',
    acceptedFormats: 'MP4, WebM, MOV, AVI',
    params: [
      { name: 'video', type: 'file', required: true, desc: 'Video file to process' },
      { name: 'search', type: 'boolean', required: false, desc: 'Search extracted faces against gallery (default: false)' },
    ],
    curl: `curl -X POST https://visionera.live/api/v1/videos/analyze \\
  -H "X-API-Key: your_api_key_here" \\
  -F "video=@footage.mp4" \\
  -F "search=true"`,
    response: `{
  "job_id": "vid_abc123def456",
  "status": "processing",
  "message": "Video queued for analysis"
}`,
  },
  {
    method: 'GET',
    path: '/api/v1/videos/:jobId',
    title: 'Video Job Status',
    description: 'Check the status and results of a video processing job. Poll this endpoint until status is "completed".',
    rateLimit: '120 requests/minute',
    maxFileSize: 'N/A',
    acceptedFormats: 'N/A',
    params: [
      { name: 'jobId', type: 'path', required: true, desc: 'The job ID returned from video/analyze' },
    ],
    curl: `curl -X GET https://visionera.live/api/v1/videos/vid_abc123def456 \\
  -H "X-API-Key: your_api_key_here"`,
    response: `{
  "job_id": "vid_abc123def456",
  "status": "completed",
  "faces_extracted": 12,
  "unique_faces": 4,
  "duration_seconds": 45,
  "results": [
    {
      "face_id": "face_001",
      "timestamp": "00:03.2",
      "gallery_match": "john_doe_001",
      "similarity": 0.93
    }
  ]
}`,
  },
]

const rateLimits = [
  { endpoint: '1:1 Face Compare', limit: '60 req/min', burst: '10 req/sec' },
  { endpoint: '1:N Face Search', limit: '30 req/min', burst: '5 req/sec' },
  { endpoint: 'N:N Batch Match', limit: '10 req/min', burst: '2 req/sec' },
  { endpoint: 'Video Analyze', limit: '10 req/min', burst: '2 req/sec' },
  { endpoint: 'Video Status', limit: '120 req/min', burst: '20 req/sec' },
]

export default function ApiDocsPage() {
  const [activeEndpoint, setActiveEndpoint] = useState(0)
  const [copiedCurl, setCopiedCurl] = useState(false)
  const [copiedResponse, setCopiedResponse] = useState(false)

  const copyToClipboard = (text: string, type: 'curl' | 'response') => {
    navigator.clipboard.writeText(text)
    if (type === 'curl') {
      setCopiedCurl(true)
      setTimeout(() => setCopiedCurl(false), 2000)
    } else {
      setCopiedResponse(true)
      setTimeout(() => setCopiedResponse(false), 2000)
    }
  }

  const ep = endpoints[activeEndpoint]

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero - Peach theme */}
      <div className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-orange-500/8 via-amber-500/5 to-background" />
        <div className="absolute top-20 right-10 w-[400px] h-[400px] bg-gradient-to-br from-orange-400/15 to-amber-300/10 rounded-full blur-3xl" />
        <div className="absolute bottom-10 left-10 w-[300px] h-[300px] bg-gradient-to-tr from-rose-400/10 to-orange-300/10 rounded-full blur-3xl" />
        
        <div className="relative max-w-7xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-block px-5 py-2 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-400 text-sm font-medium mb-6">
              API Documentation
            </span>
            <h1 className="text-5xl md:text-7xl font-bold text-foreground mb-6">
              VisionEra <span className="bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">REST API</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
              Integrate face recognition, vehicle detection, and body analysis into your applications. 
              Generate API keys from your dashboard and start making requests in minutes.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/dashboard/api-keys"
                className="px-8 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold rounded-full hover:shadow-lg hover:shadow-orange-500/25 transition-all inline-flex items-center gap-2"
              >
                Get API Key
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </Link>
              <span className="text-sm text-muted-foreground">Base URL: <code className="text-orange-400 bg-orange-500/10 px-2 py-1 rounded">https://visionera.live/api/v1</code></span>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Authentication */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="p-8 rounded-2xl border border-orange-500/20 bg-gradient-to-br from-orange-500/5 to-amber-500/5"
        >
          <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center text-orange-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </span>
            Authentication
          </h2>
          <p className="text-muted-foreground mb-4">
            All API requests require an API key passed via the <code className="text-orange-400 bg-orange-500/10 px-1.5 py-0.5 rounded text-sm">X-API-Key</code> header.
            Generate API keys from your <Link href="/dashboard/api-keys" className="text-orange-400 hover:underline">Dashboard → API Keys</Link> page.
          </p>
          <div className="bg-background/80 rounded-xl p-4 font-mono text-sm">
            <span className="text-muted-foreground">curl -H </span>
            <span className="text-orange-400">&quot;X-API-Key: ve_live_abc123...&quot;</span>
            <span className="text-muted-foreground"> https://visionera.live/api/v1/...</span>
          </div>
        </motion.div>
      </section>

      {/* Endpoints */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl font-bold text-foreground mb-8">API Endpoints</h2>
          
          {/* Endpoint tabs */}
          <div className="flex flex-wrap gap-2 mb-8">
            {endpoints.map((endpoint, i) => (
              <button
                key={i}
                onClick={() => { setActiveEndpoint(i); setCopiedCurl(false); setCopiedResponse(false); }}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  activeEndpoint === i
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/20'
                    : 'bg-card/50 border border-border text-muted-foreground hover:text-foreground hover:border-orange-500/30'
                }`}
              >
                <span className={`inline-block mr-2 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  endpoint.method === 'GET' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'
                }`}>
                  {endpoint.method}
                </span>
                {endpoint.title}
              </button>
            ))}
          </div>

          {/* Active endpoint detail */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left - Info */}
            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <span className={`px-2 py-1 rounded text-xs font-bold ${
                    ep.method === 'GET' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'
                  }`}>
                    {ep.method}
                  </span>
                  <code className="text-foreground font-mono text-sm">{ep.path}</code>
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-2">{ep.title}</h3>
                <p className="text-muted-foreground">{ep.description}</p>
              </div>

              {/* Limits */}
              <div className="flex flex-wrap gap-3">
                <div className="px-3 py-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
                  <span className="text-xs text-muted-foreground block">Rate Limit</span>
                  <span className="text-sm font-semibold text-orange-400">{ep.rateLimit}</span>
                </div>
                <div className="px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <span className="text-xs text-muted-foreground block">Max File Size</span>
                  <span className="text-sm font-semibold text-amber-400">{ep.maxFileSize}</span>
                </div>
                <div className="px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/20">
                  <span className="text-xs text-muted-foreground block">Formats</span>
                  <span className="text-sm font-semibold text-rose-400">{ep.acceptedFormats}</span>
                </div>
              </div>

              {/* Parameters */}
              <div>
                <h4 className="font-semibold text-foreground mb-3">Parameters</h4>
                <div className="space-y-2">
                  {ep.params.map((param) => (
                    <div key={param.name} className="flex items-start gap-3 p-3 rounded-lg bg-card/50 border border-border">
                      <code className="text-orange-400 text-sm font-mono shrink-0">{param.name}</code>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-muted-foreground bg-card px-1.5 py-0.5 rounded">{param.type}</span>
                          {param.required && (
                            <span className="text-xs text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">required</span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{param.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right - Code examples */}
            <div className="space-y-6">
              {/* cURL */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-foreground">cURL Example</h4>
                  <button
                    onClick={() => copyToClipboard(ep.curl, 'curl')}
                    className="text-xs text-muted-foreground hover:text-orange-400 transition-colors flex items-center gap-1"
                  >
                    {copiedCurl ? '✓ Copied!' : 'Copy'}
                  </button>
                </div>
                <pre className="bg-[#1a1a2e] rounded-xl p-5 overflow-x-auto text-sm">
                  <code className="text-orange-200 whitespace-pre">{ep.curl}</code>
                </pre>
              </div>

              {/* Response */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-foreground">Response</h4>
                  <button
                    onClick={() => copyToClipboard(ep.response, 'response')}
                    className="text-xs text-muted-foreground hover:text-orange-400 transition-colors flex items-center gap-1"
                  >
                    {copiedResponse ? '✓ Copied!' : 'Copy'}
                  </button>
                </div>
                <pre className="bg-[#1a1a2e] rounded-xl p-5 overflow-x-auto text-sm">
                  <code className="text-green-300 whitespace-pre">{ep.response}</code>
                </pre>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Rate Limiting */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl font-bold text-foreground mb-8">Rate Limits</h2>
          <p className="text-muted-foreground mb-6">
            Rate limits are enforced per API key. When you exceed the limit, you&apos;ll receive a <code className="text-orange-400 bg-orange-500/10 px-1.5 py-0.5 rounded text-sm">429 Too Many Requests</code> response.
            Rate limit headers are included in every response.
          </p>
          
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full">
              <thead>
                <tr className="bg-orange-500/5 border-b border-border">
                  <th className="text-left px-6 py-4 text-sm font-semibold text-foreground">Endpoint</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-foreground">Rate Limit</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-foreground">Burst Limit</th>
                </tr>
              </thead>
              <tbody>
                {rateLimits.map((rl, i) => (
                  <tr key={i} className="border-b border-border/50 hover:bg-card/30 transition-colors">
                    <td className="px-6 py-4 text-sm text-foreground font-medium">{rl.endpoint}</td>
                    <td className="px-6 py-4 text-sm text-orange-400 font-mono">{rl.limit}</td>
                    <td className="px-6 py-4 text-sm text-amber-400 font-mono">{rl.burst}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 p-5 rounded-xl bg-card/50 border border-border">
            <h4 className="font-semibold text-foreground mb-2">Rate Limit Headers</h4>
            <div className="font-mono text-sm space-y-1 text-muted-foreground">
              <p><span className="text-orange-400">X-RateLimit-Limit:</span> 60</p>
              <p><span className="text-orange-400">X-RateLimit-Remaining:</span> 45</p>
              <p><span className="text-orange-400">X-RateLimit-Reset:</span> 1625097600</p>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Upload Constraints */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl font-bold text-foreground mb-8">Upload Constraints</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl border border-border bg-card/30">
              <h3 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                <span className="text-2xl">🖼️</span> Images
              </h3>
              <ul className="space-y-3 text-muted-foreground text-sm">
                <li className="flex items-center gap-2"><span className="text-orange-400">•</span> Formats: JPEG, PNG, WebP, GIF</li>
                <li className="flex items-center gap-2"><span className="text-orange-400">•</span> Max size: 2 MB per image (Free), 10 MB (Pro), 20 MB (Enterprise)</li>
                <li className="flex items-center gap-2"><span className="text-orange-400">•</span> Min resolution: 64x64 pixels</li>
                <li className="flex items-center gap-2"><span className="text-orange-400">•</span> Face must be clearly visible</li>
              </ul>
            </div>
            <div className="p-6 rounded-2xl border border-border bg-card/30">
              <h3 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                <span className="text-2xl">🎬</span> Videos
              </h3>
              <ul className="space-y-3 text-muted-foreground text-sm">
                <li className="flex items-center gap-2"><span className="text-orange-400">•</span> Formats: MP4, WebM, MOV, AVI</li>
                <li className="flex items-center gap-2"><span className="text-orange-400">•</span> Max size: 500 MB</li>
                <li className="flex items-center gap-2"><span className="text-orange-400">•</span> Max duration: 10 minutes recommended</li>
                <li className="flex items-center gap-2"><span className="text-orange-400">•</span> Processing is asynchronous (poll job status)</li>
              </ul>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Error Codes */}
      <section className="max-w-7xl mx-auto px-6 py-16 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl font-bold text-foreground mb-8">Error Codes</h2>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full">
              <thead>
                <tr className="bg-orange-500/5 border-b border-border">
                  <th className="text-left px-6 py-4 text-sm font-semibold text-foreground">Code</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-foreground">Meaning</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-foreground">Resolution</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { code: '400', meaning: 'Bad Request', resolution: 'Check request parameters and file formats' },
                  { code: '401', meaning: 'Unauthorized', resolution: 'Verify your API key is valid and active' },
                  { code: '403', meaning: 'Forbidden', resolution: 'Your plan may not support this endpoint' },
                  { code: '413', meaning: 'Payload Too Large', resolution: 'Reduce file size within plan limits' },
                  { code: '429', meaning: 'Too Many Requests', resolution: 'Wait and retry, or upgrade your plan' },
                  { code: '500', meaning: 'Internal Error', resolution: 'Contact support at info@visionera.live' },
                ].map((err, i) => (
                  <tr key={i} className="border-b border-border/50 hover:bg-card/30 transition-colors">
                    <td className="px-6 py-4"><span className="text-sm font-mono font-bold text-orange-400">{err.code}</span></td>
                    <td className="px-6 py-4 text-sm text-foreground">{err.meaning}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{err.resolution}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-gradient-to-r from-orange-500/5 via-amber-500/5 to-rose-500/5 border-y border-orange-500/10">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-foreground mb-4">Ready to Integrate?</h2>
          <p className="text-muted-foreground mb-8">
            Generate your API key and start building with VisionEra in minutes.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/dashboard/api-keys"
              className="px-8 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold rounded-full hover:shadow-lg hover:shadow-orange-500/25 transition-all"
            >
              Generate API Key
            </Link>
            <Link
              href="/contact"
              className="px-8 py-3 border-2 border-orange-500/50 text-orange-400 font-semibold rounded-full hover:bg-orange-500/10 transition-all"
            >
              Contact Sales
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
