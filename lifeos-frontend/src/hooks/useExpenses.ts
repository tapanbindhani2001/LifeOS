import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { expensesApi } from '@/api/lifestyle'
import { ApiError } from '@/api/client'
import type { ExpenseFilters, ExpenseRequest } from '@/types'

export function useExpenses(filters?: ExpenseFilters) {
  return useQuery({ queryKey: ['expenses', filters], queryFn: () => expensesApi.list(filters) })
}

export function useExpenseSummary() {
  return useQuery({
    queryKey: ['expenses', 'summary'],
    queryFn: async () => {
      const data = await expensesApi.summary()
      return {
        totalSpent: data.totalExpense,
        categoryDistribution: (data.categoryBreakdown || []).reduce((acc, item) => {
          acc[item.category] = item.amount
          return acc
        }, {} as Record<string, number>),
      }
    },
  })
}

export function useCreateExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: ExpenseRequest) => expensesApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] })
      toast.success('Expense logged')
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Could not log expense'),
  })
}

export function useDeleteExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => expensesApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] })
      toast.success('Expense removed')
    },
  })
}
