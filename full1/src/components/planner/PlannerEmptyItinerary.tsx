import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { BedDouble, BrainCircuit, MapPin, Sparkles, UtensilsCrossed, Wand2 } from 'lucide-react'
import {
  destinationsApi,
  experiencesApi,
  hotelsApi,
  restaurantsApi,
  type PlannerTripDay,
  type PlannerTripItem,
} from '@/lib/api'
import {
  destinationToPlannerItem,
  experienceToPlannerItem,
  hotelToPlannerItem,
  restaurantToPlannerItem,
} from '@/lib/planner'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { Button } from '@/components/ui/Button'
import { Link } from 'react-router-dom'
import type { PlannerAddTab } from '@/components/planner/PlannerAddDrawer'
import { cn } from '@/lib/utils'

interface PlannerEmptyItineraryProps {
  onQuickAdd: (tab: PlannerAddTab) => void
  onApplyDays: (days: PlannerTripDay[]) => void
  applying: boolean
}

const QUICK_ACTIONS: Array<{ tab: PlannerAddTab; label: string; hint: string; icon: typeof BedDouble; className: string }> = [
  { tab: 'DESTINATION', label: 'Add Destination', hint: 'Places to see', icon: MapPin, className: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25' },
  { tab: 'HOTEL', label: 'Add Hotel', hint: 'Where you stay', icon: BedDouble, className: 'bg-sky-500/15 text-sky-600 dark:text-sky-400 hover:bg-sky-500/25' },
  { tab: 'RESTAURANT', label: 'Add Restaurant', hint: 'Where you eat', icon: UtensilsCrossed, className: 'bg-red-500/15 text-red-600 dark:text-red-400 hover:bg-red-500/25' },
  { tab: 'EXPERIENCE', label: 'Add Experience', hint: 'Things to do', icon: Sparkles, className: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 hover:bg-purple-500/25' },
]

interface Suggestion {
  id: string
  title: string
  tagline: string
  cities: string[]
  days: PlannerTripDay[]
}

function dayWith(dayId: string, title: string, items: PlannerTripItem[]): PlannerTripDay {
  return { id: dayId, title, notes: '', items }
}

async function fetchCityPlan(
  city: string,
  kinds: Array<'hotel' | 'destination' | 'restaurant' | 'experience'>,
): Promise<PlannerTripDay[] | null> {
  const params = { q: city, limit: '10' }
  const picks: PlannerTripItem[] = []
  if (kinds.includes('hotel')) {
    const res = await hotelsApi.list(params)
    if (!res.data?.[0]) return null
    picks.push(hotelToPlannerItem(res.data[0]))
  }
  if (kinds.includes('destination')) {
    const res = await destinationsApi.list(params)
    if (!res.data?.[0]) return null
    picks.push(destinationToPlannerItem(res.data[0]))
  }
  if (kinds.includes('restaurant')) {
    const res = await restaurantsApi.list(params)
    if (!res.data?.[0]) return null
    picks.push(restaurantToPlannerItem(res.data[0]))
  }
  if (kinds.includes('experience')) {
    const res = await experiencesApi.list(params)
    if (!res.data?.[0]) return null
    picks.push(experienceToPlannerItem(res.data[0]))
  }
  if (picks.length === 0) return null
  return [dayWith(`day-${crypto.randomUUID()}`, `${city} day 1`, picks)]
}

export function PlannerEmptyItinerary({ onQuickAdd, onApplyDays, applying }: PlannerEmptyItineraryProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null)
  const [loadingSuggestions, setLoadingSuggestions] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoadingSuggestions(true)
    void (async () => {
      const [kochi, munnar] = await Promise.all([
        fetchCityPlan('Kochi', ['hotel', 'destination', 'restaurant']),
        fetchCityPlan('Munnar', ['hotel', 'destination', 'experience']),
      ])
      if (cancelled) return
      const result: Suggestion[] = []
      if (kochi) {
        result.push({
          id: 'kochi-starter',
          title: 'Kochi classic',
          tagline: 'Heritage walk, seafood dinner and a riverside stay — a gentle first day.',
          cities: ['Kochi'],
          days: kochi,
        })
      }
      if (munnar) {
        result.push({
          id: 'munnar-starter',
          title: 'Munnar highlands',
          tagline: 'Tea-country views, a curated experience and a cosy hill-station hotel.',
          cities: ['Munnar'],
          days: munnar,
        })
      }
      setSuggestions(result)
      setLoadingSuggestions(false)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const totalStops = useMemo(() => suggestions?.reduce((sum, s) => sum + s.days.reduce((d, day) => d + day.items.length, 0), 0) ?? 0, [suggestions])

  return (
    <div className="flex flex-col gap-5">
      <EmptyState
        icon={MapPin}
        title="Your itinerary is a blank canvas"
        message="Start with one stop and watch the day take shape — the map, weather and budget fill in as you add."
      >
        <div className="grid w-full max-w-xl grid-cols-2 gap-2.5 sm:grid-cols-4">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon
            return (
              <button
                key={action.tab}
                type="button"
                onClick={() => onQuickAdd(action.tab)}
                className="press group flex flex-col items-center gap-1.5 rounded-2xl bg-secondary/40 px-3 py-4 text-center ring-1 ring-border/60 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/5 hover:ring-primary/30"
              >
                <span className={cn('flex h-11 w-11 items-center justify-center rounded-2xl transition-colors', action.className)}>
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="text-xs font-semibold text-card-foreground">{action.label}</span>
                <span className="text-[10px] text-muted-foreground">{action.hint}</span>
              </button>
            )
          })}
        </div>
      </EmptyState>

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 font-serif text-lg font-semibold text-foreground">
            <Wand2 className="h-5 w-5 text-primary" aria-hidden="true" />
            AI suggestions to get started
          </h3>
          <Link
            to="/planner/ai"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary transition-colors hover:underline"
          >
            <BrainCircuit className="h-3.5 w-3.5" aria-hidden="true" />
            or generate a full trip with AI
          </Link>
        </div>

        {loadingSuggestions ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[0, 1].map((i) => (
              <Skeleton key={i} className="h-40 w-full rounded-2xl" />
            ))}
          </div>
        ) : suggestions && suggestions.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {suggestions.map((suggestion, index) => {
              const stops = suggestion.days.reduce((sum, day) => sum + day.items.length, 0)
              return (
                <motion.div
                  key={suggestion.id}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: Math.min(index * 0.08, 0.3) }}
                  className="flex flex-col gap-3 rounded-2xl bg-card p-4 shadow-sm ring-1 ring-border"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {suggestion.cities.map((city) => (
                        <span key={city} className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                          {city}
                        </span>
                      ))}
                      <span className="text-[10px] font-medium text-muted-foreground">{stops} stops · 1 day</span>
                    </div>
                    <h4 className="mt-1.5 font-serif text-base font-semibold text-card-foreground">{suggestion.title}</h4>
                    <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{suggestion.tagline}</p>
                  </div>
                  <div className="mt-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      disabled={applying}
                      onClick={() => onApplyDays(suggestion.days)}
                    >
                      <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                      Apply to day 1
                    </Button>
                  </div>
                </motion.div>
              )
            })}
          </div>
        ) : (
          <p className="rounded-2xl bg-secondary/30 px-4 py-3 text-center text-xs text-muted-foreground">
            Suggestions are temporarily unavailable — try the search drawer or the AI generator instead.
          </p>
        )}

        <p className="text-[11px] text-muted-foreground">
          {totalStops > 0 ? `Curated from the live catalogue — ${totalStops} hand-picked stops ready to drop in.` : 'Suggestions are drawn from the live catalogue of Kerala stays, food and experiences.'}
        </p>
      </section>
    </div>
  )
}
