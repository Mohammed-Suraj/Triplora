import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowUpDown,
  BedDouble,
  Check,
  ChevronLeft,
  ChevronRight,
  Filter,
  IndianRupee,
  MapPin,
  Search,
  SlidersHorizontal,
  Star,
  X,
} from 'lucide-react'
import { destinationsApi, hotelsApi, type Hotel, type HotelFilters } from '@/lib/api'
import { HotelCard, HOTEL_TYPE_LABELS } from '@/components/hotels/HotelCard'
import { Button } from '@/components/ui/Button'
import { EmptyState, ErrorState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 9

const SORT_OPTIONS = [
  { id: 'recommended', label: 'Recommended' },
  { id: 'best_value', label: 'Best value' },
  { id: 'price_asc', label: 'Price: low to high' },
  { id: 'price_desc', label: 'Price: high to low' },
  { id: 'rating', label: 'Rating' },
  { id: 'popularity', label: 'Most popular' },
]

const AMENITY_TOGGLES: Array<{ key: keyof HotelFilters; label: string }> = [
  { key: 'freeWiFi', label: 'Free WiFi' },
  { key: 'swimmingPool', label: 'Swimming pool' },
  { key: 'freeBreakfast', label: 'Free breakfast' },
  { key: 'parking', label: 'Free parking' },
  { key: 'airConditioning', label: 'Air conditioning' },
  { key: 'familyFriendly', label: 'Family friendly' },
  { key: 'coupleFriendly', label: 'Couple friendly' },
]

const inputClass =
  'h-10 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring'

export function HotelsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [hotels, setHotels] = useState<Hotel[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)

  const [q, setQ] = useState(searchParams.get('q') ?? '')
  const [destination, setDestination] = useState(searchParams.get('destination') ?? '')
  const [hotelType, setHotelType] = useState(searchParams.get('type') ?? '')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [minRating, setMinRating] = useState('')
  const [toggles, setToggles] = useState<Record<string, boolean>>({})
  const [sort, setSort] = useState(searchParams.get('sort') ?? 'recommended')
  const [destinationOptions, setDestinationOptions] = useState<Array<{ id: string; slug: string; name: string; region: string }>>([])

  const activeFilterCount =
    (q ? 1 : 0) +
    (destination ? 1 : 0) +
    (hotelType ? 1 : 0) +
    (minPrice || maxPrice ? 1 : 0) +
    (minRating ? 1 : 0) +
    Object.values(toggles).filter(Boolean).length +
    (sort !== 'recommended' ? 1 : 0)

  const load = useCallback(() => {
    setLoading(true)
    setError(false)
    const params: Record<string, string> = { page: String(page), limit: String(PAGE_SIZE), sort }
    if (q.trim()) params.q = q.trim()
    if (destination) params.destination = destination
    if (hotelType) params.hotelType = hotelType
    if (minPrice) params.minPrice = minPrice
    if (maxPrice) params.maxPrice = maxPrice
    if (minRating) params.minRating = minRating
    for (const [key, enabled] of Object.entries(toggles)) {
      if (enabled) params[key] = 'true'
    }
    hotelsApi
      .list(params)
      .then((res) => {
        setHotels(res.data)
        setTotal(res.meta?.total ?? res.data.length)
        setTotalPages(res.meta?.totalPages ?? 1)
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [page, q, destination, hotelType, minPrice, maxPrice, minRating, toggles, sort])

  useEffect(() => {
    load()
  }, [load])

  const syncUrl = useCallback(() => {
    const next = new URLSearchParams()
    if (q.trim()) next.set('q', q.trim())
    if (destination) next.set('destination', destination)
    if (hotelType) next.set('type', hotelType)
    if (sort !== 'recommended') next.set('sort', sort)
    setSearchParams(next, { replace: true })
  }, [q, destination, hotelType, sort, setSearchParams])

  useEffect(() => {
    const timer = window.setTimeout(syncUrl, 400)
    return () => window.clearTimeout(timer)
  }, [syncUrl])

  const toggle = (key: string) =>
    setToggles((prev) => ({ ...prev, [key]: !prev[key] }))

  const resetFilters = () => {
    setQ('')
    setDestination('')
    setHotelType('')
    setMinPrice('')
    setMaxPrice('')
    setMinRating('')
    setToggles({})
    setSort('recommended')
    setPage(1)
  }

  const sortedBy = SORT_OPTIONS.find((s) => s.id === sort)

  useEffect(() => {
    destinationsApi
      .list({ limit: '50' })
      .then((res) =>
        setDestinationOptions(
          (Array.isArray(res.data) ? res.data : [])
            .map((d) => ({ id: d.id, slug: d.slug, name: d.name, region: d.region ?? '' }))
            .sort((a, b) => a.name.localeCompare(b.name)),
        ),
      )
      .catch(() => {})
  }, [])

  const filterPanel = (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <span className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          <SlidersHorizontal className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
          Filters
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={resetFilters}
              className="ml-auto text-xs font-medium text-primary hover:underline"
            >
              Clear all ({activeFilterCount})
            </button>
          )}
        </span>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-foreground">Where to</span>
        <select value={destination} onChange={(e) => { setDestination(e.target.value); setPage(1) }} className={inputClass}>
          <option value="">All Kerala</option>
          {destinationOptions.map((d) => (
            <option key={d.id} value={d.slug}>{d.name}, {d.region}</option>
          ))}
        </select>
      </label>

      <fieldset className="flex flex-col gap-1.5">
        <legend className="text-sm font-medium text-foreground">Stay type</legend>
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(HOTEL_TYPE_LABELS).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => { setHotelType(hotelType === value ? '' : value); setPage(1) }}
              className={cn(
                'rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                hotelType === value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/70',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-1.5">
        <legend className="flex items-center gap-1.5 text-sm font-medium text-foreground">
          <IndianRupee className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
          Price per night
        </legend>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            min={0}
            placeholder="Min"
            value={minPrice}
            onChange={(e) => { setMinPrice(e.target.value); setPage(1) }}
            className={inputClass}
          />
          <input
            type="number"
            min={0}
            placeholder="Max"
            value={maxPrice}
            onChange={(e) => { setMaxPrice(e.target.value); setPage(1) }}
            className={inputClass}
          />
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-1.5">
        <legend className="flex items-center gap-1.5 text-sm font-medium text-foreground">
          <Star className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
          Minimum rating
        </legend>
        <div className="flex flex-wrap gap-1.5">
          {[4, 4.5, 4.8].map((rating) => (
            <button
              key={rating}
              type="button"
              onClick={() => { setMinRating(minRating === String(rating) ? '' : String(rating)); setPage(1) }}
              className={cn(
                'rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                minRating === String(rating)
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/70',
              )}
            >
              {rating}+
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium text-foreground">Amenities</legend>
        {AMENITY_TOGGLES.map(({ key, label }) => (
          <label key={key} className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
            <span
              className={cn(
                'flex h-5 w-5 items-center justify-center rounded-md border transition-colors',
                toggles[key] ? 'border-primary bg-primary text-primary-foreground' : 'border-input bg-background',
              )}
            >
              {toggles[key] && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
            </span>
            <input
              type="checkbox"
              checked={Boolean(toggles[key])}
              onChange={() => toggle(key)}
              className="sr-only"
            />
            {label}
          </label>
        ))}
      </fieldset>
    </div>
  )

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 pt-24 pb-8 sm:px-6 md:pt-28">
      <motion.header
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="flex flex-col"
      >
        <h1 className="flex items-center gap-3 font-serif text-3xl font-bold text-foreground md:text-4xl">
          <BedDouble className="h-8 w-8 text-primary" aria-hidden="true" />
          Find your stay in Kerala
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Handpicked hotels, resorts, villas and homestays across Kerala — filter by price, rating and amenities, or
          let our recommendations match your travel style.
        </p>

        <div className="mt-8 flex flex-col gap-2 rounded-2xl bg-card p-3 shadow-sm ring-1 ring-border sm:flex-row sm:items-center">
          <label className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1) }}
              placeholder="Search hotels, resorts, homestays..."
              className="h-12 w-full rounded-xl border border-input bg-background pr-4 pl-10 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            />
          </label>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="sm:hidden"
              onClick={() => setFiltersOpen(true)}
            >
              <Filter className="h-4 w-4" aria-hidden="true" />
              Filters
              {activeFilterCount > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                  {activeFilterCount}
                </span>
              )}
            </Button>
            <select
              value={sort}
              onChange={(e) => { setSort(e.target.value); setPage(1) }}
              aria-label="Sort hotels"
              className="h-12 rounded-xl border border-input bg-background px-3 text-sm font-medium text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              {SORT_OPTIONS.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>
      </motion.header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-24 flex max-h-[calc(100vh-7rem)] flex-col gap-5 overflow-y-auto rounded-2xl bg-card p-5 shadow-sm ring-1 ring-border">
            {filterPanel}
          </div>
        </aside>

        <AnimatePresence>
          {filtersOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
                onClick={() => setFiltersOpen(false)}
              />
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'tween', duration: 0.3, ease: 'easeOut' }}
                className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xs flex-col overflow-y-auto bg-card p-5 shadow-2xl lg:hidden"
              >
                <div className="mb-4 flex items-center justify-between">
                  <span className="font-serif text-lg font-bold text-foreground">Filters</span>
                  <button
                    type="button"
                    onClick={() => setFiltersOpen(false)}
                    aria-label="Close filters"
                    className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                {filterPanel}
                <Button className="mt-6" onClick={() => setFiltersOpen(false)}>
                  Show results
                </Button>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <main className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              {loading ? 'Searching stays...' : `${total} stay${total === 1 ? '' : 's'} found`}
              {destination && (
                <span className="inline-flex items-center gap-1 font-medium text-foreground">
                  <MapPin className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                  {destinationOptions.find((d) => d.slug === destination)?.name ?? destination}
                </span>
              )}
            </p>
            <span className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
              <ArrowUpDown className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              Sorted by {sortedBy?.label}
            </span>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: PAGE_SIZE }).map((_, i) => (
                <div key={i} className="flex flex-col gap-3 rounded-2xl bg-card p-4 shadow-sm ring-1 ring-border">
                  <Skeleton className="h-52 w-full rounded-xl" />
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ))}
            </div>
          ) : error ? (
            <ErrorState title="Could not load hotels" onRetry={load} />
          ) : hotels.length === 0 ? (
            <EmptyState
              icon={BedDouble}
              title="No stays match your filters"
              message="Try widening your price range or clearing some filters."
              actionLabel="Clear filters"
              onAction={resetFilters}
            />
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {hotels.map((hotel, i) => (
                  <HotelCard key={hotel.id} hotel={hotel} index={i} />
                ))}
              </div>

              {totalPages > 1 && (
                <nav className="mt-2 flex items-center justify-center gap-2" aria-label="Pagination">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-secondary-foreground transition-colors hover:bg-secondary/70 disabled:opacity-40"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPage(p)}
                      aria-current={p === page ? 'page' : undefined}
                      className={cn(
                        'h-10 w-10 rounded-full text-sm font-semibold transition-colors',
                        p === page
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-secondary-foreground hover:bg-secondary/70',
                      )}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-secondary-foreground transition-colors hover:bg-secondary/70 disabled:opacity-40"
                    aria-label="Next page"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </nav>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  )
}
