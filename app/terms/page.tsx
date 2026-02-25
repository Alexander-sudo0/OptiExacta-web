'use client'

import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="max-w-4xl mx-auto px-6 py-32">
        <h1 className="text-4xl font-bold text-foreground mb-4">Terms of Service</h1>
        <p className="text-sm text-muted-foreground mb-12">Last updated: February 25, 2026</p>

        <div className="space-y-8 text-muted-foreground leading-relaxed">
          <div>
            <h2 className="text-2xl font-semibold text-foreground mb-3">1. Acceptance of Terms</h2>
            <p>
              By accessing or using VisionEra (&quot;the Service&quot;), operated at visionera.live, you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use the Service.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-foreground mb-3">2. Description of Service</h2>
            <p>
              VisionEra provides a cloud-based AI recognition platform that enables users to perform face detection, verification, search, vehicle recognition, body detection, and analysis through a web dashboard and REST API. The Service includes 1:1 face matching, 1:N search, N:N comparison, liveness detection, and video processing capabilities.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-foreground mb-3">3. Account Registration</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>You must provide accurate and complete information when creating an account.</li>
              <li>You are responsible for maintaining the security of your account credentials and API keys.</li>
              <li>You must notify us immediately of any unauthorized access to your account.</li>
              <li>You must be at least 18 years old to use this Service.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-foreground mb-3">4. Acceptable Use</h2>
            <p className="mb-3">You agree NOT to use the Service to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Violate any applicable laws, regulations, or third-party rights.</li>
              <li>Process images or data without proper consent from the individuals depicted.</li>
              <li>Engage in surveillance, stalking, harassment, or discrimination.</li>
              <li>Attempt to reverse-engineer, circumvent, or compromise the platform&apos;s security.</li>
              <li>Exceed your plan&apos;s usage limits or abuse the API through automated means.</li>
              <li>Upload illegal, harmful, or offensive content.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-foreground mb-3">5. API Usage &amp; Rate Limits</h2>
            <p>
              API access is subject to the rate limits and quotas defined by your subscription plan. Exceeding these limits may result in throttling or temporary suspension. API keys are confidential and must not be shared publicly.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-foreground mb-3">6. Intellectual Property</h2>
            <p>
              The Service, including its software, design, logos, and documentation, is owned by VisionEra and protected by intellectual property laws. You retain ownership of content you upload but grant us a limited license to process it for providing the Service.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-foreground mb-3">7. Data &amp; Privacy</h2>
            <p>
              Your use of the Service is also governed by our{' '}
              <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a>.
              You are responsible for ensuring you have the legal right to process any biometric data you upload to the platform.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-foreground mb-3">8. Service Availability</h2>
            <p>
              We strive to maintain high availability but do not guarantee uninterrupted access. We may perform maintenance, updates, or modifications to the Service at any time. We are not liable for any downtime or service interruptions.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-foreground mb-3">9. Limitation of Liability</h2>
            <p>
              To the fullest extent permitted by law, VisionEra shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Service. Our total liability shall not exceed the amount you paid us in the 12 months preceding the claim.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-foreground mb-3">10. Termination</h2>
            <p>
              We reserve the right to suspend or terminate your account at any time for violation of these terms. Upon termination, your right to use the Service ceases immediately. You may also delete your account at any time.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-foreground mb-3">11. Changes to Terms</h2>
            <p>
              We may modify these Terms at any time. Continued use of the Service after changes constitutes acceptance of the new terms. We will notify users of material changes via email or platform notification.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-foreground mb-3">12. Contact</h2>
            <p>
              For questions about these Terms of Service, contact us at{' '}
              <a href="mailto:info@visionera.live" className="text-primary hover:underline">
                info@visionera.live
              </a>.
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
