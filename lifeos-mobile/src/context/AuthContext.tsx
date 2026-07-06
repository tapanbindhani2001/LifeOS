import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { authApi, User, LoginRequest, RegisterRequest } from '../api/auth'
import { TOKEN_KEY } from '../api/client'

interface AuthContextValue {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (payload: LoginRequest) => Promise<void>
  logout: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refreshProfile = useCallback(async () => {
    const token = await AsyncStorage.getItem(TOKEN_KEY)
    if (!token) return
    try {
      const me = await authApi.me()
      setUser(me)
    } catch {
      await AsyncStorage.removeItem(TOKEN_KEY)
      setUser(null)
    }
  }, [])

  useEffect(() => {
    refreshProfile().finally(() => setIsLoading(false))
  }, [refreshProfile])

  const login = async (payload: LoginRequest) => {
    const resp = await authApi.login(payload)
    await AsyncStorage.setItem(TOKEN_KEY, resp.token)
    setUser(resp.user)
  }

  const logout = async () => {
    await AsyncStorage.removeItem(TOKEN_KEY)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
