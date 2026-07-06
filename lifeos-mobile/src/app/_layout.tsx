import { Stack } from 'expo-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import Toast from 'react-native-toast-message'
import { AuthProvider } from '../context/AuthContext'
import { useEffect } from 'react'
import { Platform } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
})

export default function RootLayout() {
  useEffect(() => {
    // Initial theme sync
    AsyncStorage.getItem('theme').then(val => {
      if (Platform.OS === 'web') {
        if (val === 'dark') {
          document.documentElement.classList.add('dark')
        } else {
          document.documentElement.classList.remove('dark')
        }
      }
    })
  }, [])

  // Web Dark Mode Live Overrides
  useEffect(() => {
    if (Platform.OS !== 'web') return

    const applyDarkStyle = (el: HTMLElement) => {

      // Get or cache original background color
      let originalBg = el.getAttribute('data-orig-bg')
      if (!originalBg) {
        originalBg = window.getComputedStyle(el).backgroundColor
        el.setAttribute('data-orig-bg', originalBg || '')
      }

      if (originalBg === 'rgb(255, 255, 255)' || originalBg === '#ffffff') {
        el.style.setProperty('background-color', '#0f0f12', 'important')
        el.style.setProperty('border-color', '#27272a', 'important')
      } else if (originalBg === 'rgb(248, 250, 252)' || originalBg === '#f8fafc') {
        el.style.setProperty('background-color', '#09090b', 'important')
        el.style.setProperty('border-color', '#27272a', 'important')
      } else if (originalBg === 'rgb(239, 246, 255)' || originalBg === '#eff6ff') {
        el.style.setProperty('background-color', '#181524', 'important')
      }

      // Get or cache original text color
      let originalColor = el.getAttribute('data-orig-color')
      if (!originalColor) {
        originalColor = window.getComputedStyle(el).color
        el.setAttribute('data-orig-color', originalColor || '')
      }

      if (originalColor === 'rgb(15, 23, 42)' || originalColor === '#0f172a' || originalColor === 'rgb(0, 0, 0)') {
        el.style.setProperty('color', '#f8fafc', 'important')
      } else if (originalColor === 'rgb(30, 41, 59)' || originalColor === '#1e293b') {
        el.style.setProperty('color', '#e2e8f0', 'important')
      } else if (originalColor === 'rgb(71, 85, 105)' || originalColor === '#475569') {
        el.style.setProperty('color', '#94a3b8', 'important')
      }

      // Border overrides
      let originalBorder = el.getAttribute('data-orig-border')
      if (!originalBorder) {
        originalBorder = window.getComputedStyle(el).borderColor
        el.setAttribute('data-orig-border', originalBorder || '')
      }
      if (originalBorder === 'rgb(226, 232, 240)' || originalBorder === '#e2e8f0') {
        el.style.setProperty('border-color', '#27272a', 'important')
      }
    }

    const processAll = () => {
      const isDark = document.documentElement.classList.contains('dark')
      if (!isDark) {
        document.querySelectorAll('*').forEach(el => {
          const he = el as HTMLElement
          he.style.removeProperty('background-color')
          he.style.removeProperty('color')
          he.style.removeProperty('border-color')
        })
        return
      }
      document.querySelectorAll('*').forEach(el => applyDarkStyle(el as HTMLElement))
    }

    // Run processing
    processAll()

    // Observe changes to compile layout dynamically as user interacts
    const observer = new MutationObserver(() => processAll())
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class'],
    })

    window.addEventListener('storage', processAll)
    return () => {
      observer.disconnect()
      window.removeEventListener('storage', processAll)
    }
  }, [])

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          </Stack>
          <Toast />
        </AuthProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  )
}
