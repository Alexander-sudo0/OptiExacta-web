import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Public routes that don't require authentication
const publicRoutes = ['/', '/login', '/signup', '/products', '/pricing', '/about', '/contact', '/get-started', '/terms', '/privacy']

// Protected routes that require authentication
const protectedRoutes = ['/dashboard', '/admin']

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  
  // Check if user has Firebase token in sessionStorage (via browser context)
  // Note: For server-side check, we look for the token in cookies
  // In production, you would verify the token with Firebase Admin SDK
  const firebaseToken = request.cookies.get('firebase_token')?.value
  
  // Allow processing of OAuth redirects (from Google, etc.)
  // Firebase Auth uses URL fragments and state parameters
  const searchParams = request.nextUrl.searchParams
  const hasOAuthState = searchParams.has('state') || searchParams.has('code') || searchParams.has('oobCode')
  
  // Determine if user is authenticated
  // In a real scenario, you'd verify the token against Firebase Admin SDK
  const isAuthenticated = !!firebaseToken
  
  console.log('[Middleware]', {
    pathname,
    isAuthenticated,
    hasToken: !!firebaseToken,
    hasOAuthState,
    cookies: request.cookies.getAll().map(c => c.name)
  })
  
  // For protected routes, redirect to login if not authenticated
  // BUT allow OAuth redirect processing
  if (protectedRoutes.some(route => pathname.startsWith(route))) {
    if (!isAuthenticated && !hasOAuthState) {
      console.log('[Middleware] Redirecting to login - protected route, not authenticated')
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  // For login/signup pages, redirect to dashboard if already authenticated
  // BUT don't redirect if processing OAuth callback
  if ((pathname === '/login' || pathname === '/signup') && isAuthenticated && !hasOAuthState) {
    console.log('[Middleware] Redirecting to dashboard - already authenticated')
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

// Configure which routes to run middleware on
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)']
}
