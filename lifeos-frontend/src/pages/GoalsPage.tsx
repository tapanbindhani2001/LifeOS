import { useState } from 'react'
import { Plus, Trash2, Target, CheckCircle2 } from 'lucide-react'
import { format } from 'date-fns'
import { AppLayout } from '@/components/layout/AppLayout'
import { Modal, ConfirmDialog, EmptyState, Skeleton } from '@/components/ui/Overlay'
import { useCreateGoal, useDeleteGoal, useGoals, useUpdateGoal } from '@/hooks/useGoals'
import type { Goal, GoalRequest } from '@/types'

export default function GoalsPage() {
  const { data: goals = [], isLoading } = useGoals()
  const createGoal = useCreateGoal()
  const updateGoal = useUpdateGoal()
  const deleteGoal = useDeleteGoal()

  const [formOpen, setFormOpen] = useState(false)
  const [deleting, setDeleting] = useState<Goal | null>(null)

  return (
    <AppLayout title="Goals" subtitle="Track meaningful progress toward what matters.">
      <div className="mb-5 flex justify-end">
        <button onClick={() => setFormOpen(true)} className="btn-primary">
          <Plus className="h-4 w-4" /> New Goal
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : goals.length === 0 ? (
        <EmptyState
          icon={<Target className="h-6 w-6" />}
          title="No goals yet"
          description="Set a goal and track your progress toward it."
          action={
            <button onClick={() => setFormOpen(true)} className="btn-primary">
              <Plus className="h-4 w-4" /> New Goal
            </button>
          }
        />
      ) : (
        <div className="space-y-3">
          {goals.map((goal) => (
            <div key={goal.id} className="card group p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                      goal.completed ? 'bg-emerald-50 text-emerald-500' : 'bg-brand-50 text-brand-500'
                    }`}
                  >
                    {goal.completed ? <CheckCircle2 className="h-4 w-4" /> : <Target className="h-4 w-4" />}
                  </div>
                  <div>
                    <h3 className="font-display text-base font-bold text-ink-900">{goal.title}</h3>
                    {goal.description && <p className="mt-0.5 text-sm text-ink-500">{goal.description}</p>}
                    {goal.targetDate && (
                      <p className="mt-1 text-xs text-ink-500">
                        Target: {format(new Date(goal.targetDate), 'MMM d, yyyy')}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setDeleting(goal)}
                  className="rounded-md p-1.5 text-ink-300 opacity-0 hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="mt-4">
                <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-ink-500">
                  <span>Progress</span>
                  <span>{goal.progress}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-surface-border">
                  <div
                    className={`h-full rounded-full transition-all ${goal.completed ? 'bg-emerald-500' : 'bg-brand-500'}`}
                    style={{ width: `${goal.progress}%` }}
                  />
                </div>
                {!goal.completed && (
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={goal.progress}
                    onChange={(e) =>
                      updateGoal.mutate({ id: goal.id, payload: { progress: Number(e.target.value) } })
                    }
                    className="mt-2 w-full accent-brand-500"
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title="New Goal">
        <GoalForm
          submitting={createGoal.isPending}
          onSubmit={(payload) => createGoal.mutate(payload, { onSuccess: () => setFormOpen(false) })}
        />
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Delete goal"
        description={`Delete "${deleting?.title}"? This can't be undone.`}
        onConfirm={() => deleting && deleteGoal.mutate(deleting.id)}
      />
    </AppLayout>
  )
}

function GoalForm({ onSubmit, submitting }: { onSubmit: (p: GoalRequest) => void; submitting?: boolean }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [progress, setProgress] = useState(0)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({ title, description: description || undefined, targetDate: targetDate || undefined, progress })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label">Goal title</label>
        <input
          className="input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          autoFocus
        />
      </div>
      <div>
        <label className="label">Description</label>
        <textarea className="input min-h-20" value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div>
        <label className="label">Target date</label>
        <input type="date" className="input" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
      </div>
      <div>
        <label className="label">Starting progress ({progress}%)</label>
        <input
          type="range"
          min={0}
          max={100}
          value={progress}
          onChange={(e) => setProgress(Number(e.target.value))}
          className="w-full accent-brand-500"
        />
      </div>
      <button type="submit" disabled={submitting} className="btn-primary w-full">
        Create goal
      </button>
    </form>
  )
}
