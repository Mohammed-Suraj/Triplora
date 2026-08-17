import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { BedDouble, Loader2, MapPin, Plus, Search, Sparkles, Star, UtensilsCrossed, X } from 'lucide-react'
import { destinationsApi, experiencesApi, hotelsApi, restaurantsApi, type PlannerTripItem } from '@/lib/api'
import type { Destination } from '@/data/destinations'
import {
  destinationToPlannerItem,
  experienceToPlannerItem,
  hotelToPlannerItem,
  restaurantToPlannerItem,
} from '@/lib/planner'
import { SmartImage } from '@/components/ui/SmartImage'
import { cn } from '@/lib/utils'

export type PlannerAddTab = 'HOTEL' | 'RESTAURANT' | 'DESTINATION' | 'EXPERIENCE'

const TABS: Array<{ id: PlannerAddTab; label: string; icon: typeof BedDouble }> = [
  { id: 'HOTEL', label: 'Hotels', icon: BedDouble },
  { id: 'RESTAURANT', label: 'Restaurants', icon: UtensilsCrossed },
  { id: 'DESTINATION', label: 'Destinations', icon: MapPin },
  { id: 'EXPERIENCE', label: 'Experiences', icon: Sparkles },
]

interface AddDrawerProps {
  open: boolean
  activeDayId: string | null
  initialTab?: PlannerAddTab
  onClose: () => void
  onAdd: (dayId: string, item: PlannerTripItem) => void
}

interface SearchResult {
  key: string
  item: PlannerTripItem
  subtitle: string
}

export function PlannerAddDrawer({ open, activeDayId, initialTab = 'HOTEL', onClose, onAdd }: AddDrawerProps) {
  const [tab, setTab] = useState<PlannerAddTab>(initialTab)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (open) {
      setTab(initialTab)
    } else {
      setQuery('')
      setResults([])
    }
  }, [open, initialTab])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    setError(false)
    const timer = setTimeout(async () => {
      const params: Record<string, string> = { limit: '10' }
      if (query.trim()) params.q = query.trim()
      try {
        if (tab === 'HOTEL') {
          const res = await hotelsApi.list(params)
          if (cancelled) return
          setResults(
            res.data.map((h) => ({
              key: h.id,
              subtitle: `${h.hotelType} · ${h.location}`,
              item: hotelToPlannerItem(h),
            })),
          )
        } else if (tab === 'RESTAURANT') {
          const res = await restaurantsApi.list(params)
          if (cancelled) return
          setResults(
            res.data.map((r) => ({
              key: r.id,
              subtitle: `${r.cuisines.slice(0, 2).join(' · ')} · ${r.city}`,
              item: restaurantToPlannerItem(r),
            })),
          )
        } else if (tab === 'DESTINATION') {
          const res = await destinationsApi.list(params)
          if (cancelled) return
          setResults(
            res.data.map((d: Destination) => ({
              key: d.id,
              subtitle: `${d.region} · ${d.duration || 'Visit'}`,
              item: destinationToPlannerItem(d),
            })),
          )
        } else {
          const res = await experiencesApi.list(params)
          if (cancelled) return
          setResults(
            res.data.map((e) => ({
              key: e.id,
              subtitle: `${e.city} · ${e.duration}`,
              item: experienceToPlannerItem(e),
            })),
          )
        }
      } catch {
        if (!cancelled) setError(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, query.trim() ? 300 : 0)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [open, tab, query])

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
            className="fixed top-0 right-0 z-50 flex h-full w-full max-w-md flex-col bg-card shadow-2xl ring-1 ring-border"
            role="dialog"
            aria-label="Add itinerary items"
          >
            <header className="flex items-center justify-between gap-2 border-b border-border/70 px-5 py-4">
              <div>
                <h2 className="font-serif text-lg font-semibold text-card-foreground">Add to your trip</h2>
                <p className="text-xs text-muted-foreground">
                  {activeDayId ? 'Adding to the selected day' : 'Pick a day first'}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="press flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </header>

            <div className="no-scrollbar flex gap-1.5 overflow-x-auto border-b border-border/70 px-5 py-3" role="tablist">
              {TABS.map((t) => {
                const Icon = t.icon
                return (
                  <button
                    key={t.id}
                    type="button"
                    role="tab"
                    aria-selected={tab === t.id}
                    onClick={() => setTab(t.id)}
                    className={cn(
                      'flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold transition-colors',
                      tab === t.id
                        ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25'
                        : 'bg-secondary/60 text-secondary-foreground hover:bg-secondary',
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    {t.label}
                  </button>
                )
              })}
            </div>

            <div className="px-5 pt-4">
              <label className="relative block">
                <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search Kerala's best…"
                  className="w-full rounded-full border border-border bg-secondary/40 py-2.5 pr-4 pl-10 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/50"
                />
              </label>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              {loading && (
                <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden="true" />
                  <span className="text-sm">Finding the best of Kerala…</span>
                </div>
              )}
              {!loading && error && (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  Could not load results. Try again.
                </div>
              )}
              {!loading && !error && results.length === 0 && (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  No results yet — try a search like &quot;Munnar&quot; or &quot;houseboat&quot;.
                </div>
              )}
              {!loading && !error && results.length > 0 && (
                <ul className="flex flex-col gap-2">
                  {results.map((result) => (
                    <li key={result.key}>
                      <div className="group flex items-center gap-3 rounded-2xl bg-secondary/30 p-2.5 ring-1 ring-border/60 transition-colors hover:ring-primary/30">
                        <SmartImage
                          src={result.item.image}
                          alt={result.item.name}
                          loading="lazy"
                          className="h-14 w-14 shrink-0 rounded-xl object-cover ring-1 ring-border"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-card-foreground">{result.item.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{result.subtitle}</p>
                          <p className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                            {result.item.rating > 0 && (
                              <span className="flex items-center gap-0.5">
                                <Star className="h-3 w-3 fill-amber-400 text-amber-400" aria-hidden="true" />
                                {result.item.rating.toFixed(1)}
                              </span>
                            )}
                            {result.item.price > 0 && (
                              <span>₹{result.item.price.toLocaleString('en-IN')}</span>
                            )}
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled={!activeDayId}
                          onClick={() => {
                            if (activeDayId) {
                              onAdd(activeDayId, result.item)
                              onClose()
                            }
                          }}
                          className={cn(
                            'press flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors',
                            activeDayId
                              ? 'bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground'
                              : 'cursor-not-allowed text-muted-foreground/40',
                          )}
                          aria-label={`Add ${result.item.name}`}
                        >
                          <Plus className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {!activeDayId && (
              <footer className="border-t border-border/70 px-5 py-3 text-center text-xs text-muted-foreground">
                Open a day&apos;s <Plus className="inline h-3 w-3" aria-hidden="true" /> button to pick where items land.
              </footer>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}