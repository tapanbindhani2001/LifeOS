import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, TextInput, Platform, PermissionsAndroid, Image, Modal, Alert } from 'react-native'
import { useAuth } from '../../context/AuthContext'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { tasksApi, habitsApi, expensesApi, calendarApi } from '../../api/features'
import { authApi } from '../../api/auth'
import { Spacing, BorderRadius, FontSize, Shadow } from '../../constants/theme'
import { useTheme, makeStyles } from '../../context/ThemeContext'
import { SafeAreaView } from 'react-native-safe-area-context'
import Toast from 'react-native-toast-message'
import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import Svg, { Path, Rect, Circle, Line } from 'react-native-svg'
import * as ImagePicker from 'expo-image-picker'

// Icon definitions
type IconName = 'calendar' | 'tasks' | 'expenses' | 'habits' | 'ai' | 'notes' | 'budget' | 'goals' | 'vault' | 'contacts' | 'stats' | 'subs' | 'calculator' | 'wallet' | 'lock' | 'bell'

function Icon({ name, color = '#6d4df2', size = 20 }: { name: IconName; color?: string; size?: number }) {
  switch (name) {
    case 'calendar':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          <Rect x={3} y={4} width={18} height={18} rx={2} ry={2} />
          <Line x1={16} y1={2} x2={16} y2={6} />
          <Line x1={8} y1={2} x2={8} y2={6} />
          <Line x1={3} y1={10} x2={21} y2={10} />
        </Svg>
      )
    case 'tasks':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <Path d="M22 4L12 14.01l-3-3" />
        </Svg>
      )
    case 'expenses':
    case 'wallet':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4" />
          <Path d="M4 6v12a2 2 0 0 0 2 2h14v-4" />
          <Path d="M18 12a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h4v-6h-4z" />
        </Svg>
      )
    case 'habits':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
        </Svg>
      )
    case 'ai':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m11.314 11.314l.707-.707" />
          <Circle cx={12} cy={12} r={4} />
        </Svg>
      )
    case 'notes':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <Path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
        </Svg>
      )
    case 'budget':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
          <Path d="M22 12A10 10 0 0 0 12 2v10z" />
        </Svg>
      )
    case 'goals':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          <Circle cx={12} cy={12} r={10} />
          <Circle cx={12} cy={12} r={6} />
          <Circle cx={12} cy={12} r={2} />
        </Svg>
      )
    case 'vault':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </Svg>
      )
    case 'contacts':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <Circle cx={9} cy={7} r={4} />
          <Path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </Svg>
      )
    case 'stats':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          <Line x1={18} y1={20} x2={18} y2={10} />
          <Line x1={12} y1={20} x2={12} y2={4} />
          <Line x1={6} y1={20} x2={6} y2={14} />
        </Svg>
      )
    case 'subs':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          <Rect x={1} y={4} width={22} height={16} rx={2} ry={2} />
          <Line x1={1} y1={10} x2={23} y2={10} />
        </Svg>
      )
    case 'calculator':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          <Rect x={4} y={2} width={16} height={20} rx={2} ry={2} />
          <Path d="M9 6h6M9 10h6M9 14h6M9 18h6" />
        </Svg>
      )
    case 'lock':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          <Rect x={3} y={11} width={18} height={11} rx={2} ry={2} />
          <Path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </Svg>
      )
    case 'bell':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" />
        </Svg>
      )
  }
}

function StatCard({ icon, label, value, color, onPress }: { icon: IconName; label: string; value: string | number; color: string; onPress?: () => void }) {
  const styles = useStyles()
  const CardContainer = onPress ? TouchableOpacity : View
  return (
    <CardContainer style={styles.statCard} onPress={onPress}>
      <View style={styles.statHeader}>
        <View style={[styles.statIconContainer, { backgroundColor: color + '15' }]}>
          <Icon name={icon} color={color} size={18} />
        </View>
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </CardContainer>
  )
}

const isSameDay = (d1: Date, d2: Date) => {
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate()
}

