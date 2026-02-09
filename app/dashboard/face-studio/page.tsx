'use client'

import React from "react"

import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/auth-context'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'

export default function FaceStudioPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuth()
  const [image, setImage] = useState<string | null>(null)
  const [enhancedImage, setEnhancedImage] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [brightness, setBrightness] = useState(100)
  const [contrast, setContrast] = useState(100)
  const [saturation, setSaturation] = useState(100)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, isLoading, router])

  if (isLoading || !isAuthenticated) {
    return null
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        setImage(event.target?.result as string)
        setEnhancedImage(null)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleEnhance = async () => {
    if (!image) return
    
    setIsProcessing(true)
    setTimeout(() => {
      setEnhancedImage(image)
      setIsProcessing(false)
    }, 1500)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/30 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="hover:opacity-80 transition-opacity">
              <Image 
                src="/images/logo-white.png"
                alt="OptiExacta"
                width={40}
                height={40}
                className="w-10 h-10 object-contain"
              />
            </Link>
            <h1 className="text-2xl font-bold text-foreground">Face Studio</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Upload & Controls */}
          <div className="lg:col-span-1 space-y-6">
            <div>
              <h2 className="text-xl font-bold text-foreground mb-4">Upload Image</h2>
              <div className="rounded-lg border-2 border-dashed border-border hover:border-primary transition-colors p-8 text-center bg-card/30">
                {image ? (
                  <div>
                    <div className="text-2xl mb-2">✓</div>
                    <p className="text-sm text-foreground font-semibold mb-2">Image loaded</p>
                    <button
                      onClick={() => setImage(null)}
                      className="px-3 py-1 text-xs border border-border rounded hover:bg-card/50 transition-colors text-foreground"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <label className="cursor-pointer">
                    <div className="text-3xl mb-2">🎨</div>
                    <p className="text-foreground font-semibold mb-1">Upload Image</p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Controls */}
            {image && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-semibold text-foreground block mb-2">Brightness: {brightness}%</label>
                  <input
                    type="range"
                    min="0"
                    max="200"
                    value={brightness}
                    onChange={(e) => setBrightness(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-foreground block mb-2">Contrast: {contrast}%</label>
                  <input
                    type="range"
                    min="0"
                    max="200"
                    value={contrast}
                    onChange={(e) => setContrast(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-foreground block mb-2">Saturation: {saturation}%</label>
                  <input
                    type="range"
                    min="0"
                    max="200"
                    value={saturation}
                    onChange={(e) => setSaturation(Number(e.target.value))}
                    className="w-full"
                  />
                </div>

                <button
                  onClick={handleEnhance}
                  disabled={isProcessing}
                  className="w-full py-3 bg-gradient-to-r from-primary to-secondary text-primary-foreground font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {isProcessing ? 'Enhancing...' : 'Enhance Image'}
                </button>

                <button className="w-full py-3 border border-border text-foreground rounded-lg hover:bg-card/50 transition-colors text-sm font-semibold">
                  Download Enhanced
                </button>
              </div>
            )}
          </div>

          {/* Preview */}
          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Original */}
              <div>
                <h3 className="text-lg font-bold text-foreground mb-3">Original</h3>
                <div className="rounded-lg border border-border bg-card/30 p-4 aspect-square flex items-center justify-center">
                  {image ? (
                    <img src={image || "/placeholder.svg"} alt="Original" className="w-full h-full object-cover rounded" />
                  ) : (
                    <div className="text-center">
                      <div className="text-3xl">📷</div>
                      <p className="text-muted-foreground text-sm mt-2">Upload to see preview</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Enhanced */}
              <div>
                <h3 className="text-lg font-bold text-foreground mb-3">Enhanced</h3>
                <div className="rounded-lg border border-border bg-card/30 p-4 aspect-square flex items-center justify-center">
                  {enhancedImage ? (
                    <img src={enhancedImage || "/placeholder.svg"} alt="Enhanced" className="w-full h-full object-cover rounded" />
                  ) : (
                    <div className="text-center">
                      <div className="text-3xl">✨</div>
                      <p className="text-muted-foreground text-sm mt-2">Enhanced preview will appear here</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Metrics */}
            {enhancedImage && (
              <div className="rounded-lg border border-border bg-card/30 p-6">
                <h3 className="text-lg font-bold text-foreground mb-4">Quality Metrics</h3>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: 'Clarity', value: '98.5%' },
                    { label: 'Focus', value: '97.2%' },
                    { label: 'Lighting', value: '96.8%' }
                  ].map((metric) => (
                    <div key={metric.label} className="p-4 rounded-lg bg-card/50 border border-border/50">
                      <p className="text-sm text-muted-foreground mb-2">{metric.label}</p>
                      <p className="text-2xl font-bold text-transparent bg-gradient-to-r from-primary to-secondary bg-clip-text">
                        {metric.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="bg-card/30 rounded-lg border border-border p-8 mt-12">
          <h3 className="text-lg font-bold text-foreground mb-4">Face Studio Features</h3>
          <ul className="space-y-2 text-muted-foreground">
            <li className="flex items-center gap-2">
              <span className="text-secondary">✓</span>
              <span>Automatic image enhancement and preprocessing</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-secondary">✓</span>
              <span>Brightness, contrast, and saturation adjustment</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-secondary">✓</span>
              <span>Face detection and alignment optimization</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-secondary">✓</span>
              <span>Quality metrics and analysis</span>
            </li>
          </ul>
        </div>
      </main>
    </div>
  )
}
