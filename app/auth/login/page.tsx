'use client'

import React from "react"

import Link from 'next/link'
import { useState } from 'react'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Placeholder - no actual auth yet
    console.log('Login attempt:', { email, password })
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2 text-xl font-bold text-blue-400 mb-8">
            <div className="w-8 h-8 bg-blue-500 rounded" />
            OptiExacta
          </Link>
          <h1 className="text-3xl font-bold">Sign In</h1>
          <p className="text-gray-400 mt-2">Access your facial recognition dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full px-4 py-2 bg-gray-900 border border-blue-900/30 rounded focus:border-blue-400 outline-none text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2 bg-gray-900 border border-blue-900/30 rounded focus:border-blue-400 outline-none text-white"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2 bg-blue-600 text-white rounded font-semibold hover:bg-blue-700 transition"
          >
            Sign In
          </button>
        </form>

        <div className="text-center text-sm">
          <p className="text-gray-400 mb-4">
            Don&apos;t have an account?{' '}
            <Link href="/auth/signup" className="text-blue-400 hover:text-blue-300">
              Sign up
            </Link>
          </p>
          <a href="#" className="text-blue-400 hover:text-blue-300">
            Forgot password?
          </a>
        </div>
      </div>
    </div>
  )
}
