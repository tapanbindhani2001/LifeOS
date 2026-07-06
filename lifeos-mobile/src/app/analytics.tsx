import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Colors, Spacing, BorderRadius, FontSize, Shadow } from '../constants/theme'
import { router } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { tasksApi, habitsApi, expensesApi, goalsApi } from '../api/features'

function MetricCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <View style={[styles.metricCard, color ? { borderLeftWidth: 4, borderLeftColor: color } : {}]}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
      {sub ? <Text style={styles.metricSub}>{sub}</Text> : null}
    </View>
  )
}

export default function AnalyticsScreen() {
  const { data: tasks = [], isLoading: tLoading } = useQuery({ queryKey: ['tasks'], queryFn: tasksApi.list })
  const { data: habits = [], isLoading: hLoading } = useQuery({ queryKey: ['habits'], queryFn: habitsApi.list })
  const { data: summary, isLoading: eLoading } = useQuery({ queryKey: ['expense-summary'], queryFn: expensesApi.summary })
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
        <ActivityIndicator color={Colors.brand[500]} style={{ marginTop: 60 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionTitle}>📝 Tasks</Text>
          <MetricCard
            label="Completion Rate"
            value={`${completionRate}%`}
            sub={`${doneTasks} of ${totalTasks} tasks completed`}
            color={Colors.brand[500]}
          />

          <Text style={styles.sectionTitle}>🔥 Habits</Text>
          <MetricCard
            label="Best Streak"
            value={`${bestStreak} days`}
            sub={`${habitsLoggedToday}/${(habits as any[]).length} habits logged today`}
            color={Colors.status.warning}
          />

          <Text style={styles.sectionTitle}>🎯 Goals</Text>
          <MetricCard
            label="Avg. Progress"
            value={`${avgGoalProgress}%`}
            sub={`${completedGoals} goal${completedGoals !== 1 ? 's' : ''} completed`}
            color="#8b5cf6"
          />

          <Text style={styles.sectionTitle}>💰 Finances</Text>
          <MetricCard
            label="Total Spent"
            value={`₹${totalSpent.toLocaleString()}`}
            sub={`Income: ₹${totalIncome.toLocaleString()} | Net: ₹${netBalance.toLocaleString()}`}
            color={Colors.status.error}
          />

          {/* Category Breakdown */}
          {summary && (summary as any).categoryBreakdown && (summary as any).categoryBreakdown.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>📊 Spending by Category</Text>
              <View style={styles.catCard}>
                {((summary as any).categoryBreakdown as any[]).map((cat: any) => (
                  <View key={cat.category} style={styles.catRow}>
                    <Text style={styles.catLabel}>{cat.category}</Text>
                    <Text style={styles.catAmount}>₹{cat.amount.toLocaleString()}</Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface.soft },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg, paddingBottom: Spacing.md },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  backArrow: { fontSize: 22, color: Colors.ink[900], paddingRight: 4 },
  title: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.ink[900] },
  content: { padding: Spacing.lg, paddingBottom: 40 },
  sectionTitle: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.ink[500], marginBottom: Spacing.sm, marginTop: Spacing.sm },
  metricCard: {
    backgroundColor: Colors.surface.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    ...Shadow.sm,
    marginBottom: Spacing.md,
  },
  metricLabel: { fontSize: FontSize.sm, color: Colors.ink[500], fontWeight: '600' },
  metricValue: { fontSize: 32, fontWeight: '800', color: Colors.ink[900], marginTop: 4 },
  metricSub: { fontSize: FontSize.xs, color: Colors.ink[400], fontWeight: '600', marginTop: 4 },
  catCard: { backgroundColor: Colors.surface.white, borderRadius: BorderRadius.lg, padding: Spacing.md, ...Shadow.sm, marginBottom: Spacing.md },
  catRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.surface.border },
  catLabel: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.ink[700] },
  catAmount: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.ink[900] },
})
