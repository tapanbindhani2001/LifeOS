import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, TextInput } from 'react-native'
import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { tasksApi, habitsApi, expensesApi, calendarApi } from '../../api/features'
import { Colors, Spacing, BorderRadius, FontSize, Shadow } from '../../constants/theme'
import { SafeAreaView } from 'react-native-safe-area-context'
import Toast from 'react-native-toast-message'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { router } from 'expo-router'

const CATEGORY_LABELS: Record<string, string> = {
  FOOD: 'Food', RENT: 'Rent', TRANSPORT: 'Transport',
  SHOPPING: 'Shopping', BILLS: 'Bills', ENTERTAINMENT: 'Entertainment',
  HEALTH: 'Health', OTHER: 'Other',
}

const CATEGORY_COLORS: Record<string, string> = {
  FOOD: '#10B981', // emerald
  RENT: '#3B82F6', // blue
  TRANSPORT: '#F59E0B', // amber
  SHOPPING: '#EC4899', // pink
  BILLS: '#EF4444', // red
  ENTERTAINMENT: '#8B5CF6', // violet
  HEALTH: '#06B6D4', // cyan
  OTHER: '#6B7280', // gray
}

function StatCard({ emoji, label, value, color, onPress }: { emoji: string; label: string; value: string | number; color: string; onPress?: () => void }) {
  const CardContainer = onPress ? TouchableOpacity : View
  return (
    <CardContainer style={[styles.statCard, { borderLeftColor: color, borderLeftWidth: 4 }]} onPress={onPress}>
      <Text style={styles.statEmoji}>{emoji}</Text>
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
  const [themeMode, setThemeMode] = useState('light')

  useEffect(() => {
    AsyncStorage.getItem('theme').then(val => {
      if (val) setThemeMode(val)
    })

    const handleSync = () => {
      AsyncStorage.getItem('theme').then(val => {
        if (val) setThemeMode(val)
      })
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleSync)
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', handleSync)
      }
    }
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
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }

  const firstName = user?.fullName?.split(' ')[0] ?? 'there'
  const pendingTasks = tasks.filter((t: any) => t.status !== 'DONE')
  const completedTasksCount = tasks.filter((t: any) => t.status === 'DONE').length
  const totalSpentThisMonth = summary ? (summary as any).totalExpense ?? 0 : 0
  const breakdown = summary?.categoryBreakdown || []

  // Filter today's events
  const todaysEvents = events.filter((e: any) => {
    if (!e.startTime) return false
    return isSameDay(new Date(e.startTime), new Date())
  })

  // Habits not logged today
  const pendingHabitsCount = habits.filter((h: any) => !h.loggedToday).length

  const loading = tasksLoading || habitsLoading || expLoading || calLoading

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{getGreeting()}, {firstName} 👋</Text>
            <Text style={styles.greetingSub}>
              Here's your life snapshot • {themeMode === 'dark' ? '🌙 Dark' : '☀️ Bright'}
            </Text>
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{firstName[0]?.toUpperCase()}</Text>
          </View>
        </View>

        {/* Stats */}
        {loading ? (
          <ActivityIndicator color={Colors.brand[500]} style={{ marginVertical: 40 }} />
        ) : (
          <>
            <View style={styles.statsGrid}>
              <StatCard emoji="📅" label="Today's Plan" value={todaysEvents.length} color={Colors.brand[500]} onPress={() => router.push('/calendar')} />
              <StatCard emoji="✅" label="Tasks Pending" value={pendingTasks.length} color="#8b5cf6" onPress={() => router.push('/tasks')} />
              <StatCard emoji="💰" label="Spent This Month" value={`₹${totalSpentThisMonth.toLocaleString()}`} color={Colors.status.error} onPress={() => router.push('/expenses')} />
              <StatCard emoji="🔥" label="Habits Left" value={pendingHabitsCount} color={Colors.status.warning} onPress={() => router.push('/habits')} />
            </View>

            {/* Quick Actions Deck */}
            <View style={styles.quickActionsCard}>
              <Text style={styles.quickActionsTitle}>Quick Actions</Text>
              <View style={styles.quickActionsRow}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/tasks')}>
                  <View style={[styles.actionIconBg, { backgroundColor: '#dbeafe' }]}><Text style={styles.actionIcon}>✅</Text></View>
                  <Text style={styles.actionLabel}>Tasks</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/habits')}>
                  <View style={[styles.actionIconBg, { backgroundColor: '#fef3c7' }]}><Text style={styles.actionIcon}>🔥</Text></View>
                  <Text style={styles.actionLabel}>Habits</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/notes')}>
                  <View style={[styles.actionIconBg, { backgroundColor: '#e0e7ff' }]}><Text style={styles.actionIcon}>📝</Text></View>
                  <Text style={styles.actionLabel}>Notes</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/ai-assistant')}>
                  <View style={[styles.actionIconBg, { backgroundColor: '#d1fae5' }]}><Text style={styles.actionIcon}>🤖</Text></View>
                  <Text style={styles.actionLabel}>AI Chat</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/budget')}>
                  <View style={[styles.actionIconBg, { backgroundColor: '#fce7f3' }]}><Text style={styles.actionIcon}>🐷</Text></View>
                  <Text style={styles.actionLabel}>Budget</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/goals')}>
                  <View style={[styles.actionIconBg, { backgroundColor: '#f3e8ff' }]}><Text style={styles.actionIcon}>🎯</Text></View>
                  <Text style={styles.actionLabel}>Goals</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/documents')}>
                  <View style={[styles.actionIconBg, { backgroundColor: '#ffedd5' }]}><Text style={styles.actionIcon}>📂</Text></View>
                  <Text style={styles.actionLabel}>Vault</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/contacts')}>
                  <View style={[styles.actionIconBg, { backgroundColor: '#e0f2fe' }]}><Text style={styles.actionIcon}>👥</Text></View>
                  <Text style={styles.actionLabel}>Contacts</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/analytics')}>
                  <View style={[styles.actionIconBg, { backgroundColor: '#ccfbf1' }]}><Text style={styles.actionIcon}>📊</Text></View>
                  <Text style={styles.actionLabel}>Stats</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/subscriptions')}>
                  <View style={[styles.actionIconBg, { backgroundColor: '#e0e7ff' }]}><Text style={styles.actionIcon}>💳</Text></View>
                  <Text style={styles.actionLabel}>Subs</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/calculator')}>
                  <View style={[styles.actionIconBg, { backgroundColor: '#f3f4f6' }]}><Text style={styles.actionIcon}>🧮</Text></View>
                  <Text style={styles.actionLabel}>Calculator</Text>
                </TouchableOpacity>
                <View style={styles.actionBtn} />
              </View>
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
          </>
        )}

        {/* Recent Pending Tasks */}
        <Text style={styles.sectionTitle}>Pending Tasks</Text>
        {pendingTasks.slice(0, 4).map((task: any) => (
          <View key={task.id} style={styles.taskRow}>
            <View style={[styles.taskDot, { backgroundColor: Colors.brand[300] }]} />
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
            <Text style={{ fontSize: 20, marginRight: 10 }}>💪</Text>
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
          <ActivityIndicator color={Colors.brand[500]} style={{ marginVertical: 10 }} />
        ) : expenses.length === 0 ? (
          <Text style={styles.emptyText}>No recent transactions.</Text>
        ) : (
          expenses.slice(0, 3).map((exp: any) => (
            <View key={exp.id} style={styles.taskRow}>
              <Text style={{ fontSize: 20, marginRight: 10 }}>💵</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.taskTitle}>{exp.description}</Text>
                <Text style={styles.taskSub}>{exp.category}</Text>
              </View>
              <Text style={{ color: Colors.status.error, fontWeight: '700', fontSize: FontSize.md }}>
                -₹{exp.amount}
              </Text>
            </View>
          ))
        )}

        {/* Quick AI Assistant Card */}
        <Text style={styles.sectionTitle}>AI Assistant</Text>
        <View style={styles.quickActionsCard}>
          <Text style={[styles.quickActionsTitle, { marginBottom: Spacing.xs }]}>✨ Ask anything</Text>
          <TextInput
            style={{
              borderWidth: 1.5,
              borderColor: Colors.surface.border,
              borderRadius: BorderRadius.md,
              paddingHorizontal: Spacing.md,
              paddingVertical: 10,
              fontSize: FontSize.sm,
              color: Colors.ink[900],
              backgroundColor: Colors.surface.soft,
              marginTop: 4,
            }}
            placeholder="Ask AI assistant..."
            placeholderTextColor={Colors.ink[400]}
            onSubmitEditing={(e) => {
              const val = e.nativeEvent.text
              if (val.trim()) {
                router.push({ pathname: '/ai-assistant', params: { prompt: val.trim() } })
              }
            }}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface.soft },
  scroll: { flex: 1 },
  content: { padding: Spacing.lg, paddingBottom: 40 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  greeting: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.ink[900] },
  greetingSub: { fontSize: FontSize.sm, color: Colors.ink[500], marginTop: 2 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.brand[500],
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: FontSize.lg },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  statCard: {
    backgroundColor: Colors.surface.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    width: '47.5%',
    ...Shadow.sm,
  },
  statEmoji: { fontSize: 22, marginBottom: 4 },
  statValue: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.ink[900] },
  statLabel: { fontSize: FontSize.xs, color: Colors.ink[500], marginTop: 2 },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.ink[900],
    marginBottom: Spacing.sm,
    marginTop: Spacing.xs,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadow.sm,
  },
  taskDot: { width: 10, height: 10, borderRadius: BorderRadius.full, marginRight: Spacing.sm },
  taskTitle: { fontSize: FontSize.md, fontWeight: '600', color: Colors.ink[900] },
  taskSub: { fontSize: FontSize.xs, color: Colors.ink[500], marginTop: 2 },
  logBtn: {
    backgroundColor: Colors.brand[50],
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  logBtnDone: {
    backgroundColor: Colors.surface.soft,
  },
  logBtnText: {
    color: Colors.brand[600],
    fontWeight: '700',
    fontSize: FontSize.xs,
  },
  logBtnTextDone: {
    color: Colors.ink[400],
  },
  emptyText: { color: Colors.ink[400], fontSize: FontSize.sm, textAlign: 'center', paddingVertical: Spacing.md },
  quickActionsCard: {
    backgroundColor: Colors.surface.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadow.sm,
  },
  quickActionsTitle: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.ink[900],
    marginBottom: Spacing.sm,
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
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    ...Shadow.sm,
  },
  actionIcon: {
    fontSize: 20,
  },
  actionLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.ink[700],
  },
  progressCard: {
    backgroundColor: Colors.surface.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
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
    color: Colors.ink[900],
  },
  progressPercent: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.brand[600],
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: Colors.surface.soft,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.brand[500],
    borderRadius: BorderRadius.full,
  },
  overviewCard: {
    backgroundColor: Colors.surface.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadow.sm,
  },
  overviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: Spacing.sm,
  },
  overviewTitle: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.ink[900],
  },
  overviewSubtitle: {
    fontSize: FontSize.xs,
    color: Colors.ink[500],
    fontWeight: '600',
  },
  overviewTotal: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.ink[900],
    marginBottom: Spacing.md,
  },
  overviewList: {
    gap: Spacing.md,
  },
  overviewItem: {
    gap: 6,
  },
  overviewItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  labelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  colorDot: {
    width: 8,
    height: 8,
    borderRadius: BorderRadius.full,
  },
  categoryName: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.ink[700],
  },
  categoryAmount: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.ink[900],
  },
  viewAllText: {
    fontSize: FontSize.xs,
    color: Colors.brand[600],
    fontWeight: '700',
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  recentTxCard: {
    backgroundColor: Colors.surface.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadow.sm,
  },
  recentTxHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  recentTxTitle: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.ink[900],
  },
  viewAllTxText: {
    fontSize: FontSize.xs,
    color: Colors.brand[600],
    fontWeight: '700',
  },
  recentTxList: {
    gap: Spacing.sm,
  },
  txItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
  },
  txLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  txIconBg: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txDesc: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.ink[900],
  },
  txMeta: {
    fontSize: FontSize.xs,
    color: Colors.ink[500],
    marginTop: 2,
  },
  txAmount: {
    fontSize: FontSize.sm,
    fontWeight: '800',
    color: Colors.status.error,
  },
})
