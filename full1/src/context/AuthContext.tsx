import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ApiError, authApi, getToken, setToken, type ApiEnvelope, type SafeUser } from '@/lib/api'

interface AuthContextValue {
  user: SafeUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<SafeUser>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  updateProfile: (data: { name?: string; avatar?: string | null }) => Promise<SafeUser>
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

// Shared across mounts so the initial /auth/profile request fires at most
// once per app load (e.g. React StrictMode double-mounts in dev) and is
// never automatically retried when it fails (e.g. 429 rate limiting).
let profileRequest: Promise<ApiEnvelope<SafeUser>> | null = null

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SafeUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    if (!getToken()) {
      setLoading(false)
      return
    }
    if (!profileRequest) profileRequest = authApi.profile()
    profileRequest
      .then((res) => {
        if (active) setUser(res.data)
      })
      .catch((err) => {
        // Only invalidate token if backend explicitly rejected auth (401 or 403)
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          setToken(null)
          if (active) setUser(null)
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    const handleUnauthorized = () => {
      if (active) setUser(null)
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('auth:unauthorized', handleUnauthorized)
    }

    return () => {
      active = false
      if (typeof window !== 'undefined') {
        window.removeEventListener('auth:unauthorized', handleUnauthorized)
      }
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    profileRequest = null
    const res = await authApi.login({ email, password })
    setToken(res.data.accessToken)
    setUser(res.data.user)
    return res.data.user
  }, [])

  const register = useCallback(async (name: string, email: string, password: string) => {
    profileRequest = null
    const res = await authApi.register({ name, email, password })
    setToken(res.data.accessToken)
    setUser(res.data.user)
  }, [])

  const logout = useCallback(async () => {
    profileRequest = null
    try {
      await authApi.logout()
    } catch {
      // ignore — clear local state regardless
    }
    setToken(null)
    setUser(null)
  }, [])

  const updateProfile = useCallback(async (data: { name?: string; avatar?: string | null }) => {
    const res = await authApi.updateProfile(data)
    setUser(res.data)
    return res.data
  }, [])

  const changePassword = useCallback(async (oldPassword: string, newPassword: string) => {
    await authApi.changePassword({ oldPassword, newPassword })
  }, [])

  const value = useMemo(
    () => ({ user, loading, login, register, logout, updateProfile, changePassword }),
    [user, loading, login, register, logout, updateProfile, changePassword],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
