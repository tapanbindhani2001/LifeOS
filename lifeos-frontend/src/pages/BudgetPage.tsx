import { useState } from 'react'
import { Pencil, Trash2, Plus, TrendingUp, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import clsx from 'clsx'
import { AppLayout } from '@/components/layout/AppLayout'
import { Modal, Skeleton } from '@/components/ui/Overlay'
import { useBudgets, useDeleteBudget, useUpsertBudget } from '@/hooks/useBudget'
import { formatCurrency } from '@/lib/format'
import type { Budget } from '@/types'

const CATEGORIES = [
  { key: 'FOOD', label: 'Food', emoji: '🍔' },
  { key: 'RENT', label: 'Rent', emoji: '🏠' },
  { key: 'TRANSPORT', label: 'Transport', emoji: '🚗' },
  { key: 'SHOPPING', label: 'Shopping', emoji: '🛍️' },
  { key: 'BILLS', label: 'Bills', emoji: '📄' },
  { key: 'ENTERTAINMENT', label: 'Entertainment', emoji: '🎬' },
  { key: 'HEALTH', label: 'Health', emoji: '💊' },
  { key: 'OTHER', label: 'Other', emoji: '📦' },
]

const STATUS_CONFIG = {
  ON_TRACK: {
    bar: 'bg-emerald-500',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: CheckCircle,
    label: 'On Track',
  },
  WARNING: {
    bar: 'bg-amber-400',
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: AlertTriangle,
    label: 'Warning',
  },
  OVER_BUDGET: {
    bar: 'bg-red-500',
    badge: 'bg-red-50 text-red-700 border-red-200',
    icon: XCircle,
    label: 'Over Budget',
  },
}

function BudgetFormModal({
  initial,
  onClose,
}: {
  initial?: { category: string; monthlyLimit: number }
  onClose: () => void
}) {
  const upsert = useUpsertBudget()
  const [category, setCategory] = useState(initial?.category ?? 'FOOD')
  const [limit, setLimit] = useState(initial ? String(initial.monthlyLimit) : '')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!limit || isNaN(Number(limit))) return
    upsert.mutate(
      { category, monthlyLimit: Number(limit) },
      { onSuccess: onClose },
    )
  }

  return (
    <Modal open={true} title={initial ? 'Edit Budget Limit' : 'Set Budget Limit'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Category</label>
          <select
            className="input"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            disabled={!!initial}
          >
            {CATEGORIES.map((c) => (
              <option key={c.key} value={c.key}>
                {c.emoji} {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Monthly Limit (₹)</label>
          <input
            className="input"
            type="number"
            min={1}
            step={1}
            placeholder="e.g. 5000"
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
            required
            autoFocus
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-ghost">
            Cancel
          </button>
          <button type="submit" disabled={upsert.isPending} className="btn-primary">
            {upsert.isPending ? 'Saving…' : 'Save Budget'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function BudgetCard({ budget, onEdit }: { budget: Budget; onEdit: () => void }) {
  const deleteBudget = useDeleteBudget()
  const cfg = STATUS_CONFIG[budget.status]
  const StatusIcon = cfg.icon
  const displayPct = Math.min(budget.percentage, 100)

  const catMeta = CATEGORIES.find((c) => c.key === budget.category)

  return (
    <div className="card group p-5 transition-shadow hover:shadow-md">
      {/* Top row */}
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-soft text-xl">
            {catMeta?.emoji ?? '💰'}
          </span>
          <div>
            <p className="font-display text-sm font-semibold text-ink-900">
              {catMeta?.label ?? budget.category}
            </p>
            <p className="text-xs text-ink-400">Monthly limit</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={onEdit}
            className="rounded-lg p-1.5 text-ink-400 hover:bg-surface-soft hover:text-ink-700"
            title="Edit limit"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => deleteBudget.mutate(budget.id)}
            className="rounded-lg p-1.5 text-ink-400 hover:bg-red-50 hover:text-red-500"
            title="Remove budget"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="mb-1.5 flex items-baseline justify-between text-xs">
          <span className="font-medium text-ink-700">
            {formatCurrency(budget.spent)} spent
          </span>
          <span className="text-ink-400">
            of {formatCurrency(budget.monthlyLimit)}
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-surface-soft">
          <div
            className={clsx('h-2 rounded-full transition-all duration-700', cfg.bar)}
            style={{ width: `${displayPct}%` }}
          />
        </div>
        <div className="mt-1.5 flex items-center justify-between">
          <span className="text-xs text-ink-400">{budget.percentage.toFixed(1)}% used</span>
          <span
            className={clsx(
              'flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold',
              cfg.badge,
            )}
          >
            <StatusIcon className="h-3 w-3" />
            {cfg.label}
          </span>
        </div>
      </div>

      {/* Remaining */}
      {budget.status !== 'OVER_BUDGET' ? (
        <p className="text-xs text-ink-500">
          <span className="font-semibold text-ink-700">
            {formatCurrency(budget.monthlyLimit - budget.spent)}
          </span>{' '}
          remaining this month
        </p>
      ) : (
        <p className="text-xs font-semibold text-red-600">
          Over by {formatCurrency(budget.spent - budget.monthlyLimit)}
        </p>
      )}
    </div>
  )
}

function UnbudgetedCard({
  category,
  onSet,
}: {
  category: (typeof CATEGORIES)[0]
  onSet: () => void
}) {
  return (
    <div className="card flex items-center justify-between border border-dashed border-surface-border bg-surface-soft/50 p-5">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-muted text-xl">
          {category.emoji}
        </span>
        <div>
          <p className="text-sm font-semibold text-ink-600">{category.label}</p>
          <p className="text-xs text-ink-400">No limit set</p>
        </div>
      </div>
      <button
        onClick={onSet}
        className="flex items-center gap-1 rounded-lg border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-600 transition-colors hover:bg-brand-100"
      >
        <Plus className="h-3.5 w-3.5" /> Set Limit
      </button>
    </div>
  )
}

export default function BudgetPage() {
  const { data: budgets = [], isLoading } = useBudgets()
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Budget | null>(null)
  const [newCategory, setNewCategory] = useState<string | null>(null)

  const budgetedKeys = new Set(budgets.map((b) => b.category))
  const unbudgetedCategories = CATEGORIES.filter((c) => !budgetedKeys.has(c.key))

  const totalBudgeted = budgets.reduce((s, b) => s + b.monthlyLimit, 0)
  const totalSpent = budgets.reduce((s, b) => s + b.spent, 0)
  const overBudgetCount = budgets.filter((b) => b.status === 'OVER_BUDGET').length
  const warningCount = budgets.filter((b) => b.status === 'WARNING').length

  const openNew = (categoryKey?: string) => {
    setNewCategory(categoryKey ?? null)
    setEditTarget(null)
    setFormOpen(true)
  }

  const openEdit = (budget: Budget) => {
    setEditTarget(budget)
    setNewCategory(null)
    setFormOpen(true)
  }

  return (
    <AppLayout title="Budget Planner" subtitle="Set monthly limits and track spending by category.">
      {/* Summary Strip */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          {
            label: 'Total Budgeted',
            value: formatCurrency(totalBudgeted),
            icon: '🎯',
            color: 'text-brand-600',
          },
          {
            label: 'Total Spent',
            value: formatCurrency(totalSpent),
            icon: '💳',
            color: totalSpent > totalBudgeted ? 'text-red-600' : 'text-ink-700',
          },
          {
            label: 'Categories Set',
            value: `${budgets.length} / ${CATEGORIES.length}`,
            icon: '📊',
            color: 'text-ink-700',
          },
          {
            label: 'Alerts',
            value: overBudgetCount > 0
              ? `${overBudgetCount} over budget`
              : warningCount > 0
              ? `${warningCount} warnings`
              : 'All clear ✓',
            icon: overBudgetCount > 0 ? '🚨' : warningCount > 0 ? '⚠️' : '✅',
            color: overBudgetCount > 0 ? 'text-red-600' : warningCount > 0 ? 'text-amber-600' : 'text-emerald-600',
          },
        ].map((s) => (
          <div key={s.label} className="card px-5 py-4">
            <p className="mb-1 text-xs text-ink-400">{s.label}</p>
            <p className={clsx('font-display text-lg font-bold', s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Header action */}
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-ink-500">
          <TrendingUp className="h-4 w-4" />
          Budgets reset on the 1st of each month
        </div>
        <button onClick={() => openNew()} className="btn-primary">
          <Plus className="h-4 w-4" /> Set Budget
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : (
        <>
          {/* Budgeted categories */}
          {budgets.length > 0 && (
            <div className="mb-6">
              <h2 className="mb-3 font-display text-sm font-semibold text-ink-600 uppercase tracking-wide">
                Active Budgets
              </h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {budgets.map((b) => (
                  <BudgetCard key={b.id} budget={b} onEdit={() => openEdit(b)} />
                ))}
              </div>
            </div>
          )}

          {/* Unbudgeted categories */}
          {unbudgetedCategories.length > 0 && (
            <div>
              <h2 className="mb-3 font-display text-sm font-semibold text-ink-400 uppercase tracking-wide">
                Unbudgeted Categories
              </h2>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {unbudgetedCategories.map((c) => (
                  <UnbudgetedCard key={c.key} category={c} onSet={() => openNew(c.key)} />
                ))}
              </div>
            </div>
          )}

          {budgets.length === 0 && unbudgetedCategories.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <span className="mb-4 text-5xl">💰</span>
              <h3 className="mb-2 font-display text-lg font-semibold text-ink-900">
                No budgets set yet
              </h3>
              <p className="mb-6 text-sm text-ink-500">
                Set monthly spending limits to start tracking where your money goes.
              </p>
              <button onClick={() => openNew()} className="btn-primary">
                <Plus className="h-4 w-4" /> Set Your First Budget
              </button>
            </div>
          )}
        </>
      )}

      {formOpen && (
        <BudgetFormModal
          initial={
            editTarget
              ? { category: editTarget.category, monthlyLimit: editTarget.monthlyLimit }
              : newCategory
              ? { category: newCategory, monthlyLimit: 0 }
              : undefined
          }
          onClose={() => {
            setFormOpen(false)
            setEditTarget(null)
            setNewCategory(null)
          }}
        />
      )}
    </AppLayout>
  )
}
