import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  BrainCircuit,
  CalendarDays,
  CalendarPlus,
  FileDown,
  Loader2,
  MapPin,
  Plus,
  Save,
  Share2,
  Sparkles,
  Trash2,
  Copy,
  Wallet,
} from 'lucide-react'
import {
  plannerApi,
  weatherApi,
  type PlannerTrip,
  type PlannerTripDay,
  type PlannerTripItem,
  type WeatherDay,
} from '@/lib/api'
import { generatePackingList, weatherForDay, withChecked } from '@/lib/planner'
import { optimizePlannerTripSmart } from '@/lib/plannerOptimizer'
import { exportPlannerPdf } from '@/lib/pdf'
import { PlannerAddDrawer, type PlannerAddTab } from '@/components/planner/PlannerAddDrawer'
import { PlannerBudgetPanel } from '@/components/planner/PlannerBudgetPanel'
import { PlannerDayCard } from '@/components/planner/PlannerDayCard'
import { PlannerEmptyItinerary } from '@/components/planner/PlannerEmptyItinerary'
import { PlannerPackingPanel } from '@/components/planner/PlannerPackingPanel'
import { PlannerShareModal } from '@/components/planner/PlannerShareModal'
import { PlannerOptimizationModal } from '@/components/planner/PlannerOptimizationModal'
import { PlannerSummaryPanel } from '@/components/planner/PlannerSummaryPanel'
import { PlannerWeatherStrip, type DayWeatherEntry } from '@/components/planner/PlannerWeatherStrip'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/context/ToastContext'

const PlannerTripMap = lazy(() =>
  import('@/components/planner/PlannerTripMap').then((m) => ({ default: m.PlannerTripMap })),
)

