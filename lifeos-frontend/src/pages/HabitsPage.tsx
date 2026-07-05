import { useState } from 'react'
import { Plus, Flame, Trash2, Droplets, Dumbbell, BookOpen, Brain, Repeat } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Modal, ConfirmDialog, EmptyState, Skeleton } from '@/components/ui/Overlay'
import { useCreateHabit, useDeleteHabit, useHabits, useLogHabit } from '@/hooks/useHabits'
import type { Habit, HabitFrequency, HabitRequest } from '@/types'

const ICONS = [Droplets, Dumbbell, BookOpen, Brain, Repeat]
function iconFor(index: number) {
  const Icon = ICONS[index % ICONS.length]
  return Icon
}

export default function HabitsPage() {
  const { data: habits = [], isLoading } = useHabits()
  const createHabit = useCreateHabit()
  const deleteHabit = useDeleteHabit()
  const logHabit = useLogHabit()

  const [formOpen, setFormOpen] = useState(false)
  const [deleting, setDeleting] = useState<Habit | null>(null)

  return (
    <AppLayout title="Habit Tracker" subtitle="Build streaks that stick, one check-in at a time.">
      <div className="mb-5 flex justify-end">
        <button onClick={() => setFormOpen(true)} className="btn-primary">
          <Plus className="h-4 w-4" /> New Habit
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : habits.length === 0 ? (
        <EmptyState
          icon={<Repeat className="h-6 w-6" />}
          title="No habits yet"
          description="Add a habit to start building your streak."
          action={
            <button onClick={() => setFormOpen(true)} className="btn-primary">
              <Plus className="h-4 w-4" /> New Habit
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {habits.map((habit, i) => {
            const Icon = iconFor(i)
            const progress = Math.min(100, (habit.currentStreak / Math.max(habit.bestStreak, 1)) * 100)
            // support both completedToday and loggedToday from backend
            const doneToday = habit.completedToday || habit.loggedToday
            return (
              <div key={habit.id} className="card group relative p-5">
                <button
                  onClick={() => setDeleting(habit)}
                  className="absolute right-3 top-3 rounded-md p-1 text-ink-300 opacity-0 hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-display text-base font-bold text-ink-900">{habit.name}</h3>
                <p className="mt-0.5 text-xs text-ink-500">
                  {habit.frequency === 'DAILY' ? 'Daily' : 'Weekly'}
                  {habit.targetCount ? ` · target ${habit.targetCount}` : ''}
                </p>

                <div className="mt-4 flex items-center gap-1.5 text-sm">
                  <Flame className="h-4 w-4 text-orange-500" />
                  <span className="font-semibold text-ink-900">{habit.currentStreak} day streak</span>
                  <span className="text-xs text-ink-500">· best {habit.bestStreak}</span>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-border">
                  <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${progress}%` }} />
                </div>

                <button
                  onClick={() => logHabit.mutate(habit.id)}
                  disabled={doneToday}
                  className={doneToday ? 'btn-secondary mt-4 w-full' : 'btn-primary mt-4 w-full'}
                >
                  {doneToday ? 'Logged for today' : 'Log check-in'}
                </button>
              </div>
            )
          })}
        </div>
      )}

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title="New Habit">
        <HabitForm
          submitting={createHabit.isPending}
          onSubmit={(payload) => createHabit.mutate(payload, { onSuccess: () => setFormOpen(false) })}
        />
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Delete habit"
        description={`Delete "${deleting?.name}"? Your streak history will be lost.`}
        onConfirm={() => deleting && deleteHabit.mutate(deleting.id)}
      />
    </AppLayout>
  )
}

function HabitForm({ onSubmit, submitting }: { onSubmit: (p: HabitRequest) => void; submitting?: boolean }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [frequency, setFrequency] = useState<HabitFrequency>('DAILY')
  const [targetCount, setTargetCount] = useState(1)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({ name, description: description || undefined, frequency, targetCount })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label">Habit name</label>
        <input
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoFocus
          placeholder="Drink water"
        />
      </div>
      <div>
        <label className="label">Description</label>
        <input
          className="input"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="8 glasses a day"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Frequency</label>
          <select className="input" value={frequency} onChange={(e) => setFrequency(e.target.value as HabitFrequency)}>
            <option value="DAILY">Daily</option>
            <option value="WEEKLY">Weekly</option>
          </select>
        </div>
        <div>
          <label className="label">Target count</label>
          <input
            type="number"
            min={1}
            className="input"
            value={targetCount}
            onChange={(e) => setTargetCount(Number(e.target.value))}
          />
        </div>
      </div>
      <button type="submit" disabled={submitting} className="btn-primary w-full">
        Create habit
      </button>
    </form>
  )
}
