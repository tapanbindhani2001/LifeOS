import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Bell, Sun, Moon, LogOut, User as UserIcon, Settings } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useUnreadCount } from '@/hooks/useNotifications'

export function Topbar({ title, subtitle }: { title: string; subtitle?: string }) {
  const { user, logout } = useAuth()
  const { data: unreadCount = 0 } = useUnreadCount()
  const [menuOpen, setMenuOpen] = useState(false)
  const [dark, setDark] = useState(false)

  return (
    <header className="flex items-center justify-between gap-4 border-b border-surface-border bg-white/80 px-8 py-4 backdrop-blur">
      <div>
        <h1 className="font-display text-xl font-bold text-ink-900">{title}</h1>
        {subtitle && <p className="text-sm text-ink-500">{subtitle}</p>}
      </div>

      <div className="flex flex-1 items-center justify-end gap-3">
        <div className="relative hidden max-w-sm flex-1 sm:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300" />
          <input
            className="input !py-2 pl-9 pr-14"
            placeholder="Search anything..."
            aria-label="Search"
          />
          <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-md bg-surface-muted px-1.5 py-0.5 text-[11px] font-medium text-ink-500">
            ⌘K
          </kbd>
        </div>

        <button
          onClick={() => setDark((d) => !d)}
          className="flex h-9 w-9 items-center justify-center rounded-full text-ink-500 hover:bg-surface-muted"
          aria-label="Toggle theme"
        >
          {dark ? <Moon className="h-[18px] w-[18px]" /> : <Sun className="h-[18px] w-[18px]" />}
        </button>

        <Link
          to="/reminders"
          className="relative flex h-9 w-9 items-center justify-center rounded-full text-ink-500 hover:bg-surface-muted"
          aria-label="Notifications"
        >
          <Bell className="h-[18px] w-[18px]" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Link>

        <div className="relative">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-brand-100 text-sm font-semibold text-brand-700"
          >
            {user?.fullName?.charAt(0).toUpperCase() ?? '?'}
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-11 z-20 w-52 animate-slideUp rounded-xl border border-surface-border bg-white p-1.5 shadow-popover">
                <div className="px-2.5 py-2">
                  <p className="truncate text-sm font-semibold text-ink-900">{user?.fullName}</p>
                  <p className="truncate text-xs text-ink-500">{user?.email}</p>
                </div>
                <div className="my-1 h-px bg-surface-border" />
                <Link
                  to="/settings"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-ink-700 hover:bg-surface-muted"
                >
                  <UserIcon className="h-4 w-4" /> Profile
                </Link>
                <Link
                  to="/settings"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-ink-700 hover:bg-surface-muted"
                >
                  <Settings className="h-4 w-4" /> Settings
                </Link>
                <button
                  onClick={logout}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4" /> Log out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
