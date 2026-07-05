import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts'
import { AppLayout } from '@/components/layout/AppLayout'
import { useTasks } from '@/hooks/useTasks'
import { useHabits } from '@/hooks/useHabits'
import { useExpenseSummary } from '@/hooks/useExpenses'
import { useGoals } from '@/hooks/useGoals'
import { formatCurrency } from '@/lib/format'

export default function AnalyticsPage() {
  const { data: tasks = [] } = useTasks()
  const { data: habits = [] } = useHabits()
  const { data: summary } = useExpenseSummary()
  const { data: goals = [] } = useGoals()

  const tasksByStatus = ['TODO', 'IN_PROGRESS', 'DONE'].map((status) => ({
    status:
      status === 'IN_PROGRESS'
        ? 'In Progress'
        : status.charAt(0) + status.slice(1).toLowerCase(),
    count: tasks.filter((t) => t.status === status).length,
  }))

  const expenseChart = summary
    ? Object.entries(summary.categoryDistribution).map(([category, amount]) => ({ category, amount }))
    : []

  const avgGoalProgress = goals.length
    ? Math.round(goals.reduce((s, g) => s + g.progress, 0) / goals.length)
    : 0
  const bestStreak = habits.reduce((max, h) => Math.max(max, h.bestStreak), 0)

  return (
    <AppLayout title="Analytics" subtitle="Your productivity, habits, and spending at a glance.">
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <SummaryTile label="Total Tasks" value={String(tasks.length)} />
        <SummaryTile label="Avg. Goal Progress" value={`${avgGoalProgress}%`} />
        <SummaryTile label="Best Habit Streak" value={`${bestStreak} days`} />
        <SummaryTile label="Total Spent" value={summary ? formatCurrency(summary.totalSpent) : '—'} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <h3 className="mb-4 font-display text-base font-bold text-ink-900">Tasks by Status</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={tasksByStatus}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8e9f1" vertical={false} />
                <XAxis
                  dataKey="status"
                  tick={{ fontSize: 12, fill: '#6b6885' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: '#6b6885' }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip cursor={{ fill: '#f7f7fb' }} />
                <Bar dataKey="count" fill="#6d4df2" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-5">
          <h3 className="mb-4 font-display text-base font-bold text-ink-900">Spending by Category</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={expenseChart} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e8e9f1" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 12, fill: '#6b6885' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  dataKey="category"
                  type="category"
                  width={90}
                  tick={{ fontSize: 12, fill: '#6b6885' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(v) => formatCurrency(Number(v))}
                  cursor={{ fill: '#f7f7fb' }}
                />
                <Bar dataKey="amount" fill="#3ac6a0" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-medium text-ink-500">{label}</p>
      <p className="mt-1 font-display text-xl font-bold text-ink-900">{value}</p>
    </div>
  )
}
