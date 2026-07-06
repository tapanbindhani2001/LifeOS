import { apiGet, apiPost, apiPut, apiDelete } from './client'

// ── Tasks ──────────────────────────────────────────────────────────────────────
export const tasksApi = {
  list: () => apiGet<any[]>('/tasks'),
  create: (data: any) => apiPost<any>('/tasks', data),
  update: (id: string, data: any) => apiPut<any>(`/tasks/${id}`, data),
  delete: (id: string) => apiDelete(`/tasks/${id}`),
}

// ── Habits ─────────────────────────────────────────────────────────────────────
export const habitsApi = {
  list: () => apiGet<any[]>('/habits'),
  create: (data: any) => apiPost<any>('/habits', data),
  logCheckIn: (id: string) => apiPost<any>(`/habits/${id}/log`),
  delete: (id: string) => apiDelete(`/habits/${id}`),
}

// ── Notes ──────────────────────────────────────────────────────────────────────
export const notesApi = {
  list: () => apiGet<any[]>('/notes'),
  create: (data: any) => apiPost<any>('/notes', data),
  update: (id: string, data: any) => apiPut<any>(`/notes/${id}`, data),
  delete: (id: string) => apiDelete(`/notes/${id}`),
}

// ── Expenses ───────────────────────────────────────────────────────────────────
export const expensesApi = {
  list: () => apiGet<any[]>('/expenses'),
  summary: () => apiGet<any>('/expenses/summary'),
  create: (data: any) => apiPost<any>('/expenses', data),
  update: (id: string, data: any) => apiPut<any>(`/expenses/${id}`, data),
  delete: (id: string) => apiDelete(`/expenses/${id}`),
}

// ── Goals ──────────────────────────────────────────────────────────────────────
export const goalsApi = {
  list: () => apiGet<any[]>('/goals'),
  create: (data: any) => apiPost<any>('/goals', data),
  update: (id: string, data: any) => apiPut<any>(`/goals/${id}`, data),
  delete: (id: string) => apiDelete(`/goals/${id}`),
}

// ── Calendar Events ────────────────────────────────────────────────────────────
export const calendarApi = {
  list: () => apiGet<any[]>('/calendar/events'),
  create: (data: any) => apiPost<any>('/calendar/events', data),
  update: (id: string, data: any) => apiPut<any>(`/calendar/events/${id}`, data),
  delete: (id: string) => apiDelete(`/calendar/events/${id}`),
}

// ── Documents ──────────────────────────────────────────────────────────────────
const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8080/api/v1'
export const documentsApi = {
  list: () => apiGet<any[]>('/documents'),
  remove: (id: string) => apiDelete<void>(`/documents/${id}`),
  downloadUrl: (id: string) => `${BASE_URL}/documents/${id}/download`,
}

// ── Notifications ──────────────────────────────────────────────────────────────
export const notificationsApi = {
  list: () => apiGet<any[]>('/notifications'),
  unreadCount: () => apiGet<number>('/notifications/unread-count'),
  markAllRead: () => apiPost<void>('/notifications/read'),
}

export const remindersApi = notificationsApi

// ── Subscriptions ──────────────────────────────────────────────────────────────
export const subscriptionsApi = {
  me: () => apiGet<any>('/subscriptions/me'),
  upgrade: (data: any) => apiPost<any>('/subscriptions', data),
  cancel: () => apiPost<any>('/subscriptions/cancel'),
}

// ── AI Assistant ───────────────────────────────────────────────────────────────
export const aiApi = {
  listConversations: () => apiGet<any[]>('/ai/conversations'),
  createConversation: (title?: string) => apiPost<any>('/ai/conversations', { title: title || 'New Chat' }),
  messages: (conversationId: string) => apiGet<any[]>(`/ai/conversations/${conversationId}/messages`),
  sendMessage: (conversationId: string, payload: any) =>
    apiPost<any>(`/ai/conversations/${conversationId}/messages`, payload),
  deleteConversation: (conversationId: string) => apiDelete<void>(`/ai/conversations/${conversationId}`),
}

// ── Budget ─────────────────────────────────────────────────────────────────────
export const budgetApi = {
  list: () => apiGet<any[]>('/budgets'),
  upsert: (payload: { category: string; monthlyLimit: number }) => apiPost<any>('/budgets', payload),
  remove: (id: string) => apiDelete<void>(`/budgets/${id}`),
}
