import { useState, useEffect, useCallback, type ReactNode } from 'react'
import toast from 'react-hot-toast'
import { authApi } from '@/api/auth'
import { AuthContext } from './AuthContext'
import type { User, LoginRequest, RegisterRequest } from '@/types'

const TOKEN_KEY = 'lifeos_token'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refreshProfile = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) return
    try {
      const me = await authApi.me()
      setUser(me)
    } catch {
      localStorage.removeItem(TOKEN_KEY)
      setUser(null)
    }
  }, [])

  // Restore session on mount
  useEffect(() => {
    refreshProfile().finally(() => setIsLoading(false))
  }, [refreshProfile])

  const login = async (payload: LoginRequest) => {
    const resp = await authApi.login(payload)
    localStorage.setItem(TOKEN_KEY, resp.token)
    setUser(resp.user)
    toast.success(`Welcome back, ${resp.user.fullName.split(' ')[0]}!`)
  }

  const register = async (payload: RegisterRequest) => {
    const resp = await authApi.register(payload)
    localStorage.setItem(TOKEN_KEY, resp.token)
    setUser(resp.user)
    toast.success('Account created — welcome to LifeOS!')
  }

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY)
    setUser(null)
    toast.success('Logged out successfully')
  }

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!user,
        isLoading,
        user,
        login,
        register,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
