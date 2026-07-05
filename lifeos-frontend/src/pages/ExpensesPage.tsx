import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { AppLayout } from '@/components/layout/AppLayout'
import { Modal, ConfirmDialog, EmptyState, Skeleton } from '@/components/ui/Overlay'
import { useCreateExpense, useDeleteExpense, useExpenseSummary, useExpenses } from '@/hooks/useExpenses'
import { categoryColor, formatCurrency } from '@/lib/format'
import type { Expense, ExpenseCategory, ExpenseRequest } from '@/types'
import { Wallet } from 'lucide-react'

const CATEGORIES: ExpenseCategory[] = [
  'FOOD', 'RENT', 'TRANSPORT', 'SHOPPING', 'BILLS', 'ENTERTAINMENT', 'HEALTH', 'OTHER',
]

export default function ExpensesPage() {
  const { data: expenses = [], isLoading } = useExpenses()
  const { data: summary } = useExpenseSummary()
  const createExpense = useCreateExpense()
  const deleteExpense = useDeleteExpense()

  const [formOpen, setFormOpen] = useState(false)
  const [deleting, setDeleting] = useState<Expense | null>(null)

  const chartData = summary
    ? Object.entries(summary.categoryDistribution).map(([name, value]) => ({ name, value }))
    : []

  return (
    <AppLayout title="Expense Tracker" subtitle="See where your money goes, at a glance.">
      <div className="mb-5 flex justify-end">
        <button onClick={() => setFormOpen(true)} className="btn-primary">
          <Plus className="h-4 w-4" /> Add Expense
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[340px_1fr]">
        {/* Summary card */}
        <div className="card p-5">
          <h3 className="mb-1 font-display text-base font-bold text-ink-900">This Month</h3>
          <p className="font-display text-2xl font-bold text-ink-900">
            {summary ? formatCurrency(summary.totalSpent) : '—'}
          </p>

          <div className="mx-auto my-4 h-52 w-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={64}
                  outerRadius={92}
                  paddingAngle={2}
                >
                  {chartData.map((entry) => (
                    <Cell key={entry.name} fill={categoryColor(entry.name)} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2">
            {chartData.map((entry) => (
              <div key={entry.name} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-ink-700">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: categoryColor(entry.name) }} />
                  {entry.name}
                </span>
                <span className="font-medium text-ink-900">{formatCurrency(entry.value)}</span>
              </div>
            ))}
            {chartData.length === 0 && <p className="text-sm text-ink-500">No expenses logged yet.</p>}
          </div>
        </div>

        {/* Transactions list */}
        <div className="card p-5">
          <h3 className="mb-4 font-display text-base font-bold text-ink-900">Transactions</h3>
          {isLoading ? (
            <div className="space-y-2">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-14" />
              ))}
            </div>
          ) : expenses.length === 0 ? (
            <EmptyState
              icon={<Wallet className="h-6 w-6" />}
              title="No expenses yet"
              description="Log your first expense to see it here."
            />
          ) : (
            <div className="divide-y divide-surface-border">
              {expenses.map((expense) => (
                <div key={expense.id} className="group flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <span
                      className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white"
                      style={{ background: categoryColor(expense.category) }}
                    >
                      {expense.category.charAt(0)}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-ink-900">
                        {expense.description || expense.category}
                      </p>
                      <p className="text-xs text-ink-500">
                        {format(new Date(expense.transactionDate), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-ink-900">{formatCurrency(expense.amount)}</span>
                    <button
                      onClick={() => setDeleting(expense)}
                      className="rounded-md p-1.5 text-ink-300 opacity-0 hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title="Add Expense">
        <ExpenseForm
          submitting={createExpense.isPending}
          onSubmit={(payload) => createExpense.mutate(payload, { onSuccess: () => setFormOpen(false) })}
        />
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Delete expense"
        description="Are you sure you want to remove this transaction?"
        onConfirm={() => deleting && deleteExpense.mutate(deleting.id)}
      />
    </AppLayout>
  )
}

function ExpenseForm({ onSubmit, submitting }: { onSubmit: (p: ExpenseRequest) => void; submitting?: boolean }) {
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState<ExpenseCategory>('FOOD')
  const [description, setDescription] = useState('')
  const [transactionDate, setTransactionDate] = useState(format(new Date(), 'yyyy-MM-dd'))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      amount: Number(Number(amount).toFixed(2)),
      type: 'EXPENSE',
      category,
      description: description || undefined,
      transactionDate,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label">Amount (₹)</label>
        <input
          type="number"
          step="0.01"
          min="0"
          required
          className="input"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          autoFocus
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Category</label>
          <select className="input" value={category} onChange={(e) => setCategory(e.target.value as ExpenseCategory)}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c.charAt(0) + c.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Date</label>
          <input
            type="date"
            className="input"
            value={transactionDate}
            onChange={(e) => setTransactionDate(e.target.value)}
          />
        </div>
      </div>
      <div>
        <label className="label">Description</label>
        <input
          className="input"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional"
        />
      </div>
      <button type="submit" disabled={submitting} className="btn-primary w-full">
        Add expense
      </button>
    </form>
  )
}
