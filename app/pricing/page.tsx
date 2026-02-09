'use client'

import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { HeroSection } from '@/components/hero-section'

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <HeroSection 
        title="Flexible Pricing Plans"
        subtitle="Choose the perfect plan for your facial recognition needs"
        badge="Transparent Pricing"
      />

      {/* Pricing Cards */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Starter */}
          <div className="p-8 rounded-lg border border-border bg-card/50 hover:bg-card/80 transition-all hover:border-secondary">
            <h3 className="text-2xl font-bold text-foreground mb-2">Starter</h3>
            <p className="text-muted-foreground mb-6">Perfect for pilots and testing</p>
            <div className="mb-8">
              <span className="text-5xl font-bold text-foreground">$99</span>
              <span className="text-muted-foreground ml-2">/month</span>
            </div>
            <ul className="space-y-4 mb-8">
              {['10,000 API calls/month', '1:1 Face Verification', 'Email Support', 'Basic Analytics', 'REST API'].map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-secondary" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                  </svg>
                  <span className="text-foreground">{item}</span>
                </li>
              ))}
            </ul>
            <button className="w-full py-3 border-2 border-primary text-primary rounded-full hover:bg-primary/10 transition-colors font-semibold">
              Get Started
            </button>
          </div>

          {/* Professional */}
          <div className="p-8 rounded-lg border-2 border-primary bg-card/80 hover:bg-card transition-all relative overflow-hidden">
            <div className="absolute top-0 right-0 px-4 py-1 bg-gradient-to-r from-primary to-secondary text-primary-foreground text-sm font-semibold rounded-bl">
              Popular
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-2">Professional</h3>
            <p className="text-muted-foreground mb-6">Best for most enterprises</p>
            <div className="mb-8">
              <span className="text-5xl font-bold text-foreground">$999</span>
              <span className="text-muted-foreground ml-2">/month</span>
            </div>
            <ul className="space-y-4 mb-8">
              {['1M API calls/month', '1:1 & 1:N Face Search', 'Priority Support', 'Advanced Analytics', 'Python SDK', 'Real-Time Monitoring'].map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-secondary" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                  </svg>
                  <span className="text-foreground">{item}</span>
                </li>
              ))}
            </ul>
            <button className="w-full py-3 bg-gradient-to-r from-primary to-secondary text-primary-foreground rounded-full hover:opacity-90 transition-opacity font-semibold">
              Get Started
            </button>
          </div>

          {/* Enterprise */}
          <div className="p-8 rounded-lg border border-border bg-card/50 hover:bg-card/80 transition-all hover:border-secondary">
            <h3 className="text-2xl font-bold text-foreground mb-2">Enterprise</h3>
            <p className="text-muted-foreground mb-6">Custom solutions for large scale</p>
            <div className="mb-8">
              <span className="text-5xl font-bold text-foreground">Custom</span>
              <span className="text-muted-foreground ml-2">pricing</span>
            </div>
            <ul className="space-y-4 mb-8">
              {['Unlimited API calls', 'All Features', 'Dedicated Support', '24/7 Monitoring', 'Custom Integration', 'SLA Guarantee'].map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-secondary" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                  </svg>
                  <span className="text-foreground">{item}</span>
                </li>
              ))}
            </ul>
            <button className="w-full py-3 border-2 border-secondary text-secondary rounded-full hover:bg-secondary/10 transition-colors font-semibold">
              Contact Sales
            </button>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-card/30 py-24">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-4xl font-bold text-foreground mb-12 text-center">Frequently Asked Questions</h2>
          
          <div className="space-y-6">
            {[
              { q: 'Can I upgrade or downgrade my plan?', a: 'Yes, you can change your plan at any time. Changes take effect at the next billing cycle.' },
              { q: 'What payment methods do you accept?', a: 'We accept all major credit cards, bank transfers, and wire transfers for enterprise plans.' },
              { q: 'Is there a free trial?', a: 'Yes, we offer a 14-day free trial with full access to all features on any plan.' },
              { q: 'Do you offer volume discounts?', a: 'Yes, volume discounts are available for enterprise customers. Contact our sales team for details.' },
              { q: 'What is your uptime guarantee?', a: 'We guarantee 99.99% uptime with SLA protection on all enterprise plans.' }
            ].map((item, idx) => (
              <div key={idx} className="p-6 rounded-lg border border-border bg-card/50 hover:bg-card/80 transition-all">
                <h3 className="text-lg font-semibold text-foreground mb-3">{item.q}</h3>
                <p className="text-muted-foreground">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
