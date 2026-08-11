import type { ReactNode } from 'react'
import { motion } from 'framer-motion'

export function AdminPageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="mb-6 flex flex-col gap-1"
    >
      <h1 className="font-serif text-2xl font-bold text-foreground md:text-3xl">{title}</h1>
      {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
    </motion.div>
  )
}

export function AdminEmptyState({ icon, title, subtitle }: { icon: ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card/40 px-6 py-16 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-muted-foreground">
        {icon}
      </span>
      <div className="flex flex-col gap-1">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  )
}