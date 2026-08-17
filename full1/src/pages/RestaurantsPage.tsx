import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowRight, ChevronLeft, ChevronRight, Filter, Heart, MapPin, Search, SlidersHorizontal, Sparkles, Star, UtensilsCrossed, X,
} from 'lucide-react'
import {
  restaurantsApi,
  type Restaurant,
  type RestaurantCategory,
  RESTAURANT_CATEGORY_LABELS,
  RESTAURANT_PRICE_LEVELS,
  priceLevelInfo,
} from '@/lib/api'
import { RestaurantCard } from '@/components/restaurants/RestaurantCard'
import { Button } from '@/components/ui/Button'
import { EmptyState, ErrorState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { SmartImage } from '@/components/ui/SmartImage'
import { useRestaurantFavorites } from '@/context/RestaurantFavoritesContext'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 9

const SORT_OPTIONS = [
  { id: 'recommended', label: 'Recommended' },
  { id: 'rating', label: 'Highest rated' },
  { id: 'popularity', label: 'Most popular' },
  { id: 'price_asc', label: 'Budget friendly' },
  { id: 'price_desc', label: 'Premium first' },
]

const CATEGORY_OPTIONS: Array<{ id: string; label: string }> = [
  { id: 'ALL', label: 'All restaurants' },
  ...(Object.keys(RESTAURANT_CATEGORY_LABELS) as RestaurantCategory[]).map((c) => ({
    id: c,
    label: RESTAURANT_CATEGORY_LABELS[c],
  })),
]

const CRAVINGS: Array<{ id: string; label: string }> = [
  { id: 'authentic', label: 'Kerala classics' },
  { id: 'seafood', label: 'Seafood lover' },
  { id: 'veg', label: 'Pure veg' },
  { id: 'quick', label: 'Quick bite' },
  { id: 'cozy', label: 'Café & bakery' },
  { id: 'splurge', label: 'Special night' },
]

const inputClass =
  'h-10 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring'

export function RestaurantsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { isFavorite, favoriteCount } = useRestaurantFavorites()

  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)

  const [q, setQ] = useState(searchParams.get('q') ?? '')
  const [category, setCategory] = useState(searchParams.get('category') ?? 'ALL')
  const [priceLevel, setPriceLevel] = useState('')
  const [minRating, setMinRating] = useState('')
  const [favOnly, setFavOnly] = useState(false)
  const [sort, setSort] = useState(searchParams.get('sort') ?? 'recommended')
  const [craving, setCraving] = useState('authentic')
  const [recommended, setRecommended] = useState<Restaurant[]>([])
  const [recommendedLoading, setRecommendedLoading] = useState(true)

  const activeFilterCount =
    (q ? 1 : 0) +
    (category !== 'ALL' ? 1 : 0) +
    (priceLevel ? 1 : 0) +
    (minRating ? 1 : 0) +
    (favOnly ? 1 : 0) +
    (sort !== 'recommended' ? 1 : 0)

  const load = useCallback(() => {
    setLoading(true)
    setError(false)
    const params: Record<string, string> = { page: String(page), limit: String(PAGE_SIZE), sort }
    if (q.trim()) params.q = q.trim()
    if (category !== 'ALL') params.category = category
    if (priceLevel) {
      params.minPriceLevel = priceLevel
      params.maxPriceLevel = priceLevel
    }
    if (minRating) params.minRating = minRating
    restaurantsApi
      .list(params)
      .then((res) => {
        setRestaurants(res.data)
        setTotal(res.meta?.total ?? res.data.length)
        setTotalPages(res.meta?.totalPages ?? 1)
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [page, q, category, priceLevel, minRating, sort])

  useEffect(() => {
    load()
  }, [load])

  const loadRecommended = useCallback((cravingId: string) => {
    setRecommendedLoading(true)
    restaurantsApi
      .recommend({ craving: cravingId, limit: 4 })
      .then((res) => setRecommended(res.data))
      .catch(() => setRecommended([]))
      .finally(() => setRecommendedLoading(false))
  }, [])

  useEffect(() => {
    loadRecommended(craving)
  }, [craving, loadRecommended])

  // Debounced URL sync (q, category, sort only)
  const syncUrl = useCallback(() => {
    const next = new URLSearchParams()
    if (q.trim()) next.set('q', q.trim())
    if (category !== 'ALL') next.set('category', category)
    if (sort !== 'recommended') next.set('sort', sort)
    setSearchParams(next, { replace: true })
  }, [q, category, sort, setSearchParams])
  useEffect(() => {
    const timer = window.setTimeout(syncUrl, 400)
    return () => window.clearTimeout(timer)
  }, [syncUrl])

  const resetFilters = () => {
    setQ('')
    setCategory('ALL')
    setPriceLevel('')
    setMinRating('')
    setFavOnly(false)
    setPage(1)
  }

  const displayed = favOnly ? restaurants.filter((r) => isFavorite(r.slug)) : restaurants

  const filterPanel = (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <span className="flex items-center gap-1.5 text-sm font-semibold text-card-foreground">
          <SlidersHorizontal className="h-4 w-4 text-primary" aria-hidden="true" />
          Filters
        </span>
        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={resetFilters}
            className="self-start text-xs font-semibold text-primary hover:underline"
          >
            Clear all ({activeFilterCount})
          </button>
        )}
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Category</span>
        <select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value)
            setPage(1)
          }}
          className={inputClass}
        >
          {CATEGORY_OPTIONS.map((c) => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </select>
      </label>

      <fieldset className="flex flex-col gap-1.5">
        <legend className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Price level {priceLevel && <span className="normal-case text-primary">· {priceLevelInfo(Number(priceLevel)).label}</span>}
        </legend>
        <div className="grid grid-cols-2 gap-1.5">
          {RESTAURANT_PRICE_LEVELS.map((level) => (
            <button
              key={level.level}
              type="button"
              onClick={() => {
                setPriceLevel(priceLevel === String(level.level) ? '' : String(level.level))
                setPage(1)
              }}
              aria-pressed={priceLevel === String(level.level)}
              className={cn(
                'flex h-10 flex-col items-center justify-center gap-0.5 rounded-xl border text-xs font-bold transition-all duration-300',
                priceLevel === String(level.level)
                  ? 'border-primary bg-primary text-primary-foreground shadow-md shadow-primary/20 -translate-y-0.5'
                  : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground hover:-translate-y-0.5',
              )}
            >
              <span aria-hidden="true">{level.symbol}</span>
              <span className="text-[10px] font-semibold normal-case">{level.label}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <label className="flex flex-col gap-1.5">
        <span className="flex items-center gap-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          <Star className="h-3 w-3 fill-amber-400 text-amber-400" aria-hidden="true" />
          Minimum rating
        </span>
        <select
          value={minRating}
          onChange={(e) => {
            setMinRating(e.target.value)
            setPage(1)
          }}
          className={inputClass}
        >
          <option value="">Any rating</option>
          <option value="4.5">4.5 & up</option>
          <option value="4">4.0 & up</option>
          <option value="3.5">3.5 & up</option>
          <option value="3">3.0 & up</option>
        </select>
      </label>

      <button
        type="button"
        onClick={() => {
          setFavOnly((v) => !v)
          setPage(1)
        }}
        aria-pressed={favOnly}
        className={cn(
          'flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors',
          favOnly
            ? 'border-primary bg-primary/10 text-primary'
            : 'border-border bg-background text-muted-foreground hover:border-primary/40',
        )}
      >
        <Heart className={cn('h-4 w-4', favOnly ? 'fill-red-500 text-red-500' : '')} aria-hidden="true" />
        My favorites
        <span className="ml-auto text-xs font-bold">{favoriteCount}</span>
      </button>

      <p className="rounded-xl bg-secondary/60 p-3 text-xs leading-relaxed text-muted-foreground">
        <Star className="mr-1 inline h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />
        Ratings shown are sample values for demo purposes and are not sourced from any live platform.
      </p>
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
          <UtensilsCrossed className="h-8 w-8 text-primary" aria-hidden="true" />
          Where Kerala eats
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Real, beloved eateries across Kerala — from century-old Malabar kitchens to clifftop cafés and legendary
          bakeries. Filter by cuisine, budget and rating, or let taste-based recommendations match your craving.
        </p>

        <div className="mt-8 flex flex-col gap-2 rounded-2xl bg-card p-3 shadow-sm ring-1 ring-border sm:flex-row sm:items-center">
          <label className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value)
                setPage(1)
              }}
              placeholder="Search restaurants, cuisines or locations..."
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
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-bold text-primary-foreground">
                  {activeFilterCount}
                </span>
              )}
            </Button>
            <select
              value={sort}
              onChange={(e) => {
                setSort(e.target.value)
                setPage(1)
              }}
              aria-label="Sort restaurants"
              className="h-12 rounded-xl border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>
      </motion.header>

      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: 'easeOut' }}
        className="flex flex-col gap-3"
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
            What are you craving?
          </span>
          {CRAVINGS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCraving(c.id)}
              aria-pressed={craving === c.id}
              className={cn(
                'rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-300 hover:-translate-y-0.5',
                craving === c.id
                  ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/70 hover:shadow-sm',
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
        {recommendedLoading ? (
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="overflow-hidden rounded-2xl bg-card ring-1 ring-border">
                <Skeleton className="h-32 w-full rounded-none" />
                <div className="flex flex-col gap-2 p-3">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : recommended.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            {recommended.map((r) => (
              <Link
                key={r.id}
                to={`/restaurants/${r.slug || r.id}`}
                className="group flex items-center gap-3 rounded-2xl bg-card p-2.5 ring-1 ring-border transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:ring-primary/20"
              >
                <SmartImage
                  src={r.image}
                  alt={r.name}
                  loading="lazy"
                  className="h-16 w-16 shrink-0 rounded-xl object-cover"
                />
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate text-sm font-semibold text-card-foreground group-hover:text-primary">{r.name}</span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3 text-primary" aria-hidden="true" />
                    {r.city}
                  </span>
                  <span className="flex items-center gap-1 text-xs font-semibold text-amber-500">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" aria-hidden="true" />
                    {r.rating.toFixed(1)}
                    <span className="font-normal text-muted-foreground">· {RESTAURANT_CATEGORY_LABELS[r.category]}</span>
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : null}
      </motion.section>

      <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Restaurant categories">
        {CATEGORY_OPTIONS.map((c) => (
          <button
            key={c.id}
            type="button"
            role="tab"
            aria-selected={category === c.id}
            onClick={() => {
              setCategory(c.id)
              setPage(1)
            }}
            className={cn(
              'shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-all duration-300 hover:-translate-y-0.5',
              category === c.id
                ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                : 'bg-card text-muted-foreground ring-1 ring-border hover:bg-secondary hover:shadow-sm',
            )}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-24 flex max-h-[calc(100vh-7rem)] flex-col gap-5 overflow-y-auto rounded-2xl bg-card p-5 shadow-sm ring-1 ring-border">
            {filterPanel}
          </div>
        </aside>

        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              {loading ? 'Searching tables...' : `${favOnly ? `${displayed.length} of ` : ''}${total} restaurant${total === 1 ? '' : 's'} found`}
            </p>
            <span className="text-xs text-muted-foreground">
              Sorted by {SORT_OPTIONS.find((o) => o.id === sort)?.label ?? 'Recommended'}
            </span>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: PAGE_SIZE }, (_, i) => (
                <div key={i} className="flex flex-col gap-3 overflow-hidden rounded-2xl bg-card p-4 ring-1 ring-border">
                  <Skeleton className="h-44 w-full rounded-xl" />
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ))}
            </div>
          ) : error ? (
            <ErrorState title="Could not load restaurants" onRetry={load} />
          ) : displayed.length === 0 ? (
            <EmptyState
              icon={UtensilsCrossed}
              title={favOnly ? 'No favorite restaurants yet' : 'No restaurants match your filters'}
              message={favOnly ? 'Tap the heart on any restaurant to save it here.' : 'Try a different cuisine, widening your price range, or clearing some filters.'}
              actionLabel="Clear filters"
              onAction={resetFilters}
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {displayed.map((r, i) => (
                <RestaurantCard key={r.id} restaurant={r} index={i} />
              ))}
            </div>
          )}

          {!loading && !error && displayed.length > 0 && totalPages > 1 && (
            <nav aria-label="Pagination" className="flex items-center justify-center gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <Button
                  key={n}
                  variant={n === page ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setPage(n)}
                  aria-current={n === page ? 'page' : undefined}
                >
                  {n}
                </Button>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </nav>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <Link
          to="/explore"
          className="group flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
        >
          Explore Kerala destinations
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </Link>
      </div>

      <AnimatePresence>
        {filtersOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
              onClick={() => setFiltersOpen(false)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.3, ease: 'easeOut' }}
              className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xs flex-col bg-background shadow-xl"
              role="dialog"
              aria-label="Restaurant filters"
            >
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <h2 className="font-serif text-lg font-semibold text-foreground">Filters</h2>
                <button
                  type="button"
                  onClick={() => setFiltersOpen(false)}
                  aria-label="Close filters"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-secondary-foreground transition-colors hover:bg-secondary/70"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-5">{filterPanel}</div>
              <div className="border-t border-border p-4">
                <Button
                  size="lg"
                  className="w-full"
                  onClick={() => setFiltersOpen(false)}
                >
                  Show results ({favOnly ? displayed.length : total})
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