function newId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`
}

function emptyDay(index: number): PlannerTripDay {
  return { id: newId('day'), title: `Day ${index}`, notes: '', items: [] }
}

function dateLabelFor(startDate: string | null, dayIndex: number): string {
  if (!startDate) return ''
  const date = new Date(startDate)
  date.setDate(date.getDate() + dayIndex)
  return date.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })
}

export function PlannerBuilderPage() {
  const toast = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const tripId = searchParams.get('trip')

  const [trips, setTrips] = useState<PlannerTrip[]>([])
  const [listLoading, setListLoading] = useState(true)

  const [trip, setTrip] = useState<PlannerTrip | null>(null)
  const [loadingTrip, setLoadingTrip] = useState(false)
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<string | null>(null)
  const tripLoadedOnceRef = useRef(false)

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerTab, setDrawerTab] = useState<PlannerAddTab>('HOTEL')
  const [activeDayId, setActiveDayId] = useState<string | null>(null)
  const [shareOpen, setShareOpen] = useState(false)
  const [smartRunning, setSmartRunning] = useState(false)
  const [aiRunning, setAiRunning] = useState(false)
  const [applyingSuggestion, setApplyingSuggestion] = useState(false)
  const [mapOpenDays, setMapOpenDays] = useState<Record<string, boolean>>({})
  const [dragItemId, setDragItemId] = useState<string | null>(null)
  const [weather, setWeather] = useState<Record<string, { data: WeatherDay[] | null; loading: boolean }>>({})
  const [optModalOpen, setOptModalOpen] = useState(false)
  const [optIsDeep, setOptIsDeep] = useState(false)
  const [proposedDays, setProposedDays] = useState<PlannerTripDay[]>([])
  const [optInsights, setOptInsights] = useState<string[]>([])

  const loadTrips = useCallback(() => {
    setListLoading(true)
    plannerApi
      .list()
      .then((res) => setTrips(res.data))
      .catch(() => setTrips([]))
      .finally(() => setListLoading(false))
  }, [])

  useEffect(() => {
    loadTrips()
  }, [loadTrips])

  useEffect(() => {
    if (!tripId) {
      setTrip(null)
      tripLoadedOnceRef.current = false
      setWeather({})
      return
    }
    setLoadingTrip(true)
    plannerApi
      .get(tripId)
      .then((res) => {
        setTrip(res.data)
        tripLoadedOnceRef.current = true
      })
      .catch(() => {
        toast.error('Could not load this trip')
        setSearchParams({}, { replace: true })
      })
      .finally(() => setLoadingTrip(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId])

  const fingerprint = useMemo(
    () => (trip ? JSON.stringify({ title: trip.title, startDate: trip.startDate, days: trip.days, packing: trip.packing }) : null),
    [trip],
  )

  const save = useCallback(async () => {
    if (!trip || !tripLoadedOnceRef.current) return
    setSaving(true)
    try {
      const res = await plannerApi.update(trip.id, {
        title: trip.title,
        startDate: trip.startDate,
        days: trip.days,
        packing: trip.packing,
      })
      setTrip(res.data)
      setLastSaved(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
    } catch {
      toast.error('Could not save — check your connection')
    } finally {
      setSaving(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip])

  useEffect(() => {
    if (!fingerprint || !trip || !tripLoadedOnceRef.current) return
    const timer = setTimeout(() => {
      void save()
    }, 1200)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fingerprint])

  // Weather per day (anchored at each day's first item with coordinates).
  useEffect(() => {
    if (!trip || !tripLoadedOnceRef.current) return
    let cancelled = false
    const fetchEntries: Array<{ dayId: string; lat: number; lng: number }> = []
    for (const day of trip.days) {
      const anchor = day.items.find((item) => typeof item.latitude === 'number' && typeof item.longitude === 'number')
      if (anchor && anchor.latitude != null && anchor.longitude != null) {
        fetchEntries.push({ dayId: day.id, lat: anchor.latitude, lng: anchor.longitude })
      }
    }
    const unique = new Map<string, { dayId: string; lat: number; lng: number }>()
    for (const entry of fetchEntries) {
      unique.set(`${entry.lat.toFixed(2)},${entry.lng.toFixed(2)}`, entry)
    }
    for (const entry of unique.values()) {
      const key = `${entry.lat.toFixed(2)},${entry.lng.toFixed(2)}`
      if (weather[key]) continue
      setWeather((prev) => ({ ...prev, [key]: { data: null, loading: true } }))
      weatherApi
        .get(entry.lat, entry.lng)
        .then((res) => {
          if (cancelled) return
          setWeather((prev) => ({ ...prev, [key]: { data: res.data?.daily ?? null, loading: false } }))
        })
        .catch(() => {
          if (cancelled) return
          setWeather((prev) => ({ ...prev, [key]: { data: null, loading: false } }))
        })
    }
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip?.days])

  const createTrip = useCallback(async () => {
    try {
      const res = await plannerApi.create({ title: 'My Kerala Trip', days: [emptyDay(1)], packing: [] })
      setTrips((prev) => [res.data, ...prev])
      setSearchParams({ trip: res.data.id }, { replace: true })
      toast.success('Trip created — start adding stops!')
    } catch {
      toast.error('Could not create a trip')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const mutateTrip = useCallback((updater: (current: PlannerTrip) => PlannerTrip) => {
    setTrip((current) => (current ? updater(current) : current))
  }, [])

  const patchDay = useCallback(
    (dayId: string, patch: Partial<PlannerTripDay>) => {
      mutateTrip((current) => ({
        ...current,
        days: current.days.map((day) => (day.id === dayId ? { ...day, ...patch } : day)),
      }))
    },
    [mutateTrip],
  )

  const addItem = useCallback(
    (dayId: string, item: PlannerTripItem) => {
      patchDay(dayId, { items: [...(trip?.days.find((d) => d.id === dayId)?.items ?? []), item] })
      toast.success(`Added ${item.name}`)
    },
    [patchDay, trip, toast],
  )

  const removeItem = useCallback(
    (itemId: string) => {
      mutateTrip((current) => ({
        ...current,
        days: current.days.map((day) => ({ ...day, items: day.items.filter((item) => item.id !== itemId) })),
      }))
    },
    [mutateTrip],
  )

  const moveItemTo = useCallback(
    (itemId: string, toDayId: string, toIndex?: number) => {
      mutateTrip((current) => {
        let dragged: PlannerTripItem | null = null
        const days = current.days.map((day) => {
          const items = [...day.items]
          const idx = items.findIndex((item) => item.id === itemId)
          if (idx >= 0) {
            dragged = items.splice(idx, 1)[0]
          }
          return { ...day, items }
        })
        if (!dragged) return current
        const target = days.find((day) => day.id === toDayId) ?? days[0]
        if (target) {
          const clamp = Math.max(0, Math.min(toIndex ?? target.items.length, target.items.length))
          target.items.splice(clamp, 0, dragged)
        }
        return { ...current, days }
      })
    },
    [mutateTrip],
  )

  const shiftItem = useCallback(
    (itemId: string, delta: number) => {
      mutateTrip((current) => ({
        ...current,
        days: current.days.map((day) => {
          const idx = day.items.findIndex((item) => item.id === itemId)
          if (idx < 0) return day
          const to = Math.max(0, Math.min(idx + delta, day.items.length - 1))
          if (to === idx) return day
          const items = [...day.items]
          const [moved] = items.splice(idx, 1)
          items.splice(to, 0, moved)
          return { ...day, items }
        }),
      }))
    },
    [mutateTrip],
  )

  const addDay = useCallback(() => {
    mutateTrip((current) => ({ ...current, days: [...current.days, emptyDay(current.days.length + 1)] }))
  }, [mutateTrip])

  const removeDay = useCallback(
    (dayId: string) => {
      mutateTrip((current) => {
        if (current.days.length <= 1) return current
        return { ...current, days: current.days.filter((day) => day.id !== dayId) }
      })
    },
    [mutateTrip],
  )

  const regeneratePacking = useCallback(() => {
    if (!trip) return
    const labels = generatePackingList(trip)
    const next = withChecked(labels, trip.packing)
    mutateTrip((current) => ({ ...current, packing: next }))
    toast.success(`Checklist updated with ${labels.length} items`)
  }, [trip, mutateTrip, toast])

  const togglePacking = useCallback(
    (label: string) => {
      mutateTrip((current) => ({
        ...current,
        packing: current.packing.map((item) => (item.label === label ? { ...item, checked: !item.checked } : item)),
      }))
    },
    [mutateTrip],
  )

  const runSmartOptimize = useCallback(() => {
    if (!trip || trip.days.length === 0) return
    setSmartRunning(true)
    setTimeout(() => {
      const nextDays = optimizePlannerTripSmart(trip.days)
      setProposedDays(nextDays)
      setOptInsights([
        'Regrouped stops by geographical proximity to reduce travel time.',
        'Scheduled hotel stays at the end of each day.',
        'Balanced stop density across days.'
      ])
      setOptIsDeep(false)
      setOptModalOpen(true)
      setSmartRunning(false)
    }, 500)
  }, [trip])

  const runAiOptimize = useCallback(async () => {
    if (!trip) return
    setAiRunning(true)
    try {
      const res = await plannerApi.optimizeAi({ title: trip.title, days: trip.days })
      const data = res.data as unknown as { days?: PlannerTripDay[]; insights?: string[] }
      const nextDays = Array.isArray(data?.days) ? data.days : (res.data as unknown as PlannerTripDay[])
      const insights = Array.isArray(data?.insights) ? data.insights : [
        'Geographically regrouped stops to reduce transit times.',
        'Scheduled restaurant stops during meal intervals.',
        'Provided day notes and timing advice.'
      ]
      setProposedDays(nextDays)
      setOptInsights(insights)
      setOptIsDeep(true)
      setOptModalOpen(true)
    } catch {
      toast.error('AI service busy — generated instant smart optimization preview')
      const nextDays = optimizePlannerTripSmart(trip.days)
      setProposedDays(nextDays)
      setOptInsights([
        'Regrouped stops by geographical proximity.',
        'Placed hotel overnight stays at day end.'
      ])
      setOptIsDeep(false)
      setOptModalOpen(true)
    } finally {
      setAiRunning(false)
    }
  }, [trip, toast])

  const acceptOptimization = useCallback(() => {
    if (!proposedDays || proposedDays.length === 0) return
    mutateTrip((current) => ({ ...current, days: proposedDays }))
    setOptModalOpen(false)
    toast.success('Optimization applied to your itinerary!')
  }, [proposedDays, mutateTrip, toast])

  const rejectOptimization = useCallback(() => {
    setOptModalOpen(false)
    toast.info('Kept original itinerary')
  }, [toast])

  const duplicateTrip = useCallback(async () => {
    if (!trip) return
    try {
      const res = await plannerApi.duplicate(trip.id)
      setTrips((prev) => [res.data, ...prev])
      toast.success('Trip duplicated')
    } catch {
      toast.error('Could not duplicate the trip')
    }
  }, [trip, toast])

  const deleteTrip = useCallback(async () => {
    if (!trip) return
    const confirmed = window.confirm(`Delete "${trip.title}"? This cannot be undone.`)
    if (!confirmed) return
    try {
      await plannerApi.remove(trip.id)
      setTrips((prev) => prev.filter((t) => t.id !== trip.id))
      setSearchParams({}, { replace: true })
      toast.success('Trip deleted')
    } catch {
      toast.error('Could not delete the trip')
    }
  }, [trip, setSearchParams, toast])

  const duplicateFromList = useCallback(
    async (id: string) => {
      try {
        const res = await plannerApi.duplicate(id)
        setTrips((prev) => [res.data, ...prev])
        toast.success('Trip duplicated')
      } catch {
        toast.error('Could not duplicate the trip')
      }
    },
    [toast],
  )

  const removeFromList = useCallback(
    async (id: string) => {
      const tripToDelete = trips.find((t) => t.id === id)
      const confirmed = window.confirm(`Delete "${tripToDelete?.title ?? 'this trip'}"? This cannot be undone.`)
      if (!confirmed) return
      try {
        await plannerApi.remove(id)
        setTrips((prev) => prev.filter((t) => t.id !== id))
        toast.success('Trip deleted')
      } catch {
        toast.error('Could not delete the trip')
      }
    },
    [toast, trips],
  )

  const exportPdf = useCallback(async () => {
    if (!trip) return
    try {
      await exportPlannerPdf(trip)
      toast.success('PDF exported')
    } catch {
      toast.error('Could not export the PDF')
    }
  }, [trip, toast])

  const weatherEntries: DayWeatherEntry[] = useMemo(() => {
    if (!trip) return []
    return trip.days.map((day, index) => {
      const anchor = day.items.find((item) => typeof item.latitude === 'number' && typeof item.longitude === 'number')
      const key =
        anchor && anchor.latitude != null && anchor.longitude != null
          ? `${anchor.latitude.toFixed(2)},${anchor.longitude.toFixed(2)}`
          : null
      const entry = key ? weather[key] : undefined
      return {
        dayId: day.id,
        label: `Day ${index + 1}`,
        location: anchor?.city ?? dayAnchorCityText(day),
        weather: entry?.data ? weatherForDay(entry.data, index, trip.startDate) : null,
        loading: entry?.loading ?? false,
        dateLabel: dateLabelFor(trip.startDate, index),
      }
    })
  }, [trip, weather])

  const stopCount = trip?.days.reduce((sum, day) => sum + day.items.length, 0) ?? 0

  const openDrawer = useCallback((dayId?: string, tab?: PlannerAddTab) => {
    setActiveDayId(dayId ?? null)
    if (tab) setDrawerTab(tab)
    setDrawerOpen(true)
  }, [])

  const quickAdd = useCallback(
    (tab: PlannerAddTab) => {
      openDrawer(trip?.days[0]?.id ?? undefined, tab)
    },
    [openDrawer, trip],
  )

  const applySuggestionDays = useCallback(
    (days: PlannerTripDay[]) => {
      setApplyingSuggestion(true)
      setTimeout(() => {
        mutateTrip((current) => ({ ...current, days }))
        setApplyingSuggestion(false)
        toast.success(`Kickstarted your trip with ${days.reduce((sum, d) => sum + d.items.length, 0)} stops — edit freely!`)
      }, 350)
    },
    [mutateTrip, toast],
  )

  if (listLoading) {
    return (
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 pt-24 pb-10 sm:px-6 md:pt-28">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-44 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    )
  }

  if (!tripId || (!trip && !loadingTrip)) {
    return (
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 pt-24 pb-10 sm:px-6 md:pt-28">
        <motion.header
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="font-serif text-3xl font-bold text-foreground md:text-4xl">Trip Planner 2.0</h1>
              <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                Build a hand-crafted, day-by-day Kerala itinerary — drag and drop stops, watch the budget, pack smart.
              </p>
            </div>
            <Button variant="primary" size="lg" onClick={createTrip}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Create a new trip
            </Button>
          </div>
          <Link to="/planner/ai" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            Prefer AI? Generate a full itinerary instead
          </Link>
        </motion.header>

        <section className="flex flex-col gap-3">
          <h2 className="flex items-center gap-2 font-serif text-xl font-semibold text-foreground">
            <CalendarDays className="h-5 w-5 text-primary" aria-hidden="true" />
            My trips
          </h2>
          {trips.length === 0 ? (
            <EmptyState
              icon={MapPin}
              title="No trips yet"
              message="Start with a blank canvas — add hotels, restaurants, destinations and experiences, then let AI tighten the flow."
              actionLabel="Create your first trip"
              onAction={createTrip}
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {trips.map((t, index) => {
                const days = Array.isArray(t.days) ? t.days.length : 0
                const stops = Array.isArray(t.days) ? t.days.reduce((sum, d) => sum + (d.items?.length ?? 0), 0) : 0
                return (
                  <motion.div
                    key={t.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: Math.min(index * 0.05, 0.4) }}
                    className="flex flex-col gap-3 rounded-2xl bg-card p-5 shadow-sm ring-1 ring-border transition-all duration-500 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/5 hover:ring-primary/30"
                  >
                    <div className="min-w-0">
                      <h3 className="truncate font-serif text-lg font-semibold text-card-foreground">{t.title}</h3>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {days} {days === 1 ? 'day' : 'days'} · {stops} {stops === 1 ? 'stop' : 'stops'}
                        {t.shareCode && <span className="ml-1.5 text-primary">· shared</span>}
                      </p>
                    </div>
                    <div className="mt-auto flex items-center gap-2">
                      <Button
                        variant="primary"
                        size="sm"
                        className="flex-1"
                        onClick={() => setSearchParams({ trip: t.id }, { replace: true })}
                      >
                        Open
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => void duplicateFromList(t.id)} aria-label="Duplicate trip">
                        <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => void removeFromList(t.id)} aria-label="Delete trip">
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </Button>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </section>
      </div>
    )
  }

  if (loadingTrip || !trip) {
    return (
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 pt-24 pb-10 sm:px-6 md:pt-28">
        <Skeleton className="h-10 w-72" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="flex flex-col gap-4 lg:col-span-2">
            <Skeleton className="h-64 w-full rounded-2xl" />
            <Skeleton className="h-64 w-full rounded-2xl" />
          </div>
          <Skeleton className="h-96 w-full rounded-2xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 pt-24 pb-10 sm:px-6 md:pt-28">
      <motion.header
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col gap-4"
      >
        <button
          type="button"
          onClick={() => setSearchParams({}, { replace: true })}
          className="flex w-fit items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          All trips
        </button>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 max-w-xl">
            <input
              value={trip.title}
              onChange={(e) => mutateTrip((current) => ({ ...current, title: e.target.value }))}
              aria-label="Trip title"
              className="w-full bg-transparent font-serif text-2xl font-bold text-foreground outline-none placeholder:text-muted-foreground/50 md:text-3xl"
            />
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                {trip.days.length} {trip.days.length === 1 ? 'day' : 'days'}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                {stopCount} {stopCount === 1 ? 'stop' : 'stops'}
              </span>
              <label className="flex items-center gap-1.5">
                <CalendarPlus className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                <input
                  type="date"
                  value={trip.startDate ? trip.startDate.slice(0, 10) : ''}
                  onChange={(e) =>
                    mutateTrip((current) => ({
                      ...current,
                      startDate: e.target.value ? new Date(`${e.target.value}T00:00:00`).toISOString() : null,
                    }))
                  }
                  className="bg-transparent text-xs text-muted-foreground outline-none"
                  aria-label="Trip start date"
                />
              </label>
              <span className="flex items-center gap-1 text-[11px]">
                {saving ? (
                  <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                ) : (
                  <Save className="h-3 w-3" aria-hidden="true" />
                )}
                {lastSaved ? `Saved ${lastSaved}` : saving ? 'Saving…' : 'Autosaves'}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="primary" size="sm" onClick={() => openDrawer(activeDayId ?? trip.days[0]?.id)}>
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              Add items
            </Button>
            <Button variant="outline" size="sm" onClick={runSmartOptimize} disabled={smartRunning || stopCount === 0}>
              {smartRunning ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />}
              AI Optimize
            </Button>
            <Button variant="outline" size="sm" onClick={runAiOptimize} disabled={aiRunning || stopCount === 0}>
              {aiRunning ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <BrainCircuit className="h-3.5 w-3.5" aria-hidden="true" />}
              Deep AI Optimize
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShareOpen(true)}>
              <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
              Share
            </Button>
            <Button variant="outline" size="sm" onClick={exportPdf}>
              <FileDown className="h-3.5 w-3.5" aria-hidden="true" />
              PDF
            </Button>
            <Button variant="outline" size="sm" onClick={duplicateTrip}>
              <Copy className="h-3.5 w-3.5" aria-hidden="true" />
              Duplicate
            </Button>
            <Button variant="outline" size="sm" onClick={deleteTrip} className="text-red-600 hover:border-red-300 hover:text-red-500 dark:text-red-400">
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              Delete
            </Button>
          </div>
        </div>

        <PlannerWeatherStrip entries={weatherEntries} />
      </motion.header>

      <PlannerSummaryPanel trip={trip} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px] lg:items-start">
        <div className="flex min-w-0 flex-col gap-4">
          {stopCount === 0 ? (
            <PlannerEmptyItinerary onQuickAdd={quickAdd} onApplyDays={applySuggestionDays} applying={applyingSuggestion} />
          ) : (
            <>
              <div className="flex flex-col gap-5">
                {trip.days.map((day, index) => {
                  const anchor = day.items.find((item) => typeof item.latitude === 'number' && typeof item.longitude === 'number')
                  const key =
                    anchor && anchor.latitude != null && anchor.longitude != null
                      ? `${anchor.latitude.toFixed(2)},${anchor.longitude.toFixed(2)}`
                      : null
                  const weatherEntry = key ? (weather[key] as { data: WeatherDay[] | null; loading: boolean } | undefined) : undefined
                  return (
                    <PlannerDayCard
                      key={day.id}
                      day={day}
                      dayIndex={index}
                      totalDays={trip.days.length}
                      weather={weatherEntry?.data ? weatherForDay(weatherEntry.data, index, trip.startDate) : null}
                      weatherLoading={weatherEntry?.loading ?? false}
                      dragItemId={dragItemId}
                      onDragStart={(itemId) => {
                        setDragItemId(itemId)
                      }}
                      onDragOverRow={(_itemId) => {
                        // row hover handled locally
                      }}
                      onDropRow={(itemId, toDayId, toIndex) => {
                        moveItemTo(itemId, toDayId, toIndex)
                        setDragItemId(null)
                      }}
                      onDropDay={(itemId, toDayId) => {
                        if (itemId) moveItemTo(itemId, toDayId)
                        setDragItemId(null)
                      }}
                      onRemove={removeItem}
                      onShift={shiftItem}
                      onUpdateTitle={(title) => patchDay(day.id, { title })}
                      onUpdateNotes={(notes) => patchDay(day.id, { notes })}
                      onRemoveDay={() => removeDay(day.id)}
                      onAddItems={() => openDrawer(day.id)}
                      onToggleMap={() => setMapOpenDays((prev) => ({ ...prev, [day.id]: !prev[day.id] }))}
                      mapOpen={mapOpenDays[day.id] ?? false}
                    />
                  )
                })}
              </div>

              <Button variant="outline" onClick={addDay} className="w-full py-6 border-dashed">
                <Plus className="h-4 w-4" aria-hidden="true" />
                Add another day
              </Button>
            </>
          )}
        </div>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-24">
          <Suspense fallback={<Skeleton className="h-80 w-full rounded-2xl" />}>
            <PlannerTripMap trip={trip} />
          </Suspense>
          <PlannerBudgetPanel trip={trip} />
          <PlannerPackingPanel items={trip.packing} onToggle={togglePacking} onRegenerate={regeneratePacking} />
        </aside>
      </div>

      <PlannerAddDrawer
        open={drawerOpen}
        activeDayId={activeDayId}
        initialTab={drawerTab}
        onClose={() => setDrawerOpen(false)}
        onAdd={addItem}
      />

      <PlannerShareModal
        open={shareOpen}
        trip={trip}
        onClose={() => setShareOpen(false)}
        onShared={(updated) => setTrip(updated)}
      />

      <PlannerOptimizationModal
        isOpen={optModalOpen}
        isDeepAi={optIsDeep}
        originalDays={trip.days}
        optimizedDays={proposedDays}
        insights={optInsights}
        onAccept={acceptOptimization}
        onReject={rejectOptimization}
      />

      <p className="flex items-center justify-center gap-1.5 pt-2 text-xs text-muted-foreground">
        <Wallet className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
        Prices are indicative catalog rates; travel times and forecasts are approximations.
      </p>
    </div>
  )
}

function dayAnchorCityText(day: PlannerTripDay): string {
  const city = day.items.find((item) => item.city.trim())?.city
  return city ?? ''
}
