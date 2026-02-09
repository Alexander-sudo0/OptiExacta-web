'use client'

import React from "react"

import Link from 'next/link'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-black text-white">
      {/* Sidebar */}
      <aside className="w-64 border-r border-blue-900/20 bg-black/50 p-6">
        <Link href="/" className="flex items-center gap-2 font-bold text-blue-400 mb-8">
          <div className="w-8 h-8 bg-blue-500 rounded" />
          OptiExacta Admin
        </Link>

        <nav className="space-y-2">
          <Link href="/admin" className="block px-4 py-2 rounded hover:bg-blue-900/20 text-gray-300 hover:text-blue-400 transition">
            Dashboard
          </Link>
          <Link href="/admin/users" className="block px-4 py-2 rounded hover:bg-blue-900/20 text-gray-300 hover:text-blue-400 transition">
            Users
          </Link>
          <Link href="/admin/subscriptions" className="block px-4 py-2 rounded hover:bg-blue-900/20 text-gray-300 hover:text-blue-400 transition">
            Subscriptions
          </Link>
        </nav>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col">
        <header className="border-b border-blue-900/20 px-6 py-4 bg-glass">
          <p className="text-gray-400 text-sm">Admin Panel</p>
        </header>
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  )
}
