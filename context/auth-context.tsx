'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  updateProfile,
} from 'firebase/auth'
import { auth } from '@/lib/firebase'

export interface User {
  uid: string
  email: string | null
  displayName: string | null
  photoURL: string | null
}

interface AuthContextType {
  user: User | null
  firebaseUser: FirebaseUser | null
  isLoading: boolean
  idToken: string | null
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string, displayName?: string) => Promise<void>
  loginWithGoogle: () => Promise<void>
  logout: () => Promise<void>
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [idToken, setIdToken] = useState<string | null>(null)

  const syncSession = async (token: string) => {
    await fetch('/api/auth/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })

    await fetch('/api/auth/init', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
  }

  // Check if we're in dev mode with skip auth
  const isDevMode = process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_SKIP_AUTH_IN_DEV === 'true'

  // Monitor auth state changes
  useEffect(() => {
    let unsubscribe: (() => void) | undefined

    const initAuth = async () => {
      // In dev mode with skip auth, set a fake authenticated user
      if (isDevMode) {
        console.log('[auth-context] DEV MODE: Setting dev user and token');
        setUser({
          uid: 'dev-user',
          email: 'dev@test.com',
          displayName: 'Alexandra',
          photoURL: null,
        })
        setIdToken('dev-token')
        setIsLoading(false)
        return
      }

      // Check for redirect result from Google Sign-In FIRST
      try {
        console.log('[Auth] Checking redirect result...')
        const result = await getRedirectResult(auth)
        if (result?.user) {
          console.log('[Auth] Got redirect result, user:', result.user.email)
          const token = await result.user.getIdToken()
          console.log('[Auth] Got token, syncing session...')
          setIdToken(token)
          await syncSession(token)
          console.log('[Auth] Session synced successfully')
        } else {
          console.log('[Auth] No redirect result')
        }
      } catch (error) {
        console.error('[Auth] Redirect result error:', error)
      }

      // Now set up the auth state listener
      unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        try {
          if (firebaseUser) {
            // User is signed in
            console.log('[Auth] User signed in:', firebaseUser.email)
            setFirebaseUser(firebaseUser)
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              photoURL: firebaseUser.photoURL,
            })

            // Get ID token for API calls and initialize server session
            const token = await firebaseUser.getIdToken()
            setIdToken(token)
            await syncSession(token)
            console.log('[Auth] User session established')
          } else {
            // User is signed out
            console.log('[Auth] User signed out')
            setFirebaseUser(null)
            setUser(null)
            setIdToken(null)
          }
        } catch (error) {
          console.error('Auth state change error:', error)
        } finally {
          setIsLoading(false)
        }
      })
    }

    initAuth()

    return () => {
      if (unsubscribe) {
        unsubscribe()
      }
    }
  }, [])

  const login = async (email: string, password: string) => {
    setIsLoading(true)
    try {
      const result = await signInWithEmailAndPassword(auth, email, password)
      const token = await result.user.getIdToken()
      setIdToken(token)
      await syncSession(token)
    } catch (error) {
      console.error('Login error:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const signup = async (email: string, password: string, displayName?: string) => {
    setIsLoading(true)
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password)

      // Update display name if provided
      if (displayName && auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName })
      }

      const token = await result.user.getIdToken()
      setIdToken(token)
      await syncSession(token)
    } catch (error) {
      console.error('Signup error:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const loginWithGoogle = async () => {
    setIsLoading(true)
    try {
      const provider = new GoogleAuthProvider()
      // Try popup first (works without third-party cookies)
      try {
        console.log('[Auth] Trying signInWithPopup...')
        const result = await signInWithPopup(auth, provider)
        console.log('[Auth] Popup sign-in successful:', result.user.email)
        const token = await result.user.getIdToken()
        setIdToken(token)
        setUser({
          uid: result.user.uid,
          email: result.user.email,
          displayName: result.user.displayName,
          photoURL: result.user.photoURL,
        })
        setFirebaseUser(result.user)
        await syncSession(token)
        console.log('[Auth] Session synced after popup')
      } catch (popupError: any) {
        console.warn('[Auth] Popup failed:', popupError.code, popupError.message)
        // If popup blocked or closed, fall back to redirect
        if (
          popupError.code === 'auth/popup-blocked' ||
          popupError.code === 'auth/popup-closed-by-user' ||
          popupError.code === 'auth/cancelled-popup-request'
        ) {
          console.log('[Auth] Falling back to signInWithRedirect...')
          await signInWithRedirect(auth, provider)
          return // Page will redirect
        }
        throw popupError
      }
    } catch (error) {
      console.error('Google login error:', error)
      setIsLoading(false)
      throw error
    }
  }

  const logout = async () => {
    setIsLoading(true)
    try {
      await signOut(auth)
      await fetch('/api/auth/session', { method: 'DELETE' })
      setUser(null)
      setFirebaseUser(null)
      setIdToken(null)
    } catch (error) {
      console.error('Logout error:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        isLoading,
        idToken,
        login,
        signup,
        loginWithGoogle,
        logout,
        isAuthenticated: user !== null,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
