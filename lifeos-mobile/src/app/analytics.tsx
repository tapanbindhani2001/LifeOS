import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Spacing, BorderRadius, FontSize, Shadow } from '../constants/theme'
import { useTheme, makeStyles } from '../context/ThemeContext'
import { router } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { tasksApi, habitsApi, expensesApi, goalsApi } from '../api/features'
import Svg, { Circle } from 'react-native-svg'

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

const CATEGORY_LABELS: Record<string, string> = {
  FOOD: 'Food', RENT: 'Rent', TRANSPORT: 'Transport',
  SHOPPING: 'Shopping', BILLS: 'Bills', ENTERTAINMENT: 'Entertainment',
  HEALTH: 'Health', OTHER: 'Other',
}

function ProgressRingCard({
  label,
  value,
  sub,
  percent,
  ringColor,
}: {
  label: string
  value: string
  sub?: string
  percent: number
  ringColor: string
}) {
  const styles = useStyles()
  const { colors } = useTheme()
  const radius = 24
  const strokeWidth = 5
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (Math.min(percent, 100) / 100) * circumference

  return (
    <View style={styles.chartMetricCard}>
      <View style={styles.chartMetricLeft}>
        <Text style={styles.metricLabel}>{label}</Text>
        <Text style={styles.metricValue}>{value}</Text>
        {sub ? <Text style={styles.metricSub}>{sub}</Text> : null}
      </View>
      <View style={styles.chartRingContainer}>
        <Svg width="64" height="64" viewBox="0 0 64 64">
          <Circle
            cx="32"
            cy="32"
            r={radius}
            stroke={colors.surface.border}
            strokeWidth={strokeWidth}
            fill="none"
          />
          <Circle
            cx="32"
            cy="32"
            r={radius}
            stroke={ringColor}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform="rotate(-90 32 32)"
          />
        </Svg>
        <Text style={styles.ringPercentageText}>{Math.round(percent)}%</Text>
      </View>
    </View>
  )
}

function MetricCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  const styles = useStyles()
  return (
    <View style={[styles.metricCard, color ? { borderLeftWidth: 4, borderLeftColor: color } : {}]}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
      {sub ? <Text style={styles.metricSub}>{sub}</Text> : null}
    </View>
  )
}

