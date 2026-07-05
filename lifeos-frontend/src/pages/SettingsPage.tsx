import { useState } from 'react'
import toast from 'react-hot-toast'
import { Loader2 } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { useAuth } from '@/context/AuthContext'
import { authApi } from '@/api/auth'
import { ApiError } from '@/api/client'

export default function SettingsPage() {
  const { user, refreshProfile, logout } = useAuth()
  const [fullName, setFullName] = useState(user?.fullName ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await authApi.updateProfile({ fullName, email, password: password || undefined })
      await refreshProfile()
      toast.success('Profile updated')
      setPassword('')
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not update profile')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppLayout title="Settings" subtitle="Manage your profile and account preferences.">
      <div className="max-w-lg space-y-6">
        <form onSubmit={handleSubmit} className="card space-y-4 p-6">
          <h3 className="font-display text-base font-bold text-ink-900">Profile</h3>
          <div>
            <label className="label">Full name</label>
            <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </div>
          <div>
            <label className="label">Email</label>
            <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="label">New password</label>
            <input
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Leave blank to keep current password"
            />
          </div>
          <button type="submit" disabled={saving} className="btn-primary w-full">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Save changes
          </button>
        </form>

        <div className="card p-6">
          <h3 className="font-display text-base font-bold text-ink-900">Account</h3>
          <p className="mt-1 text-sm text-ink-500">Sign out of LifeOS on this device.</p>
          <button onClick={logout} className="btn-secondary mt-4">
            Log out
          </button>
        </div>
      </div>
    </AppLayout>
  )
}
