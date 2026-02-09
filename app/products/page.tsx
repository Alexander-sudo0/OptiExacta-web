'use client'

import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { HeroSection } from '@/components/hero-section'
import { FeatureCard } from '@/components/feature-card'
import Image from 'next/image'

export default function ProductsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <HeroSection 
        title="Our Products"
        subtitle="Comprehensive facial recognition solutions designed for every enterprise need"
        backgroundImage="/analytics-dashboard.jpg"
        badge="Complete Suite"
      />

      {/* Main Products */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <div className="mb-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="relative h-96 rounded-lg overflow-hidden">
              <Image 
                src="/security-technology.jpg"
                alt="OptiExacta Platform"
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
            </div>
            <div>
              <h2 className="text-4xl font-bold text-foreground mb-6">OptiExacta Platform</h2>
              <p className="text-lg text-muted-foreground mb-6">
                Our flagship platform delivers enterprise-grade facial recognition with real-time processing capabilities.
              </p>
              <ul className="space-y-4 mb-8">
                {['1:1 Face Verification', '1:N Face Search', 'Real-Time Monitoring', 'Multi-Face Detection', 'Vehicle Recognition', 'Analytics Dashboard'].map((feature) => (
                  <li key={feature} className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-secondary" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                    </svg>
                    <span className="text-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
              <button className="px-8 py-3 bg-gradient-to-r from-primary to-secondary text-primary-foreground font-semibold rounded-full hover:opacity-90 transition-opacity">
                Learn More
              </button>
            </div>
          </div>
        </div>

        <div className="mb-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold text-foreground mb-6">OptiExacta SDK</h2>
              <p className="text-lg text-muted-foreground mb-6">
                Integrate facial recognition directly into your applications with our powerful and easy-to-use SDK.
              </p>
              <ul className="space-y-4 mb-8">
                {['REST API', 'Python SDK', 'C++ Library', 'Real-Time Processing', 'Offline Mode', 'Cloud Integration'].map((feature) => (
                  <li key={feature} className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-secondary" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                    </svg>
                    <span className="text-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
              <button className="px-8 py-3 bg-gradient-to-r from-primary to-secondary text-primary-foreground font-semibold rounded-full hover:opacity-90 transition-opacity">
                Get Documentation
              </button>
            </div>
            <div className="relative h-96 rounded-lg overflow-hidden">
              <Image 
                src="/analytics-dashboard.jpg"
                alt="OptiExacta SDK"
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="bg-card/30 py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">Industry Solutions</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Tailored solutions for different industries and use cases
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { title: 'Government & Law Enforcement', icon: '🏛️', description: 'Real-time surveillance and criminal identification' },
              { title: 'Transportation & Airports', icon: '✈️', description: 'Passenger identification and security screening' },
              { title: 'Banking & Finance', icon: '🏦', description: 'Fraud prevention and identity verification' },
              { title: 'Retail & Commerce', icon: '🛍️', description: 'Customer analytics and loss prevention' },
              { title: 'Smart Cities', icon: '🏙️', description: 'Urban safety and crowd management' },
              { title: 'Healthcare', icon: '🏥', description: 'Patient identification and access control' }
            ].map((useCase) => (
              <div key={useCase.title} className="p-6 rounded-lg border border-border bg-card/50 hover:bg-card/80 transition-all hover:border-secondary">
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
