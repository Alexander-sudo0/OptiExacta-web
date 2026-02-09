import { adminAuth, adminDb } from './firebase-admin'

/**
 * Verify Firebase ID token
 * This should be called on every API request
 */
export async function verifyFirebaseToken(token: string) {
  try {
    const decodedToken = await adminAuth.verifyIdToken(token)
    return decodedToken
  } catch (error) {
    console.error('Token verification failed:', error)
    return null
  }
}

/**
 * Extract Bearer token from Authorization header
 */
export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }
  return authHeader.substring(7)
}

/**
 * Get or create user in Firestore
 */
export async function getOrCreateUser(uid: string, email: string, displayName?: string) {
  const userRef = adminDb.collection('users').doc(uid)
  const userDoc = await userRef.get()

  if (userDoc.exists) {
    return userDoc.data()
  }

  // Create new user
  const newUser = {
    uid,
    email,
    displayName: displayName || email.split('@')[0],
    createdAt: new Date(),
    updatedAt: new Date(),
    plan: 'free', // Default plan
    status: 'active',
  }

  await userRef.set(newUser)

  // Create default tenant for user
  const tenantRef = adminDb.collection('tenants').doc()
  const tenantData = {
    name: `${displayName || email}'s Workspace`,
    ownerId: uid,
    createdAt: new Date(),
    updatedAt: new Date(),
    members: [
      {
        uid,
        email,
        role: 'admin',
        joinedAt: new Date(),
      },
    ],
  }

  await tenantRef.set(tenantData)

  // Create subscription
  const subscriptionRef = adminDb.collection('subscriptions').doc()
  await subscriptionRef.set({
    tenantId: tenantRef.id,
    userId: uid,
    plan: 'free',
    status: 'active',
    trialEndsAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days
    createdAt: new Date(),
    updatedAt: new Date(),
    features: {
      oneToOne: true,
      oneToN: false,
      watchlist: false,
      videoProcessing: false,
      apiAccess: true,
    },
    limits: {
      dailyRequests: 100,
      imageSizeMB: 2,
    },
  })

  return newUser
}

/**
 * Get user profile
 */
export async function getUserProfile(uid: string) {
  const userDoc = await adminDb.collection('users').doc(uid).get()
  return userDoc.exists ? userDoc.data() : null
}

/**
 * Get user's primary tenant
 */
export async function getUserTenant(uid: string) {
  const snapshot = await adminDb
    .collection('tenants')
    .where('ownerId', '==', uid)
    .limit(1)
    .get()

  if (snapshot.empty) {
    return null
  }

  return {
    id: snapshot.docs[0].id,
    ...snapshot.docs[0].data(),
  }
}

/**
 * Get user's current subscription
 */
export async function getUserSubscription(uid: string) {
  const snapshot = await adminDb
    .collection('subscriptions')
    .where('userId', '==', uid)
    .orderBy('createdAt', 'desc')
    .limit(1)
    .get()

  if (snapshot.empty) {
    return null
  }

  return {
    id: snapshot.docs[0].id,
    ...snapshot.docs[0].data(),
  }
}

/**
 * Check if user has feature access based on plan
 */
export async function checkFeatureAccess(uid: string, feature: string): Promise<boolean> {
  const subscription = await getUserSubscription(uid)

  if (!subscription) {
    return false
  }

  // Check if feature is enabled in subscription
  if (feature in subscription.features) {
    return subscription.features[feature] === true
  }

  return false
}

/**
 * Check daily usage limits
 */
export async function checkUsageLimit(uid: string, tenantId: string): Promise<boolean> {
  const subscription = await getUserSubscription(uid)

  if (!subscription) {
    return false
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const usageSnapshot = await adminDb
    .collection('usage')
    .where('tenantId', '==', tenantId)
    .where('date', '>=', today)
    .get()

  const dailyUsage = usageSnapshot.docs.reduce((sum, doc) => sum + (doc.data().requestCount || 0), 0)
  const dailyLimit = subscription.limits?.dailyRequests || 100

  return dailyUsage < dailyLimit
}
