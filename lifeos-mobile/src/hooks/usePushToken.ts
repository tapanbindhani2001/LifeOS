import { useEffect } from 'react'
import { Platform } from 'react-native'
import * as Device from 'expo-device'
import Constants from 'expo-constants'
import { devicesApi } from '../api/features'
import { useAuth } from '../context/AuthContext'

const isExpoGo = Constants.appOwnership === 'expo' || (Constants.executionEnvironment as string) === 'store-client'

// Load notifications dynamically to avoid crash in Expo Go
let Notifications: any = null
if (Platform.OS !== 'web' && !isExpoGo) {
  try {
    Notifications = require('expo-notifications')
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    })
  } catch (e) {
    console.warn('Failed to initialize Expo Notifications:', e)
  }
}

export function usePushToken() {
  const { isAuthenticated } = useAuth()

  useEffect(() => {
    if (!isAuthenticated) return

    async function registerForPushNotificationsAsync() {
      if (Platform.OS === 'web') return
      if (isExpoGo) {
        console.log('Push notifications are not supported in Expo Go. Use a development build instead.')
        return
      }

      if (!Device.isDevice) {
        console.log('Must use physical device for Push Notifications')
        return
      }

      try {
        if (!Notifications || !Notifications.getPermissionsAsync || !Notifications.requestPermissionsAsync) {
          console.warn('Expo Notifications native module is not available. Please rebuild the binary (npm run android/ios) to link it.')
          return
        }

        const { status: existingStatus } = await Notifications.getPermissionsAsync()
        let finalStatus = existingStatus

        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync()
          finalStatus = status
        }

        if (finalStatus !== 'granted') {
          console.log('Failed to get push token for push notification!')
          return
        }

        const projectId =
          Constants.expoConfig?.extra?.eas?.projectId ??
          Constants.easConfig?.projectId

        if (!Notifications.getExpoPushTokenAsync) {
          console.warn('getExpoPushTokenAsync is not available.')
          return
        }

        const tokenData = await Notifications.getExpoPushTokenAsync({
          projectId,
        })

        const token = tokenData.data
        console.log('Expo Push Token retrieved:', token)

        await devicesApi.registerToken(token, Platform.OS)
        console.log('Expo Push Token registered successfully with backend')
      } catch (error) {
        console.error('Error registering for push notifications:', error)
      }
    }

    registerForPushNotificationsAsync()
  }, [isAuthenticated])
}
