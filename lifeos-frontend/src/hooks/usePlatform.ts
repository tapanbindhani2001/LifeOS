import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { adminApi, aiApi, documentsApi } from '@/api/platform'

// ---------------- Documents ----------------
export function useDocuments() {
  return useQuery({ queryKey: ['documents'], queryFn: documentsApi.list })
}

export function useUploadDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => documentsApi.upload(file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['documents'] })
      toast.success('Document uploaded')
    },
    onError: () => toast.error('Upload failed — file may exceed 10MB'),
  })
}

export function useDeleteDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => documentsApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['documents'] })
      toast.success('Document removed')
    },
  })
}

// ---------------- AI Assistant ----------------
export function useConversations() {
  return useQuery({ queryKey: ['ai', 'conversations'], queryFn: aiApi.listConversations })
}

export function useCreateConversation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: aiApi.createConversation,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ai', 'conversations'] }),
  })
}

export function useMessages(conversationId: string | null) {
  return useQuery({
    queryKey: ['ai', 'messages', conversationId],
    queryFn: () => aiApi.messages(conversationId as string),
    enabled: !!conversationId,
  })
}

export function useSendMessage(conversationId: string | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (content: string) => aiApi.sendMessage(conversationId as string, { role: 'USER', content }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ai', 'messages', conversationId] })
      qc.invalidateQueries({ queryKey: ['ai', 'conversations'] })
    },
    onError: () => toast.error('Message failed to send'),
  })
}

export function useDeleteConversation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => aiApi.deleteConversation(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ai', 'conversations'] }),
  })
}

// ---------------- Admin ----------------
export function useAdminStats() {
  return useQuery({ queryKey: ['admin', 'stats'], queryFn: adminApi.stats })
}

export function useAdminUsers() {
  return useQuery({ queryKey: ['admin', 'users'], queryFn: adminApi.users })
}

export function useToggleUserStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => adminApi.toggleStatus(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] })
      toast.success('User status updated')
    },
    onError: () => toast.error('Could not update — self-lockout is prevented'),
  })
}

export function useUpdateUserRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) => adminApi.updateRole(id, role),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] })
      toast.success('Role updated')
    },
  })
}
