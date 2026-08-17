import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { BedDouble, CalendarDays, MapPin, Sparkles, UtensilsCrossed, Wallet } from 'lucide-react'
import type { PlannerTrip } from '@/lib/api'
import { computeBudget } from '@/lib/planner'

interface Stat {
  label: string
  value: string
  icon: typeof CalendarDays
  accent: string
}

export function PlannerSummaryPanel({ trip }: { trip: PlannerTrip }) {
  const stats = useMemo<Stat[]>(() => {
    const days = trip.days.length
    const stops = trip.days.reduce((sum, day) => sum + day.items.length, 0)
    const counts = { HOTEL: 0, RESTAURANT: 0, DESTINATION: 0, EXPERIENCE: 0 }
    for (const day of trip.days) {
      for (const item of day.items) counts[item.type] += 1
    }
    const budget = computeBudget(trip)
    return [
      { label: 'Days', value: String(days), icon: CalendarDays, accent: 'bg-primary/10 text-primary' },
      { label: 'Stops', value: String(stops), icon: MapPin, accent: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
      { label: 'Budget', value: `₹${budget.total.toLocaleString('en-IN')}`, icon: Wallet, accent: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
      { label: 'Hotels', value: String(counts.HOTEL), icon: BedDouble, accent: 'bg-sky-500/10 text-sky-600 dark:text-sky-400' },
      { label: 'Dining', value: String(counts.RESTAURANT), icon: UtensilsCrossed, accent: 'bg-red-500/10 text-red-600 dark:text-red-400' },
      { label: 'Activities', value: String(counts.EXPERIENCE), icon: Sparkles, accent: 'bg-purple-500/10 text-purple-600 dark:text-purple-400' },
    ]
  }, [trip])

  return (
    <section aria-label="Trip summary" className="flex flex-wrap items-center gap-2 py-1">
      {stats.map((stat, index) => {
        const Icon = stat.icon
        return (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.25, delay: index * 0.03 }}
            className="flex items-center gap-2 rounded-full border border-border/80 bg-card/80 px-3 py-1.5 shadow-xs backdrop-blur-xs"
          >
            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${stat.accent}`}>
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <span className="flex items-baseline gap-1 text-xs">
              <span className="font-bold text-foreground tabular-nums">{stat.value}</span>
              <span className="text-[11px] font-medium text-muted-foreground">{stat.label}</span>
            </span>
          </motion.div>
        )
      })}
    </section>
  )
}
