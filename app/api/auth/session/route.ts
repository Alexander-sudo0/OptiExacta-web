import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/auth/session
 * Store Firebase token in an httpOnly cookie for middleware checks
 */
export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json()

    if (!token) {
      return NextResponse.json({ error: 'Missing token' }, { status: 400 })
    }

    const response = NextResponse.json({ success: true })
    // Use secure cookies only when actually using HTTPS
    const isHttps = request.url.startsWith('https://')
    response.cookies.set('firebase_token', token, {
      httpOnly: true,
      secure: isHttps, // Only secure on HTTPS
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days instead of 1 hour
    })

    console.log('[Session API] Cookie set for token:', token.substring(0, 20) + '...')
    return response
  } catch (error) {
    console.error('[Session API] Error:', error)
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
  }
}

/**
 * DELETE /api/auth/session
 * Clear Firebase token cookie
 */
export async function DELETE(request: NextRequest) {
  const response = NextResponse.json({ success: true })
  const isHttps = request.url.startsWith('https://')
  response.cookies.set('firebase_token', '', {
    httpOnly: true,
    secure: isHttps,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
  return response
}