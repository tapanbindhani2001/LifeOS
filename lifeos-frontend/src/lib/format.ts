import type { TaskPriority, TaskStatus } from '@/types'

export function priorityBadgeClass(priority: TaskPriority): string {
  switch (priority) {
    case 'HIGH':
      return 'bg-red-50 text-red-600'
    case 'MEDIUM':
      return 'bg-amber-50 text-amber-600'
    case 'LOW':
      return 'bg-emerald-50 text-emerald-600'
    default:
      return 'bg-surface-muted text-ink-500'
  }
}

export function statusLabel(status: TaskStatus): string {
  switch (status) {
    case 'TODO':
      return 'To do'
    case 'IN_PROGRESS':
      return 'In progress'
    case 'DONE':
      return 'Done'
  }
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

export const CATEGORY_COLORS: Record<string, string> = {
  FOOD: '#6d4df2',
  RENT: '#3ac6a0',
  TRANSPORT: '#f2994a',
  SHOPPING: '#f2c94c',
  BILLS: '#eb5757',
  ENTERTAINMENT: '#2f80ed',
  HEALTH: '#bb6bd9',
  OTHER: '#9b9b9b',
}

export function categoryColor(category: string): string {
  return CATEGORY_COLORS[category] ?? '#9b9b9b'
}

export function initials(name: string): string {
  return name
    .split(' ')
    .map((p) => p.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase()
}
