import { useEffect } from 'react'
import { AppState, AppStateStatus } from 'react-native'
import { useQueryClient } from '@tanstack/react-query'
import { syncManager } from '../utils/syncManager'
import { subscriptionsApi } from '../api/features'
import Toast from 'react-native-toast-message'

export function useSyncLoop() {
  const qc = useQueryClient()

  const checkAndSync = async () => {
    try {
      const queue = await syncManager.getQueue()
      if (queue.length === 0) return

      // Ping check to see if backend server is responsive
      await subscriptionsApi.me()

      // If ping succeeds, process the queue!
      const { successCount } = await syncManager.syncQueue()
      if (successCount > 0) {
        // Refresh query lists to reflect backend sync
        qc.invalidateQueries({ queryKey: ['tasks'] })
        qc.invalidateQueries({ queryKey: ['notes'] })
        qc.invalidateQueries({ queryKey: ['habits'] })

        Toast.show({
          type: 'success',
          text1: 'Back online! 🚀',
          text2: `Successfully synced ${successCount} local draft(s).`
        })
      }
    } catch (err) {
      // Backend is still offline/unreachable, do nothing
      console.log('Background sync ping failed (still offline)')
    }
  }

  useEffect(() => {
    // Initial sync check on mount
    checkAndSync()

    // 1. Periodic poll check (every 20 seconds)
    const timer = setInterval(checkAndSync, 20000)

    // 2. Immediate check when app foregrounds
    const subscription = AppState.addEventListener('change', (nextStatus: AppStateStatus) => {
      if (nextStatus === 'active') {
        checkAndSync()
      }
    })

    return () => {
      clearInterval(timer)
      subscription.remove()
    }
  }, [])
}
