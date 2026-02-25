'use client'

import React from "react"
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/auth-context'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'

export default function SignupPage() {
  const router = useRouter()
  const { signup, loginWithGoogle, isAuthenticated, isLoading } = useAuth()
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    company: '',
    password: '',
    confirmPassword: ''
  })
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/dashboard')
    }
  }, [isAuthenticated, isLoading, router])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')
    
    if (!formData.fullName || !formData.email || !formData.password || !formData.confirmPassword) {
      setError('Please fill in all required fields')
      setIsSubmitting(false)
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      setIsSubmitting(false)
      return
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters')
      setIsSubmitting(false)
      return
    }

    try {
      // Firebase signup
      await signup(formData.email, formData.password, formData.fullName)
      router.push('/dashboard')
    } catch (err: any) {
      // Handle Firebase signup errors
      if (err.code === 'auth/email-already-in-use') {
        setError('An account with this email already exists')
      } else if (err.code === 'auth/invalid-email') {
        setError('Invalid email address')
      } else if (err.code === 'auth/weak-password') {
        setError('Password is too weak. Use 6+ characters with numbers and symbols.')
      } else {
        setError(err.message || 'Failed to create account')
      }
      setFormData(prev => ({ ...prev, password: '', confirmPassword: '' }))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGoogleSignup = async () => {
    setError('')
    setIsSubmitting(true)

    try {
      await loginWithGoogle()
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message || 'Failed to sign up with Google')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl border-4 border-border border-t-primary animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (isAuthenticated) {
    return null
  }

  const features = [
    { icon: '🔒', title: 'Enterprise Security', desc: 'Bank-grade encryption' },
    { icon: '⚡', title: 'Real-time Processing', desc: 'Sub-second results' },
    { icon: '🎯', title: '99.9% Accuracy', desc: 'NIST top-ranked' },
    { icon: '🌐', title: 'Global Scale', desc: 'Multi-region support' }
  ]

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-secondary via-primary to-cyan-600">
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-20 left-20 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-20 right-20 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          </div>
          
          {/* Grid Pattern */}
          <div className="absolute inset-0 opacity-10" 
            style={{
              backgroundImage: `linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)`,
              backgroundSize: '50px 50px'
            }} 
          />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center p-12 text-white">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Link href="/" className="flex items-center gap-3 mb-12 hover:opacity-80 transition-opacity">
              <Image 
                src="/images/visionera-logo-white.png"
                alt="VisionEra"
                width={56}
                height={56}
                className="w-14 h-14 object-contain"
              />
              <span className="text-2xl font-bold tracking-tight">VisionEra</span>
            </Link>

            <h1 className="text-4xl font-bold mb-4 leading-tight">
              Start Your<br />
              <span className="text-white/90">Free Trial Today</span>
            </h1>
            <p className="text-lg text-white/70 mb-10 max-w-md">
              Join thousands of enterprises using VisionEra's NIST top-ranked facial recognition technology.
            </p>

            {/* Feature Grid */}
            <div className="grid grid-cols-2 gap-4 mb-10">
              {features.map((feature, i) => (
                <motion.div
                  key={feature.title}
                  className="p-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 hover:bg-white/15 transition-colors"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                >
                  <span className="text-2xl mb-2 block">{feature.icon}</span>
                  <h3 className="font-semibold text-sm">{feature.title}</h3>
                  <p className="text-xs text-white/60">{feature.desc}</p>
                </motion.div>
              ))}
            </div>

            {/* Testimonial */}
            <motion.div
              className="p-5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              <p className="text-white/80 italic text-sm mb-3">
                "VisionEra made face recognition incredibly easy. We set up our entire system in under an hour."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-white/20 to-white/5 flex items-center justify-center font-bold">
                  M
                </div>
                <div>
                  <p className="font-semibold text-sm">Michael Chen</p>
                  <p className="text-xs text-white/60">CTO, TechCorp Global</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12 relative">
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -right-32 w-64 h-64 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-gradient-to-tr from-secondary/5 to-primary/5 rounded-full blur-3xl" />
        </div>

        <motion.div 
          className="w-full max-w-md relative z-10"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-3 hover:opacity-80 transition-opacity">
              <Image 
                src="/images/visionera-logo-white.png"
                alt="VisionEra"
                width={48}
                height={48}
                className="w-12 h-12 object-contain"
              />
              <span className="text-xl font-bold text-foreground">VisionEra</span>
            </Link>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-foreground mb-2">Create your account</h2>
            <p className="text-muted-foreground">
              Get started with a free 14-day trial
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Full Name *</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </span>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder="John Doe"
                  className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-border bg-card/50 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Email Address *</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </span>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="john@company.com"
                  className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-border bg-card/50 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                />
              </div>
            </div>

            {/* Company (Optional) */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Company Name <span className="text-muted-foreground">(Optional)</span></label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </span>
                <input
                  type="text"
                  name="company"
                  value={formData.company}
                  onChange={handleChange}
                  placeholder="Your Company"
                  className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-border bg-card/50 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Password *</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full pl-12 pr-12 py-3.5 rounded-xl border border-border bg-card/50 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">Minimum 6 characters</p>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Confirm Password *</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </span>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full pl-12 pr-12 py-3.5 rounded-xl border border-border bg-card/50 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showConfirmPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Error Message */}
            <AnimatePresence>
              {error && (
                <motion.div 
                  className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm flex items-center gap-3"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Terms */}
            <p className="text-xs text-muted-foreground">
              By creating an account, you agree to our{' '}
              <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link>
              {' '}and{' '}
              <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
            </p>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 bg-gradient-to-r from-primary to-secondary text-primary-foreground font-bold rounded-xl hover:opacity-90 transition-all focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
            >
              {isSubmitting ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Creating account...
                </>
              ) : (
                <>
                  Create Account
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3 bg-background text-muted-foreground">or continue with</span>
            </div>
          </div>

          {/* Google Signup */}
          <motion.button
            type="button"
            onClick={handleGoogleSignup}
            disabled={isSubmitting}
            className="w-full py-3.5 px-4 border border-border bg-card hover:bg-card/80 text-foreground font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            {isSubmitting ? 'Creating account...' : 'Continue with Google'}
          </motion.button>

          {/* Divider - Updated */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3 bg-background text-muted-foreground">Already have an account?</span>
            </div>
          </div>

          {/* Login Link */}
          <Link
            href="/login"
            className="w-full block text-center py-3.5 border border-border rounded-xl text-foreground hover:bg-card/50 hover:border-primary/30 transition-all font-medium"
          >
            Sign in instead
          </Link>

          {/* Info */}
          <div className="mt-6 p-4 rounded-xl border border-border/50 bg-card/20 text-center">
            <p className="text-xs text-muted-foreground">
              All new accounts receive a <span className="text-primary font-semibold">14-day free trial</span> with full access
            </p>
          </div>

          {/* Back Link */}
          <div className="text-center mt-6">
            <Link href="/" className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Home
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
