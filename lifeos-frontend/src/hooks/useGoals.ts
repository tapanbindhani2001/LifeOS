import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { goalsApi } from '@/api/lifestyle'
import { ApiError } from '@/api/client'
import type { GoalRequest } from '@/types'

export function useGoals() {
  return useQuery({ queryKey: ['goals'], queryFn: goalsApi.list })
}

export function useCreateGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: GoalRequest) => goalsApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['goals'] })
      toast.success('Goal created')
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Could not create goal'),
  })
}

export function useUpdateGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<GoalRequest> }) => goalsApi.update(id, payload),
    onSuccess: (goal) => {
      qc.invalidateQueries({ queryKey: ['goals'] })
      if (goal.completed) toast.success(`Goal "${goal.title}" completed! 🎉`)
    },
  })
}

export function useDeleteGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => goalsApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['goals'] })
      toast.success('Goal removed')
    },
  })
}
