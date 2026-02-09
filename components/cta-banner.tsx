import Link from 'next/link'

interface CTABannerProps {
  title: string
  subtitle: string
  primaryButton: { text: string; href: string }
  secondaryButton?: { text: string; href: string }
}

export function CTABanner({ title, subtitle, primaryButton, secondaryButton }: CTABannerProps) {
  return (
    <section className="relative py-24 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-secondary/10" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-cyan-orange rounded-full blur-3xl opacity-5" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-cyan-pink rounded-full blur-3xl opacity-5" />
      
      <div className="relative max-w-4xl mx-auto px-6 text-center">
        <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">{title}</h2>
        <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
          {subtitle}
        </p>
        <div className="flex flex-col md:flex-row items-center justify-center gap-4">
          <Link
            href={primaryButton.href}
            className="px-8 py-4 bg-gradient-to-r from-primary to-secondary text-primary-foreground font-semibold rounded-full hover:opacity-90 transition-opacity inline-block"
          >
            {primaryButton.text}
          </Link>
          {secondaryButton && (
            <Link
              href={secondaryButton.href}
              className="px-8 py-4 border-2 border-primary text-primary rounded-full hover:bg-primary/10 transition-colors font-semibold inline-block"
            >
              {secondaryButton.text}
            </Link>
          )}
        </div>
      </div>
    </section>
  )
}
