import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  BedDouble,
  Bus,
  Check,
  CloudRain,
  CloudSun,
  Gem,
  IndianRupee,
  Landmark,
  Lightbulb,
  Map,
  MapPin,
  Moon,
  NotepadText,
  Plus,
  ShoppingBag,
  Sparkles,
  Sun,
  Sunset,
  Trash2,
  Umbrella,
  UtensilsCrossed,
} from 'lucide-react'
import type { PlannerTripDay, PlannerTripItem, WeatherDay } from '@/lib/api'
import { dayAnchorCity, googleMapsEmbedUrl, timeForIndex, transportEstimate } from '@/lib/planner'
import { PlannerItemRowAnimated } from '@/components/planner/PlannerItemRow'
import { SmartImage } from '@/components/ui/SmartImage'
import { cn } from '@/lib/utils'

function WeatherGlyph({ weather }: { weather: WeatherDay | null | undefined }) {
  if (!weather) {
    return (
      <span className="flex items-center gap-1 rounded-full bg-secondary/50 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
        <CloudRain className="h-3 w-3" aria-hidden="true" /> —
      </span>
    )
  }
  const code = weather.code
  const Icon = code <= 2 ? Sun : code <= 48 ? CloudSun : code >= 95 ? CloudRain : code >= 80 ? CloudRain : Umbrella
  const accent = code <= 2 ? 'text-amber-500' : code >= 95 ? 'text-purple-500' : 'text-sky-500'
  return (
    <span className="flex items-center gap-1 rounded-full bg-secondary/50 px-2 py-0.5 text-[11px] font-semibold text-secondary-foreground" title={weather.condition}>
      <Icon className={cn('h-3 w-3', accent)} aria-hidden="true" />
      {weather.min}–{weather.max}°
      <span className="hidden font-normal text-muted-foreground md:inline">{weather.condition}</span>
    </span>
  )
}

function ChipList({ items }: { items: string[] }) {
  if (items.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item, i) => (
        <span
          key={i}
          className="rounded-full bg-background px-2.5 py-1 text-xs font-medium text-card-foreground ring-1 ring-border"
        >
          {item}
        </span>
      ))}
    </div>
  )
}

function BulletList({ items }: { items: string[] }) {
  if (items.length === 0) return null
  return (
    <ul className="flex flex-col gap-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-sm leading-relaxed text-muted-foreground">
          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
          {item}
        </li>
      ))}
    </ul>
  )
}

function PlanSection({
  icon: Icon,
  title,
  className,
  children,
}: {
  icon: typeof MapPin
  title: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn('rounded-2xl bg-secondary p-4', className)}>
      <h4 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary">
        <Icon className="h-4 w-4" aria-hidden="true" />
        {title}
      </h4>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  )
}

function DaySchedule({
  icon: Icon,
  label,
  text,
}: {
  icon: typeof MapPin
  label: string
  text: string
}) {
  if (!text) return null
  return (
    <div className="flex flex-col gap-1 rounded-xl bg-background p-3 ring-1 ring-border">
      <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-card-foreground">
        <Icon className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
        {label}
      </span>
      <p className="text-sm leading-relaxed text-muted-foreground">{text}</p>
    </div>
  )
}

/** Groups a day's stops into Morning (<12h), Afternoon (12-17h) and Evening (>=17h). */
function slotTextFor(day: PlannerTripDay, slot: 'morning' | 'afternoon' | 'evening'): string {
  const parts = day.items
    .map((item, index) => ({ item, time: timeForIndex(index) }))
    .filter(({ time }) => {
      const hour = parseInt(time.split(':')[0], 10) + (time.includes('PM') && time.split(':')[0] !== '12' ? 12 : 0) + (time.includes('AM') && time.split(':')[0] === '12' ? -12 : 0)
      if (slot === 'morning') return hour < 12
      if (slot === 'afternoon') return hour >= 12 && hour < 17
      return hour >= 17
    })
    .map(({ item, time }) => `${time} — ${item.name}`)
  return parts.join('\n')
}

interface PlannerDayCardProps {
  day: PlannerTripDay
  dayIndex: number
  totalDays: number
  weather: WeatherDay | null | undefined
  weatherLoading: boolean
  dragItemId: string | null
  readOnly?: boolean
  onDragStart: (itemId: string, fromDayId: string) => void
  onDragOverRow: (itemId: string) => void
  onDropRow: (itemId: string, toDayId: string, toIndex: number) => void
  onDropDay: (itemId: string, toDayId: string) => void
  onRemove: (itemId: string) => void
  onShift: (itemId: string, delta: number) => void
  onUpdateTitle: (title: string) => void
  onUpdateNotes: (notes: string) => void
  onRemoveDay: () => void
  onAddItems: () => void
  onToggleMap: () => void
  mapOpen: boolean
}

