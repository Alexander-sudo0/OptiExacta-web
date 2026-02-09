'use client'

import React from "react"

import { useState } from 'react'

export default function OneToNSearch() {
  const [targetImage, setTargetImage] = useState<string | null>(null)
  const [results, setResults] = useState<Array<{ id: number; confidence: number }> | null>(null)

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setTargetImage(reader.result as string)
        // Simulate search
        setResults([
          { id: 1, confidence: 98.5 },
          { id: 2, confidence: 94.2 },
          { id: 3, confidence: 87.6 },
        ])
      }
      reader.readAsDataURL(file)
    }
  }

  return (
    <div className="max-w-4xl">
      <h1 className="text-4xl font-bold mb-2">1:N Face Search</h1>
      <p className="text-gray-400 mb-8">Search a face against your database</p>

      <div className="mb-8">
        <label className="block text-sm font-semibold mb-4">Upload Target Face</label>
        <div className="border-2 border-dashed border-blue-900/30 rounded-lg p-12 text-center hover:border-blue-400 transition cursor-pointer relative">
          <input
            type="file"
            accept="image/*"
            onChange={handleUpload}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
          {targetImage ? (
            <img src={targetImage || "/placeholder.svg"} alt="Target" className="w-32 h-32 object-contain mx-auto" />
          ) : (
            <div>
              <p className="text-gray-400 text-lg">Drop image or click to upload</p>
              <p className="text-gray-500 text-sm mt-2">Supported: JPG, PNG (Max 10MB)</p>
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      {results && (
        <div className="p-8 bg-glass rounded border border-blue-900/30">
          <h2 className="text-2xl font-bold mb-6">Top Matches</h2>
          <div className="space-y-3">
            {results.map((result) => (
              <div key={result.id} className="flex items-center justify-between p-4 bg-blue-900/20 rounded">
                <span className="text-gray-300">Match ID: {result.id}</span>
                <span className="text-blue-400 font-bold">{result.confidence.toFixed(2)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
