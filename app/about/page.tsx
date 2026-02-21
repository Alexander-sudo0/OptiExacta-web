'use client'

import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { HeroSection } from '@/components/hero-section'
import Image from 'next/image'

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <HeroSection 
        title="About VisionEra"
        subtitle="Facial recognition as a service — powerful, accurate, and simple to use"
        backgroundImage="/images/hero-facial-recognition.jpg"
        badge="Our Story"
      />

      {/* Company Story */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-24">
          <div>
            <h2 className="text-4xl font-bold text-foreground mb-6">Our Journey</h2>
            <p className="text-lg text-muted-foreground mb-6">
              VisionEra was built to make facial recognition accessible to everyone — from startups to enterprises. We believe advanced face recognition should not require expensive hardware, complex SDKs, or deep ML expertise.
            </p>
            <p className="text-lg text-muted-foreground mb-6">
              Our cloud platform lets you verify, search, and match faces from a simple web dashboard. Upload photos or videos, run searches, and get results — all without writing a single line of code.
            </p>
            <p className="text-lg text-muted-foreground">
              We are committed to delivering the highest accuracy and reliability, making our platform the go-to solution for organizations across industries.
            </p>
          </div>
          <div className="relative h-96 rounded-lg overflow-hidden">
            <Image 
              src="/security-technology.jpg"
              alt="VisionEra Platform"
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="bg-card/30 py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 rounded-lg border border-border bg-background/50">
              <h3 className="text-2xl font-bold text-foreground mb-4">Our Mission</h3>
              <p className="text-muted-foreground">
                To democratize facial recognition technology by providing a cloud platform that is powerful yet simple to use — accessible to organizations of all sizes.
              </p>
            </div>
            <div className="p-8 rounded-lg border border-border bg-background/50">
              <h3 className="text-2xl font-bold text-foreground mb-4">Our Vision</h3>
              <p className="text-muted-foreground">
                To become the leading cloud platform for facial recognition, trusted for our accuracy, reliability, and ease of use across industries worldwide.
              </p>
            </div>
            <div className="p-8 rounded-lg border border-border bg-background/50">
              <h3 className="text-2xl font-bold text-foreground mb-4">Our Values</h3>
              <p className="text-muted-foreground">
                Simplicity, accuracy, security, and innovation. We believe the best technology is one that anyone can use without complexity or barriers.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* What We Offer */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-foreground mb-4">Why Choose VisionEra</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            A facial recognition platform built for real-world needs
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {[
            { title: '99.9% Accuracy', description: 'Industry-leading facial recognition accuracy across diverse demographics and conditions' },
            { title: 'No Code Required', description: 'Use our web dashboard — no SDKs, no APIs, no development work needed' },
            { title: 'Video Processing', description: 'Upload video footage and search faces automatically — a feature most platforms lack' },
            { title: 'Scalable Cloud', description: 'Handle from 10 to 10 million face searches without any infrastructure changes' },
            { title: 'Multiple Search Modes', description: '1:1 verification, 1:N search, and N:N matching — all from one platform' },
            { title: 'Real-Time Analytics', description: 'Track usage, monitor performance, and view detailed insights in your dashboard' }
          ].map((highlight) => (
            <div key={highlight.title} className="p-6 rounded-lg border border-border bg-card/50 hover:bg-card/80 transition-all hover:border-secondary">
              <h3 className="text-xl font-semibold text-foreground mb-3">{highlight.title}</h3>
              <p className="text-muted-foreground">{highlight.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Platform Overview */}
      <section className="bg-card/30 py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="relative h-96 rounded-lg overflow-hidden">
              <Image 
                src="/analytics-dashboard.jpg"
                alt="VisionEra Dashboard"
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
            </div>
            <div>
              <h2 className="text-4xl font-bold text-foreground mb-6">Built for Teams</h2>
              <p className="text-lg text-muted-foreground mb-6">
                VisionEra is designed for organizations that need reliable face recognition without the complexity. Our dashboard makes it easy for non-technical teams to upload, search, and manage face data.
              </p>
              <p className="text-lg text-muted-foreground mb-6">
                Whether you are a security analyst, HR manager, or investigator — our platform gives you the tools to get the job done quickly and accurately.
              </p>
              <a href="/signup" className="px-8 py-3 bg-gradient-to-r from-primary to-secondary text-primary-foreground font-semibold rounded-full hover:opacity-90 transition-opacity inline-block">
                Get Started Free
              </a>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
