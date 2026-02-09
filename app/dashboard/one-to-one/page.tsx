'use client'

import React from "react"

import { useState } from 'react'

export default function OneToOneSearch() {
  const [image1, setImage1] = useState<string | null>(null)
  const [image2, setImage2] = useState<string | null>(null)
  const [result, setResult] = useState<{ match: boolean; confidence: number } | null>(null)

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, setImage: (img: string | null) => void) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setImage(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (image1 && image2) {
      // Placeholder result
      setResult({
        match: true,
        confidence: 98.5,
      })
    }
  }

  return (
    <div className="max-w-4xl">
      <h1 className="text-4xl font-bold mb-2">1:1 Face Search</h1>
      <p className="text-gray-400 mb-8">Compare two facial images for verification</p>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Image 1 */}
          <div>
            <label className="block text-sm font-semibold mb-4">Image 1</label>
            <div className="border-2 border-dashed border-blue-900/30 rounded-lg p-8 text-center hover:border-blue-400 transition cursor-pointer relative">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleImageUpload(e, setImage1)}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              {image1 ? (
                <img src={image1 || "/placeholder.svg"} alt="Image 1" className="w-full h-64 object-contain" />
              ) : (
                <div>
                  <p className="text-gray-400 text-sm">Drop image or click to upload</p>
                  <p className="text-gray-500 text-xs mt-2">Max 10MB</p>
                </div>
              )}
            </div>
          </div>

          {/* Image 2 */}
          <div>
            <label className="block text-sm font-semibold mb-4">Image 2</label>
            <div className="border-2 border-dashed border-blue-900/30 rounded-lg p-8 text-center hover:border-blue-400 transition cursor-pointer relative">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleImageUpload(e, setImage2)}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              {image2 ? (
                <img src={image2 || "/placeholder.svg"} alt="Image 2" className="w-full h-64 object-contain" />
              ) : (
                <div>
                  <p className="text-gray-400 text-sm">Drop image or click to upload</p>
                  <p className="text-gray-500 text-xs mt-2">Max 10MB</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={!image1 || !image2}
          className="w-full py-3 bg-blue-600 text-white rounded font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Compare Faces
        </button>
      </form>

      {/* Results */}
      {result && (
        <div className="mt-12 p-8 bg-glass rounded border border-blue-900/30">
          <h2 className="text-2xl font-bold mb-6">Results</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-blue-900/20 rounded">
              <span className="text-gray-300">Match</span>
              <span className={`font-bold ${result.match ? 'text-green-400' : 'text-red-400'}`}>
                {result.match ? 'YES' : 'NO'}
              </span>
            </div>
            <div className="flex items-center justify-between p-4 bg-blue-900/20 rounded">
              <span className="text-gray-300">Confidence</span>
              <span className="text-blue-400 font-bold">{result.confidence.toFixed(2)}%</span>
            </div>
            <div className="p-4 bg-blue-900/20 rounded text-sm text-gray-400">
              <p className="mb-2 font-semibold">Coordinates</p>
              <p>Face 1: X: 125, Y: 87, W: 256, H: 298</p>
              <p>Face 2: X: 142, Y: 102, W: 241, H: 287</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
