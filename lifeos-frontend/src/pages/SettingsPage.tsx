import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { Loader2 } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { useAuth } from '@/context/AuthContext'

export default function SettingsPage() {
  const { user, logout } = useAuth()
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light')



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

        {/* Account Info Card */}
        <div className="card space-y-4 p-6">
          <h3 className="font-display text-base font-bold text-ink-900">Account Info</h3>
          <div>
            <span className="text-xs font-semibold text-ink-500 block mb-1">Role</span>
            <div className="bg-surface-soft border border-surface-border text-ink-900 rounded-lg px-3.5 py-2.5 text-sm uppercase font-semibold tracking-wider text-brand-600">
              {user?.role?.replace('ROLE_', '') ?? 'USER'}
            </div>
          </div>
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


    </AppLayout>
  )
}
