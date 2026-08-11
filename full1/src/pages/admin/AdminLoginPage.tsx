import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ShieldCheck, Compass } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/Button'
import { ForbiddenPage } from '@/pages/ForbiddenPage'

export function AdminLoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (user && user.role === 'ADMIN') {
    return <Navigate to="/admin/dashboard" replace />
  }

  if (user && user.role !== 'ADMIN') {
    return <ForbiddenPage />
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await login(email, password)
      const from = (location.state as { from?: string } | null)?.from
      navigate(from?.startsWith('/admin') ? from : '/admin/dashboard', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Admin login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 pt-28 pb-20 md:px-6 md:pt-32">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="w-full rounded-2xl bg-card p-8 shadow-sm ring-1 ring-border"
      >
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ShieldCheck className="h-6 w-6" aria-hidden="true" />
          </span>
          <h1 className="font-serif text-2xl font-bold text-card-foreground">Admin Login</h1>
          <p className="text-sm text-muted-foreground">Access the Triplora admin dashboard.</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label htmlFor="admin-email" className="text-sm font-medium text-card-foreground">
              Email address
            </label>
            <input
              id="admin-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@triplora.travel"
              className="h-12 w-full rounded-xl border border-input bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="admin-password" className="text-sm font-medium text-card-foreground">
              Password
            </label>
            <input
              id="admin-password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="h-12 w-full rounded-xl border border-input bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            />
          </div>
          {error && (
            <p
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800/40 dark:bg-red-950/20 dark:text-red-300"
            >
              {error}
            </p>
          )}
          <Button type="submit" size="lg" loading={loading} className="w-full">
            {loading ? 'Signing in...' : 'Sign in to Admin'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Return to the site?{' '}
          <Link to="/" className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">
            <Compass className="h-3.5 w-3.5" aria-hidden="true" />
            Visit Triplora
          </Link>
        </p>
      </motion.div>
    </div>
  )
}