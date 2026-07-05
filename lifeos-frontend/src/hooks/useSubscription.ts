import { useQuery } from '@tanstack/react-query'
import { subscriptionsApi } from '@/api/platform'

export function useSubscription() {
  return useQuery({
    queryKey: ['subscription', 'me'],
    queryFn: subscriptionsApi.me,
    staleTime: 60_000,
  })
}
