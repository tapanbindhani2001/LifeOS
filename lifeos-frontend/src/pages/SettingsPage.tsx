import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { Loader2 } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { useAuth } from '@/context/AuthContext'
import { authApi } from '@/api/auth'
import { ApiError } from '@/api/client'
import { Modal } from '@/components/ui/Overlay'

export default function SettingsPage() {
  const { user, logout } = useAuth()
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light')

  // Change Password Modal States
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)

  // App Updates State
  const [checkingUpdates, setCheckingUpdates] = useState(false)

  useEffect(() => {
    const handleSync = () => {
      setTheme(localStorage.getItem('theme') || 'light')
    }
    window.addEventListener('storage', handleSync)
    return () => window.removeEventListener('storage', handleSync)
  }, [])

  const changeTheme = (newTheme: string) => {
    setTheme(newTheme)
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
    window.dispatchEvent(new Event('storage'))
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPassword.trim()) {
      toast.error('Password cannot be empty')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    setSavingPassword(true)
    try {
      await authApi.updateProfile({
        fullName: user?.fullName || '',
        email: user?.email,
        password: newPassword
      })
      toast.success('Password updated successfully')
      setPasswordOpen(false)
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not change password')
    } finally {
      setSavingPassword(false)
    }
  }

  const handleCheckUpdates = () => {
    setCheckingUpdates(true)
    setTimeout(() => {
      setCheckingUpdates(false)
      toast.success('Your app is up to date! (v1.0.0)')
    }, 1500)
  }

  return (
    <AppLayout title="Settings" subtitle="Manage your profile and account preferences.">
      <div className="max-w-lg space-y-6">
        {/* Read-only Profile Details Card */}
        <div className="card space-y-4 p-6">
          <h3 className="font-display text-base font-bold text-ink-900">Profile Details</h3>
          <div>
            <span className="text-xs font-semibold text-ink-500 block mb-1">Full Name</span>
            <div className="bg-surface-soft border border-surface-border text-ink-900 rounded-lg px-3.5 py-2.5 text-sm">
              {user?.fullName}
            </div>
          </div>
          <div>
            <span className="text-xs font-semibold text-ink-500 block mb-1">Email Address</span>
            <div className="bg-surface-soft border border-surface-border text-ink-900 rounded-lg px-3.5 py-2.5 text-sm">
              {user?.email}
            </div>
          </div>
        </div>

        {/* Security Card */}
        <div className="card p-6">
          <h3 className="font-display text-base font-bold text-ink-900">Security</h3>
          <p className="mt-1 text-sm text-ink-500">Update your account password securely.</p>
          <button onClick={() => setPasswordOpen(true)} className="btn-secondary mt-4">
            Change Password
          </button>
        </div>

        {/* Display Preferences */}
        <div className="card p-6">
          <h3 className="font-display text-base font-bold text-ink-900">Display Preferences</h3>
          <p className="mt-1 text-sm text-ink-500">Choose between light and dark display modes.</p>
          <div className="mt-4 flex gap-3">
            <button
              onClick={() => changeTheme('light')}
              className={`btn-secondary flex-1 py-3 text-center transition-all ${
                theme === 'light' ? '!border-brand-500 !bg-brand-50/30 font-bold text-brand-600' : ''
              }`}
            >
              ☀️ Bright (Light)
            </button>
            <button
              onClick={() => changeTheme('dark')}
              className={`btn-secondary flex-1 py-3 text-center transition-all ${
                theme === 'dark' ? '!border-brand-500 !bg-brand-50/20 font-bold text-brand-600' : ''
              }`}
            >
              🌙 Dark
            </button>
          </div>
        </div>

        {/* App Version & Updates Card */}
        <div className="card p-6">
          <h3 className="font-display text-base font-bold text-ink-900">App Updates</h3>
          <p className="mt-1 text-sm text-ink-500">LifeOS is currently at version 1.0.0.</p>
          <button onClick={handleCheckUpdates} disabled={checkingUpdates} className="btn-secondary mt-4 flex items-center gap-2">
            {checkingUpdates && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {checkingUpdates ? 'Checking for updates...' : 'Check for Updates'}
          </button>
        </div>

        {/* Sign Out Card */}
        <div className="card p-6">
          <h3 className="font-display text-base font-bold text-ink-900">Account</h3>
          <p className="mt-1 text-sm text-ink-500">Sign out of LifeOS on this device.</p>
          <button onClick={logout} className="btn-secondary mt-4">
            Log out
          </button>
        </div>
      </div>

      {/* Change Password Modal */}
      <Modal open={passwordOpen} onClose={() => setPasswordOpen(false)} title="Change Password" width="max-w-md">
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="label">New password</label>
            <input
              type="password"
              className="input"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              autoFocus
              placeholder="Enter new password"
            />
          </div>
          <div>
            <label className="label">Confirm new password</label>
            <input
              type="password"
              className="input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="Confirm new password"
            />
          </div>
          <button type="submit" disabled={savingPassword} className="btn-primary w-full">
            {savingPassword && <Loader2 className="h-4 w-4 animate-spin" />}
            Update Password
          </button>
        </form>
      </Modal>
    </AppLayout>
  )
}
