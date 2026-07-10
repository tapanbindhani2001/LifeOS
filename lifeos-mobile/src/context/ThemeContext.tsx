import React, { createContext, useContext, useEffect, useState } from 'react'
import { Platform, StyleSheet } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { LightColors, DarkColors } from '../constants/theme'

export type ThemeMode = 'light' | 'dark'
export type ThemeColors = typeof LightColors

const THEME_KEY = 'theme'

interface ThemeContextValue {
  theme: ThemeMode
  colors: ThemeColors
  setTheme: (theme: ThemeMode) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>('light')

  const applyTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme)
    if (Platform.OS === 'web') {
      if (newTheme === 'dark') {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
      // Notify other tabs/windows if needed
      window.dispatchEvent(new Event('storage'))
    }
  }

  useEffect(() => {
    // Load persisted theme
    AsyncStorage.getItem(THEME_KEY).then((val) => {
      if (val === 'dark' || val === 'light') {
        applyTheme(val as ThemeMode)
      }
    })
  }, [])

  const setTheme = async (newTheme: ThemeMode) => {
    applyTheme(newTheme)
    await AsyncStorage.setItem(THEME_KEY, newTheme)
  }

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(nextTheme)
  }

  const colors = theme === 'dark' ? DarkColors : LightColors

  return (
    <ThemeContext.Provider value={{ theme, colors, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}

export function makeStyles<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(
  stylesFactory: (colors: ThemeColors) => T
) {
  return () => {
    const { colors } = useTheme()
    return stylesFactory(colors)
  }
}