export default function AnalyticsScreen() {
  const { colors } = useTheme()
  const styles = useStyles()
  const { data: tasks = [], isLoading: tLoading } = useQuery({ queryKey: ['tasks'], queryFn: tasksApi.list })
  const { data: habits = [], isLoading: hLoading } = useQuery({ queryKey: ['habits'], queryFn: habitsApi.list })
  const { data: summary, isLoading: eLoading } = useQuery({ queryKey: ['expense-summary'], queryFn: () => expensesApi.summary() })
  const { data: goals = [], isLoading: gLoading } = useQuery({ queryKey: ['goals'], queryFn: goalsApi.list })

  const loading = tLoading || hLoading || eLoading || gLoading

  // Computed stats
  const doneTasks = (tasks as any[]).filter((t: any) => t.status === 'DONE').length
  const totalTasks = (tasks as any[]).length
  const completionRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0

  const bestStreak = (habits as any[]).reduce((max: number, h: any) => Math.max(max, h.bestStreak ?? 0), 0)
  const habitsLoggedToday = (habits as any[]).filter((h: any) => h.loggedToday).length

  const avgGoalProgress = (goals as any[]).length
    ? Math.round((goals as any[]).reduce((s: number, g: any) => s + (g.progress ?? 0), 0) / (goals as any[]).length)
    : 0
  const completedGoals = (goals as any[]).filter((g: any) => g.completed).length

  const totalSpent = summary ? (summary as any).totalExpense ?? 0 : 0
  const totalIncome = summary ? (summary as any).totalIncome ?? 0 : 0
  const netBalance = summary ? (summary as any).netBalance ?? 0 : 0

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Analytics</Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.brand[500]} style={{ marginTop: 60 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionTitle}>📝 Tasks</Text>
          <ProgressRingCard
            label="Completion Rate"
            value={`${completionRate}%`}
            sub={`${doneTasks} of ${totalTasks} tasks completed`}
            percent={completionRate}
            ringColor={colors.brand[500]}
          />

          <Text style={styles.sectionTitle}>🔥 Habits</Text>
          <MetricCard
            label="Best Streak"
            value={`${bestStreak} days`}
            sub={`${habitsLoggedToday}/${(habits as any[]).length} habits logged today`}
            color={colors.status.warning}
          />

          <Text style={styles.sectionTitle}>🎯 Goals</Text>
          <ProgressRingCard
            label="Avg. Progress"
            value={`${avgGoalProgress}%`}
            sub={`${completedGoals} goal${completedGoals !== 1 ? 's' : ''} completed`}
            percent={avgGoalProgress}
            ringColor="#8b5cf6"
          />

          <Text style={styles.sectionTitle}>💰 Finances</Text>
          <MetricCard
            label="Total Spent"
            value={`₹${totalSpent.toLocaleString()}`}
            sub={`Income: ₹${totalIncome.toLocaleString()} | Net: ₹${netBalance.toLocaleString()}`}
            color={colors.status.error}
          />

          {/* Category Breakdown */}
          {summary && (summary as any).categoryBreakdown && (summary as any).categoryBreakdown.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>📊 Spending by Category</Text>
              <View style={styles.catCard}>
                {((summary as any).categoryBreakdown as any[]).map((cat: any) => {
                  const percentage = totalSpent > 0 ? (cat.amount / totalSpent) * 100 : 0
                  const barColor = CATEGORY_COLORS[cat.category] || '#6B7280'
                  return (
                    <View key={cat.category} style={styles.catCompareRow}>
                      <View style={styles.catCompareHeader}>
                        <Text style={styles.catCompareLabel}>
                          {CATEGORY_LABELS[cat.category] || cat.category}
                        </Text>
                        <Text style={styles.catCompareAmount}>
                          ₹{cat.amount.toLocaleString()} ({Math.round(percentage)}%)
                        </Text>
                      </View>
                      <View style={styles.catCompareBarBg}>
                        <View style={[styles.catCompareBarFill, { width: `${percentage}%`, backgroundColor: barColor }]} />
                      </View>
                    </View>
                  )
                })}
              </View>
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

const useStyles = makeStyles((colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface.soft },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg, paddingBottom: Spacing.md },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  backArrow: { fontSize: 22, color: colors.ink[900], paddingRight: 4 },
  title: { fontSize: FontSize.xl, fontWeight: '800', color: colors.ink[900] },
  content: { padding: Spacing.lg, paddingBottom: 40 },
  sectionTitle: { fontSize: FontSize.sm, fontWeight: '700', color: colors.ink[500], marginBottom: Spacing.sm, marginTop: Spacing.sm },
  metricCard: {
    backgroundColor: colors.surface.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    ...Shadow.sm,
    marginBottom: Spacing.md,
  },
  metricLabel: { fontSize: FontSize.sm, color: colors.ink[500], fontWeight: '600' },
  metricValue: { fontSize: 32, fontWeight: '800', color: colors.ink[900], marginTop: 4 },
  metricSub: { fontSize: FontSize.xs, color: colors.ink[400], fontWeight: '600', marginTop: 4 },
  catCard: { backgroundColor: colors.surface.white, borderRadius: BorderRadius.lg, padding: Spacing.md, ...Shadow.sm, marginBottom: Spacing.md },
  catRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.surface.border },
  catLabel: { fontSize: FontSize.sm, fontWeight: '600', color: colors.ink[700] },
  catAmount: { fontSize: FontSize.sm, fontWeight: '700', color: colors.ink[900] },

  // Visual Chart Dashboard styles
  chartMetricCard: {
    backgroundColor: colors.surface.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...Shadow.sm,
    marginBottom: Spacing.md,
  },
  chartMetricLeft: {
    flex: 1,
    paddingRight: Spacing.md,
  },
  chartRingContainer: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  ringPercentageText: {
    position: 'absolute',
    fontSize: FontSize.xs,
    fontWeight: '800',
    color: colors.ink[900],
  },
  catCompareRow: {
    marginBottom: Spacing.md,
  },
  catCompareHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  catCompareLabel: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: colors.ink[700],
  },
  catCompareAmount: {
    fontSize: FontSize.xs + 1,
    fontWeight: '800',
    color: colors.ink[900],
  },
  catCompareBarBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surface.soft,
    width: '100%',
    overflow: 'hidden',
  },
  catCompareBarFill: {
    height: '100%',
    borderRadius: 4,
  },
}))
