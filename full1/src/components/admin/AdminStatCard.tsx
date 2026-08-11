import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AdminStatCardProps {
  icon: LucideIcon
  label: string
  value: number | string
  hint?: string
  accent?: string
  index?: number
}

export function AdminStatCard({ icon: Icon, label, value, hint, accent, index = 0 }: AdminStatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.06, ease: 'easeOut' }}
      className="glass-strong card-lift flex flex-col gap-2 rounded-2xl p-5 shadow-sm ring-1 ring-border"
    >
      <span
        className={cn(
          'flex h-11 w-11 items-center justify-center rounded-xl',
          accent ?? 'bg-primary/10 text-primary',
        )}
      >
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="text-2xl font-bold text-foreground">{value}</span>
      <span className="text-xs font-medium text-muted-foreground">
        {label}
        {hint && <span className="ml-1 text-muted-foreground/70">({hint})</span>}
      </span>
    </motion.div>
  )
}