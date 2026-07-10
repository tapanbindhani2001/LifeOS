import { apiGet, apiPost, apiPut } from './client'
import type { LoginRequest, LoginResponse, RegisterRequest, UpdateProfileRequest, User } from '@/types'

export const authApi = {
  login: (payload: LoginRequest) => apiPost<LoginResponse>('/auth/login', payload),
  register: (payload: RegisterRequest) => apiPost<LoginResponse>('/auth/register', payload),
  me: () => apiGet<User>('/users/me'),
  updateProfile: (payload: UpdateProfileRequest) => apiPut<User>('/users/me', payload),
  forgotPassword: (email: string) => apiPost<{ message: string; resetCode?: string }>('/auth/forgot-password', { email }),
  resetPassword: (payload: any) => apiPost<void>('/auth/reset-password', payload),
}
