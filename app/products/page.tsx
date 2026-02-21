'use client'

import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { HeroSection } from '@/components/hero-section'
import Link from 'next/link'
import { motion } from 'framer-motion'

export default function ProductsPage() {
  const services = [
    {
      title: '1:1 Face Verification',
      description: 'Compare two facial images to determine if they belong to the same person. Returns a confidence score and match result. Ideal for identity verification, KYC compliance, and secure onboarding.',
      features: ['Identity confirmation', 'Confidence scoring', 'Liveness detection', 'Instant results'],
      icon: '🎯',
      href: '/dashboard/one-to-one',
      gradient: 'from-blue-500/20 to-cyan-500/20'
    },
    {
      title: '1:N Face Search',
      description: 'Search a single probe face against your entire enrolled gallery. Our engine scans thousands of faces in milliseconds to find the best matches ranked by similarity.',
      features: ['Gallery search', 'Top-N results', 'Similarity ranking', 'Fast matching'],
      icon: '🔍',
      href: '/dashboard/one-to-n',
      gradient: 'from-purple-500/20 to-pink-500/20'
    },
    {
      title: 'N:N Face Matching',
      description: 'Cross-reference multiple probe faces against multiple gallery faces in a single operation. Perfect for deduplication, batch processing, and multi-subject investigations.',
      features: ['Batch matching', 'Cross-referencing', 'Deduplication', 'Investigation support'],
      icon: '🔗',
      href: '/dashboard/face-search-n-n',
      gradient: 'from-orange-500/20 to-red-500/20'
    },
    {
      title: 'Video Face Search',
      description: 'Upload video footage and automatically extract all unique faces. Then search any extracted face against photos in your database. Ideal for surveillance footage analysis.',
      features: ['Video upload (up to 500MB)', 'Auto face extraction', 'Frame-by-frame analysis', 'Photo-to-video matching'],
      icon: '🎬',
      href: '/dashboard/video-processing',
      gradient: 'from-green-500/20 to-emerald-500/20'
    },
    {
      title: 'Face Studio',
      description: 'Your central hub for managing enrolled faces. Upload, organize, and maintain your face gallery. Create collections for different projects and use cases.',
      features: ['Face enrollment', 'Gallery management', 'Collection organizing', 'Metadata tagging'],
      icon: '🗂️',
      href: '/dashboard/studio',
      gradient: 'from-indigo-500/20 to-violet-500/20'
    },
    {
      title: 'Watchlist Management',
      description: 'Create and manage watchlists for persons of interest. Get alerts when a match is detected during any face search performed on the platform.',
      features: ['Watchlist creation', 'Alert notifications', 'Person tracking', 'Priority flagging'],
      icon: '🔔',
      href: '/dashboard/watchlist',
      gradient: 'from-amber-500/20 to-yellow-500/20'
    }
  ]

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <HeroSection 
        title="Our Services"
        subtitle="Powerful facial recognition tools accessible from your browser — no SDKs or downloads required"
        badge="Cloud Platform"
      />

      {/* Services Grid */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <div className="space-y-16">
          {services.map((service, i) => (
            <motion.div
              key={service.title}
              className={`grid grid-cols-1 lg:grid-cols-2 gap-12 items-center ${i % 2 === 1 ? 'lg:direction-rtl' : ''}`}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
            >
              <div className={i % 2 === 1 ? 'lg:order-2' : ''}>
                <div className="text-5xl mb-4">{service.icon}</div>
                <h2 className="text-3xl font-bold text-foreground mb-4">{service.title}</h2>
                <p className="text-lg text-muted-foreground mb-6">{service.description}</p>
                <ul className="space-y-3 mb-8">
                  {service.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3">
                      <svg className="w-5 h-5 text-secondary flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                      </svg>
                      <span className="text-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={service.href}
                  className="px-6 py-3 bg-gradient-to-r from-primary to-secondary text-primary-foreground font-semibold rounded-full hover:opacity-90 transition-opacity inline-flex items-center gap-2"
                >
                  Try {service.title}
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
              <div className={`relative h-80 rounded-2xl overflow-hidden border border-border bg-gradient-to-br ${service.gradient} flex items-center justify-center ${i % 2 === 1 ? 'lg:order-1' : ''}`}>
                <span className="text-[120px]">{service.icon}</span>
                <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent" />
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Use Cases */}
      <section className="bg-card/30 py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">Industry Solutions</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Our platform serves customers across every industry
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { title: 'Law Enforcement', icon: '🏛️', description: 'Investigate cases with video analysis and face matching' },
              { title: 'Airports & Travel', icon: '✈️', description: 'Passenger verification and watchlist screening' },
              { title: 'Banking & Finance', icon: '🏦', description: 'KYC compliance and fraud prevention with 1:1 verification' },
              { title: 'Corporate Security', icon: '🏢', description: 'Employee verification and visitor management' },
              { title: 'Investigations', icon: '🔎', description: 'Cross-reference faces with N:N batch matching' },
              { title: 'Access Control', icon: '🔐', description: 'Identity verification for restricted area access' }
            ].map((useCase) => (
              <div key={useCase.title} className="p-6 rounded-2xl border border-border bg-card/50 hover:bg-card/80 transition-all hover:border-secondary/30">
                <div className="text-4xl mb-4">{useCase.icon}</div>
                <h3 className="text-xl font-semibold text-foreground mb-2">{useCase.title}</h3>
                <p className="text-muted-foreground">{useCase.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
