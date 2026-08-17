import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  BedDouble,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  GripVertical,
  MapPin,
  Sparkles,
  Star,
  Trash2,
  UtensilsCrossed,
} from 'lucide-react'
import type { PlannerTripItem } from '@/lib/api'
import { PLANNER_ITEM_LABELS, itemCostLabel, timeForIndex } from '@/lib/planner'
import { cn } from '@/lib/utils'

const TYPE_STYLES: Record<PlannerTripItem['type'], { icon: typeof MapPin; className: string }> = {
  HOTEL: { icon: BedDouble, className: 'bg-sky-500/15 text-sky-600 dark:text-sky-400' },
  RESTAURANT: { icon: UtensilsCrossed, className: 'bg-red-500/15 text-red-600 dark:text-red-400' },
  DESTINATION: { icon: MapPin, className: 'bg-green-500/15 text-green-600 dark:text-green-400' },
  EXPERIENCE: { icon: Sparkles, className: 'bg-purple-500/15 text-purple-600 dark:text-purple-400' },
}

interface PlannerItemRowProps {
  item: PlannerTripItem
  index: number
  dayId: string
  readOnly?: boolean
  /** Renders a <div> instead of <li> so the row can sit inside a timeline entry. */
  as?: 'li' | 'div'
  /** Hides the row's own time column (the timeline gutter provides it). */
  timeline?: boolean
  onDragStart: (itemId: string, fromDayId: string) => void
  onDragOverRow: (itemId: string) => void
  onDropRow: (itemId: string, toDayId: string, toIndex: number) => void
  onRemove: (itemId: string) => void
  onShift: (itemId: string, delta: number) => void
}

export function PlannerItemRow({
  item,
  index,
  dayId,
  readOnly = false,
  as = 'li',
  timeline = false,
  onDragStart,
  onDragOverRow,
  onDropRow,
  onRemove,
  onShift,
}: PlannerItemRowProps) {
  const [hover, setHover] = useState(false)
  const meta = TYPE_STYLES[item.type] ?? TYPE_STYLES.DESTINATION
  const Icon = meta.icon
  const href =
    item.href ||
    (item.slug
      ? `/${item.type.toLowerCase()}s/${item.slug}`
      : '')

  const content = (
    <>
      {!timeline && (
        <span className="w-14 shrink-0 text-right font-mono text-[11px] font-semibold text-muted-foreground tabular-nums">
          {timeForIndex(index)}
        </span>
      )}
      <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', meta.className)}>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-card-foreground">{item.name}</span>
        <span className="flex flex-wrap items-center gap-x-1.5 text-[11px] text-muted-foreground">
          <span className="font-medium text-primary">{PLANNER_ITEM_LABELS[item.type]}</span>
          {item.city && <span>· {item.city}</span>}
          {item.rating > 0 && (
            <span className="flex items-center gap-0.5">
              ·<Star className="h-3 w-3 fill-amber-400 text-amber-400" aria-hidden="true" />
              {item.rating.toFixed(1)}
            </span>
          )}
          {item.duration && <span>· {item.duration}</span>}
        </span>
      </span>
      {!readOnly && item.price > 0 && (
        <span className="hidden shrink-0 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold text-secondary-foreground sm:inline-block">
          {itemCostLabel(item)}
        </span>
      )}
      {!readOnly && (
        <span className="flex shrink-0 flex-col gap-0.5">
          <button
            type="button"
            onClick={() => onShift(item.id, -1)}
            aria-label="Move earlier"
            className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => onShift(item.id, 1)}
            aria-label="Move later"
            className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </span>
      )}
      {!readOnly && (
        <button
          type="button"
          onClick={() => onRemove(item.id)}
          aria-label={`Remove ${item.name}`}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground/60 transition-colors hover:bg-red-500/10 hover:text-red-500"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </>
  )

  const rowClass = cn(
    'flex items-center gap-2.5 rounded-xl px-2 py-2 ring-1 ring-border/60 transition-colors',
    hover ? 'bg-primary/10 ring-2 ring-primary' : 'bg-card hover:ring-primary/25',
  )

  if (readOnly) {
    const Tag = as
    return (
      <Tag className={rowClass}>
        {content}
        {href && (
          <a
            href={href}
            onClick={(e) => e.stopPropagation()}
            className="shrink-0 text-muted-foreground transition-colors hover:text-primary"
            aria-label={`View ${item.name}`}
          >
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </a>
        )}
      </Tag>
    )
  }

  const Tag = as
  return (
    <Tag
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/planner-item', JSON.stringify({ itemId: item.id, fromDayId: dayId }))
        e.dataTransfer.effectAllowed = 'move'
        onDragStart(item.id, dayId)
      }}
      onDragOver={(e) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        setHover(true)
        onDragOverRow(item.id)
      }}
      onDragLeave={() => setHover(false)}
      onDrop={(e) => {
        e.preventDefault()
        e.stopPropagation()
        setHover(false)
        onDropRow(item.id, dayId, index)
      }}
      className={rowClass}
    >
      {content}
      <span className="flex h-8 w-6 shrink-0 cursor-grab items-center justify-center text-muted-foreground/50 active:cursor-grabbing">
        <GripVertical className="h-4 w-4" aria-hidden="true" />
      </span>
    </Tag>
  )
}

export function PlannerItemRowAnimated(props: PlannerItemRowProps & { index: number }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -14 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 14, height: 0, marginTop: 0, marginBottom: 0 }}
      transition={{ duration: 0.25 }}
    >
      <PlannerItemRow {...props} />
    </motion.div>
  )
}