import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowRight,
  CalendarDays,
  Check,
  Copy,
  Pencil,
  Route,
  Sparkles,
  Trash2,
  Wallet,
  X,
} from 'lucide-react'
import { tripPlanApi } from '@/lib/api'
import type { TripPlan } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState, ErrorState } from '@/components/ui/EmptyState'
import { SmartImage } from '@/components/ui/SmartImage'
import { useToast } from '@/context/ToastContext'

const budgetLabels: Record<string, string> = { RELAXED: 'Relaxed', PREMIUM: 'Premium', LUXURY: 'Luxury' }
const styleLabels: Record<string, string> = {
  ROMANTIC: 'Romantic',
  FAMILY: 'Family',
  SOLO: 'Solo',
  FRIENDS: 'Friends',
}

function planImages(plan: TripPlan): string[] {
  const merged: string[] = []
  const push = (image: string) => {
    if (image && !merged.includes(image) && merged.length < 3) merged.push(image)
  }
  plan.itinerary.slice(0, 3).forEach((item) => push(item.destination.image))
  plan.payload?.itinerary.slice(0, 3).forEach((day) => push(day.destination.image))
  return merged
}

function formatDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

export function MyAiTripsPage() {
  const toast = useToast()
  const [plans, setPlans] = useState<TripPlan[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<TripPlan | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await tripPlanApi.list()
      setPlans(res.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load your trips.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleDuplicate = async (id: string) => {
    setBusyId(id)
    try {
      const res = await tripPlanApi.duplicate(id)
      setPlans((prev) => [res.data, ...(prev ?? [])])
      toast.success('Trip duplicated.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not duplicate the trip.')
    } finally {
      setBusyId(null)
    }
  }

  const handleRename = async (id: string, title: string) => {
    setBusyId(id)
    try {
      const res = await tripPlanApi.updateTitle(id, title)
      setPlans((prev) => prev?.map((p) => (p.id === id ? res.data : p)) ?? prev)
      setEditingId(null)
      toast.success('Title updated.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not rename the trip.')
    } finally {
      setBusyId(null)
    }
  }

  const handleDelete = async (id: string) => {
    setBusyId(id)
    try {
      await tripPlanApi.remove(id)
      setPlans((prev) => prev?.filter((p) => p.id !== id) ?? prev)
      setDeleting(null)
      toast.success('Trip deleted.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not delete the trip.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 pt-28 pb-20 md:px-6 md:pt-32">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="flex flex-col items-center gap-4 text-center"
      >
        <Badge variant="accent">
          <Route className="h-3.5 w-3.5" aria-hidden="true" />
          My AI Trips
        </Badge>
        <h1 className="max-w-2xl font-serif text-4xl font-bold text-balance text-foreground md:text-5xl">
          Your saved AI itineraries
        </h1>
        <p className="max-w-xl text-base leading-relaxed text-pretty text-muted-foreground">
          {plans && plans.length > 0
            ? `You have ${plans.length} saved ${plans.length === 1 ? 'trip' : 'trips'}. Open one to view, rename, duplicate - or chat with the AI assistant to refine it.`
            : 'Every itinerary you save from the planner appears here, ready to view, edit and export.'}
        </p>
        <Link to="/planner">
          <Button size="lg">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            Plan a new trip
          </Button>
        </Link>
      </motion.div>

      {loading ? (
        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="flex flex-col gap-4 rounded-2xl bg-card p-5 ring-1 ring-border">
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-xl" />
                ))}
              </div>
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-8 w-full rounded-full" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="mt-12">
          <ErrorState message={error} onRetry={() => void load()} />
        </div>
      ) : plans && plans.length > 0 ? (
        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan, index) => {
            const images = planImages(plan)
            const editing = editingId === plan.id
            return (
              <motion.article
                key={plan.id}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: index * 0.06, ease: 'easeOut' }}
                className="card-lift flex flex-col gap-4 rounded-2xl bg-card p-5 shadow-sm ring-1 ring-border"
              >
                <div className="grid grid-cols-3 gap-2">
                  {images.length > 0 ? (
                    images.map((image, i) => (
                      <div key={i} className="relative h-20 overflow-hidden rounded-xl">
                        <SmartImage
                          src={image}
                          alt=""
                          loading="lazy"
                          className="h-full w-full"
                          onError={(e) => {
                            ;(e.currentTarget as HTMLImageElement).src =
                              'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80'
                          }}
                        />
                      </div>
                    ))
                  ) : (
                    <div className="col-span-3 flex h-20 items-center justify-center rounded-xl bg-secondary text-muted-foreground">
                      <Route className="h-6 w-6" aria-hidden="true" />
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  {editing ? (
                    <form
                      className="flex items-center gap-2"
                      onSubmit={(e) => {
                        e.preventDefault()
                        const input = (e.currentTarget.elements.namedItem('title') as HTMLInputElement).value.trim()
                        if (input) handleRename(plan.id, input)
                      }}
                    >
                      <input
                        name="title"
                        defaultValue={plan.title ?? 'Untitled trip'}
                        autoFocus
                        maxLength={120}
                        className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm font-medium text-card-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                      />
                      <button
                        type="submit"
                        disabled={busyId === plan.id}
                        aria-label="Save title"
                        className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-primary text-primary-foreground"
                      >
                        <Check className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        aria-label="Cancel rename"
                        className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-secondary text-secondary-foreground"
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </form>
                  ) : (
                    <h2 className="line-clamp-2 font-serif text-lg font-semibold text-card-foreground">
                      {plan.title ?? 'Untitled trip'}
                    </h2>
                  )}
                  {formatDate(plan.createdAt) && (
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                      {formatDate(plan.createdAt)}
                      <span aria-hidden="true">·</span>
                      {plan.days} days
                    </span>
                  )}
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <Badge>
                      <Wallet className="h-3 w-3" aria-hidden="true" />
                      {budgetLabels[plan.budget] ?? plan.budget}
                    </Badge>
                    <Badge>
                      <Route className="h-3 w-3" aria-hidden="true" />
                      {styleLabels[plan.travelStyle] ?? plan.travelStyle}
                    </Badge>
                  </div>
                </div>

                <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-border pt-4">
                  <Link to={`/my-ai-trips/${plan.id}`}>
                    <Button size="sm">
                      View itinerary
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Button>
                  </Link>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingId(plan.id)
                    }}
                    aria-label="Rename trip"
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                    Rename
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDuplicate(plan.id)}
                    disabled={busyId === plan.id}
                    aria-label="Duplicate trip"
                  >
                    <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                    Duplicate
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setDeleting(plan)}
                    disabled={busyId === plan.id}
                    aria-label="Delete trip"
                    className="text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    Delete
                  </Button>
                </div>
              </motion.article>
            )
          })}
        </div>
      ) : (
        <div className="mt-12">
          <EmptyState
            icon={Route}
            title="No saved trips yet"
            message="Generate an itinerary in the planner and press Save itinerary — or describe your dream trip and let Triplora plan it for you."
          >
            <Link to="/planner">
              <Button size="lg">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                Plan a trip
              </Button>
            </Link>
          </EmptyState>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleting && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setDeleting(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              role="dialog"
              aria-modal="true"
              aria-label="Delete itinerary confirmation"
              className="relative z-10 w-full max-w-md rounded-2xl bg-card p-6 shadow-xl ring-1 ring-border"
            >
              <h3 className="font-serif text-xl font-bold text-card-foreground">Delete itinerary?</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Are you sure you want to delete{' '}
                <span className="font-semibold text-foreground">{deleting.title ?? 'this trip'}</span>? This
                cannot be undone.
              </p>
              <div className="mt-6 flex justify-end gap-3">
                <Button variant="outline" onClick={() => setDeleting(null)}>
                  Keep trip
                </Button>
                <Button
                  variant="outline"
                  disabled={busyId === deleting.id}
                  onClick={() => handleDelete(deleting.id)}
                  className="bg-red-600 text-white hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800"
                >
                  {busyId === deleting.id ? 'Deleting...' : 'Confirm Delete'}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}