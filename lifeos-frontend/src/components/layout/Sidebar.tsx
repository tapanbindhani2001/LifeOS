import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Calendar,
  CheckSquare,
  StickyNote,
  Repeat,
  Target,
  Wallet,
  PiggyBank,
  BarChart3,
  FileText,
  Sparkles,
  Bell,
  Users,
  Settings,
  ShieldCheck,
  Crown,
  CreditCard,
  Calculator,
} from 'lucide-react'
import clsx from 'clsx'
import { useAuth } from '@/context/AuthContext'
import { useSubscription } from '@/hooks/useSubscription'
import { Logo } from '@/components/ui/Logo'

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/calendar', label: 'Calendar', icon: Calendar },
  { to: '/tasks', label: 'Tasks', icon: CheckSquare },
  { to: '/notes', label: 'Notes', icon: StickyNote },
  { to: '/habits', label: 'Habit Tracker', icon: Repeat },
  { to: '/goals', label: 'Goals', icon: Target },
  { to: '/expenses', label: 'Expenses', icon: Wallet },
  { to: '/budget', label: 'Budget', icon: PiggyBank },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/calculator', label: 'Calculator', icon: Calculator },
  { to: '/documents', label: 'Documents', icon: FileText },
  { to: '/subscriptions', label: 'Subscriptions', icon: CreditCard },
]

export function Sidebar() {
  const { user } = useAuth()
  const { data: subscription } = useSubscription()
  const isPremium = subscription && subscription.plan !== 'FREE'

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-surface-border bg-white">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-6 py-5">
        <Logo size="sm" />
        <span className="font-display text-lg font-bold text-ink-900">LifeOS</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                isActive ? 'bg-brand-50 text-brand-600' : 'text-ink-500 hover:bg-surface-muted hover:text-ink-900',
              )
            }
          >
            <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
            {label}
          </NavLink>
        ))}

        <NavLink
          to="/ai-assistant"
          className={({ isActive }) =>
            clsx(
              'flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
              isActive ? 'bg-brand-50 text-brand-600' : 'text-ink-500 hover:bg-surface-muted hover:text-ink-900',
            )
          }
        >
          <span className="flex items-center gap-3">
            <Sparkles className="h-[18px] w-[18px]" strokeWidth={2} />
            AI Assistant
          </span>
          <span className="badge bg-brand-100 text-brand-700">Premium</span>
        </NavLink>

        <NavLink
          to="/reminders"
          className={({ isActive }) =>
            clsx(
              'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
              isActive ? 'bg-brand-50 text-brand-600' : 'text-ink-500 hover:bg-surface-muted hover:text-ink-900',
            )
          }
        >
          <Bell className="h-[18px] w-[18px]" strokeWidth={2} />
          Reminders
        </NavLink>

        <NavLink
          to="/contacts"
          className={({ isActive }) =>
            clsx(
              'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
              isActive ? 'bg-brand-50 text-brand-600' : 'text-ink-500 hover:bg-surface-muted hover:text-ink-900',
            )
          }
        >
          <Users className="h-[18px] w-[18px]" strokeWidth={2} />
          Contacts
        </NavLink>

        {user?.role === 'ROLE_ADMIN' && (
          <NavLink
            to="/admin"
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                isActive ? 'bg-brand-50 text-brand-600' : 'text-ink-500 hover:bg-surface-muted hover:text-ink-900',
              )
            }
          >
            <ShieldCheck className="h-[18px] w-[18px]" strokeWidth={2} />
            Admin Console
          </NavLink>
        )}

        <NavLink
          to="/settings"
          className={({ isActive }) =>
            clsx(
              'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
              isActive ? 'bg-brand-50 text-brand-600' : 'text-ink-500 hover:bg-surface-muted hover:text-ink-900',
            )
          }
        >
          <Settings className="h-[18px] w-[18px]" strokeWidth={2} />
          Settings
        </NavLink>
      </nav>

      {/* Storage + Upgrade + Profile */}
      <div className="space-y-3 border-t border-surface-border p-4">
        {!isPremium && (
          <div className="rounded-xl bg-surface-soft p-3">
            <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-ink-500">
              <span>Storage</span>
              <span>1.2 GB / 5 GB</span>
            </div>
            <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-surface-border">
              <div className="h-full w-1/4 rounded-full bg-brand-500" />
            </div>
            <button className="btn-primary w-full !py-2 !text-xs">
              <Crown className="h-3.5 w-3.5" />
              Upgrade to Premium
            </button>
          </div>
        )}

        <div className="flex items-center gap-2.5 rounded-xl px-1 py-1">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
            {user?.fullName?.charAt(0).toUpperCase() ?? '?'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-ink-900">{user?.fullName ?? 'Guest'}</p>
            <p className="truncate text-xs text-ink-500">{isPremium ? subscription?.plan : 'Free Plan'}</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
