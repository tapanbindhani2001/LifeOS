import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { budgetApi } from '@/api/productivity'
import type { UpsertBudgetRequest } from '@/types'

export function useBudgets() {
  return useQuery({ queryKey: ['budgets'], queryFn: budgetApi.list })
}

export function useUpsertBudget() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: UpsertBudgetRequest) => budgetApi.upsert(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['budgets'] })
      toast.success('Budget saved')
    },
    onError: () => toast.error('Failed to save budget'),
  })
}

export function useDeleteBudget() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => budgetApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['budgets'] })
      toast.success('Budget removed')
    },
    onError: () => toast.error('Failed to remove budget'),
  })
}
