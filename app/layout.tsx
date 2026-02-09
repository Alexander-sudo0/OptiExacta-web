import React from "react"
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { AuthProvider } from '@/context/auth-context'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'OptiExacta Labs | NIST-Ranked #1 Facial Recognition',
  description: 'Enterprise-grade facial recognition technology. NIST-ranked #1 in accuracy. Real-time detection, identification, and analytics for government, enterprise, and security.',
  keywords: 'facial recognition, face detection, computer vision, AI, NIST, security, surveillance',
  authors: [{ name: 'OptiExacta Labs' }],
  creator: 'OptiExacta Labs',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://optiexacta.com',
    title: 'OptiExacta Labs | NIST-Ranked #1 Facial Recognition',
    description: 'Leading facial recognition technology for enterprise security',
    images: [
      {
        url: '/images/hero-facial-recognition.jpg',
        width: 1200,
        height: 630,
        alt: 'OptiExacta Facial Recognition'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'OptiExacta Labs | Facial Recognition',
    description: 'NIST-ranked #1 facial recognition technology'
  }
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#000000',
  colorScheme: 'dark'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <head>
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className="font-sans bg-background text-foreground">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
