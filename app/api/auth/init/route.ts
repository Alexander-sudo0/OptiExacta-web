import { NextRequest, NextResponse } from 'next/server'
import { adminAuth } from '@/lib/firebase-admin'
import { extractBearerToken, getOrCreateUser } from '@/lib/auth-utils'

/**
 * POST /api/auth/init
 * Initialize user in Firestore after Firebase auth
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = extractBearerToken(authHeader)

    if (!token) {
      return NextResponse.json(
        { error: 'Missing authentication token' },
        { status: 401 }
      )
    }

    const decodedToken = await adminAuth.verifyIdToken(token)
    const { uid, email, name: displayName } = decodedToken

    await getOrCreateUser(uid, email || '', displayName)

    return NextResponse.json(
      {
        success: true,
        user: {
          uid,
          email,
          displayName,
        },
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Auth init error:', error)
    console.error('Error details:', {
      code: error.code,
      message: error.message,
      stack: error.stack?.split('\n').slice(0, 3).join('\n')
    })

    if (error.code === 'auth/id-token-expired') {
      return NextResponse.json(
        { error: 'Token expired' },
        { status: 401 }
      )
    }

    if (error.code === 'auth/invalid-id-token') {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    // Firebase Admin not configured
    if (error.message?.includes('private_key') || error.message?.includes('PEM')) {
      return NextResponse.json(
        { error: 'Firebase Admin not configured. Please add FIREBASE_PRIVATE_KEY to backend/.env' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'Authentication failed', details: error.message },
      { status: 500 }
    )
  }
}