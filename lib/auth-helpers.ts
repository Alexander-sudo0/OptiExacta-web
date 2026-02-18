// Simple helper to check user's system role from backend
export async function checkUserRole(): Promise<'SUPER_ADMIN' | 'ADMIN' | 'USER' | null> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3011'}/api/auth/session`, {
      credentials: 'include',
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.user?.systemRole || 'USER'
  } catch {
    return null
  }
}