export default function DashboardScreen() {
  const qc = useQueryClient()
  const { user } = useAuth()
  const { colors, theme } = useTheme()
  const styles = useStyles()
  const [aiPrompt, setAiPrompt] = useState('')

  // Profile modal states
  const [profileModalOpen, setProfileModalOpen] = useState(false)
  const [profilePicture, setProfilePicture] = useState(user?.profilePicture || '')
  const [updatingProfile, setUpdatingProfile] = useState(false)

  const { refreshProfile } = useAuth()

  useEffect(() => {
    if (user) {
      setProfilePicture(user.profilePicture || '')
    }
  }, [user])

  const handlePickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Gallery access is required to pick a profile photo.')
        return
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.3,
        base64: true,
      })

      if (!result.canceled && result.assets && result.assets[0].base64) {
        const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`
        setProfilePicture(base64Image)
      }
    } catch (err) {
      Alert.alert('Error', 'An error occurred while picking the image.')
    }
  }

  const handleSaveProfile = async () => {
    setUpdatingProfile(true)
    try {
      await authApi.updateProfile({
        fullName: user?.fullName || '',
        profilePicture: profilePicture || undefined
      })
      await refreshProfile()
      setProfileModalOpen(false)
      Toast.show({ type: 'success', text1: 'Profile updated successfully!' })
    } catch (err: any) {
      Toast.show({ type: 'error', text1: err.message || 'Failed to update profile' })
    } finally {
      setUpdatingProfile(false)
    }
  }

  useEffect(() => {
    async function requestSmsPermission() {
      console.log('[SMS Tracker] Checking SMS permission status...');
      if (Platform.OS !== 'android') {
        console.log('[SMS Tracker] Non-Android device. Skipping check.');
        return
      }
      try {
        const hasPermission = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.READ_SMS
        )
        console.log('[SMS Tracker] Current permission granted:', hasPermission);
        if (!hasPermission) {
          console.log('[SMS Tracker] Permission denied/not set. Launching system request dialog...');
          const result = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.READ_SMS,
            {
              title: 'SMS Access Permission',
              message: 'LifeOS needs access to your SMS to automatically parse and track your bank transactions.',
              buttonNeutral: 'Ask Me Later',
              buttonNegative: 'Cancel',
              buttonPositive: 'OK',
            }
          )
          console.log('[SMS Tracker] User response result:', result);
        } else {
          console.log('[SMS Tracker] Already authorized. SMS auto-tracking is active!');
        }
      } catch (err) {
        console.log('[SMS Tracker] Permission request error:', err)
      }
    }
    requestSmsPermission()
  }, [])
  
  const { data: tasks = [], isLoading: tasksLoading } = useQuery({ queryKey: ['tasks'], queryFn: tasksApi.list })
  const { data: habits = [], isLoading: habitsLoading } = useQuery({ queryKey: ['habits'], queryFn: habitsApi.list })
  const { data: summary, isLoading: expLoading } = useQuery({ queryKey: ['expenses', 'summary'], queryFn: expensesApi.summary })
  const { data: expenses = [], isLoading: expListLoading } = useQuery({ queryKey: ['expenses'], queryFn: expensesApi.list })
  const { data: events = [], isLoading: calLoading } = useQuery({ queryKey: ['calendar'], queryFn: calendarApi.list })

  const logHabit = useMutation({
    mutationFn: habitsApi.logCheckIn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['habits'] })
      Toast.show({ type: 'success', text1: 'Habit checked in! 🔥' })
    },
    onError: (e: any) => Toast.show({ type: 'error', text1: e.message || 'Failed to log' }),
  })

  // Dynamic greeting
  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour >= 5 && hour < 12) return 'Good morning'
    if (hour >= 12 && hour < 17) return 'Good afternoon'
    return 'Good evening'
  }

  const firstName = user?.fullName?.split(' ')[0] ?? 'there'
  const pendingTasks = tasks.filter((t: any) => t.status !== 'DONE')
  const completedTasksCount = tasks.filter((t: any) => t.status === 'DONE').length
  const totalSpentThisMonth = summary ? (summary as any).totalExpense ?? 0 : 0

  // Filter today's events
  const todaysEvents = events.filter((e: any) => {
    if (!e.startTime) return false
    return isSameDay(new Date(e.startTime), new Date())
  })

  // Habits not logged today
  const pendingHabitsCount = habits.filter((h: any) => !h.loggedToday).length

  const loading = tasksLoading || habitsLoading || expLoading || calLoading

  const submitAiPrompt = () => {
    if (aiPrompt.trim()) {
      router.push({ pathname: '/ai-assistant', params: { prompt: aiPrompt.trim() } })
      setAiPrompt('')
    }
  }

  const isDark = theme === 'dark'

  // Dynamic Bento Action Colors to guarantee contrast in Dark and Light Modes
  const actions = [
    { name: 'tasks' as IconName, label: 'Tasks', route: '/tasks', bg: isDark ? 'rgba(96, 165, 250, 0.15)' : 'rgba(37, 99, 235, 0.1)', color: isDark ? '#60a5fa' : '#2563eb' },
    { name: 'habits' as IconName, label: 'Habits', route: '/habits', bg: isDark ? 'rgba(251, 191, 36, 0.15)' : 'rgba(217, 119, 6, 0.1)', color: isDark ? '#fbbf24' : '#d97706' },
    { name: 'notes' as IconName, label: 'Notes', route: '/notes', bg: isDark ? 'rgba(129, 140, 248, 0.15)' : 'rgba(79, 70, 229, 0.1)', color: isDark ? '#818cf8' : '#4f46e5' },
    { name: 'ai' as IconName, label: 'AI Chat', route: '/ai-assistant', bg: isDark ? 'rgba(52, 211, 153, 0.15)' : 'rgba(5, 150, 105, 0.1)', color: isDark ? '#34d399' : '#059669' },
    { name: 'budget' as IconName, label: 'Budget', route: '/budget', bg: isDark ? 'rgba(244, 114, 182, 0.15)' : 'rgba(219, 39, 119, 0.1)', color: isDark ? '#f472b6' : '#db2777' },
    { name: 'goals' as IconName, label: 'Goals', route: '/goals', bg: isDark ? 'rgba(192, 132, 252, 0.15)' : 'rgba(147, 51, 234, 0.1)', color: isDark ? '#c084fc' : '#9333ea' },
    { name: 'vault' as IconName, label: 'Vault', route: '/documents', bg: isDark ? 'rgba(251, 146, 60, 0.15)' : 'rgba(234, 88, 12, 0.1)', color: isDark ? '#fb923c' : '#ea580c' },
    { name: 'contacts' as IconName, label: 'Contacts', route: '/contacts', bg: isDark ? 'rgba(56, 189, 248, 0.15)' : 'rgba(2, 132, 199, 0.1)', color: isDark ? '#38bdf8' : '#0284c7' },
    { name: 'stats' as IconName, label: 'Stats', route: '/analytics', bg: isDark ? 'rgba(45, 212, 191, 0.15)' : 'rgba(13, 148, 136, 0.1)', color: isDark ? '#2dd4bf' : '#0d9488' },
    { name: 'subs' as IconName, label: 'Subscription', route: '/subscriptions', bg: isDark ? 'rgba(129, 140, 248, 0.15)' : 'rgba(79, 70, 229, 0.1)', color: isDark ? '#818cf8' : '#4f46e5' },
    { name: 'calculator' as IconName, label: 'Calculator', route: '/calculator', bg: isDark ? 'rgba(156, 163, 175, 0.15)' : 'rgba(75, 85, 99, 0.1)', color: isDark ? '#9ca3af' : '#4b5563' },
  ]

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{getGreeting()}, {firstName} 👋</Text>
            <Text style={styles.greetingSub}>
              {"Here's your life snapshot • "}{theme === 'dark' ? '🌙 Dark' : '☀️ Bright'}
            </Text>
          </View>
          <TouchableOpacity onPress={() => setProfileModalOpen(true)} style={styles.avatar}>
            {user?.profilePicture ? (
              <Image source={{ uri: user.profilePicture }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>{firstName[0]?.toUpperCase()}</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Stats */}
        {loading ? (
          <ActivityIndicator color={colors.brand[500]} style={{ marginVertical: 40 }} />
        ) : (
          <>
            <View style={styles.statsGrid}>
              <StatCard icon="calendar" label="Today's Plan" value={todaysEvents.length} color={colors.brand[500]} />
              <StatCard icon="tasks" label="Tasks Pending" value={pendingTasks.length} color={isDark ? '#a78bfa' : '#8b5cf6'} />
              <StatCard icon="expenses" label="Spent This Month" value={`₹${totalSpentThisMonth.toLocaleString()}`} color={colors.status.error} />
              <StatCard icon="habits" label="Habits Left" value={pendingHabitsCount} color={colors.status.warning} />
            </View>

            {/* Task Progress Tracker Card */}
            {tasks.length > 0 && (
              <View style={styles.progressCard}>
                <View style={styles.progressHeader}>
                  <Text style={styles.progressTitle}>Task Completion</Text>
                  <Text style={styles.progressPercent}>
                    {Math.round((completedTasksCount / tasks.length) * 100)}% ({completedTasksCount}/{tasks.length})
                  </Text>
                </View>
                <View style={styles.progressBarTrack}>
                  <View
                    style={[
                      styles.progressBarFill,
                      { width: `${(completedTasksCount / tasks.length) * 100}%` }
                    ]}
                  />
                </View>
              </View>
            )}

            {/* Bento Quick Actions & AI Search */}
            <View style={styles.bentoSection}>
              <Text style={styles.sectionTitle}>Quick Actions</Text>
              
              {/* Bento Row 1: AI Prompter Banner (Large Card) */}
              <View style={styles.aiBannerCard}>
                <View style={styles.aiBannerHeader}>
                  <View style={styles.aiIconContainer}>
                    <Icon name="ai" color="#fff" size={16} />
                  </View>
                  <Text style={styles.aiBannerTitle}>AI Assistant</Text>
                </View>
                <Text style={styles.aiBannerSub}>Ask anything, log expenses, or find habits instantly.</Text>
                <View style={styles.aiInputWrapper}>
                  <TextInput
                    style={styles.aiInput}
                    placeholder="Type a query for AI assistant..."
                    placeholderTextColor="rgba(255, 255, 255, 0.5)"
                    value={aiPrompt}
                    onChangeText={setAiPrompt}
                    onSubmitEditing={submitAiPrompt}
                  />
                  <TouchableOpacity style={styles.aiSubmitBtn} onPress={submitAiPrompt}>
                    <Text style={styles.aiSubmitBtnText}>→</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Bento Row 2: Standard Bento Quick Grid */}
              <View style={styles.quickGridCard}>
                <View style={styles.quickActionsRow}>
                  {actions.map((act, index) => (
                    <TouchableOpacity key={index} style={styles.actionBtn} onPress={() => router.push(act.route as any)}>
                      <View style={[styles.actionIconBg, { backgroundColor: act.bg }]}>
                        <Icon name={act.name} color={act.color} size={18} />
                      </View>
                      <Text style={styles.actionLabel}>{act.label}</Text>
                    </TouchableOpacity>
                  ))}
                  {/* Grid padding item */}
                  <View style={styles.actionBtn} />
                </View>
              </View>
            </View>
          </>
        )}

        {/* Recent Pending Tasks */}
        <Text style={styles.sectionTitle}>Pending Tasks</Text>
        {pendingTasks.slice(0, 4).map((task: any) => (
          <View key={task.id} style={styles.taskRow}>
            <View style={[styles.taskIconWrapper, { backgroundColor: isDark ? 'rgba(96,165,250,0.15)' : 'rgba(37,99,235,0.1)' }]}>
              <Icon name="tasks" color={isDark ? '#60a5fa' : '#2563eb'} size={15} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.taskTitle} numberOfLines={1}>{task.title}</Text>
              <Text style={styles.taskSub}>{task.priority} • {task.status}</Text>
            </View>
          </View>
        ))}
        {pendingTasks.length === 0 && !tasksLoading && (
          <Text style={styles.emptyText}>All caught up! No pending tasks.</Text>
        )}

        {/* Active Habits Tracker */}
        <Text style={styles.sectionTitle}>Active Habits</Text>
        {habits.slice(0, 4).map((habit: any) => (
          <View key={habit.id} style={styles.taskRow}>
            <View style={[styles.taskIconWrapper, { backgroundColor: isDark ? 'rgba(251,191,36,0.15)' : 'rgba(217,119,6,0.1)' }]}>
              <Icon name="habits" color={isDark ? '#fbbf24' : '#d97706'} size={15} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.taskTitle}>{habit.name}</Text>
              <Text style={styles.taskSub}>{habit.frequency} • {habit.currentStreak ?? 0} day streak</Text>
            </View>
            <TouchableOpacity
              style={[styles.logBtn, habit.loggedToday && styles.logBtnDone]}
              disabled={habit.loggedToday || logHabit.isPending}
              onPress={() => logHabit.mutate(habit.id)}
            >
              <Text style={[styles.logBtnText, habit.loggedToday && styles.logBtnTextDone]}>
                {habit.loggedToday ? 'Done ✓' : 'Log'}
              </Text>
            </TouchableOpacity>
          </View>
        ))}
        {habits.length === 0 && !habitsLoading && (
          <Text style={styles.emptyText}>No habits yet. Build your first streak!</Text>
        )}

        {/* Recent Transactions Feed */}
        <Text style={styles.sectionTitle}>Recent Transactions</Text>
        {expListLoading ? (
          <ActivityIndicator color={colors.brand[500]} style={{ marginVertical: 10 }} />
        ) : expenses.length === 0 ? (
          <Text style={styles.emptyText}>No recent transactions.</Text>
        ) : (
          expenses.slice(0, 3).map((exp: any) => (
            <View key={exp.id} style={styles.taskRow}>
              <View style={[styles.taskIconWrapper, { backgroundColor: isDark ? 'rgba(244,114,182,0.15)' : 'rgba(219,39,119,0.1)' }]}>
                <Icon name="expenses" color={isDark ? '#f472b6' : '#db2777'} size={15} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.taskTitle}>{exp.description}</Text>
                <Text style={styles.taskSub}>{exp.category}</Text>
              </View>
              <Text style={{ color: colors.status.error, fontWeight: '700', fontSize: FontSize.md, fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif' }}>
                -₹{exp.amount}
              </Text>
            </View>
          ))
        )}
      </ScrollView>

      {/* Profile Setup Modal */}
      <Modal
        visible={profileModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setProfileModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setProfileModalOpen(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.avatarEditContainer}>
              <View style={styles.largeAvatar}>
                {profilePicture ? (
                  <Image source={{ uri: profilePicture }} style={styles.largeAvatarImg} />
                ) : (
                  <Text style={styles.largeAvatarText}>{user?.fullName[0]?.toUpperCase() || '?'}</Text>
                )}
              </View>
              
              <View style={styles.photoActionRow}>
                <TouchableOpacity style={styles.photoActionBtn} onPress={handlePickImage}>
                  <Text style={styles.photoActionText}>Upload Photo</Text>
                </TouchableOpacity>
                {profilePicture ? (
                  <TouchableOpacity style={styles.photoActionBtn} onPress={() => setProfilePicture('')}>
                    <Text style={[styles.photoActionText, styles.removePhotoText]}>Remove</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>

            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveProfile} disabled={updatingProfile}>
              {updatingProfile ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.saveBtnText}>Save Profile</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const useStyles = makeStyles((colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface.soft },
  scroll: { flex: 1 },
  content: { padding: Spacing.lg, paddingBottom: 40 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  greeting: { fontSize: FontSize.xl, fontWeight: '800', color: colors.ink[900], fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium' },
  greetingSub: { fontSize: FontSize.sm, color: colors.ink[500], marginTop: 2, fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif' },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    backgroundColor: colors.brand[500],
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: FontSize.lg, fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium' },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  statCard: {
    backgroundColor: colors.surface.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    width: '47.5%',
    borderWidth: 1,
    borderColor: colors.surface.border,
    ...Shadow.sm,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  statIconContainer: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: { fontSize: FontSize.xl, fontWeight: '800', color: colors.ink[900], fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium', marginTop: 4 },
  statLabel: { fontSize: 11, color: colors.ink[500], marginTop: 2, fontWeight: '600', fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif' },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: colors.ink[900],
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: colors.surface.border,
    ...Shadow.sm,
  },
  taskIconWrapper: {
    width: 30,
    height: 30,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  taskTitle: { fontSize: FontSize.md, fontWeight: '600', color: colors.ink[900], fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium' },
  taskSub: { fontSize: FontSize.xs, color: colors.ink[500], marginTop: 2, fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif' },
  logBtn: {
    backgroundColor: colors.brand[50],
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  logBtnDone: {
    backgroundColor: colors.surface.soft,
  },
  logBtnText: {
    color: colors.brand[600],
    fontWeight: '700',
    fontSize: FontSize.xs,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  logBtnTextDone: {
    color: colors.ink[400],
  },
  emptyText: { color: colors.ink[400], fontSize: FontSize.sm, textAlign: 'center', paddingVertical: Spacing.md, fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif' },
  
  // Bento layouts
  bentoSection: {
    marginBottom: Spacing.md,
  },
  aiBannerCard: {
    backgroundColor: colors.brand[500], // Fallback/base background
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: colors.brand[600],
    ...Shadow.md,
  },
  aiBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: 4,
  },
  aiIconContainer: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiBannerTitle: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: '#fff',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  aiBannerSub: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: Spacing.md,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  aiInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  aiInput: {
    flex: 1,
    height: 40,
    fontSize: FontSize.sm,
    color: '#fff',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  aiSubmitBtn: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.sm,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiSubmitBtnText: {
    color: colors.brand[600],
    fontWeight: '800',
    fontSize: FontSize.md,
  },

  quickGridCard: {
    backgroundColor: colors.surface.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: colors.surface.border,
    ...Shadow.sm,
  },
  quickActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: 8,
  },
  actionBtn: {
    alignItems: 'center',
    width: '22%',
    marginBottom: Spacing.sm,
  },
  actionIconBg: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md, // Soft square for a more bento-like aesthetic
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: colors.surface.border,
  },
  actionLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.ink[700],
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },

  progressCard: {
    backgroundColor: colors.surface.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: colors.surface.border,
    ...Shadow.sm,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  progressTitle: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: colors.ink[900],
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  progressPercent: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: colors.brand[600],
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: colors.surface.soft,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.brand[500],
    borderRadius: BorderRadius.full,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: BorderRadius.full,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.surface.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    ...Shadow.md,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: colors.ink[900],
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  modalClose: {
    fontSize: FontSize.lg,
    color: colors.ink[500],
    fontWeight: 'bold',
  },
  avatarEditContainer: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  largeAvatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: colors.brand[500],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
    ...Shadow.sm,
  },
  largeAvatarImg: {
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  largeAvatarText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  photoActionRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  photoActionBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
    backgroundColor: colors.surface.soft,
    borderWidth: 1,
    borderColor: colors.surface.border,
  },
  photoActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.brand[600],
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  removePhotoText: {
    color: colors.status.error,
  },
  fieldContainer: {
    width: '100%',
    marginBottom: Spacing.md,
  },
  fieldLabel: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: colors.ink[500],
    marginBottom: 6,
    textTransform: 'uppercase',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  inputField: {
    borderWidth: 1.5,
    borderColor: colors.surface.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    fontSize: FontSize.md,
    color: colors.ink[900],
    backgroundColor: colors.surface.white,
    width: '100%',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  saveBtn: {
    backgroundColor: colors.brand[500],
    borderRadius: BorderRadius.md,
    paddingVertical: 12,
    alignItems: 'center',
    width: '100%',
    marginTop: Spacing.sm,
    ...Shadow.sm,
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: FontSize.md,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
}))
