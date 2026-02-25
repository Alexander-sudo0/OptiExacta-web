'use client'

import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { HeroSection } from '@/components/hero-section'
import Link from 'next/link'
import { motion } from 'framer-motion'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a0a] via-[#0d0b08] to-[#0a0a0a]">
      <Navbar />
      
      <HeroSection 
        title="See Every Face. Know Every Identity."
        subtitle="The recognition engine behind law enforcement, banks, and smart cities. Upload a photo, scan a crowd, or analyze hours of footage — results in milliseconds."
        backgroundVideo="/images/hero-bg.mp4"
        badge="Trusted by Enterprises Worldwide"
      />

      {/* Features Section */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-24">
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <span className="inline-block px-5 py-2 rounded-full bg-gradient-to-r from-orange-500/15 to-amber-500/15 border border-orange-500/30 text-orange-400 text-sm font-medium mb-4">
            Platform Capabilities
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">Everything You Need</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            A complete recognition toolkit — face verification, search, video analysis, and API access from your browser
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              icon: (<svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>),
              title: "1:1 Face Verification",
              description: "Compare two faces to verify identity. Confirm if two photos show the same person with a confidence score.",
              gradient: true,
            },
            {
              icon: (<svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>),
              title: "1:N Face Search",
              description: "Search one face against your entire gallery. Find matches across thousands of enrolled faces instantly.",
              gradient: false,
            },
            {
              icon: (<svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>),
              title: "N:N Face Matching",
              description: "Match multiple faces against multiple faces. Cross-reference entire datasets in a single request.",
              gradient: true,
            },
            {
              icon: (<svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>),
              title: "Video Face Search",
              description: "Upload a video, extract all faces, then search against photos. Analyze surveillance footage effortlessly.",
              gradient: false,
            },
            {
              icon: (<svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/></svg>),
              title: "REST API Access",
              description: "Integrate face recognition into your apps with our REST APIs. Generate API keys and start building.",
              gradient: true,
            },
            {
              icon: (<svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>),
              title: "Usage Analytics",
              description: "Track API calls, monitor usage patterns, and view detailed analytics — all in real time.",
              gradient: false,
            },
          ].map((feature, i) => (
            <motion.div
              key={feature.title}
              className="relative p-6 rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl transition-all duration-500 group hover:shadow-[0_8px_32px_rgba(251,146,60,0.15)] hover:border-orange-400/30 hover:bg-white/[0.06] overflow-hidden"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              viewport={{ once: true }}
              whileHover={{ y: -8, scale: 1.02 }}
            >
              {/* Glass shine effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.08] via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              {/* Bottom glow */}
              <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-32 h-16 bg-orange-500/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <div className="relative z-10">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-5 bg-gradient-to-br ${
                  feature.gradient ? 'from-orange-500/20 to-amber-500/20 text-orange-400 shadow-lg shadow-orange-500/10' : 'from-white/10 to-white/5 text-orange-300 shadow-lg shadow-white/5'
                } border border-white/10 backdrop-blur-sm`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How It Works Section */}
      <section className="relative py-24">
        {/* Subtle section separator glow */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-500/15 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-orange-500/10 to-transparent" />
        <div className="max-w-7xl mx-auto px-6">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <span className="inline-block px-5 py-2 rounded-full bg-gradient-to-r from-orange-500/15 to-amber-500/15 border border-orange-500/30 text-orange-400 text-sm font-medium mb-4">
              How It Works
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">Get Started in Minutes</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              No SDKs, no libraries — just sign up, upload, and search
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Sign Up', desc: 'Create your free account and access the dashboard instantly', icon: '🚀' },
              { step: '02', title: 'Upload Faces', desc: 'Upload photos or videos — faces are detected automatically', icon: '📤' },
              { step: '03', title: 'Search & Match', desc: 'Run 1:1, 1:N, or N:N searches and get results in seconds', icon: '✅' }
            ].map((item, i) => (
              <motion.div 
                key={item.step}
                className="relative text-center p-8 rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl group hover:bg-white/[0.06] hover:border-orange-400/20 transition-all duration-500"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.15 }}
                viewport={{ once: true }}
                whileHover={{ y: -5 }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] via-transparent to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                <div className="text-6xl mb-6 relative z-10">{item.icon}</div>
                <span className="text-6xl font-bold text-orange-400/10 absolute top-4 right-4">{item.step}</span>
                <h3 className="text-2xl font-bold text-foreground mb-3 relative z-10">{item.title}</h3>
                <p className="text-muted-foreground relative z-10">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <span className="inline-block px-5 py-2 rounded-full bg-gradient-to-r from-orange-500/15 to-amber-500/15 border border-orange-500/30 text-orange-400 text-sm font-medium mb-4">
              Our Services
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              AI Recognition Cloud Services
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Access powerful face, vehicle, and body recognition directly from your browser or via REST APIs.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                title: '1:1 Verification',
                desc: 'Upload two photos and instantly verify if they are the same person. Great for KYC, onboarding, and identity checks.',
                icon: '🎯',
                href: '/dashboard/one-to-one'
              },
              {
                title: '1:N Search',
                desc: 'Search a face against your entire enrolled gallery. Locate a person across thousands of records in milliseconds.',
                icon: '🔍',
                href: '/dashboard/one-to-n'
              },
              {
                title: 'N:N Matching',
                desc: 'Cross-match multiple probe faces against multiple gallery faces. Ideal for deduplication and investigations.',
                icon: '🔗',
                href: '/dashboard/face-search-n-n'
              },
              {
                title: 'Video Processing',
                desc: 'Upload video footage, automatically extract all faces, then search each face against your photo database.',
                icon: '🎬',
                href: '/dashboard/video-processing'
              },
              {
                title: 'Vehicle Recognition',
                desc: 'Detect and identify vehicles from images and video. License plate reading, make/model classification, and color detection.',
                icon: '🚗',
                href: '/contact'
              },
              {
                title: 'Body Recognition',
                desc: 'Detect and track people by body features when faces are not visible. Gait analysis and person re-identification.',
                icon: '🚶',
                href: '/contact'
              }
            ].map((service, i) => (
              <motion.div
                key={service.title}
                className="relative p-6 rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl hover:bg-white/[0.06] hover:border-orange-400/30 transition-all duration-500 group overflow-hidden hover:shadow-[0_8px_32px_rgba(251,146,60,0.12)]"
                initial={{ opacity: 0, y: 25 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                viewport={{ once: true }}
                whileHover={{ y: -8, scale: 1.02 }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.06] via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-24 h-12 bg-orange-500/15 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                <div className="relative z-10">
                  <div className="text-4xl mb-4 w-16 h-16 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 flex items-center justify-center backdrop-blur-sm shadow-lg shadow-black/10">{service.icon}</div>
                  <h3 className="text-xl font-bold text-foreground mb-2">{service.title}</h3>
                  <p className="text-muted-foreground text-sm mb-4 leading-relaxed">{service.desc}</p>
                  <Link 
                    href={service.href}
                    className="text-orange-400 text-sm font-semibold inline-flex items-center gap-1 group-hover:gap-2 transition-all"
                  >
                    {service.href === '/contact' ? 'Contact Sales' : 'Try it now'}
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { label: 'NIST FRVT', value: 'Top 10', sublabel: 'Global Ranking' },
              { label: 'Latency', value: '<500ms', sublabel: 'API Response Time' },
              { label: 'Uptime', value: '99.9%', sublabel: 'Platform Availability' },
              { label: 'Liveness', value: 'iBeta L2', sublabel: 'Anti-Spoofing' }
            ].map((stat, i) => (
              <motion.div 
                key={stat.label} 
                className="relative group text-center p-8 rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl hover:bg-white/[0.06] hover:border-orange-400/30 transition-all duration-500 overflow-hidden hover:shadow-[0_8px_32px_rgba(251,146,60,0.12)]"
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                viewport={{ once: true }}
                whileHover={{ y: -5 }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.06] via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-24 h-12 bg-orange-500/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                <div className="relative z-10">
                  <p className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent mb-2">
                    {stat.value}
                  </p>
                  <p className="text-foreground font-semibold">{stat.label}</p>
                  <p className="text-sm text-muted-foreground">{stat.sublabel}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Compliance Section */}
      <section className="relative py-16">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-500/15 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-orange-500/10 to-transparent" />
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            className="text-center mb-10"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl font-bold text-foreground mb-3">Compliance & Certifications</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Enterprise-grade security and compliance for regulated industries
            </p>
          </motion.div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { name: 'NIST FRVT', desc: 'Top-ranked in NIST Face Recognition Vendor Test', icon: '🏆' },
              { name: 'GDPR', desc: 'Fully compliant with EU General Data Protection Regulation', icon: '🛡\uFE0F' },
              { name: 'DPDP Act', desc: 'Compliant with India Digital Personal Data Protection Act 2023', icon: '🇮🇳' },
              { name: 'ISO 27001', desc: 'Information security management standard', icon: '🔒' },
            ].map((cert, i) => (
              <motion.div
                key={cert.name}
                className="relative text-center p-6 rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl hover:bg-white/[0.06] hover:border-orange-400/30 transition-all duration-500 group overflow-hidden hover:shadow-[0_8px_32px_rgba(251,146,60,0.1)]"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                viewport={{ once: true }}
                whileHover={{ y: -5 }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                <div className="relative z-10">
                  <div className="text-3xl mb-3">{cert.icon}</div>
                  <h3 className="font-bold text-foreground mb-1">{cert.name}</h3>
                  <p className="text-xs text-muted-foreground">{cert.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <span className="inline-block px-5 py-2 rounded-full bg-gradient-to-r from-orange-500/15 to-amber-500/15 border border-orange-500/30 text-orange-400 text-sm font-medium mb-4">
              Use Cases
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">Built for Every Industry</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              From law enforcement to banking — our platform powers recognition across industries
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { title: 'Law Enforcement', icon: '🏛\uFE0F', desc: 'Investigate cases faster with video processing and face matching against suspect databases' },
              { title: 'Banking & KYC', icon: '🏦', desc: 'Automate identity verification for customer onboarding with 1:1 face verification and liveness detection' },
              { title: 'Smart Cities', icon: '🏙\uFE0F', desc: 'Vehicle recognition, traffic monitoring, and public safety with real-time face and body detection' },
              { title: 'Border Control', icon: '🛂', desc: 'Passenger identification and real-time screening at airports and border checkpoints' },
              { title: 'Retail & Enterprise', icon: '🏬', desc: 'Customer verification, VIP identification, loss prevention, and employee attendance tracking' },
              { title: 'Investigations', icon: '🔎', desc: 'Cross-reference faces across datasets using N:N matching and video analysis for case resolution' }
            ].map((useCase, i) => (
              <motion.div 
                key={useCase.title}
                className="relative p-6 rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl hover:bg-white/[0.06] hover:border-orange-400/30 transition-all duration-500 group overflow-hidden hover:shadow-[0_8px_32px_rgba(251,146,60,0.1)]"
                initial={{ opacity: 0, y: 25 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                viewport={{ once: true }}
                whileHover={{ y: -5, scale: 1.02 }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.06] via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                <div className="relative z-10">
                  <div className="text-4xl mb-4 w-16 h-16 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 flex items-center justify-center backdrop-blur-sm shadow-lg shadow-black/10">{useCase.icon}</div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">{useCase.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{useCase.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 via-transparent to-amber-500/5" />
        <motion.div 
          className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-br from-orange-400/10 to-amber-300/5 rounded-full blur-3xl"
          animate={{ rotate: 360 }}
          transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
        />
        <motion.div 
          className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-tr from-rose-400/10 to-orange-300/5 rounded-full blur-3xl"
          animate={{ rotate: -360 }}
          transition={{ duration: 80, repeat: Infinity, ease: "linear" }}
        />
        
        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <span className="inline-block px-5 py-2 rounded-full bg-gradient-to-r from-orange-500/15 to-amber-500/15 border border-orange-500/30 text-orange-400 text-sm font-medium mb-6">
              Get Started Today
            </span>
            <h2 className="text-4xl md:text-6xl font-bold text-foreground mb-6">Ready to Search Faces at Scale?</h2>
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              Sign up free and start using our recognition platform. Explore our API documentation to integrate in minutes.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link 
                href="/signup"
                className="group px-8 py-4 bg-gradient-to-r from-primary to-secondary text-primary-foreground font-semibold rounded-full hover:shadow-lg hover:shadow-primary/25 transition-all inline-flex items-center gap-2"
              >
                Start Free Trial
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              <Link 
                href="/api-docs"
                className="px-8 py-4 border-2 border-primary/50 text-primary font-semibold rounded-full hover:bg-primary/10 hover:border-primary transition-all inline-flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                API Documentation
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
