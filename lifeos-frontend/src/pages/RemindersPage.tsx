import { CheckCheck, Bell, Info, AlertTriangle, CheckCircle2, Clock, ShieldAlert } from 'lucide-react'
import { format } from 'date-fns'
import { AppLayout } from '@/components/layout/AppLayout'
import { EmptyState, Skeleton } from '@/components/ui/Overlay'
import { useMarkAllRead, useNotifications } from '@/hooks/useNotifications'
import type { NotificationType } from '@/types'
import clsx from 'clsx'

// Map every NotificationType variant to an icon and color
const ICONS: Partial<Record<NotificationType, typeof Info>> = {
  INFO: Info,
  WARNING: AlertTriangle,
  SUCCESS: CheckCircle2,
  REMINDER: Clock,
  SYSTEM: ShieldAlert,
  ALERT: AlertTriangle,
}

const COLORS: Partial<Record<NotificationType, string>> = {
  INFO: 'bg-blue-50 text-blue-500',
  WARNING: 'bg-amber-50 text-amber-500',
  SUCCESS: 'bg-emerald-50 text-emerald-500',
  REMINDER: 'bg-purple-50 text-purple-500',
  SYSTEM: 'bg-ink-100 text-ink-500',
  ALERT: 'bg-red-50 text-red-500',
}

const DEFAULT_ICON = Info
const DEFAULT_COLOR = 'bg-surface-muted text-ink-400'

export default function RemindersPage() {
  const { data: notifications = [], isLoading } = useNotifications()
  const markAllRead = useMarkAllRead()

  return (
    <AppLayout title="Reminders" subtitle="Stay on top of what needs your attention.">
      <div className="mb-5 flex justify-end">
        <button onClick={() => markAllRead.mutate()} className="btn-secondary">
          <CheckCheck className="h-4 w-4" /> Mark all as read
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)}
        </div>
      ) : notifications.length === 0 ? (
        <EmptyState
          icon={<Bell className="h-6 w-6" />}
          title="You're all caught up"
          description="New notifications will show up here."
        />
      ) : (
        <div className="card divide-y divide-surface-border overflow-hidden">
          {notifications.map((n) => {
            const Icon = ICONS[n.type] ?? DEFAULT_ICON
            const colorClass = COLORS[n.type] ?? DEFAULT_COLOR
            return (
              <div key={n.id} className={clsx('flex gap-3 p-4', !n.read && 'bg-brand-50/40')}>
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${colorClass}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink-900">{n.title}</p>
                  <p className="mt-0.5 text-sm text-ink-500">{n.message}</p>
                  <p className="mt-1 text-xs text-ink-300">{format(new Date(n.createdAt), 'MMM d, hh:mm a')}</p>
                </div>
                {!n.read && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand-500" />}
              </div>
            )
          })}
        </div>
      )}
    </AppLayout>
  )
}
