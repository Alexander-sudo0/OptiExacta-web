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
        title="Facial Recognition Powered by AI"
        subtitle="NIST-ranked #1 facial recognition technology. Real-time detection, identification, and analytics for enterprise security."
        backgroundImage="/images/hero-facial-recognition.jpg"
        badge="Industry-Leading Accuracy"
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
            Capabilities
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">Advanced Features</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Cutting-edge facial recognition features designed for security, safety, and enterprise solutions
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <FeatureCard 
            icon={<svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>}
            title="Real-Time Detection"
            description="Instant facial recognition in crowds with 99.9% accuracy. Process multiple faces simultaneously."
            gradient
            index={0}
          />
          <FeatureCard 
            icon={<svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>}
            title="NIST Certified"
            description="Ranked #1 in NIST facial recognition leaderboard. First Indian company to achieve this status."
            index={1}
          />
          <FeatureCard 
            icon={<svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>}
            title="Instant Analytics"
            description="Retrospective and real-time event insights. Comprehensive data analysis and reporting."
            gradient
            index={2}
          />
          <FeatureCard 
            icon={<svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>}
            title="Location Tracking"
            description="Efficient location tracking and analysis with body-based and vehicle identification."
            index={3}
          />
          <FeatureCard 
            icon={<svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>}
            title="Enterprise Security"
            description="Multi-layered security with DDoS protection, firewalls, and 24/7 monitoring."
            gradient
            index={4}
          />
          <FeatureCard 
            icon={<svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>}
            title="Fast Integration"
            description="Seamless integration with existing infrastructure. Designed for easy deployment."
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
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">Simple Integration</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Get started in minutes with our easy-to-use API and comprehensive documentation
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Upload', desc: 'Upload facial images or connect video streams', icon: '📤' },
              { step: '02', title: 'Process', desc: 'Our AI analyzes and extracts facial features', icon: '⚡' },
              { step: '03', title: 'Results', desc: 'Get instant matches and detailed analytics', icon: '✅' }
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

      {/* Solutions Section */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
                Solutions
              </span>
              <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
                Real-Time Surveillance Solutions
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Monitor critical areas with comprehensive surveillance capabilities. Our advanced technology delivers real-time insights with instant face recognition in crowds and vehicle identification across network cameras.
              </p>
              <ul className="space-y-4 mb-8">
                {['Public Safety Monitoring', 'Fraud Prevention', 'Identity Verification', 'Urban Security'].map((item, i) => (
                  <motion.li 
                    key={item} 
                    className="flex items-center gap-3"
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: i * 0.1 }}
                    viewport={{ once: true }}
                  >
                    <div className="w-6 h-6 rounded-full bg-gradient-to-r from-primary to-secondary flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                      </svg>
                    </div>
                    <span className="text-foreground font-medium">{item}</span>
                  </motion.li>
                ))}
              </ul>
              <Link 
                href="/products"
                className="inline-flex items-center gap-2 text-primary font-semibold hover:gap-3 transition-all"
              >
                Learn more
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </motion.div>
            <motion.div 
              className="relative"
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <div className="relative h-[500px] rounded-2xl overflow-hidden border border-border/50 shadow-2xl shadow-primary/10">
                <Image 
                  src="/images/real-time-monitoring.jpg"
                  alt="Real-time monitoring system"
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
                
                {/* Floating stats card */}
                <motion.div 
                  className="absolute bottom-6 left-6 right-6 p-4 rounded-xl bg-card/80 backdrop-blur-md border border-border/50"
                  initial={{ y: 20, opacity: 0 }}
                  whileInView={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  viewport={{ once: true }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Active Cameras</p>
                      <p className="text-2xl font-bold text-foreground">24</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Faces Detected</p>
                      <p className="text-2xl font-bold text-secondary">1,247</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Alerts Today</p>
                      <p className="text-2xl font-bold text-primary">12</p>
                    </div>
                  </div>
                </motion.div>
              </div>
              
              {/* Decorative elements */}
              <div className="absolute -z-10 -top-4 -right-4 w-full h-full rounded-2xl border border-primary/20" />
              <div className="absolute -z-20 -top-8 -right-8 w-full h-full rounded-2xl border border-secondary/10" />
            </motion.div>
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
              { label: 'NIST Rank', value: '#1', sublabel: 'Global Ranking' },
              { label: 'Accuracy Rate', value: '99.9%', sublabel: 'Face Recognition' },
              { label: 'Processing', value: '<100ms', sublabel: 'Response Time' },
              { label: 'Deployments', value: '50+', sublabel: 'Countries' }
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
                
                {/* Glow effect */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary/10 to-secondary/10 opacity-0 group-hover:opacity-100 transition-opacity -z-10 blur-xl" />
              </motion.div>
            ))}
          </div>
        </motion.div>
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
            <h2 className="text-4xl md:text-6xl font-bold text-foreground mb-6">Ready to Transform Your Security?</h2>
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              Join leading enterprises using OptiExacta's facial recognition technology. Start your free trial today.
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
                Schedule a Demo
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
