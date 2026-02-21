'use client'

import Link from 'next/link'
import { useState } from 'react'

export default function Header() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b border-blue-900/20 bg-glass">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 text-xl font-bold text-blue-400">
          <div className="w-8 h-8 bg-blue-500 rounded" />
          VisionEra
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex gap-8">
          <Link href="/" className="text-gray-300 hover:text-blue-400 transition">
            Home
          </Link>
          <Link href="/nist-ranking" className="text-gray-300 hover:text-blue-400 transition">
            NIST Ranking
          </Link>
          <Link href="/products" className="text-gray-300 hover:text-blue-400 transition">
            Products
          </Link>
          <Link href="/pricing" className="text-gray-300 hover:text-blue-400 transition">
            Pricing
          </Link>
        </nav>

        {/* Auth & Theme */}
        <div className="flex items-center gap-4">
          <Link
            href="/auth/login"
            className="px-4 py-2 text-gray-300 hover:text-blue-400 transition"
          >
            Login
          </Link>
          <Link
            href="/auth/signup"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          >
            Sign up
          </Link>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 text-gray-300 hover:text-blue-400"
          >
            ☰
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <nav className="md:hidden border-t border-blue-900/20 px-4 py-4 space-y-2 bg-black/50">
          <Link href="/" className="block text-gray-300 hover:text-blue-400 py-2">
            Home
          </Link>
          <Link href="/nist-ranking" className="block text-gray-300 hover:text-blue-400 py-2">
            NIST Ranking
          </Link>
          <Link href="/products" className="block text-gray-300 hover:text-blue-400 py-2">
            Products
          </Link>
          <Link href="/pricing" className="block text-gray-300 hover:text-blue-400 py-2">
            Pricing
          </Link>
        </nav>
      )}
    </header>
  )
}
