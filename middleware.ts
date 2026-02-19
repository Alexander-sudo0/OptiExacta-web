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
  
  // Debug logging
  console.log('[Middleware]', {
    pathname,
    hasToken: !!firebaseToken,
    cookies: request.cookies.getAll().map(c => c.name)
  })
  
  // Determine if user is authenticated
  // In a real scenario, you'd verify the token against Firebase Admin SDK
  const isAuthenticated = !!firebaseToken
  
  // For protected routes, redirect to login if not authenticated
  if (protectedRoutes.some(route => pathname.startsWith(route))) {
    if (!isAuthenticated) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  // For login/signup pages, redirect to dashboard if already authenticated
  if ((pathname === '/login' || pathname === '/signup') && isAuthenticated) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

// Configure which routes to run middleware on
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)']
}
