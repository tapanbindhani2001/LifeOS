import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface-soft px-4 text-center">
      <p className="font-display text-6xl font-bold text-brand-500">404</p>
      <h1 className="mt-3 font-display text-xl font-bold text-ink-900">Page not found</h1>
      <p className="mt-1 text-sm text-ink-500">The page you're looking for doesn't exist or has moved.</p>
      <Link to="/dashboard" className="btn-primary mt-6">
        Back to Dashboard
      </Link>
    </div>
  )
}
