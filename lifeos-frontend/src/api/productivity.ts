import { apiDelete, apiGet, apiPost, apiPut } from './client'
import type {
  Budget,
  CalendarEvent,
  CalendarEventRequest,
  CalendarFilters,
  Note,
  NoteRequest,
  Task,
  TaskFilters,
  TaskRequest,
  UpsertBudgetRequest,
} from '@/types'

export const tasksApi = {
  list: (filters?: TaskFilters) => apiGet<Task[]>('/tasks', filters as Record<string, unknown>),
  get: (id: string) => apiGet<Task>(`/tasks/${id}`),
  create: (payload: TaskRequest) => {
    console.log("tasksApi.create called with:", payload)
    return apiPost<Task>('/tasks', payload)
  },
  update: (id: string, payload: TaskRequest) => apiPut<Task>(`/tasks/${id}`, payload),
  remove: (id: string) => apiDelete<void>(`/tasks/${id}`),
}

export const notesApi = {
  list: () => apiGet<Note[]>('/notes'),
  get: (id: string) => apiGet<Note>(`/notes/${id}`),
  create: (payload: NoteRequest) => apiPost<Note>('/notes', payload),
  update: (id: string, payload: NoteRequest) => apiPut<Note>(`/notes/${id}`, payload),
  remove: (id: string) => apiDelete<void>(`/notes/${id}`),
}

export const calendarApi = {
  list: (filters?: CalendarFilters) => apiGet<CalendarEvent[]>('/calendar/events', filters as Record<string, unknown>),
  get: (id: string) => apiGet<CalendarEvent>(`/calendar/events/${id}`),
  create: (payload: CalendarEventRequest) => apiPost<CalendarEvent>('/calendar/events', payload),
  update: (id: string, payload: CalendarEventRequest) => apiPut<CalendarEvent>(`/calendar/events/${id}`, payload),
  remove: (id: string) => apiDelete<void>(`/calendar/events/${id}`),
}

export const budgetApi = {
  list: () => apiGet<Budget[]>('/budgets'),
  upsert: (payload: UpsertBudgetRequest) => apiPost<Budget>('/budgets', payload),
  remove: (id: string) => apiDelete<void>(`/budgets/${id}`),
}
