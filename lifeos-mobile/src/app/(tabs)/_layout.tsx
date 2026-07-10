import { Tabs, router } from 'expo-router'
import { useEffect } from 'react'
import { View } from 'react-native'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import Svg, { Path, Rect, Circle, Line } from 'react-native-svg'

type TabIconName = 'dashboard' | 'calendar' | 'expenses' | 'profile'

function TabIcon({ name, color, focused }: { name: TabIconName; color: string; focused: boolean }) {
  const size = 20
  switch (name) {
    case 'dashboard':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill={focused ? color + '20' : 'none'} stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <Path d="M9 22V12h6v10" />
        </Svg>
      )
    case 'calendar':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill={focused ? color + '20' : 'none'} stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Rect x={3} y={4} width={18} height={18} rx={2} ry={2} />
          <Line x1={16} y1={2} x2={16} y2={6} />
          <Line x1={8} y1={2} x2={8} y2={6} />
          <Line x1={3} y1={10} x2={21} y2={10} />
        </Svg>
      )
    case 'expenses':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill={focused ? color + '20' : 'none'} stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4" />
          <Path d="M4 6v12a2 2 0 0 0 2 2h14v-4" />
          <Path d="M18 12a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h4v-6h-4z" />
        </Svg>
      )
    case 'profile':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill={focused ? color + '20' : 'none'} stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <Circle cx={12} cy={7} r="4" />
        </Svg>
      )
  }
}

export default function TabsLayout() {
  const { isAuthenticated, isLoading } = useAuth()
  const { colors } = useTheme()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/(auth)/login')
    }
  }, [isAuthenticated, isLoading])

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand[500],
        tabBarInactiveTintColor: colors.ink[400],
        tabBarStyle: {
          borderTopColor: colors.surface.border,
          backgroundColor: colors.surface.white,
          height: 60,
          paddingBottom: 8,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Dashboard', tabBarIcon: ({ color, focused }) => <TabIcon name="dashboard" color={color} focused={focused} /> }}
      />
      <Tabs.Screen
        name="calendar"
        options={{ title: 'Calendar', tabBarIcon: ({ color, focused }) => <TabIcon name="calendar" color={color} focused={focused} /> }}
      />
      <Tabs.Screen
        name="expenses"
        options={{ title: 'Expenses', tabBarIcon: ({ color, focused }) => <TabIcon name="expenses" color={color} focused={focused} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile', tabBarIcon: ({ color, focused }) => <TabIcon name="profile" color={color} focused={focused} /> }}
      />
    </Tabs>
  )
}
