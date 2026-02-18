'use client'

import { useRouter } from 'next/navigation'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { HeroSection } from '@/components/hero-section'
import { useAuth } from '@/context/auth-context'

const plans = [
  {
    name: 'Free',
    code: 'FREE',
    price: '$0',
    period: '/month',
    description: 'Get started with facial recognition – no credit card required',
    popular: false,
    features: [
      '200 API requests/month',
      '15 requests/day (strict)',
      '3 video processes/month',
      '2 MB max image size',
      '1:1, 1:N, N:N Face Search',
      'Video Processing',
      'Analytics Dashboard',
      '14-day full trial',
    ],
    cta: 'Get Started Free',
    style: 'border-border hover:border-secondary',
  },
  {
    name: 'Pro',
    code: 'PRO',
    price: '$49.99',
    period: '/month',
    description: 'For teams and growing businesses',
    popular: true,
    features: [
      '500 API requests/month',
      '200 requests/day (soft limit)',
      'Unlimited video processing',
      '10 MB max image size',
      '1:1, 1:N, N:N Face Search',
      'Video Processing',
      'Advanced Analytics',
      'Priority Support',
    ],
    cta: 'Upgrade to Pro',
    style: 'border-2 border-primary',
  },
  {
    name: 'Enterprise',
    code: 'ENTERPRISE',
    price: '$199.99',
    period: '/month',
    description: 'For large-scale operations and custom needs',
    popular: false,
    features: [
      '5,000 API requests/month',
      'Unlimited daily requests',
      'Unlimited video processing',
      '20 MB max image size',
      '1:1, 1:N, N:N Face Search',
      'Video Processing',
      'Full Analytics & Reporting',
      'Dedicated Support & SLA',
    ],
    cta: 'Go Enterprise',
    style: 'border-border hover:border-secondary',
  },
]

export default function PricingPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuth()

  const handlePlanClick = (planCode: string) => {
    if (isLoading) return
    if (!isAuthenticated) {
      // Redirect to login, then come back to pricing
      router.push(`/login?redirect=/pricing`)
      return
    }
    // User is logged in — go to dashboard (payment flow handled there later)
    router.push('/dashboard')
  }

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
          {plans.map((plan) => (
            <div
              key={plan.code}
              className={`p-8 rounded-lg bg-card/50 hover:bg-card/80 transition-all relative overflow-hidden ${plan.style}`}
            >
              {plan.popular && (
                <div className="absolute top-0 right-0 px-4 py-1 bg-gradient-to-r from-primary to-secondary text-primary-foreground text-sm font-semibold rounded-bl">
                  Popular
                </div>
              )}
              <h3 className="text-2xl font-bold text-foreground mb-2">{plan.name}</h3>
              <p className="text-muted-foreground mb-6">{plan.description}</p>
              <div className="mb-8">
                <span className="text-5xl font-bold text-foreground">{plan.price}</span>
                <span className="text-muted-foreground ml-2">{plan.period}</span>
              </div>
              <ul className="space-y-4 mb-8">
                {plan.features.map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-secondary shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                    </svg>
                    <span className="text-foreground">{item}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handlePlanClick(plan.code)}
                className={`w-full py-3 rounded-full font-semibold transition-all ${
                  plan.popular
                    ? 'bg-gradient-to-r from-primary to-secondary text-primary-foreground hover:opacity-90'
                    : 'border-2 border-primary text-primary hover:bg-primary/10'
                }`}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-card/30 py-24">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-4xl font-bold text-foreground mb-12 text-center">Frequently Asked Questions</h2>
          
          <div className="space-y-6">
            {[
              { q: 'Can I upgrade or downgrade my plan?', a: 'Yes, you can change your plan at any time. Changes take effect at the next billing cycle.' },
              { q: 'What payment methods do you accept?', a: 'We accept all major credit cards and UPI via Razorpay.' },
              { q: 'Is there a free trial?', a: 'Yes! The Free plan gives you 200 requests/month. All new accounts also get a 14-day full-access trial.' },
              { q: 'What happens when I hit my limit?', a: 'Free plan requests are blocked at the daily limit. Pro plan has a soft daily limit — you get a warning but can continue. Enterprise has no daily limits.' },
              { q: 'What is your uptime guarantee?', a: 'We guarantee 99.99% uptime with SLA protection on Enterprise plans.' }
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
