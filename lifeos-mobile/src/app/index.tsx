import { useEffect } from 'react'
import { View, ActivityIndicator, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { useAuth } from '../context/AuthContext'
import { useTheme, makeStyles } from '../context/ThemeContext'

export default function RootIndex() {
  const { isAuthenticated, isLoading } = useAuth()
  const { colors } = useTheme()
  const styles = useStyles()

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        router.replace('/(tabs)')
      } else {
        router.replace('/(auth)/login')
      }
    }
  }, [isAuthenticated, isLoading])

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.brand[500]} />
    </View>
  )
}

const useStyles = makeStyles((colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
}))
