'use client'

import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { HeroSection } from '@/components/hero-section'
import { CTABanner } from '@/components/cta-banner'

export default function GetStartedPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <HeroSection 
        title="Get Started with VisionEra"
        subtitle="Begin your journey with world-class facial recognition technology in minutes"
        badge="Quick Start"
      />

      {/* Steps Section */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-foreground mb-4">Four Simple Steps</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Get up and running with VisionEra in just a few minutes
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              step: '01',
              title: 'Sign Up',
              description: 'Create your free account with our simple registration process. No credit card required for the trial.'
            },
            {
              step: '02',
              title: 'Choose a Plan',
              description: 'Select the plan that best fits your needs. Start with our Starter plan or go straight to Professional.'
            },
            {
              step: '03',
              title: 'Upload & Search',
              description: 'Upload face photos or videos to your dashboard. Search and match faces instantly from your browser.'
            },
            {
              step: '04',
              title: 'Get Results',
              description: 'View match results, confidence scores, and analytics. Scale your usage as your needs grow.'
            }
          ].map((item) => (
            <div key={item.step} className="p-6 rounded-lg border border-border bg-card/50 hover:bg-card/80 transition-all">
              <div className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-4">
                {item.step}
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">{item.title}</h3>
              <p className="text-muted-foreground">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Resources Section */}
      <section className="bg-card/30 py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-4">Resources & Support</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Everything you need to succeed with VisionEra
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { title: 'API Documentation', icon: '📚', desc: 'Comprehensive API reference with examples and best practices' },
              { title: 'Video Tutorials', icon: '💻', desc: 'Step-by-step guides for using every feature on the platform' },
              { title: 'Video Tutorials', icon: '🎥', desc: 'Step-by-step video guides for common integration scenarios' },
              { title: 'Community Forum', icon: '💬', desc: 'Connect with other developers and get answers quickly' },
              { title: 'Support Team', icon: '🤝', desc: 'Expert support available via email and priority chat' },
              { title: 'Webinars', icon: '📡', desc: 'Monthly webinars on advanced topics and use cases' }
            ].map((resource) => (
              <div key={resource.title} className="p-6 rounded-lg border border-border bg-background/50 hover:bg-card/50 transition-all">
                <div className="text-4xl mb-4">{resource.icon}</div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{resource.title}</h3>
                <p className="text-muted-foreground text-sm">{resource.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="max-w-4xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-foreground mb-4">Common Questions</h2>
        </div>

        <div className="space-y-6">
          {[
            {
              q: 'How long does the onboarding process take?',
              a: 'Most customers are up and running within 30 minutes. Our SDK is easy to integrate and well-documented.'
            },
            {
              q: 'Do you offer a free trial?',
              a: 'Yes! We offer a 14-day free trial with full access to all features. No credit card required.'
            },
            {
              q: 'Do I need coding skills to use VisionEra?',
              a: 'No! Everything is done from the web dashboard. Just upload photos or videos and search — no code needed.'
            },
            {
              q: 'Is there technical support during integration?',
              a: 'Yes, our technical team is available to help via email, chat, and video calls during your integration.'
            },
            {
              q: 'Can I upgrade or downgrade my plan?',
              a: 'Absolutely. You can change your plan at any time, and we\'ll prorate the charges accordingly.'
            }
          ].map((item, idx) => (
            <div key={idx} className="p-6 rounded-lg border border-border bg-card/50">
              <h3 className="text-lg font-semibold text-foreground mb-3">{item.q}</h3>
              <p className="text-muted-foreground">{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <CTABanner
        title="Ready to Transform Your Security?"
        subtitle="Join hundreds of organizations already using VisionEra's facial recognition platform."
        primaryButton={{ text: 'Start Free Trial', href: '#' }}
        secondaryButton={{ text: 'Schedule a Demo', href: '/contact' }}
      />

      <Footer />
    </div>
  )
}
