'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'

interface HeroSectionProps {
  title: string
  subtitle: string
  backgroundImage?: string
  backgroundVideo?: string
  badge?: string
}

export function HeroSection({ title, subtitle, backgroundImage, backgroundVideo, badge }: HeroSectionProps) {
  // Generate particles only on client to avoid hydration mismatch
  const [particles, setParticles] = useState<Array<{ left: string; top: string; duration: number; delay: number }>>([])

  useEffect(() => {
    // Generate random positions only once on mount
    setParticles(
      Array.from({ length: 20 }, () => ({
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        duration: 3 + Math.random() * 4,
        delay: Math.random() * 5,
      }))
    )
  }, [])

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background gradient - warm peach/orange tint */}
      <div className="absolute inset-0 bg-gradient-to-b from-orange-500/[0.06] via-amber-500/[0.03] to-background" />
      
      {/* Animated gradient orbs - warm tones */}
      <motion.div 
        className="absolute top-20 right-10 w-[500px] h-[500px] bg-gradient-to-br from-orange-400/20 to-amber-300/10 rounded-full blur-3xl"
        animate={{ 
          y: [0, -30, 0],
          scale: [1, 1.1, 1],
          opacity: [0.2, 0.3, 0.2]
        }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div 
        className="absolute bottom-20 left-10 w-[500px] h-[500px] bg-gradient-to-tr from-rose-400/15 to-orange-300/10 rounded-full blur-3xl"
        animate={{ 
          y: [0, 30, 0],
          scale: [1.1, 1, 1.1],
          opacity: [0.15, 0.25, 0.15]
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      />
      <motion.div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-orange-500/10 to-transparent rounded-full blur-3xl"
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.1, 0.15, 0.1]
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      />
      
      {/* Grid pattern overlay - warm tone */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(251,146,60,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(251,146,60,0.03)_1px,transparent_1px)] bg-[size:50px_50px]" />

      {/* Abstract tech pattern - circuit nodes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-[0.04]">
        <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="circuit" x="0" y="0" width="200" height="200" patternUnits="userSpaceOnUse">
              <circle cx="100" cy="100" r="3" fill="currentColor" />
              <circle cx="0" cy="0" r="2" fill="currentColor" />
              <circle cx="200" cy="0" r="2" fill="currentColor" />
              <circle cx="0" cy="200" r="2" fill="currentColor" />
              <circle cx="200" cy="200" r="2" fill="currentColor" />
              <line x1="100" y1="100" x2="200" y2="0" stroke="currentColor" strokeWidth="0.5" />
              <line x1="100" y1="100" x2="0" y2="0" stroke="currentColor" strokeWidth="0.5" />
              <line x1="100" y1="100" x2="200" y2="200" stroke="currentColor" strokeWidth="0.5" />
              <line x1="100" y1="100" x2="0" y2="200" stroke="currentColor" strokeWidth="0.5" />
              <line x1="100" y1="100" x2="100" y2="0" stroke="currentColor" strokeWidth="0.5" />
              <line x1="100" y1="100" x2="100" y2="200" stroke="currentColor" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#circuit)" className="text-orange-300" />
        </svg>
      </div>

      {/* Background video if provided */}
      {backgroundVideo && (
        <div className="absolute inset-0 z-0 overflow-hidden">
          <video
            src={backgroundVideo}
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover opacity-20"
          />
          {/* Layered overlays for readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a]/60 via-[#0a0a0a]/30 to-[#0a0a0a]" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a]/40 via-transparent to-[#0a0a0a]/40" />
        </div>
      )}

      {/* Background image if provided (fallback) */}
      {backgroundImage && !backgroundVideo && (
        <div className="absolute inset-0 z-0">
          <Image
            src={backgroundImage || "/placeholder.svg"}
            alt="Hero background"
            fill
            className="object-cover opacity-20"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/40 to-background" />
        </div>
      )}

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {particles.map((particle, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-orange-400/40 rounded-full"
            style={{
              left: particle.left,
              top: particle.top,
            }}
            animate={{
              y: [0, -100, 0],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: particle.duration,
              repeat: Infinity,
              delay: particle.delay,
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 pt-28 text-center">
        {badge && (
          <motion.div 
            className="mb-8 inline-block"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="px-5 py-2.5 rounded-full bg-gradient-to-r from-orange-500/15 to-amber-500/15 border border-orange-500/40 text-orange-300 text-sm font-medium backdrop-blur-sm inline-flex items-center gap-2">
              <span className="w-2 h-2 bg-orange-400 rounded-full animate-pulse" />
              {badge}
            </span>
          </motion.div>
        )}
        
        <motion.h1 
          className="text-5xl md:text-7xl lg:text-8xl font-bold text-foreground mb-6 text-balance leading-tight"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <span className="bg-gradient-to-r from-foreground via-foreground to-primary bg-clip-text">
            {title.split(' ').slice(0, -2).join(' ')}
          </span>{' '}
          <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            {title.split(' ').slice(-2).join(' ')}
          </span>
        </motion.h1>
        
        <motion.p 
          className="text-xl md:text-2xl text-muted-foreground mb-10 text-balance max-w-3xl mx-auto leading-relaxed"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          {subtitle}
        </motion.p>

        <motion.div 
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          <Link 
            href="/signup"
            className="group relative px-8 py-4 bg-gradient-to-r from-primary to-secondary text-primary-foreground font-semibold rounded-full hover:shadow-lg hover:shadow-primary/25 transition-all duration-300 overflow-hidden"
          >
            <span className="relative z-10 flex items-center gap-2">
              Start Free Trial
              <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-secondary to-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </Link>
          <Link 
            href="/login"
            className="group px-8 py-4 border-2 border-primary/50 text-primary rounded-full hover:bg-primary/10 hover:border-primary transition-all duration-300 font-semibold backdrop-blur-sm flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Live Demo
          </Link>
        </motion.div>

        {/* Trust badges */}
        <motion.div 
          className="mt-16 pt-8 border-t border-border/30"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1 }}
        >
          <p className="text-sm text-muted-foreground mb-6">Trusted by leading enterprises worldwide</p>
          <div className="flex flex-wrap items-center justify-center gap-8 opacity-60">
            {['NIST Top-Ranked', 'ISO 27001', 'GDPR Compliant', 'DPDP Act'].map((badge, i) => (
              <motion.div 
                key={badge}
                className="px-4 py-2 rounded-lg bg-card/30 border border-border/50 text-xs font-medium text-muted-foreground"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.2 + i * 0.1 }}
              >
                {badge}
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div 
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
      >
        <motion.div 
          className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex items-start justify-center p-2"
          animate={{ y: [0, 5, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <motion.div 
            className="w-1 h-2 bg-primary rounded-full"
            animate={{ y: [0, 8, 0], opacity: [1, 0.5, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </motion.div>
      </motion.div>
    </div>
  )
}
