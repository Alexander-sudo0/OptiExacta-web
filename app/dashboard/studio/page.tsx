'use client'

import React from "react"

import { useState } from 'react'

export default function FaceStudio() {
  const [image, setImage] = useState<string | null>(null)
  const [enhancement, setEnhancement] = useState('none')

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setImage(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  return (
    <div className="max-w-6xl">
      <h1 className="text-4xl font-bold mb-2">Face Studio</h1>
      <p className="text-gray-400 mb-8">Image enhancement and preprocessing tools</p>

      <div className="grid md:grid-cols-3 gap-8">
        {/* Upload & Tools */}
        <div className="md:col-span-1 space-y-6">
          <div>
            <label className="block text-sm font-semibold mb-3">Upload Image</label>
            <div className="border-2 border-dashed border-blue-900/30 rounded-lg p-6 text-center hover:border-blue-400 transition cursor-pointer relative">
              <input
                type="file"
                accept="image/*"
                onChange={handleUpload}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              {image ? (
                <p className="text-green-400 text-sm">Image loaded</p>
              ) : (
                <p className="text-gray-400 text-sm">Click to upload</p>
              )}
            </div>
          </div>

          {/* Enhancement Tools */}
          <div className="bg-glass rounded border border-blue-900/30 p-6">
            <h3 className="font-semibold mb-4">Enhancement Tools</h3>
            <div className="space-y-3">
              {[
                { id: 'none', label: 'Original' },
                { id: 'enhance', label: 'Enhance' },
                { id: 'denoise', label: 'Denoise' },
                { id: 'brightness', label: 'Auto Brightness' },
              ].map((tool) => (
                <label key={tool.id} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="enhancement"
                    value={tool.id}
                    checked={enhancement === tool.id}
                    onChange={(e) => setEnhancement(e.target.value)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">{tool.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Export */}
          {image && (
            <button className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition font-semibold text-sm">
              Export
            </button>
          )}
        </div>

        {/* Preview */}
        <div className="md:col-span-2">
          <label className="block text-sm font-semibold mb-3">Preview</label>
          <div className="bg-gray-900 rounded-lg border border-blue-900/30 p-8 flex items-center justify-center min-h-96">
            {image ? (
              <img src={image || "/placeholder.svg"} alt="Preview" className="max-w-full max-h-96 rounded" />
            ) : (
              <p className="text-gray-400">Upload an image to preview</p>
            )}
          </div>

          {/* Stats */}
          {image && (
            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="p-4 bg-glass rounded border border-blue-900/30">
                <p className="text-gray-400 text-sm">Quality Score</p>
                <p className="text-2xl font-bold text-blue-400">92%</p>
              </div>
              <div className="p-4 bg-glass rounded border border-blue-900/30">
                <p className="text-gray-400 text-sm">Face Confidence</p>
                <p className="text-2xl font-bold text-blue-400">98.5%</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
