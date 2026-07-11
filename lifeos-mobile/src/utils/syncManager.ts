import AsyncStorage from '@react-native-async-storage/async-storage'
import { tasksApi, notesApi, habitsApi } from '../api/features'

export interface SyncQueueItem {
  id: string
  type: 'TASK' | 'NOTE' | 'HABIT_LOG'
  action: 'CREATE' | 'CHECK_IN'
  payload: any
  timestamp: number
}

const QUEUE_KEY = 'pending_sync_queue'

export const syncManager = {
  getQueue: async (): Promise<SyncQueueItem[]> => {
    try {
      const data = await AsyncStorage.getItem(QUEUE_KEY)
      return data ? JSON.parse(data) : []
    } catch {
      return []
    }
  },

  addToQueue: async (
    type: SyncQueueItem['type'],
    action: SyncQueueItem['action'],
    payload: any
  ): Promise<string> => {
    const tempId = `draft_${type.toLowerCase()}_${Date.now()}`
    const newItem: SyncQueueItem = {
      id: tempId,
      type,
      action,
      payload,
      timestamp: Date.now()
    }
    try {
      const queue = await syncManager.getQueue()
      queue.push(newItem)
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
      return tempId
    } catch (e) {
      console.warn('Failed to add item to sync queue:', e)
      return tempId
    }
  },

  removeFromQueue: async (id: string): Promise<void> => {
    try {
      const queue = await syncManager.getQueue()
      const updated = queue.filter((item) => item.id !== id)
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(updated))
    } catch (e) {
      console.warn('Failed to remove item from sync queue:', e)
    }
  },

  clearQueue: async (): Promise<void> => {
    try {
      await AsyncStorage.removeItem(QUEUE_KEY)
    } catch {}
  },

  syncQueue: async (): Promise<{ successCount: number; failedCount: number }> => {
    const queue = await syncManager.getQueue()
    let successCount = 0
    let failedCount = 0

    for (const item of queue) {
      try {
        if (item.type === 'TASK') {
          await tasksApi.create(item.payload)
        } else if (item.type === 'NOTE') {
          await notesApi.create(item.payload)
        } else if (item.type === 'HABIT_LOG') {
          await habitsApi.logCheckIn(item.payload.habitId)
        }
        await syncManager.removeFromQueue(item.id)
        successCount++
      } catch (err) {
        console.warn(`Sync failed for item ${item.id}:`, err)
        failedCount = queue.length - successCount
        break // Stop syncing queue if we hit a network failure again
      }
    }

    return { successCount, failedCount }
  }
}
