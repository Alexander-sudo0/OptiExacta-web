'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'

export function Footer() {
  const footerLinks = {
    product: [
      { label: 'Products', href: '/products' },
      { label: 'Pricing', href: '/pricing' },
      { label: 'API Docs', href: '/api-docs' },
      { label: 'Dashboard', href: '/dashboard' },
    ],
    company: [
      { label: 'About Us', href: '/about' },
      { label: 'Contact', href: '/contact' },
      { label: 'NIST Ranking', href: '/nist-ranking' },
    ],
    legal: [
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms of Service', href: '/terms' },
      { label: 'GDPR Compliance', href: '/privacy' },
      { label: 'DPDP Act', href: '/privacy' },
    ],
  }

  const socialLinks = [
    {
      name: 'Twitter',
      href: '#',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      ),
    },
    {
      name: 'LinkedIn',
      href: '#',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z"/><circle cx="4" cy="4" r="2"/>
        </svg>
      ),
    },
    {
      name: 'GitHub',
      href: '#',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
        </svg>
      ),
    },
  ]

  return (
    <footer className="relative overflow-hidden">
      {/* Pre-footer CTA band */}
      <div className="relative bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-rose-500/10 border-y border-orange-500/20">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(251,146,60,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(251,146,60,0.04)_1px,transparent_1px)] bg-[size:40px_40px]" />
        <div className="max-w-7xl mx-auto px-6 py-12 relative z-10">
          <motion.div
            className="flex flex-col md:flex-row items-center justify-between gap-6"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div>
              <h3 className="text-xl md:text-2xl font-bold text-foreground mb-2">
                Ready to get started?
              </h3>
              <p className="text-muted-foreground text-sm max-w-md">
                Deploy AI recognition in minutes. No upfront costs, pay as you scale.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/signup"
                className="px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold rounded-full hover:shadow-lg hover:shadow-orange-500/25 transition-all duration-300 text-sm"
              >
                Start Free Trial
              </Link>
              <Link
                href="/contact"
                className="px-6 py-3 border border-orange-500/40 text-orange-300 rounded-full hover:bg-orange-500/10 transition-all duration-300 text-sm font-medium"
              >
                Talk to Sales
              </Link>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Main footer */}
      <div className="bg-gradient-to-b from-card/80 to-background/95 relative">
        {/* Background decorations */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-orange-400/8 to-amber-300/5 rounded-full blur-3xl" />
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-rose-400/8 to-orange-300/5 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-gradient-to-r from-orange-500/[0.02] to-amber-500/[0.02] rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-6 pt-16 pb-8 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 mb-16">
            {/* Company Info */}
            <motion.div 
              className="lg:col-span-2"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <Link href="/" className="inline-flex items-center gap-3 mb-5 hover:opacity-80 transition-opacity group">
                <Image 
                  src="/images/visionera-logo-white.png"
                  alt="VisionEra"
                  width={44}
                  height={44}
                  className="w-11 h-11 object-contain group-hover:scale-105 transition-transform"
                />
                <div>
                  <span className="text-xl font-bold text-foreground block leading-tight">VisionEra</span>
                  <span className="text-[10px] uppercase tracking-[0.2em] text-orange-400/80 font-medium">AI Recognition</span>
                </div>
              </Link>
              <p className="text-muted-foreground text-sm mb-6 max-w-xs leading-relaxed">
                NIST top-ranked AI recognition technology for face, vehicle, and body detection. Powering enterprise security worldwide.
              </p>
              
              {/* Contact info */}
              <div className="space-y-2.5 mb-6">
                <a href="mailto:info@visionera.live" className="flex items-center gap-2.5 text-sm text-muted-foreground hover:text-orange-400 transition-colors group">
                  <span className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center group-hover:bg-orange-500/20 transition-colors">
                    <svg className="w-3.5 h-3.5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </span>
                  info@visionera.live
                </a>
                <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                  <span className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </span>
                  India &middot; Global
                </div>
              </div>

              {/* Social Links */}
              <div className="flex items-center gap-2">
                {socialLinks.map((social) => (
                  <a 
                    key={social.name}
                    href={social.href} 
                    className="w-9 h-9 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-muted-foreground hover:text-orange-400 hover:bg-orange-500/20 hover:border-orange-500/40 transition-all duration-200"
                  >
                    <span className="sr-only">{social.name}</span>
                    {social.icon}
                  </a>
                ))}
              </div>
            </motion.div>

            {/* Product */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <h4 className="font-semibold text-foreground mb-5 flex items-center gap-2 text-sm uppercase tracking-wider">
                <span className="w-8 h-[2px] bg-gradient-to-r from-orange-400 to-transparent rounded-full" />
                Product
              </h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                {footerLinks.product.map((link) => (
                  <li key={link.label}>
                    <Link 
                      href={link.href} 
                      className="hover:text-orange-400 transition-colors inline-flex items-center gap-1.5 group"
                    >
                      <span className="w-1 h-1 rounded-full bg-orange-400/40 group-hover:bg-orange-400 transition-colors" />
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* Company */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <h4 className="font-semibold text-foreground mb-5 flex items-center gap-2 text-sm uppercase tracking-wider">
                <span className="w-8 h-[2px] bg-gradient-to-r from-amber-400 to-transparent rounded-full" />
                Company
              </h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                {footerLinks.company.map((link) => (
                  <li key={link.label}>
                    <Link 
                      href={link.href} 
                      className="hover:text-orange-400 transition-colors inline-flex items-center gap-1.5 group"
                    >
                      <span className="w-1 h-1 rounded-full bg-amber-400/40 group-hover:bg-amber-400 transition-colors" />
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* Legal */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <h4 className="font-semibold text-foreground mb-5 flex items-center gap-2 text-sm uppercase tracking-wider">
                <span className="w-8 h-[2px] bg-gradient-to-r from-rose-400 to-transparent rounded-full" />
                Legal
              </h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                {footerLinks.legal.map((link) => (
                  <li key={link.label}>
                    <Link 
                      href={link.href} 
                      className="hover:text-orange-400 transition-colors inline-flex items-center gap-1.5 group"
                    >
                      <span className="w-1 h-1 rounded-full bg-rose-400/40 group-hover:bg-rose-400 transition-colors" />
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>

          {/* Compliance badges row */}
          <motion.div
            className="flex flex-wrap items-center justify-center gap-3 mb-10"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            {[
              { label: 'NIST FRVT', icon: '🏆' },
              { label: 'ISO 27001', icon: '🔒' },
              { label: 'GDPR', icon: '🇪🇺' },
              { label: 'DPDP Act', icon: '🇮🇳' },
              { label: 'iBeta L2', icon: '✓' },
            ].map((badge) => (
              <span
                key={badge.label}
                className="px-3 py-1.5 rounded-full bg-orange-500/8 border border-orange-500/15 text-xs text-muted-foreground flex items-center gap-1.5"
              >
                <span className="text-[11px]">{badge.icon}</span>
                {badge.label}
              </span>
            ))}
          </motion.div>

          {/* Bottom divider with gradient */}
          <div className="h-px bg-gradient-to-r from-transparent via-orange-500/20 to-transparent mb-6" />

          {/* Bottom Section */}
          <motion.div 
            className="flex flex-col md:flex-row items-center justify-between gap-4"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <div className="flex flex-col md:flex-row items-center gap-3 md:gap-6">
              <p className="text-muted-foreground/60 text-xs">
                © 2025 VisionEra. All rights reserved.
              </p>
              <div className="flex items-center gap-1.5 text-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                <span className="text-muted-foreground/60">All systems operational</span>
              </div>
            </div>

            <p className="text-muted-foreground/40 text-[11px]">
              Built with ❤️ for a safer world
            </p>
          </motion.div>
        </div>
      </div>
    </footer>
  )
}
