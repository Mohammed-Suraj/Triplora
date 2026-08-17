import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CalendarDays, FileDown, Loader2, MapPin, Sparkles } from 'lucide-react'
import { plannerApi, type PlannerTrip } from '@/lib/api'
import { exportPlannerPdf } from '@/lib/pdf'
import { PlannerBudgetPanel } from '@/components/planner/PlannerBudgetPanel'
import { PlannerDayCard } from '@/components/planner/PlannerDayCard'
import { PlannerPackingPanel } from '@/components/planner/PlannerPackingPanel'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/context/ToastContext'

export function PlannerSharePage() {
  const { code = '' } = useParams()
  const toast = useToast()
  const [trip, setTrip] = useState<PlannerTrip | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [mapOpenDays, setMapOpenDays] = useState<Record<string, boolean>>({})

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setFailed(false)
    plannerApi
      .getShared(code)
      .then((res) => {
        if (cancelled) return
        setTrip(res.data)
      })
      .catch(() => {
        if (cancelled) return
        setFailed(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [code])

  const exportPdf = useCallback(async () => {
    if (!trip) return
    try {
      await exportPlannerPdf(trip)
      toast.success('PDF exported')
    } catch {
      toast.error('Could not export the PDF')
    }
  }, [trip, toast])

  if (loading) {
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

  if (failed || !trip) {
    return (
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 pt-24 pb-10 sm:px-6 md:pt-28">
        <EmptyState
          icon={MapPin}
          title="This trip link is not available"
          message="It may have been removed, or the share code is wrong. Ask the trip owner for a fresh link."
          actionLabel="Build your own trip"
          onAction={() => {
            window.location.href = '/planner'
          }}
        />
      </div>
    )
  }

  const stopCount = trip.days.reduce((sum, day) => sum + day.items.length, 0)

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 pt-24 pb-10 sm:px-6 md:pt-28">
      <motion.header
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col gap-4"
      >
        <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-primary">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          Shared itinerary
        </p>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 max-w-xl">
            <h1 className="font-serif text-3xl font-bold text-foreground md:text-4xl">{trip.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                {trip.days.length} {trip.days.length === 1 ? 'day' : 'days'}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                {stopCount} {stopCount === 1 ? 'stop' : 'stops'}
              </span>
              {trip.startDate && (
                <span>
                  {new Date(trip.startDate).toLocaleDateString([], {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportPdf}>
              <FileDown className="h-3.5 w-3.5" aria-hidden="true" />
              PDF
            </Button>
            <Link
              to="/planner"
              className="press inline-flex h-9 items-center gap-2 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground shadow-md shadow-primary/20 transition-colors hover:bg-primary/90"
            >
              Build your own trip
            </Link>
          </div>
        </div>
      </motion.header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px] lg:items-start">
        <div className="flex min-w-0 flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {trip.days.map((day, index) => (
              <PlannerDayCard
                key={day.id}
                day={day}
                dayIndex={index}
                totalDays={trip.days.length}
                weather={undefined}
                weatherLoading={false}
                dragItemId={null}
                readOnly
                onDragStart={() => {}}
                onDragOverRow={() => {}}
                onDropRow={() => {}}
                onDropDay={() => {}}
                onRemove={() => {}}
                onShift={() => {}}
                onUpdateTitle={() => {}}
                onUpdateNotes={() => {}}
                onRemoveDay={() => {}}
                onAddItems={() => {}}
                onToggleMap={() => setMapOpenDays((prev) => ({ ...prev, [day.id]: !prev[day.id] }))}
                mapOpen={mapOpenDays[day.id] ?? false}
              />
            ))}
          </div>
        </div>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-24">
          <PlannerBudgetPanel trip={trip} />
          <PlannerPackingPanel items={trip.packing} readOnly onToggle={() => {}} onRegenerate={undefined} />
        </aside>
      </div>

      <p className="flex items-center justify-center gap-1.5 pt-2 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
        Curated on Triplora — prices are indicative catalog rates; travel times and forecasts are approximations.
      </p>
    </div>
  )
}
