import { Link } from 'react-router-dom'
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  Wallet,
  Repeat,
  Sparkles,
  Plus,
  StickyNote,
  Receipt,
  ListTodo,
  CalendarPlus,
  ScanLine,
  Mic,
  Crown,
  ArrowRight,
} from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { format } from 'date-fns'
import { AppLayout } from '@/components/layout/AppLayout'
import { MiniCalendar } from '@/components/dashboard/MiniCalendar'
import { Skeleton } from '@/components/ui/Overlay'
import { useAuth } from '@/context/AuthContext'
import { useTasks } from '@/hooks/useTasks'
import { useHabits, useLogHabit } from '@/hooks/useHabits'
import { useExpenseSummary } from '@/hooks/useExpenses'
import { useCalendarEvents } from '@/hooks/useNotesCalendar'
import { categoryColor, formatCurrency, priorityBadgeClass } from '@/lib/format'

export default function DashboardPage() {
  const { user } = useAuth()
  const { data: tasks = [], isLoading: tasksLoading } = useTasks()
  const { data: habits = [], isLoading: habitsLoading } = useHabits()
  const { data: summary, isLoading: summaryLoading } = useExpenseSummary()
  const { data: events = [] } = useCalendarEvents()
  const logHabit = useLogHabit()

  const pendingTasks = tasks.filter((t) => t.status !== 'DONE')
  const todaysEvents = events.slice(0, 5)
  const chartData = summary
    ? Object.entries(summary.categoryDistribution).map(([name, value]) => ({ name, value }))
    : []

  const greeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good Morning'
    if (hour < 18) return 'Good Afternoon'
    return 'Good Evening'
  }

  return (
    <AppLayout title={`${greeting()}, ${user?.fullName?.split(' ')[0] ?? 'there'}! 👋`} subtitle="Here's what's happening with your life today.">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
        {/* Main column */}
        <div className="space-y-6">
          {/* Quick add */}
          <div className="flex justify-end">
            <Link to="/tasks" className="btn-primary">
              <Plus className="h-4 w-4" />
              Quick Add
            </Link>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            <StatCard
              icon={<CalendarIcon className="h-5 w-5" />}
              iconBg="bg-blue-50 text-blue-500"
              label="Today's Plan"
              value={String(todaysEvents.length)}
              caption="Events scheduled"
              to="/calendar"
              linkLabel="View Calendar"
            />
            <StatCard
              icon={<CheckCircle2 className="h-5 w-5" />}
              iconBg="bg-emerald-50 text-emerald-500"
              label="Tasks"
              value={String(pendingTasks.length)}
              caption="Tasks pending"
              to="/tasks"
              linkLabel="View Tasks"
            />
            <StatCard
              icon={<Wallet className="h-5 w-5" />}
              iconBg="bg-orange-50 text-orange-500"
              label="Expenses"
              value={summary ? formatCurrency(summary.totalSpent) : '—'}
              caption="Spent this month"
              to="/expenses"
              linkLabel="View Reports"
              accent
            />
            <StatCard
              icon={<Repeat className="h-5 w-5" />}
              iconBg="bg-purple-50 text-purple-500"
              label="Habits"
              value={String(habits.filter((h) => !h.completedToday).length)}
              caption="In progress"
              to="/habits"
              linkLabel="View Habits"
            />
            <StatCard
              icon={<Sparkles className="h-5 w-5" />}
              iconBg="bg-teal-50 text-teal-500"
              label="AI Summary"
              value="Your day is"
              caption="productive"
              highlight="60%"
              to="/ai-assistant"
              linkLabel="View Insights"
            />
          </div>

          {/* Schedule / Tasks / Habits row */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <Panel title="Today's Schedule" to="/calendar">
              {todaysEvents.length === 0 && (
                <p className="py-6 text-center text-sm text-ink-500">No events scheduled today.</p>
              )}
              <div className="space-y-4">
                {todaysEvents.map((event) => (
                  <div key={event.id} className="flex gap-3 text-sm">
                    <span className="w-16 shrink-0 font-medium text-brand-600">
                      {format(new Date(event.startTime), 'hh:mm a')}
                    </span>
                    <div>
                      <p className="font-medium text-ink-900">{event.title}</p>
                      {event.location && <p className="text-xs text-ink-500">{event.location}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="Tasks" to="/tasks">
              <div className="space-y-1">
                {tasksLoading && <Skeleton className="h-32" />}
                {pendingTasks.slice(0, 5).map((task) => (
                  <label key={task.id} className="flex items-center justify-between gap-2 rounded-lg px-1 py-2 hover:bg-surface-soft">
                    <span className="flex items-center gap-2.5">
                      <input type="checkbox" className="h-4 w-4 rounded border-surface-border text-brand-500 focus:ring-brand-400" />
                      <span>
                        <span className="block text-sm font-medium text-ink-900">{task.title}</span>
                        {task.category && <span className="text-xs text-ink-500">{task.category}</span>}
                      </span>
                    </span>
                    <span className={`badge ${priorityBadgeClass(task.priority)}`}>{task.priority}</span>
                  </label>
                ))}
              </div>
              <Link to="/tasks" className="btn-secondary mt-4 w-full">
                <Plus className="h-4 w-4" /> Add New Task
              </Link>
            </Panel>

            <Panel title="Habit Tracker" to="/habits">
              <div className="space-y-4">
                {habitsLoading && <Skeleton className="h-32" />}
                {habits.slice(0, 4).map((habit) => (
                  <div key={habit.id}>
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <span className="font-medium text-ink-900">{habit.name}</span>
                      <span className="text-xs text-ink-500">{habit.currentStreak} day streak</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-border">
                        <div
                          className="h-full rounded-full bg-brand-500"
                          style={{ width: `${Math.min(100, (habit.currentStreak / Math.max(habit.bestStreak, 1)) * 100)}%` }}
                        />
                      </div>
                      <button
                        onClick={() => logHabit.mutate(habit.id)}
                        disabled={habit.completedToday}
                        className="text-xs font-semibold text-brand-600 disabled:text-ink-300"
                      >
                        {habit.completedToday ? 'Done' : 'Log'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <Link to="/habits" className="btn-secondary mt-4 w-full">
                <Plus className="h-4 w-4" /> Add New Habit
              </Link>
            </Panel>
          </div>

          {/* Expenses / Transactions / AI */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <Panel title="Expense Overview" to="/expenses" badge="This Month">
              {summaryLoading && <Skeleton className="h-40" />}
              {summary && (
                <>
                  <p className="font-display text-2xl font-bold text-ink-900">{formatCurrency(summary.totalSpent)}</p>
                  <div className="relative mx-auto my-3 h-36 w-36">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={42} outerRadius={62} paddingAngle={2}>
                          {chartData.map((entry) => (
                            <Cell key={entry.name} fill={categoryColor(entry.name)} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-1.5">
                    {chartData.map((entry) => (
                      <div key={entry.name} className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 text-ink-700">
                          <span className="h-2 w-2 rounded-full" style={{ background: categoryColor(entry.name) }} />
                          {entry.name}
                        </span>
                        <span className="font-medium text-ink-900">{formatCurrency(entry.value)}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </Panel>

            <Panel title="Recent Transactions" to="/expenses">
              <p className="py-10 text-center text-sm text-ink-500">
                Head to <Link to="/expenses" className="font-medium text-brand-600">Expenses</Link> to see your latest transactions.
              </p>
            </Panel>

            <div className="card flex flex-col justify-between p-5">
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="flex items-center gap-1.5 font-display text-base font-bold text-ink-900">
                    <Sparkles className="h-4 w-4 text-brand-500" /> AI Assistant
                  </h3>
                  <span className="badge bg-brand-100 text-brand-700">Premium</span>
                </div>
                <div className="rounded-xl bg-surface-soft p-3 text-sm text-ink-700">
                  Good {greeting().split(' ')[1].toLowerCase()}, {user?.fullName?.split(' ')[0]}! You have{' '}
                  {pendingTasks.length} pending task{pendingTasks.length === 1 ? '' : 's'} today.
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link to="/ai-assistant" className="btn-secondary !text-xs">Plan my day</Link>
                <Link to="/ai-assistant" className="btn-secondary !text-xs">Expense insights</Link>
                <Link to="/ai-assistant" className="btn-secondary !text-xs">Summarize notes</Link>
              </div>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <MiniCalendar highlightedDates={events.map((e) => e.startTime)} />

          <Panel title="Upcoming Tasks" to="/tasks">
            <div className="space-y-3">
              {pendingTasks.slice(0, 4).map((task) => (
                <div key={task.id} className="flex items-start justify-between gap-2">
                  <label className="flex items-start gap-2.5">
                    <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-surface-border text-brand-500" />
                    <span>
                      <span className="block text-sm font-medium text-ink-900">{task.title}</span>
                      <span className="text-xs text-ink-500">{task.dueDate ? format(new Date(task.dueDate), 'MMM d') : 'No date'}</span>
                    </span>
                  </label>
                  <span className={`badge ${priorityBadgeClass(task.priority)}`}>{task.priority}</span>
                </div>
              ))}
              {pendingTasks.length === 0 && <p className="text-sm text-ink-500">All caught up!</p>}
            </div>
          </Panel>

          <div className="card p-5">
            <h3 className="mb-3 font-display text-base font-bold text-ink-900">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-2">
              <QuickAction icon={<StickyNote className="h-4 w-4" />} label="Add Note" to="/notes" color="text-brand-600 bg-brand-50" />
              <QuickAction icon={<Receipt className="h-4 w-4" />} label="Add Expense" to="/expenses" color="text-emerald-600 bg-emerald-50" />
              <QuickAction icon={<ListTodo className="h-4 w-4" />} label="Add Task" to="/tasks" color="text-blue-600 bg-blue-50" />
              <QuickAction icon={<CalendarPlus className="h-4 w-4" />} label="Add Event" to="/calendar" color="text-orange-600 bg-orange-50" />
              <QuickAction icon={<ScanLine className="h-4 w-4" />} label="Scan Document" to="/documents" color="text-teal-600 bg-teal-50" />
              <QuickAction icon={<Mic className="h-4 w-4" />} label="Voice Note" to="/notes" color="text-pink-600 bg-pink-50" />
            </div>
          </div>

          <div className="card relative overflow-hidden bg-gradient-to-br from-brand-500 to-brand-700 p-5 text-white">
            <Crown className="mb-2 h-6 w-6 text-amber-300" />
            <h3 className="font-display text-base font-bold">Unlock Premium</h3>
            <p className="mt-1 text-sm text-brand-100">
              Get AI Assistant, unlimited storage, advanced analytics and more.
            </p>
            <Link to="/subscriptions" className="btn-primary mt-4 !bg-white !text-brand-700 hover:!bg-brand-50">
              Upgrade Now
            </Link>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}

function StatCard({
  icon,
  iconBg,
  label,
  value,
  caption,
  to,
  linkLabel,
  accent,
  highlight,
}: {
  icon: React.ReactNode
  iconBg: string
  label: string
  value: string
  caption: string
  to: string
  linkLabel: string
  accent?: boolean
  highlight?: string
}) {
  return (
    <div className="card p-4">
      <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-lg ${iconBg}`}>{icon}</div>
      <p className="text-xs font-medium text-ink-500">{label}</p>
      <p className="mt-0.5 font-display text-xl font-bold text-ink-900">
        {highlight ? (
          <>
            {value} <span className="text-brand-600">{highlight}</span>
          </>
        ) : (
          value
        )}
      </p>
      <p className="mt-0.5 text-xs text-ink-500">{caption}</p>
      <Link to={to} className={`mt-2 flex items-center gap-1 text-xs font-semibold ${accent ? 'text-orange-500' : 'text-brand-600'}`}>
        {linkLabel} <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  )
}

function Panel({
  title,
  children,
  to,
  badge,
}: {
  title: string
  children: React.ReactNode
  to: string
  badge?: string
}) {
  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-base font-bold text-ink-900">{title}</h3>
        {badge ? (
          <span className="text-xs font-medium text-ink-500">{badge}</span>
        ) : (
          <Link to={to} className="text-xs font-semibold text-brand-600 hover:text-brand-700">
            View All
          </Link>
        )}
      </div>
      {children}
    </div>
  )
}

function QuickAction({
  icon,
  label,
  to,
  color,
}: {
  icon: React.ReactNode
  label: string
  to: string
  color: string
}) {
  return (
    <Link
      to={to}
      className="flex flex-col items-center justify-center rounded-xl p-3.5 text-center transition-transform hover:scale-[1.02] bg-white border border-surface-border hover:shadow-sm"
    >
      <div className={`mb-2 flex h-8 w-8 items-center justify-center rounded-lg ${color}`}>
        {icon}
      </div>
      <span className="text-xs font-medium text-ink-700">{label}</span>
    </Link>
  )
}
