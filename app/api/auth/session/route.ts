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
    response.cookies.set('firebase_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60,
    })

    return response
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
  }
}

/**
 * DELETE /api/auth/session
 * Clear Firebase token cookie
 */
export async function DELETE() {
  const response = NextResponse.json({ success: true })
  response.cookies.set('firebase_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
  return response
}