import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import type { ApiResponse } from '@/types'

const TOKEN_KEY = 'lifeos_token'

export const tokenStorage = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
}

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Attach JWT token to every outgoing request
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = tokenStorage.get()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Custom error class carrying the backend's message + field errors
export class ApiError extends Error {
  status?: number
  errors: Record<string, string> | string[] | null

  constructor(message: string, status?: number, errors: Record<string, string> | string[] | null = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.errors = errors
  }
}

// Unwrap ApiResponse envelope, map errors to ApiError, and handle 401s globally
api.interceptors.response.use(
  (response) => {
    const body = response.data as ApiResponse<unknown>
    if (body && typeof body === 'object' && 'success' in body) {
      if (!body.success) {
        throw new ApiError(body.message || 'Request failed', response.status, body.errors)
      }
      // Return the unwrapped data directly to callers
      return { ...response, data: body.data }
    }
    return response
  },
  (error: AxiosError<ApiResponse<unknown>>) => {
    if (error.response) {
      const { status, data } = error.response
      const message = data?.message || error.message || 'Something went wrong'

      if (status === 401) {
        tokenStorage.clear()
        if (!window.location.pathname.startsWith('/login')) {
          window.location.href = '/login'
        }
      }

      return Promise.reject(new ApiError(message, status, data?.errors ?? null))
    }
    if (error.request) {
      return Promise.reject(new ApiError('Unable to reach the server. Please check your connection.'))
    }
    return Promise.reject(new ApiError(error.message))
  },
)

// Typed convenience wrapper — since the interceptor unwraps `data`,
// every call below returns T directly (not ApiResponse<T>).
export async function apiGet<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  const res = await api.get(url, { params })
  return res.data as T
}

export async function apiPost<T>(url: string, body?: unknown): Promise<T> {
  const res = await api.post(url, body)
  return res.data as T
}

export async function apiPut<T>(url: string, body?: unknown): Promise<T> {
  const res = await api.put(url, body)
  return res.data as T
}

export async function apiDelete<T = void>(url: string): Promise<T> {
  const res = await api.delete(url)
  return res.data as T
}

export async function apiUpload<T>(url: string, file: File, extraFields?: Record<string, string>): Promise<T> {
  const form = new FormData()
  form.append('file', file)
  if (extraFields) {
    Object.entries(extraFields).forEach(([k, v]) => form.append(k, v))
  }
  const res = await api.post(url, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data as T
}
