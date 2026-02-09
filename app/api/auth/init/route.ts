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

    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    )
  }
}