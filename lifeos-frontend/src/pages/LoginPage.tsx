import { useEffect, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { authApi } from '@/api/auth'
import toast from 'react-hot-toast'
import { Logo } from '@/components/ui/Logo'

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  
  // Regular Login states
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  // Forgot Password flow states
  const [isForgot, setIsForgot] = useState(false)
  const [forgotStep, setForgotStep] = useState(1) // 1 = request code, 2 = reset
  const [forgotEmail, setForgotEmail] = useState('')
  const [resetCode, setResetCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [forgotLoading, setForgotLoading] = useState(false)

  useEffect(() => {
    if (isAuthenticated) {
      const from = (location.state as any)?.from?.pathname || '/dashboard'
      navigate(from, { replace: true })
    }
  }, [isAuthenticated, navigate, location])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await login({ email: email.trim(), password })
      setEmail('')
      setPassword('')
    } catch {
      // toast already shown by AuthContext
    } finally {
      setLoading(false)
    }
  }

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!forgotEmail.trim()) {
      toast.error('Email is required')
      return
    }

    setForgotLoading(true)
    try {
      const res = await authApi.forgotPassword(forgotEmail.trim())
      toast.success('Reset code generated successfully!')
      
      // Auto-fill code if present in response (for ease of local sandbox testing)
      if (res && res.resetCode) {
        setResetCode(res.resetCode)
      }
      
      setForgotStep(2)
    } catch (err: any) {
      toast.error(err.message || 'Could not request reset code')
    } finally {
      setForgotLoading(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resetCode.trim()) {
      toast.error('Verification code is required')
      return
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    setForgotLoading(true)
    try {
      await authApi.resetPassword({
        email: forgotEmail.trim(),
        code: resetCode.trim(),
        newPassword
      })
      toast.success('Password updated successfully! Please log in.')
      setIsForgot(false)
      setForgotStep(1)
      setEmail(forgotEmail)
      setForgotEmail('')
      setResetCode('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      toast.error(err.message || 'Failed to reset password')
    } finally {
      setForgotLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-soft px-4">
      <div className="w-full max-w-md">
        {/* Logo and Header */}
        <div className="mb-8 flex flex-col items-center">
          <Logo className="mb-3" size="md" />
          <h1 className="font-display text-2xl font-bold text-ink-900">
            {isForgot ? 'Password Recovery' : 'Welcome back'}
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            {isForgot ? 'Retrieve access to your LifeOS account' : 'Sign in to continue to LifeOS'}
          </p>
        </div>

        {/* Form Container */}
        {!isForgot ? (
          /* STANDARD LOGIN CARD */
          <form onSubmit={handleSubmit} className="card space-y-4 p-7 shadow-md">
            <div>
              <label className="label" htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                required
                className="input focus:border-brand-500 focus:bg-white transition-all"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="label" htmlFor="password">Password</label>
                <button
                  type="button"
                  onClick={() => setIsForgot(true)}
                  className="text-xs font-semibold text-brand-600 hover:text-brand-700 transition-colors"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="input pr-10 focus:border-brand-500 focus:bg-white transition-all"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-300 hover:text-ink-500"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full py-3 flex items-center justify-center gap-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Sign in
            </button>
          </form>
        ) : forgotStep === 1 ? (
          /* FORGOT PASSWORD: STEP 1 (REQUEST OTP) */
          <form onSubmit={handleRequestCode} className="card space-y-4 p-7 shadow-md">
            <button
              type="button"
              onClick={() => setIsForgot(false)}
              className="flex items-center gap-2 text-xs font-semibold text-ink-500 hover:text-ink-700 mb-2 transition-colors"
            >
              <ArrowLeft className="h-3 w-3" /> Back to login
            </button>

            <div>
              <label className="label" htmlFor="forgotEmail">Email Address</label>
              <input
                id="forgotEmail"
                type="email"
                required
                className="input focus:border-brand-500 focus:bg-white transition-all"
                placeholder="you@example.com"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
              />
            </div>

            <button type="submit" disabled={forgotLoading} className="btn-primary w-full py-3 flex items-center justify-center gap-2">
              {forgotLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Send Reset Code
            </button>
          </form>
        ) : (
          /* FORGOT PASSWORD: STEP 2 (VERIFY CODE & PASSWORD) */
          <form onSubmit={handleResetPassword} className="card space-y-4 p-7 shadow-md">
            <button
              type="button"
              onClick={() => setForgotStep(1)}
              className="flex items-center gap-2 text-xs font-semibold text-ink-500 hover:text-ink-700 mb-2 transition-colors"
            >
              <ArrowLeft className="h-3 w-3" /> Change email
            </button>

            <div>
              <label className="label" htmlFor="resetCode">Verification Code</label>
              <input
                id="resetCode"
                type="text"
                required
                maxLength={6}
                className="input text-center tracking-widest font-bold text-lg focus:border-brand-500 focus:bg-white transition-all"
                placeholder="000000"
                value={resetCode}
                onChange={(e) => setResetCode(e.target.value)}
              />
            </div>

            <div>
              <label className="label" htmlFor="newPassword">New Password</label>
              <div className="relative">
                <input
                  id="newPassword"
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  className="input pr-10 focus:border-brand-500 focus:bg-white transition-all"
                  placeholder="At least 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-300 hover:text-ink-500"
                  tabIndex={-1}
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="label" htmlFor="confirmPassword">Confirm Password</label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  className="input pr-10 focus:border-brand-500 focus:bg-white transition-all"
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-300 hover:text-ink-500"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={forgotLoading} className="btn-primary w-full py-3 flex items-center justify-center gap-2">
              {forgotLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Reset Password
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-ink-500">
          Don't have an account?{' '}
          <Link to="/register" className="font-semibold text-brand-600 hover:text-brand-700 transition-colors">
            Create one
          </Link>
        </p>
      </div>
    </div>
  )
}
