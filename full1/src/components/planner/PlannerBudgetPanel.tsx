import { motion } from 'framer-motion'
import { BedDouble, Car, IndianRupee, MapPin, Sparkles, UtensilsCrossed, Wallet } from 'lucide-react'
import type { PlannerTrip } from '@/lib/api'
import { computeBudget, type PlannerBudgetSectionType } from '@/lib/planner'
import { cn } from '@/lib/utils'

const CATEGORY_ICONS: Record<string, typeof Wallet> = {
  HOTEL: BedDouble,
  RESTAURANT: UtensilsCrossed,
  DESTINATION: MapPin,
  EXPERIENCE: Sparkles,
  TRANSPORT: Car,
}

const CATEGORY_COLORS: Record<string, string> = {
  HOTEL: 'bg-sky-500/15 text-sky-600 dark:text-sky-400',
  RESTAURANT: 'bg-red-500/15 text-red-600 dark:text-red-400',
  DESTINATION: 'bg-green-500/15 text-green-600 dark:text-green-400',
  EXPERIENCE: 'bg-purple-500/15 text-purple-600 dark:text-purple-400',
  TRANSPORT: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
}

export function PlannerBudgetPanel({ trip }: { trip: Pick<PlannerTrip, 'days'> }) {
  const budget = computeBudget(trip)
  const maxDay = Math.max(1, ...budget.byDay.map((d) => d.total))
  const maxCategory = Math.max(1, ...budget.byCategory.map((c) => c.total))

  const categoryMeta = (type: PlannerBudgetSectionType) => ({
    Icon: CATEGORY_ICONS[type] ?? Wallet,
    className: CATEGORY_COLORS[type] ?? 'bg-primary/10 text-primary',
  })

  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-card p-5 shadow-sm ring-1 ring-border">
      <h3 className="flex items-center gap-2 font-serif text-lg font-semibold text-card-foreground">
        <Wallet className="h-5 w-5 text-primary" aria-hidden="true" />
        Budget
      </h3>

      <div className="flex items-end gap-2 rounded-xl bg-primary/10 px-4 py-3 ring-1 ring-primary/20">
        <IndianRupee className="mb-1 h-5 w-5 text-primary" aria-hidden="true" />
        <span className="font-serif text-3xl font-bold text-primary">
          {budget.total.toLocaleString('en-IN')}
        </span>
        <span className="mb-1.5 text-xs font-medium text-muted-foreground">estimated total</span>
      </div>

      {budget.byCategory.length > 0 && (
        <div className="flex flex-col gap-2">
          {budget.byCategory.map((cat) => {
            const { Icon, className } = categoryMeta(cat.type)
            return (
              <div key={cat.type} className="flex items-center gap-2.5 text-sm">
                <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', className)}>
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="w-24 shrink-0 truncate text-xs font-semibold text-secondary-foreground">
                  {cat.type === 'TRANSPORT' ? 'Transport' : `${cat.label}s`}
                  {cat.count > 0 && <span className="ml-1 font-normal text-muted-foreground">({cat.count})</span>}
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: `${Math.max(6, (cat.total / maxCategory) * 100)}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                    className="h-full rounded-full bg-primary/70"
                  />
                </div>
                <span className="w-20 shrink-0 text-right text-xs font-semibold tabular-nums text-card-foreground">
                  ₹{cat.total.toLocaleString('en-IN')}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {budget.byDay.length > 1 && (
        <div className="flex flex-col gap-2 border-t border-border/70 pt-3">
          {budget.byDay.map((day, index) => (
            <div key={day.dayId} className="flex items-center gap-2.5 text-xs">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary font-serif text-[11px] font-bold text-secondary-foreground">
                {index + 1}
              </span>
              <span className="min-w-0 flex-1 truncate text-muted-foreground">
                {day.title || `Day ${index + 1}`}
                {day.transport > 0 && (
                  <span className="ml-1 text-[10px] text-muted-foreground/70">+ ₹{day.transport.toLocaleString('en-IN')} travel</span>
                )}
              </span>
              <div className="h-1.5 w-20 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-primary/50"
                  style={{ width: `${Math.max(4, (day.total / maxDay) * 100)}%` }}
                />
              </div>
              <span className="w-16 shrink-0 text-right font-semibold tabular-nums text-card-foreground">
                ₹{day.total.toLocaleString('en-IN')}
              </span>
            </div>
          ))}
        </div>
      )}

      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Estimates from catalog rates: hotels per night, restaurants &amp; experiences per person, transport at ~₹14/km plus a ₹80 base fare between stops.
      </p>
    </div>
  )
}