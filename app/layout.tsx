import React from "react"
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { AuthProvider } from '@/context/auth-context'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'VisionEra | Facial Recognition as a Service',
  description: 'Enterprise-grade facial recognition as a service. 1:1 verification, 1:N search, N:N matching, video processing, and real-time analytics — all from a simple cloud dashboard.',
  keywords: 'facial recognition, face search, face verification, FRaaS, AI, computer vision, face matching, video face search',
  authors: [{ name: 'VisionEra' }],
  creator: 'VisionEra',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://visionera.com',
    title: 'VisionEra | Facial Recognition as a Service',
    description: 'Powerful facial recognition cloud platform — verify, search, and match faces at scale',
    images: [
      {
        url: '/images/hero-facial-recognition.jpg',
        width: 1200,
        height: 630,
        alt: 'VisionEra Facial Recognition'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'VisionEra | Facial Recognition as a Service',
    description: 'Powerful facial recognition cloud platform'
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
