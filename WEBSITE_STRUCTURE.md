# OptiExacta SaaS Website

A modern, responsive SaaS website for OptiExacta Labs - NIST-ranked #1 facial recognition technology company.

## Website Structure

### Pages
- **Home** (`/`) - Main landing page with hero, features, solutions, stats, and CTAs
- **Products** (`/products`) - Product showcase with OptiExacta Platform and SDK details
- **Pricing** (`/pricing`) - Three-tier pricing plans (Starter, Professional, Enterprise) with FAQ
- **About** (`/about`) - Company story, mission, vision, and team information
- **Contact** (`/contact`) - Contact form and business information
- **Get Started** (`/get-started`) - Onboarding guide with 4-step process and resources

### Components

#### Layout Components
- **Navbar** - Fixed navigation with logo, menu, and CTA buttons (responsive mobile menu)
- **Footer** - Multi-column footer with links, contact info, and social media

#### Content Components
- **HeroSection** - Reusable hero component with background image, badge, and CTA buttons
- **FeatureCard** - Card component for showcasing features with icon support
- **StatCard** - Animated stat counter with gradient text
- **CTABanner** - Call-to-action section with primary and secondary buttons
- **FeatureWithGif** - Component for displaying features with GIF animations

## Design System

### Color Palette (5 colors)
- **Primary**: Cyan Blue (#00D9FF) - Used for primary actions and accents
- **Secondary**: Cyan (#00D9FF) → Orange (#FF6B35) gradient
- **Background**: Dark Navy (#000D0A)
- **Card**: Semi-transparent dark blue
- **Neutrals**: Grays from near-black to light gray

### Typography
- **Sans-serif**: Inter font for all text (headings and body)
- **Font sizes**: 5xl for main titles, 4xl for section titles, xl for body text
- **Font weights**: Bold (700) for headings, Regular (400) for body

### Layout
- Mobile-first responsive design
- Max-width container: 7xl (80rem)
- Flexbox for layouts
- Grid for multi-column sections
- Generous padding and spacing

## Animations & Effects

### CSS Animations
- **fade-in-up**: Content appears with upward movement
- **float**: Subtle floating motion for decorative elements
- **gradient-shift**: Animated gradient backgrounds
- **shimmer**: Text shimmer effect
- **glow-pulse**: Glowing effect for highlights

### Interactive Elements
- Hover effects on cards and buttons
- Smooth transitions on all interactive elements
- Gradient overlays on images
- Border color changes on hover

## Generated Assets

### Images
- `hero-facial-recognition.jpg` - Abstract facial mesh visualization
- `security-technology.jpg` - Server room with security elements
- `analytics-dashboard.jpg` - Data visualization interface
- `real-time-monitoring.jpg` - Live detection system interface

## Key Features

1. **NIST-Ranked Branding** - Prominent display of #1 ranking achievement
2. **Feature Showcase** - 6 main features with gradient cards
3. **Real-Time Stats** - Dynamic statistics section
4. **Solutions Lab** - Company innovation center showcase
5. **Multi-Industry Support** - 6 use cases across different sectors
6. **Flexible Pricing** - Three tiers with feature comparison
7. **Expert Team** - Team member showcase
8. **Comprehensive FAQ** - Answers to common questions
9. **Contact Integration** - Email form and business hours
10. **SEO Optimized** - Metadata, keywords, and Open Graph tags

## Technology Stack

- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS with custom theme tokens
- **Components**: React with TypeScript
- **Animations**: CSS keyframes and Tailwind animation utilities
- **Images**: Next.js Image component with optimization

## Customization

### Adding New Pages
1. Create a new directory under `/app`
2. Create a `page.tsx` file
3. Use existing components (Navbar, Footer, HeroSection)
4. Follow the established design patterns

### Updating Theme
Edit `app/globals.css` to modify:
- Color tokens (CSS variables)
- Animation keyframes
- Gradient utilities

### Modifying Navigation
Update `components/navbar.tsx` to add/remove menu items

## Performance Optimizations

- Image optimization with Next.js Image component
- CSS-based animations (no JavaScript)
- Lazy loading for images
- CSS classes for repeated styles (DRY principle)
- Semantic HTML structure

## Accessibility

- Semantic HTML elements
- ARIA labels and roles
- Alt text for all images
- Keyboard navigation support
- Color contrast compliance
- SR-only class for screen readers

## Deployment

Ready to deploy to Vercel with:
```bash
npm run build
npm run start
```

Or directly via Vercel CLI:
```bash
vercel
```

## Notes

- All pages follow a consistent design language
- Mobile-responsive across all breakpoints
- Dark theme optimized for modern interfaces
- Gradient accents create visual interest
- Professional copy emphasizes NIST ranking and technical excellence
