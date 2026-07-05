import { Users, UserCheck, ListChecks, Wallet, TrendingUp, Ban, ShieldCheck } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Skeleton } from '@/components/ui/Overlay'
import { useAdminStats, useAdminUsers, useToggleUserStatus, useUpdateUserRole } from '@/hooks/usePlatform'
import { useAuth } from '@/context/AuthContext'
import { formatCurrency, initials } from '@/lib/format'

export default function AdminPage() {
  const { user: currentUser } = useAuth()
  const { data: stats, isLoading: statsLoading } = useAdminStats()
  const { data: users = [], isLoading: usersLoading } = useAdminUsers()
  const toggleStatus = useToggleUserStatus()
  const updateRole = useUpdateUserRole()

  const statCards = [
    { label: 'Total Users', value: stats?.totalUsers, icon: Users, color: 'bg-blue-50 text-blue-500' },
    {
      label: 'Active Subscriptions',
      value: stats?.activeSubscriptions ?? stats?.totalSubscriptions,
      icon: UserCheck,
      color: 'bg-emerald-50 text-emerald-500',
    },
    { label: 'Total Tasks', value: stats?.totalTasks, icon: ListChecks, color: 'bg-purple-50 text-purple-500' },
    {
      label: 'Expenses Tracked',
      value: stats
        ? stats.totalExpensesTracked !== undefined
          ? formatCurrency(stats.totalExpensesTracked)
          : String(stats.totalExpenses)
        : undefined,
      icon: Wallet,
      color: 'bg-orange-50 text-orange-500',
    },
    {
      label: 'New This Week',
      value: stats?.newUsersThisWeek ?? '—',
      icon: TrendingUp,
      color: 'bg-teal-50 text-teal-500',
    },
  ]

  return (
    <AppLayout title="Admin Console" subtitle="System-wide stats and user management.">
      {/* Stat cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card p-4">
            <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-lg ${color}`}>
              <Icon className="h-5 w-5" />
            </div>
            <p className="text-xs font-medium text-ink-500">{label}</p>
            {statsLoading ? (
              <Skeleton className="mt-1 h-6 w-16" />
            ) : (
              <p className="mt-0.5 font-display text-xl font-bold text-ink-900">{value ?? '—'}</p>
            )}
          </div>
        ))}
      </div>

      {/* Users table */}
      <div className="card overflow-hidden">
        <div className="border-b border-surface-border p-5">
          <h3 className="font-display text-base font-bold text-ink-900">All Users</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-surface-border text-xs font-semibold uppercase tracking-wide text-ink-500">
                <th className="px-5 py-3">User</th>
                <th className="px-5 py-3">Role</th>
                <th className="px-5 py-3">Plan</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {usersLoading && (
                <tr>
                  <td colSpan={5} className="p-5">
                    <Skeleton className="h-32" />
                  </td>
                </tr>
              )}
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
                        {initials(u.fullName)}
                      </div>
                      <div>
                        <p className="font-medium text-ink-900">{u.fullName}</p>
                        <p className="text-xs text-ink-500">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <select
                      value={u.role}
                      disabled={u.id === currentUser?.id}
                      onChange={(e) => updateRole.mutate({ id: u.id, role: e.target.value })}
                      className="rounded-lg border border-surface-border bg-white px-2 py-1 text-xs font-medium disabled:opacity-50"
                    >
                      <option value="ROLE_USER">User</option>
                      <option value="ROLE_ADMIN">Admin</option>
                    </select>
                  </td>
                  <td className="px-5 py-3 text-ink-700">{u.subscriptionPlan ?? 'FREE'}</td>
                  <td className="px-5 py-3">
                    <span
                      className={`badge ${
                        u.enabled !== false ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                      }`}
                    >
                      {u.enabled !== false ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => toggleStatus.mutate(u.id)}
                      disabled={u.id === currentUser?.id}
                      className="btn-ghost !px-2 !py-1 text-xs disabled:opacity-40"
                      title={u.id === currentUser?.id ? "You can't disable your own account" : ''}
                    >
                      {u.enabled !== false ? (
                        <>
                          <Ban className="h-3.5 w-3.5" /> Disable
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="h-3.5 w-3.5" /> Enable
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  )
}
