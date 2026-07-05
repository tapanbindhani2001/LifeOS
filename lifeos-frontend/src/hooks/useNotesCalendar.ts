import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { calendarApi, notesApi } from '@/api/productivity'
import type { CalendarEventRequest, CalendarFilters, NoteRequest } from '@/types'

export function useNotes() {
  return useQuery({ queryKey: ['notes'], queryFn: notesApi.list })
}

export function useCreateNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: NoteRequest) => notesApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notes'] })
      toast.success('Note saved')
    },
  })
}

export function useUpdateNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: NoteRequest }) => notesApi.update(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notes'] })
      toast.success('Note updated')
    },
  })
}

export function useDeleteNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => notesApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notes'] })
      toast.success('Note deleted')
    },
  })
}

export function useCalendarEvents(filters?: CalendarFilters) {
  return useQuery({ queryKey: ['calendar', filters], queryFn: () => calendarApi.list(filters) })
}

export function useCreateEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CalendarEventRequest) => calendarApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['calendar'] })
      toast.success('Event added')
    },
  })
}

export function useDeleteEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => calendarApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['calendar'] })
      toast.success('Event removed')
    },
  })
}
