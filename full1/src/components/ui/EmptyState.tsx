import type { ComponentType, ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Compass, RotateCcw, SearchX } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface EmptyStateProps {
  icon?: ComponentType<{ className?: string }>
  title: string
  message?: string
  actionLabel?: string
  onAction?: () => void
  children?: ReactNode
}

export function EmptyState({
  icon: Icon = SearchX,
  title,
  message,
  actionLabel,
  onAction,
  children,
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-border bg-card/50 px-6 py-14 text-center"
    >
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary text-muted-foreground shadow-sm">
        <Icon className="h-7 w-7" aria-hidden="true" />
      </span>
      <h2 className="font-serif text-xl font-semibold text-foreground">{title}</h2>
      {message && (
        <p className="max-w-sm text-sm leading-relaxed text-pretty text-muted-foreground">{message}</p>
      )}
      {actionLabel && onAction && (
        <Button variant="secondary" size="sm" onClick={onAction} className="mt-1">
          {actionLabel}
        </Button>
      )}
      {children}
    </motion.div>
  )
}

export function ErrorState({
  title = 'Something went wrong',
  message = 'We could not load this right now. Please try again.',
  onRetry,
}: {
  title?: string
  message?: string
  onRetry?: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-red-300/60 bg-card/50 px-6 py-14 text-center dark:border-red-900/50"
      role="alert"
    >
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-500 shadow-sm dark:bg-red-950/50">
        <Compass className="h-7 w-7" aria-hidden="true" />
      </span>
      <h2 className="font-serif text-xl font-semibold text-foreground">{title}</h2>
      <p className="max-w-sm text-sm leading-relaxed text-pretty text-muted-foreground">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="mt-1">
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          Try again
        </Button>
      )}
    </motion.div>
  )
}
