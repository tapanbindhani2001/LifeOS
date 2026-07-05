import { createContext, useContext } from 'react'
import type { User, LoginRequest, RegisterRequest } from '@/types'

export interface AuthContextType {
  isAuthenticated: boolean
  isLoading: boolean
  user: User | null
  login: (payload: LoginRequest) => Promise<void>
  register: (payload: RegisterRequest) => Promise<void>
  logout: () => void
  refreshProfile: () => Promise<void>
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
