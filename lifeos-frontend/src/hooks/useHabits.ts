import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { habitsApi } from '@/api/lifestyle'
import { ApiError } from '@/api/client'
import type { HabitRequest } from '@/types'

export function useHabits() {
  return useQuery({ queryKey: ['habits'], queryFn: habitsApi.list })
}

export function useCreateHabit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: HabitRequest) => habitsApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['habits'] })
      toast.success('Habit created')
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Could not create habit'),
  })
}

export function useDeleteHabit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => habitsApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['habits'] })
      toast.success('Habit removed')
    },
  })
}

export function useLogHabit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => habitsApi.logCheckIn(id),
    onSuccess: (habit) => {
      qc.invalidateQueries({ queryKey: ['habits'] })
      toast.success(`Nice! ${habit.currentStreak}-day streak on "${habit.name}"`)
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Could not log check-in'),
  })
}
