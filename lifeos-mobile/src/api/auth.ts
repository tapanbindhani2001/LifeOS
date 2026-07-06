import { apiGet, apiPost } from './client'

export interface LoginRequest { email: string; password: string }
export interface RegisterRequest { fullName: string; email: string; password: string }

export interface User {
  id: string
  fullName: string
  email: string
  role: string
  bio?: string
  avatarUrl?: string
}

export interface AuthResponse {
  token: string
  user: User
}

export const authApi = {
  login: (payload: LoginRequest) => apiPost<AuthResponse>('/auth/login', payload),
  register: (payload: RegisterRequest) => apiPost<AuthResponse>('/auth/register', payload),
  me: () => apiGet<User>('/users/me'),
}
