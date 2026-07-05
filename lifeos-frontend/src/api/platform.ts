import { apiDelete, apiGet, apiPost, apiUpload } from './client'
import type {
  AdminStats,
  AdminUserRow,
  AppNotification,
  ChatMessage,
  Conversation,
  DocumentMeta,
  SendMessageRequest,
  Subscription,
  SubscriptionRequest,
} from '@/types'

export const documentsApi = {
  list: () => apiGet<DocumentMeta[]>('/documents'),
  upload: (file: File) => apiUpload<DocumentMeta>('/documents/upload', file),
  downloadUrl: (id: string) => `${import.meta.env.VITE_API_BASE_URL || '/api/v1'}/documents/${id}/download`,
  remove: (id: string) => apiDelete<void>(`/documents/${id}`),
}

export const notificationsApi = {
  list: () => apiGet<AppNotification[]>('/notifications'),
  unreadCount: () => apiGet<number>('/notifications/unread-count'),
  markAllRead: () => apiPost<void>('/notifications/read'),
}

export const subscriptionsApi = {
  me: () => apiGet<Subscription>('/subscriptions/me'),
  upgrade: (payload: SubscriptionRequest) => apiPost<Subscription>('/subscriptions', payload),
  cancel: () => apiPost<Subscription>('/subscriptions/cancel'),
}

export const aiApi = {
  listConversations: () => apiGet<Conversation[]>('/ai/conversations'),
  createConversation: () => apiPost<Conversation>('/ai/conversations'),
  messages: (conversationId: string) => apiGet<ChatMessage[]>(`/ai/conversations/${conversationId}/messages`),
  sendMessage: (conversationId: string, payload: SendMessageRequest) =>
    apiPost<ChatMessage>(`/ai/conversations/${conversationId}/messages`, payload),
  deleteConversation: (conversationId: string) => apiDelete<void>(`/ai/conversations/${conversationId}`),
}

export const adminApi = {
  stats: () => apiGet<AdminStats>('/admin/stats'),
  users: () => apiGet<AdminUserRow[]>('/admin/users'),
  toggleStatus: (id: string) => apiPost<AdminUserRow>(`/admin/users/${id}/toggle-status`),
  updateRole: (id: string, role: string) => apiPost<AdminUserRow>(`/admin/users/${id}/role`, { role }),
}
