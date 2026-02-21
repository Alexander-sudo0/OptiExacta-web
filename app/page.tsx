'use client'

import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { HeroSection } from '@/components/hero-section'
import { FeatureCard } from '@/components/feature-card'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section */}
      <HeroSection 
        title="Facial Recognition as a Service"
        subtitle="Verify, search, and match faces at scale — all from a simple cloud dashboard. No infrastructure to manage."
        backgroundImage="/images/hero-facial-recognition.jpg"
        badge="Cloud-Powered FR Platform"
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
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            Platform Capabilities
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">Everything You Need</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            A complete facial recognition toolkit — upload, detect, search and match from your browser
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <FeatureCard 
            icon={<svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>}
            title="1:1 Face Verification"
            description="Compare two faces to verify identity. Confirm if two photos show the same person with a confidence score."
            gradient
            index={0}
          />
          <FeatureCard 
            icon={<svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>}
            title="1:N Face Search"
            description="Search one face against your entire gallery. Find matches across thousands of enrolled faces instantly."
            index={1}
          />
          <FeatureCard 
            icon={<svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>}
            title="N:N Face Matching"
            description="Match multiple faces against multiple faces. Cross-reference entire datasets in a single request."
            gradient
            index={2}
          />
          <FeatureCard 
            icon={<svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>}
            title="Video Face Search"
            description="Upload a video, extract all faces, then search against photos. Perfect for surveillance footage analysis."
            index={3}
          />
          <FeatureCard 
            icon={<svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>}
            title="Face Studio"
            description="Enroll, organize, and manage your face gallery. Create collections for different use cases and projects."
            gradient
            index={4}
          />
          <FeatureCard 
            icon={<svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>}
            title="Usage Analytics"
            description="Track API calls, monitor usage patterns, and view detailed analytics — all in real time."
            index={5}
          />
        </div>
      </section>

      {/* How It Works Section */}
      <section className="bg-card/30 py-24 border-y border-border/50">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <span className="inline-block px-4 py-1.5 rounded-full bg-secondary/10 text-secondary text-sm font-medium mb-4">
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
                className="relative text-center p-8"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.15 }}
                viewport={{ once: true }}
              >
                <div className="text-6xl mb-6">{item.icon}</div>
                <span className="text-6xl font-bold text-primary/10 absolute top-4 right-4">{item.step}</span>
                <h3 className="text-2xl font-bold text-foreground mb-3">{item.title}</h3>
                <p className="text-muted-foreground">{item.desc}</p>
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
            <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              Our Services
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Facial Recognition Cloud Services
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Access powerful face recognition directly from your browser. No downloads, no complex integrations — just results.
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
                title: 'Face Studio',
                desc: 'Manage your face gallery — enroll new subjects, organize collections, and maintain your searchable database.',
                icon: '🗂️',
                href: '/dashboard/studio'
              },
              {
                title: 'Watchlist Alerts',
                desc: 'Set up watchlists for persons of interest and get notified when a match is found during any search.',
                icon: '🔔',
                href: '/dashboard/watchlist'
              }
            ].map((service, i) => (
              <motion.div
                key={service.title}
                className="p-6 rounded-2xl border border-border bg-card/30 hover:bg-card/60 hover:border-primary/30 transition-all duration-300 group"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                viewport={{ once: true }}
                whileHover={{ y: -5 }}
              >
                <div className="text-4xl mb-4">{service.icon}</div>
                <h3 className="text-xl font-bold text-foreground mb-2">{service.title}</h3>
                <p className="text-muted-foreground text-sm mb-4">{service.desc}</p>
                <Link 
                  href={service.href}
                  className="text-primary text-sm font-semibold inline-flex items-center gap-1 group-hover:gap-2 transition-all"
                >
                  Try it now
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
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
              { label: 'Accuracy Rate', value: '99.9%', sublabel: 'Face Recognition' },
              { label: 'Processing', value: '<1s', sublabel: 'Response Time' },
              { label: 'Uptime', value: '99.9%', sublabel: 'Platform Availability' },
              { label: 'Searches', value: '10M+', sublabel: 'Processed Monthly' }
            ].map((stat, i) => (
              <motion.div 
                key={stat.label} 
                className="relative group text-center p-8 rounded-2xl border border-border bg-card/30 hover:bg-card/60 hover:border-primary/30 transition-all duration-300"
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                viewport={{ once: true }}
                whileHover={{ y: -5 }}
              >
                <p className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-2">
                  {stat.value}
                </p>
                <p className="text-foreground font-semibold">{stat.label}</p>
                <p className="text-sm text-muted-foreground">{stat.sublabel}</p>
                
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary/10 to-secondary/10 opacity-0 group-hover:opacity-100 transition-opacity -z-10 blur-xl" />
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Use Cases */}
      <section className="bg-card/30 py-24 border-y border-border/50">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <span className="inline-block px-4 py-1.5 rounded-full bg-secondary/10 text-secondary text-sm font-medium mb-4">
              Use Cases
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">Built for Every Industry</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              From law enforcement to banking — our platform powers face recognition across industries
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { title: 'Law Enforcement', icon: '🏛️', desc: 'Investigate cases faster with video processing and face matching against suspect databases' },
              { title: 'Banking & KYC', icon: '🏦', desc: 'Automate identity verification for customer onboarding with 1:1 face verification' },
              { title: 'Airport Security', icon: '✈️', desc: 'Passenger identification and real-time screening against watchlists' },
              { title: 'HR & Attendance', icon: '🏢', desc: 'Face-based attendance tracking and employee verification from photos or video' },
              { title: 'Investigations', icon: '🔎', desc: 'Cross-reference faces across datasets using N:N matching for investigations' },
              { title: 'Access Control', icon: '🔐', desc: 'Verify identities before granting access to buildings, systems, or restricted areas' }
            ].map((useCase, i) => (
              <motion.div 
                key={useCase.title}
                className="p-6 rounded-2xl border border-border bg-card/30 hover:bg-card/60 hover:border-secondary/30 transition-all duration-300"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                viewport={{ once: true }}
              >
                <div className="text-4xl mb-4">{useCase.icon}</div>
                <h3 className="text-xl font-semibold text-foreground mb-2">{useCase.title}</h3>
                <p className="text-muted-foreground text-sm">{useCase.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-secondary/5" />
        <motion.div 
          className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-cyan-orange rounded-full blur-3xl opacity-10"
          animate={{ rotate: 360 }}
          transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
        />
        <motion.div 
          className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-cyan-pink rounded-full blur-3xl opacity-10"
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
            <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              Get Started Today
            </span>
            <h2 className="text-4xl md:text-6xl font-bold text-foreground mb-6">Ready to Search Faces at Scale?</h2>
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              Sign up free and start using our facial recognition platform today. No credit card required.
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
                href="/contact"
                className="px-8 py-4 border-2 border-primary/50 text-primary font-semibold rounded-full hover:bg-primary/10 hover:border-primary transition-all inline-flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Contact Sales
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
