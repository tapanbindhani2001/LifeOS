// Core API client for LifeOS Mobile
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage'

export const TOKEN_KEY = 'lifeos_token'
const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8080/api/v1'

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
})

// Attach JWT token to every request
api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await AsyncStorage.getItem(TOKEN_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

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

// Response interceptor — unwrap ApiResponse envelope
api.interceptors.response.use(
  (response) => {
    const body = response.data
    if (body && typeof body === 'object' && 'success' in body) {
      if (!body.success) {
        throw new ApiError(body.message || 'Request failed', response.status, body.errors)
      }
      return { ...response, data: body.data }
    }
    return response
  },
  async (error: AxiosError<any>) => {
    if (error.response) {
      const { status, data } = error.response
      const message = data?.message || error.message || 'Something went wrong'
      if (status === 401) {
        await AsyncStorage.removeItem(TOKEN_KEY)
      }
      return Promise.reject(new ApiError(message, status, data?.errors ?? null))
    }
    if (error.request) {
      return Promise.reject(new ApiError('Unable to reach the server. Please check your connection.'))
    }
    return Promise.reject(new ApiError(error.message))
  }
)

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