export function PlannerDayCard({
  day,
  dayIndex,
  totalDays,
  weather,
  weatherLoading,
  dragItemId,
  readOnly = false,
  onDragStart,
  onDragOverRow,
  onDropRow,
  onDropDay,
  onRemove,
  onShift,
  onUpdateTitle,
  onUpdateNotes,
  onRemoveDay,
  onAddItems,
  onToggleMap,
  mapOpen,
}: PlannerDayCardProps) {
  const [dropTarget, setDropTarget] = useState<string | null>(null)
  const city = dayAnchorCity(day)

  const anchor =
    day.items.find((item) => item.type === 'DESTINATION' && item.image) ??
    day.items.find((item) => item.image) ??
    null
  const anchorName = anchor?.name ?? day.title
  const anchorLocation = anchor?.city || anchor?.location || city
  const aiDescription = day.description || day.notes
  const estimatedCost =
    day.estimatedDailyCost ||
    `₹${(day.items.reduce((sum, item) => sum + item.price, 0) + transportEstimate(day)).toLocaleString('en-IN')} approx`
  const transportLine = day.localTransportation ?? []

  const activities = day.items.filter((item) => item.type === 'DESTINATION' || item.type === 'EXPERIENCE')
  const hotels = day.items.filter((item) => item.type === 'HOTEL')
  const restaurants = day.items.filter((item) => item.type === 'RESTAURANT')

  const itemRows = (items: PlannerTripItem[]) =>
    items.map((item) => {
      const index = day.items.findIndex((candidate) => candidate.id === item.id)
      return (
        <PlannerItemRowAnimated
          key={item.id}
          item={item}
          index={index}
          dayId={day.id}
          as="div"
          readOnly={readOnly}
          onDragStart={onDragStart}
          onDragOverRow={onDragOverRow}
          onDropRow={onDropRow}
          onRemove={onRemove}
          onShift={onShift}
        />
      )
    })

  const dragProps = readOnly
    ? {}
    : {
        onDragOver: (e: React.DragEvent) => {
          e.preventDefault()
          setDropTarget(day.id)
        },
        onDragLeave: (e: React.DragEvent) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropTarget(null)
        },
        onDrop: (e: React.DragEvent) => {
          e.preventDefault()
          setDropTarget(null)
          onDropDay(dragItemId ?? '', day.id)
        },
      }

  return (
    <motion.section
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className={cn(
        'flex flex-col gap-4 overflow-hidden rounded-3xl bg-card shadow-sm ring-1 ring-border',
        dragItemId && 'ring-dashed ring-primary/40',
      )}
      {...dragProps}
    >
      {/* Cover image */}
      <div className="relative h-48 w-full shrink-0 overflow-hidden sm:h-56">
        {anchor?.image ? (
          <SmartImage
            src={anchor.image}
            alt={anchorName}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/25 via-secondary to-secondary">
            <span className="font-serif text-2xl font-bold text-primary/40">Day {dayIndex + 1}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" aria-hidden="true" />
        <span className="glass-strong absolute top-3 left-3 flex h-8 items-center rounded-full px-3.5 text-xs font-bold text-white shadow-md">
          DAY {dayIndex + 1}
        </span>
        <div className="absolute bottom-3 left-4 right-4 flex flex-col gap-1">
          <h3 className="font-serif text-xl font-bold text-white drop-shadow-md">{anchorName}</h3>
          {anchorLocation && (
            <span className="flex items-center gap-1.5 text-sm text-white/90 drop-shadow">
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
              {anchorLocation}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4 px-4 pb-4 sm:px-5 sm:pb-5">
        {/* Header controls */}
        <header className="flex flex-wrap items-center gap-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 font-serif text-sm font-bold text-primary">
            {dayIndex + 1}
          </span>
          <div className="min-w-0 flex-1">
            {readOnly ? (
              <h4 className="w-full truncate font-serif text-lg font-semibold text-card-foreground">{day.title}</h4>
            ) : (
              <input
                value={day.title}
                onChange={(e) => onUpdateTitle(e.target.value)}
                placeholder={`Day ${dayIndex + 1} title`}
                aria-label={`Day ${dayIndex + 1} title`}
                className="w-full bg-transparent font-serif text-lg font-semibold text-card-foreground outline-none placeholder:text-muted-foreground/50"
              />
            )}
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
              {city && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-primary" aria-hidden="true" />
                  {city}
                </span>
              )}
              <span>{day.items.length} stop{day.items.length === 1 ? '' : 's'}</span>
              {weatherLoading && <span className="flex items-center gap-1"><CloudSun className="h-3 w-3" />…</span>}
              {!weatherLoading && <WeatherGlyph weather={weather} />}
            </p>
          </div>
          <button
            type="button"
            onClick={onToggleMap}
            aria-pressed={mapOpen}
            className={cn(
              'press flex h-9 w-9 items-center justify-center rounded-full transition-colors',
              mapOpen ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-secondary',
            )}
            title="Show day route on map"
          >
            <Map className="h-4 w-4" aria-hidden="true" />
          </button>
          {!readOnly && (
            <button
              type="button"
              onClick={onAddItems}
              className="press flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors hover:bg-primary/20"
              title="Add items to this day"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
          {!readOnly && totalDays > 1 && (
            <button
              type="button"
              onClick={onRemoveDay}
              className="press flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground/60 transition-colors hover:bg-red-500/10 hover:text-red-500"
              title="Delete day"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </header>

        {mapOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <iframe
              title={`Day ${dayIndex + 1} route map`}
              src={googleMapsEmbedUrl(day)}
              className="h-56 w-full rounded-xl ring-1 ring-border"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </motion.div>
        )}

        {day.items.length === 0 && (
          <div className="flex h-24 w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border text-muted-foreground">
            {readOnly ? (
              <span className="text-xs font-semibold">No stops on this day</span>
            ) : (
              <button
                type="button"
                onClick={onAddItems}
                className="flex items-center gap-1.5 text-xs font-semibold transition-colors hover:text-primary"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                {dropTarget === day.id ? 'Drop items here' : 'Add stops to this day'}
              </button>
            )}
          </div>
        )}

        {/* AI description */}
        {aiDescription && (
          <div className="flex flex-col gap-1.5 rounded-2xl bg-primary/5 p-4 ring-1 ring-primary/15">
            <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-primary">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              AI description
            </span>
            <p className="text-sm leading-relaxed text-secondary-foreground">{aiDescription}</p>
          </div>
        )}

        {/* Morning / Afternoon / Evening */}
        {(day.morning || day.afternoon || day.evening || day.items.length > 0) && (
          <div className="grid gap-2 sm:grid-cols-3">
            <DaySchedule icon={Sun} label="Morning" text={day.morning || slotTextFor(day, 'morning')} />
            <DaySchedule icon={Sunset} label="Afternoon" text={day.afternoon || slotTextFor(day, 'afternoon')} />
            <DaySchedule icon={Moon} label="Evening" text={day.evening || slotTextFor(day, 'evening')} />
          </div>
        )}

        {/* Rich sections */}
        {(activities.length > 0 ||
          hotels.length > 0 ||
          restaurants.length > 0 ||
          day.nearbyAttractions?.length ||
          day.hiddenGems?.length ||
          day.shopping?.length ||
          day.travelTips?.length) && (
          <div className="grid gap-3 sm:grid-cols-2">
            {activities.length > 0 && (
              <PlanSection icon={Sparkles} title="Activities">
                <div className="flex flex-col gap-2">{itemRows(activities)}</div>
              </PlanSection>
            )}
            {hotels.length > 0 && (
              <PlanSection icon={BedDouble} title="Hotels">
                <div className="flex flex-col gap-2">{itemRows(hotels)}</div>
              </PlanSection>
            )}
            {restaurants.length > 0 && (
              <PlanSection icon={UtensilsCrossed} title="Restaurants">
                <div className="flex flex-col gap-2">{itemRows(restaurants)}</div>
              </PlanSection>
            )}
            <PlanSection icon={IndianRupee} title="Estimated cost" className="sm:col-span-2">
              <p className="text-base font-semibold text-card-foreground">{estimatedCost}</p>
            </PlanSection>
            <PlanSection icon={Bus} title="Local transport">
              {transportLine.length > 0 ? (
                <ChipList items={transportLine} />
              ) : (
                <p className="text-sm text-muted-foreground">
                  Auto / rickshaw between stops — est. ₹{transportEstimate(day).toLocaleString('en-IN')} for the day
                </p>
              )}
            </PlanSection>
            <PlanSection icon={Landmark} title="Nearby attractions">
              <ChipList items={day.nearbyAttractions ?? []} />
            </PlanSection>
            <PlanSection icon={Gem} title="Hidden gems">
              <ChipList items={day.hiddenGems ?? []} />
            </PlanSection>
            <PlanSection icon={ShoppingBag} title="Shopping">
              <ChipList items={day.shopping ?? []} />
            </PlanSection>
            <PlanSection icon={Lightbulb} title="AI travel tips" className="sm:col-span-2">
              <BulletList items={day.travelTips ?? []} />
            </PlanSection>
          </div>
        )}

        {/* Notes */}
        <div className="flex items-start gap-2 border-t border-border/60 pt-3">
          <NotepadText className="mt-2 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          {readOnly ? (
            <p className="w-full text-sm text-muted-foreground">{day.notes || 'No notes for this day'}</p>
          ) : (
            <textarea
              value={day.notes}
              onChange={(e) => onUpdateNotes(e.target.value)}
              placeholder={`Notes for Day ${dayIndex + 1} — food ideas, tips, reminders…`}
              rows={2}
              className="w-full resize-none bg-transparent text-sm text-muted-foreground outline-none placeholder:text-muted-foreground/40"
            />
          )}
        </div>

        <div className="min-h-2">
          <AnimatePresence>
            {dropTarget === day.id && dragItemId && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="rounded-xl border-2 border-dashed border-primary/50 bg-primary/5 px-3 py-2 text-center text-xs font-semibold text-primary"
              >
                Drop here to move to Day {dayIndex + 1}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.section>
  )
}