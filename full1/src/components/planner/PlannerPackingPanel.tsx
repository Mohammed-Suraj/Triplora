import { AnimatePresence, motion } from 'framer-motion'
import { Backpack, Check, RefreshCw } from 'lucide-react'
import type { PlannerPackingItem } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

interface PlannerPackingPanelProps {
  items: PlannerPackingItem[]
  readOnly?: boolean
  onToggle?: (label: string) => void
  onRegenerate?: () => void
}

export function PlannerPackingPanel({ items, readOnly = false, onToggle, onRegenerate }: PlannerPackingPanelProps) {
  const done = items.filter((item) => item.checked).length

  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-card p-5 shadow-sm ring-1 ring-border">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 font-serif text-lg font-semibold text-card-foreground">
          <Backpack className="h-5 w-5 text-primary" aria-hidden="true" />
          Packing checklist
        </h3>
        {!readOnly && onRegenerate && (
          <Button variant="outline" size="sm" onClick={onRegenerate}>
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            Regenerate
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
          <motion.div
            animate={{ width: `${items.length === 0 ? 0 : (done / items.length) * 100}%` }}
            transition={{ duration: 0.4 }}
            className="h-full rounded-full bg-emerald-500/80"
          />
        </div>
        <span className="shrink-0 font-semibold tabular-nums">
          {done}/{items.length}
        </span>
      </div>

      {items.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Add some stops and hit regenerate — the checklist builds itself from your trip.
        </p>
      )}

      <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        <AnimatePresence initial={false}>
          {items.map((item) => (
            <motion.li
              key={item.label}
              layout
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <button
                type="button"
                disabled={readOnly}
                onClick={() => onToggle?.(item.label)}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm ring-1 ring-border/60 transition-colors',
                  readOnly ? 'cursor-default' : 'hover:ring-primary/30',
                  item.checked && 'bg-emerald-500/10 ring-emerald-500/30',
                )}
                aria-pressed={item.checked}
              >
                <span
                  className={cn(
                    'flex h-5 w-5 shrink-0 items-center justify-center rounded-md ring-1 transition-colors',
                    item.checked ? 'bg-emerald-500 text-white ring-emerald-500' : 'bg-secondary text-transparent ring-border',
                  )}
                >
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
                <span className={cn('min-w-0 flex-1', item.checked && 'text-muted-foreground line-through')}>
                  {item.label}
                </span>
              </button>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  )
}