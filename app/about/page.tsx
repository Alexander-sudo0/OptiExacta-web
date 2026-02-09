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
        title="About OptiExacta"
        subtitle="Leading the facial recognition revolution with NIST-ranked #1 technology"
        backgroundImage="/images/hero-facial-recognition.jpg"
        badge="Pioneering Innovation"
      />

      {/* Company Story */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-24">
          <div>
            <h2 className="text-4xl font-bold text-foreground mb-6">Our Journey</h2>
            <p className="text-lg text-muted-foreground mb-6">
              OptiExacta Labs is a trailblazing Indian company that ranks among the top in the National Institute of Standards and Technology (NIST) facial recognition leaderboard. We are the first Indian company to achieve the #1 ranking, a milestone that underscores our excellence in accuracy, speed, and reliability.
            </p>
            <p className="text-lg text-muted-foreground mb-6">
              Founded with a mission to revolutionize surveillance and security through cutting-edge technology, OptiExacta combines precision engineering with innovative solutions to meet the evolving challenges of modern security.
            </p>
            <p className="text-lg text-muted-foreground">
              Our commitment to excellence drives us to continuously improve and innovate, delivering unparalleled performance and reliability in every product we offer.
            </p>
          </div>
          <div className="relative h-96 rounded-lg overflow-hidden">
            <Image 
              src="/security-technology.jpg"
              alt="OptiExacta Innovation"
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
                To deliver advanced facial recognition technology that enhances security, streamlines operations, and enables organizations to make informed decisions swiftly and efficiently.
              </p>
            </div>
            <div className="p-8 rounded-lg border border-border bg-background/50">
              <h3 className="text-2xl font-bold text-foreground mb-4">Our Vision</h3>
              <p className="text-muted-foreground">
                To be the global leader in facial recognition technology, trusted by enterprises and governments worldwide for our accuracy, reliability, and commitment to innovation.
              </p>
            </div>
            <div className="p-8 rounded-lg border border-border bg-background/50">
              <h3 className="text-2xl font-bold text-foreground mb-4">Our Values</h3>
              <p className="text-muted-foreground">
                Innovation, accuracy, security, and collaboration. We foster a culture of continuous improvement and strive to exceed expectations in everything we do.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Technology Highlights */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-foreground mb-4">Why Choose OptiExacta</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Our technology stands out with proven performance and enterprise-grade capabilities
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {[
            { title: 'NIST Ranked #1', description: 'Top ranked in the National Institute of Standards and Technology facial recognition leaderboard' },
            { title: '99.9% Accuracy', description: 'Industry-leading accuracy rate across diverse facial recognition tasks' },
            { title: 'Real-Time Processing', description: 'Sub-100ms processing speed for instant facial recognition' },
            { title: 'Scalable Infrastructure', description: 'Built to handle millions of faces with enterprise-grade reliability' },
            { title: 'Multi-face Detection', description: 'Detect and identify multiple faces simultaneously in complex environments' },
            { title: 'Global Deployment', description: 'Deployed in 50+ countries across government, enterprise, and security sectors' }
          ].map((highlight) => (
            <div key={highlight.title} className="p-6 rounded-lg border border-border bg-card/50 hover:bg-card/80 transition-all hover:border-secondary">
              <h3 className="text-xl font-semibold text-foreground mb-3">{highlight.title}</h3>
              <p className="text-muted-foreground">{highlight.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Solutions Lab */}
      <section className="bg-card/30 py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="relative h-96 rounded-lg overflow-hidden">
              <Image 
                src="/analytics-dashboard.jpg"
                alt="Solutions Lab"
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
            </div>
            <div>
              <h2 className="text-4xl font-bold text-foreground mb-6">Solutions Lab</h2>
              <p className="text-lg text-muted-foreground mb-6">
                At OptiExacta Labs, we continuously develop and refine our advanced technology. Our innovation lab is where we explore new possibilities, test cutting-edge features, and create solutions that push the boundaries of facial recognition technology.
              </p>
              <p className="text-lg text-muted-foreground mb-6">
                We work closely with our clients to understand their unique challenges and develop tailored solutions that enhance their security and surveillance capabilities.
              </p>
              <button className="px-8 py-3 bg-gradient-to-r from-primary to-secondary text-primary-foreground font-semibold rounded-full hover:opacity-90 transition-opacity">
                Visit Our Lab
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-foreground mb-4">Expert Team</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Composed of leading researchers, engineers, and security experts
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {[
            { role: 'Chief Technology Officer', expertise: 'AI & Machine Learning' },
            { role: 'Security Director', expertise: 'Enterprise Security' },
            { role: 'Research Lead', expertise: 'Computer Vision' },
            { role: 'Product Manager', expertise: 'Strategic Vision' }
          ].map((member, idx) => (
            <div key={idx} className="text-center p-6 rounded-lg border border-border bg-card/50 hover:bg-card/80 transition-all">
              <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary to-secondary" />
              <h3 className="font-semibold text-foreground mb-2">{member.role}</h3>
              <p className="text-muted-foreground text-sm">{member.expertise}</p>
            </div>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  )
}
