import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { AlertCircle, Eye, EyeOff, LogIn, Mail, Lock } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

export function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (user) {
    const from = (location.state as { from?: string } | null)?.from ?? '/planner'
    return <Navigate to={user.role === 'ADMIN' ? '/admin/dashboard' : from} replace />
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (loading) return
    setError(null)
    if (!email.trim()) {
      setError('Please enter your email address.')
      return
    }
    if (!password) {
      setError('Please enter your password.')
      return
    }
    setLoading(true)
    try {
      const loggedIn = await login(email, password)
      const from = (location.state as { from?: string } | null)?.from ?? '/planner'
      navigate(loggedIn.role === 'ADMIN' ? '/admin/dashboard' : from, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const inputClass =
    'peer h-12 w-full rounded-xl border border-input bg-background pr-11 pl-4 text-sm text-foreground shadow-sm transition-all duration-200 placeholder:text-muted-foreground hover:border-foreground/20 focus:border-primary/50 focus:shadow-md focus:shadow-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring'

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 pt-28 pb-20 md:px-6 md:pt-32">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="w-full rounded-3xl bg-card p-8 shadow-xl shadow-black/5 ring-1 ring-border dark:shadow-black/30 md:p-10"
      >
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <LogIn className="h-6 w-6" aria-hidden="true" />
          </span>
          <h1 className="font-serif text-2xl font-bold text-card-foreground">Welcome back</h1>
          <p className="text-sm text-muted-foreground">Log in to plan and save your Kerala journey.</p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="mt-8 flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label htmlFor="email" className="text-sm font-medium text-card-foreground">
              Email address
            </label>
            <div className="relative">
              <Mail
                className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors peer-focus:text-primary"
                aria-hidden="true"
              />
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={cn(inputClass, 'pl-11')}
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="text-sm font-medium text-card-foreground">
                Password
              </label>
            </div>
            <div className="relative">
              <Lock
                className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={cn(inputClass, 'pl-11 pr-12')}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
                className="press absolute top-1/2 right-3 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              role="alert"
              className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-600 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
            >
              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
              {error}
            </motion.p>
          )}
          <Button type="submit" size="lg" loading={loading} className="w-full">
            {loading ? 'Logging in…' : 'Log in'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{' '}
          <Link to="/register" className="font-semibold text-primary hover:underline">
            Create one
          </Link>
        </p>
      </motion.div>
    </div>
  )
}
