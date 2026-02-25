'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <motion.nav 
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        scrolled 
          ? 'bg-white/[0.04] backdrop-blur-2xl border-b border-white/[0.08] shadow-[0_4px_30px_rgba(0,0,0,0.3)]' 
          : 'bg-transparent'
      }`}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity group">
          <motion.div
            whileHover={{ rotate: [0, -10, 10, 0] }}
            transition={{ duration: 0.5 }}
          >
            <Image 
              src="/images/visionera-logo-white.png"
              alt="VisionEra"
              width={52}
              height={52}
              className="w-13 h-13 object-contain"
            />
          </motion.div>
          <div className="flex flex-col">
            <span className="text-2xl font-bold text-foreground group-hover:text-primary transition-colors">VisionEra</span>
            <span className="text-[10px] text-muted-foreground font-medium tracking-wider">AI RECOGNITION</span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-1">
          {[
            { href: '/products', label: 'Products' },
            { href: '/pricing', label: 'Pricing' },
            { href: '/api-docs', label: 'API Docs' },
            { href: '/about', label: 'About' }
          ].map((link) => (
            <Link 
              key={link.href}
              href={link.href} 
              className="relative px-4 py-2 text-muted-foreground hover:text-foreground transition-colors font-medium group"
            >
              {link.label}
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-gradient-to-r from-primary to-secondary group-hover:w-1/2 transition-all duration-300" />
            </Link>
          ))}
        </div>

        {/* CTA Buttons */}
        <div className="hidden md:flex items-center gap-3">
          <Link 
            href="/login"
            className="px-5 py-2.5 text-foreground hover:text-primary transition-colors font-medium"
          >
            Login
          </Link>
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Link 
              href="/signup"
              className="px-6 py-2.5 text-primary-foreground bg-gradient-to-r from-primary to-secondary hover:shadow-lg hover:shadow-primary/25 transition-all rounded-full font-semibold inline-flex items-center gap-2"
            >
              Get Started
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </motion.div>
        </div>

        {/* Mobile Menu Button */}
        <button 
          className="md:hidden text-foreground p-2 rounded-lg hover:bg-card/50 transition-colors"
          onClick={() => setIsOpen(!isOpen)}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {isOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            className="md:hidden bg-card/95 backdrop-blur-xl border-t border-border"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="p-4 space-y-1">
              {[
                { href: '/products', label: 'Products' },
                { href: '/pricing', label: 'Pricing' },
                { href: '/api-docs', label: 'API Docs' },
                { href: '/about', label: 'About' }
              ].map((link, i) => (
                <motion.div
                  key={link.href}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Link 
                    href={link.href} 
                    className="block text-muted-foreground hover:text-foreground py-3 px-4 rounded-lg hover:bg-card/50 transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    {link.label}
                  </Link>
                </motion.div>
              ))}
              <div className="pt-4 mt-4 border-t border-border space-y-2">
                <Link 
                  href="/login" 
                  className="block text-center px-4 py-3 text-foreground border border-primary/50 rounded-xl hover:bg-primary/10 transition-colors font-medium"
                  onClick={() => setIsOpen(false)}
                >
                  Login
                </Link>
                <Link 
                  href="/signup" 
                  className="block text-center px-4 py-3 bg-gradient-to-r from-primary to-secondary text-primary-foreground rounded-xl font-semibold"
                  onClick={() => setIsOpen(false)}
                >
                  Get Started
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  )
}
