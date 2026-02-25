'use client'

import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="max-w-4xl mx-auto px-6 py-32">
        <h1 className="text-4xl font-bold text-foreground mb-4">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-12">Last updated: February 25, 2026</p>

        <div className="space-y-8 text-muted-foreground leading-relaxed">
          <div>
            <h2 className="text-2xl font-semibold text-foreground mb-3">1. Introduction</h2>
            <p>
              VisionEra (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) operates the visionera.live website and facial recognition platform. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our service.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-foreground mb-3">2. Information We Collect</h2>
            <p className="mb-3">We may collect the following types of information:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong className="text-foreground">Account Information:</strong> Name, email address, and authentication credentials when you create an account.</li>
              <li><strong className="text-foreground">Usage Data:</strong> Information about how you interact with our platform, including API calls, feature usage, and session data.</li>
              <li><strong className="text-foreground">Uploaded Content:</strong> Images, videos, and biometric data you upload to our platform for facial recognition processing.</li>
              <li><strong className="text-foreground">Device Information:</strong> Browser type, IP address, and device identifiers for security and analytics purposes.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-foreground mb-3">3. How We Use Your Information</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>To provide and maintain our facial recognition services.</li>
              <li>To authenticate your identity and manage your account.</li>
              <li>To process and analyze images/videos as requested by you.</li>
              <li>To monitor usage, enforce rate limits, and prevent abuse.</li>
              <li>To communicate with you about your account, updates, and support.</li>
              <li>To improve our platform and develop new features.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-foreground mb-3">4. Data Storage &amp; Security</h2>
            <p>
              We implement industry-standard security measures including encryption at rest and in transit, access controls, and regular security audits. Uploaded images and biometric data are stored securely and are only accessible to authorized personnel and your account.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-foreground mb-3">5. Data Retention</h2>
            <p>
              We retain your account information for as long as your account is active. Uploaded content and processing results are retained according to your subscription plan. You may request deletion of your data at any time by contacting us.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-foreground mb-3">6. Third-Party Services</h2>
            <p>
              We use Google Firebase for authentication. When you sign in, Google&apos;s privacy policy applies to the authentication process. We do not sell, trade, or share your personal data with third parties for marketing purposes.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-foreground mb-3">7. Your Rights</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Access and receive a copy of your personal data.</li>
              <li>Request correction of inaccurate data.</li>
              <li>Request deletion of your data.</li>
              <li>Withdraw consent for data processing.</li>
              <li>Lodge a complaint with a data protection authority.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-foreground mb-3">8. Cookies</h2>
            <p>
              We use essential cookies to maintain your session and authentication state. We do not use tracking or advertising cookies.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-foreground mb-3">9. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new policy on this page with an updated revision date.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-foreground mb-3">10. Contact Us</h2>
            <p>
              If you have questions about this Privacy Policy, please contact us at{' '}
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
