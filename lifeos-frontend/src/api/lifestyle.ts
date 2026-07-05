import { apiDelete, apiGet, apiPost, apiPut } from './client'
import type {
  Expense,
  ExpenseFilters,
  ExpenseRequest,
  ExpenseSummary,
  Goal,
  GoalRequest,
  Habit,
  HabitRequest,
} from '@/types'

export const expensesApi = {
  list: (filters?: ExpenseFilters) => apiGet<Expense[]>('/expenses', filters as Record<string, unknown>),
  summary: () => apiGet<ExpenseSummary>('/expenses/summary'),
  create: (payload: ExpenseRequest) => apiPost<Expense>('/expenses', payload),
  update: (id: string, payload: ExpenseRequest) => apiPut<Expense>(`/expenses/${id}`, payload),
  remove: (id: string) => apiDelete<void>(`/expenses/${id}`),
}

export const habitsApi = {
  list: () => apiGet<Habit[]>('/habits'),
  create: (payload: HabitRequest) => apiPost<Habit>('/habits', payload),
  update: (id: string, payload: HabitRequest) => apiPut<Habit>(`/habits/${id}`, payload),
  remove: (id: string) => apiDelete<void>(`/habits/${id}`),
  logCheckIn: (id: string) => apiPost<Habit>(`/habits/${id}/log`),
}

export const goalsApi = {
  list: () => apiGet<Goal[]>('/goals'),
  create: (payload: GoalRequest) => apiPost<Goal>('/goals', payload),
  update: (id: string, payload: Partial<GoalRequest>) => apiPut<Goal>(`/goals/${id}`, payload),
  remove: (id: string) => apiDelete<void>(`/goals/${id}`),
}
