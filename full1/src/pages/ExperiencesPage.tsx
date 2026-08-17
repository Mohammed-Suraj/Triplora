import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowRight,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Compass,
  MapPin,
  Search,
  SlidersHorizontal,
  Star,
  X,
} from 'lucide-react'
import {
  experiencesApi,
  type Experience,
  type ExperienceCategory,
  EXPERIENCE_CATEGORY_LABELS,
} from '@/lib/api'
import { ExperienceCard, EXPERIENCE_CATEGORY_META } from '@/components/experiences/ExperienceCard'
import { Button } from '@/components/ui/Button'
import { EmptyState, ErrorState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { useExperienceWishlist } from '@/context/ExperienceWishlistContext'
import { useExperiencePlanner } from '@/context/ExperiencePlannerContext'
import { formatINR } from '@/lib/formatters'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 9

const SORT_OPTIONS = [
  { id: 'recommended', label: 'Recommended' },
  { id: 'popularity', label: 'Most popular' },
  { id: 'rating', label: 'Highest rated' },
  { id: 'price_asc', label: 'Budget friendly' },
  { id: 'price_desc', label: 'Premium first' },
]

const CITY_OPTIONS = [
  'Munnar',
  'Wayanad',
  'Kochi',
  'Thekkady',
  'Alappuzha',
  'Thiruvananthapuram',
  'Thrissur',
  'Varkala',
  'Kollam',
  'Idukki',
  'Kannur',
  'Kozhikode',
  'Palakkad',
  'Kasaragod',
  'Kovalam',
  'Kumarakom',
  'Vagamon',
  'Pathanamthitta',
]

const BUDGET_OPTIONS = [
  { id: '', label: 'Any budget' },
  { id: 'free', label: 'Free experiences' },
  { id: 'under1000', label: 'Under ₹1,000' },
  { id: '1000-2500', label: '₹1,000 – ₹2,500' },
  { id: '2500plus', label: '₹2,500 and above' },
]

const inputClass =
  'h-10 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring'

export function ExperiencesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [experiences, setExperiences] = useState<Experience[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [q, setQ] = useState(searchParams.get('q') ?? '')
  const [category, setCategory] = useState<string>(searchParams.get('category') ?? 'ALL')
  const [city, setCity] = useState(searchParams.get('city') ?? '')
  const [difficulty, setDifficulty] = useState(searchParams.get('difficulty') ?? 'ALL')
  const [budget, setBudget] = useState(searchParams.get('budget') ?? '')
  const [minRating, setMinRating] = useState(searchParams.get('minRating') ?? '')
  const [sort, setSort] = useState(searchParams.get('sort') ?? 'recommended')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [wishlistOnly, setWishlistOnly] = useState(false)
  const { wishlist } = useExperienceWishlist()
  const { planned, removeFromPlanner, clearPlanner, plannedTotal } = useExperiencePlanner()

  const activeFilterCount = useMemo(
    () =>
      [category !== 'ALL', city !== '', difficulty !== 'ALL', budget !== '', minRating !== '', wishlistOnly].filter(Boolean)
        .length,
    [category, city, difficulty, budget, minRating, wishlistOnly],
  )

  const budgetRange = useCallback((id: string) => {
    switch (id) {
      case 'free':
        return { max: '0' }
      case 'under1000':
        return { max: '1000' }
      case '1000-2500':
        return { min: '1000', max: '2500' }
      case '2500plus':
        return { min: '2500' }
      default:
        return {}
    }
  }, [])

  const load = useCallback(() => {
    setLoading(true)
    setError(false)
    const params: Record<string, string> = { page: String(page), limit: String(PAGE_SIZE), sort }
    if (q.trim()) params.q = q.trim()
    if (category !== 'ALL') params.category = category
    if (city) params.city = city
    if (difficulty !== 'ALL') params.difficulty = difficulty
    const range = budgetRange(budget)
    if (range.min) params.minPrice = range.min
    if (range.max) params.maxPrice = range.max
    if (minRating) params.minRating = minRating
    experiencesApi
      .list(params)
      .then((res) => {
        setExperiences(res.data)
        setTotal(res.meta?.total ?? res.data.length)
        setTotalPages(res.meta?.totalPages ?? 1)
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [page, q, category, city, difficulty, budget, minRating, sort, budgetRange])

  useEffect(() => {
    load()
  }, [load])

  const syncUrl = useCallback(() => {
    const next = new URLSearchParams()
    if (q.trim()) next.set('q', q.trim())
    if (category !== 'ALL') next.set('category', category)
    if (city) next.set('city', city)
    if (difficulty !== 'ALL') next.set('difficulty', difficulty)
    if (budget) next.set('budget', budget)
    if (minRating) next.set('minRating', minRating)
    if (sort !== 'recommended') next.set('sort', sort)
    setSearchParams(next, { replace: true })
  }, [q, category, city, difficulty, budget, minRating, sort, setSearchParams])

  useEffect(() => {
    const timer = window.setTimeout(syncUrl, 400)
    return () => window.clearTimeout(timer)
  }, [syncUrl])

  const resetFilters = useCallback(() => {
    setCategory('ALL')
    setCity('')
    setDifficulty('ALL')
    setBudget('')
    setMinRating('')
    setWishlistOnly(false)
    setQ('')
    setPage(1)
  }, [])

  const displayed = useMemo(() => {
    if (!wishlistOnly) return experiences
    return experiences.filter((exp) => wishlist.includes(exp.slug))
  }, [experiences, wishlistOnly, wishlist])

  const categoryTabs = useMemo(
    () => [
      { id: 'ALL', label: 'All experiences' },
      ...(Object.keys(EXPERIENCE_CATEGORY_LABELS) as ExperienceCategory[]).map((c) => ({
        id: c,
        label: EXPERIENCE_CATEGORY_LABELS[c],
      })),
    ],
    [],
  )

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
          {categoryTabs.map((c) => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="flex items-center gap-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          <MapPin className="h-3 w-3 text-primary" aria-hidden="true" />
          Destination
        </span>
        <select
          value={city}
          onChange={(e) => {
            setCity(e.target.value)
            setPage(1)
          }}
          className={inputClass}
        >
          <option value="">All of Kerala</option>
          {CITY_OPTIONS.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </label>

      <fieldset className="flex flex-col gap-1.5">
        <legend className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Difficulty</legend>
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { id: 'ALL', label: 'Any' },
            { id: 'EASY', label: 'Easy' },
            { id: 'MODERATE', label: 'Moderate' },
            { id: 'CHALLENGING', label: 'Challenging' },
          ].map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => {
                setDifficulty(d.id)
                setPage(1)
              }}
              aria-pressed={difficulty === d.id}
              className={cn(
                'h-9 rounded-xl border text-xs font-bold transition-all duration-300 hover:-translate-y-0.5',
                difficulty === d.id
                  ? 'border-primary bg-primary text-primary-foreground shadow-md shadow-primary/20'
                  : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground',
              )}
            >
              {d.label}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Budget</span>
        <select
          value={budget}
          onChange={(e) => {
            setBudget(e.target.value)
            setPage(1)
          }}
          className={inputClass}
        >
          {BUDGET_OPTIONS.map((b) => (
            <option key={b.id} value={b.id}>{b.label}</option>
          ))}
        </select>
      </label>

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
        </select>
      </label>

      <label className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background p-3">
        <span className="text-sm font-semibold text-foreground">Wishlist only</span>
        <button
          type="button"
          role="switch"
          aria-checked={wishlistOnly}
          onClick={() => {
            setWishlistOnly((v) => !v)
            setPage(1)
          }}
          className={cn(
            'relative h-6 w-11 rounded-full transition-colors duration-300',
            wishlistOnly ? 'bg-primary' : 'bg-input',
          )}
        >
          <span
            className={cn(
              'absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-300',
              wishlistOnly && 'translate-x-5',
            )}
            aria-hidden="true"
          />
        </button>
      </label>
    </div>
  )

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 pt-24 pb-8 sm:px-6 md:pt-28">
      <motion.header
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="flex flex-col gap-3"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Compass className="h-6 w-6" aria-hidden="true" />
          </span>
          <h1 className="font-serif text-3xl font-bold text-card-foreground">Local Experiences</h1>
        </div>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          150+ handpicked ways to live Kerala — from waterfall rappels and Theyyam rituals to houseboat
          nights, spice trails and cliff-side sunrises.
        </p>
      </motion.header>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.08, ease: 'easeOut' }}
        className="rounded-2xl bg-card p-3 shadow-sm ring-1 ring-border"
      >
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value)
                setPage(1)
              }}
              placeholder="Search experiences, destinations or activities..."
              className="h-12 w-full rounded-xl border border-input bg-background pr-4 pl-10 text-sm placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            />
          </label>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="lg:hidden"
              onClick={() => setFiltersOpen(true)}
              aria-label="Open filters"
            >
              <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
              Filters
              {activeFilterCount > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
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
              className={cn(inputClass, 'h-12 w-full sm:w-52')}
              aria-label="Sort experiences"
            >
              {SORT_OPTIONS.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>
      </motion.div>

      {planned.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-primary/25 bg-primary/5 p-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-sm font-bold text-card-foreground">
              <CalendarPlus className="h-4 w-4 text-primary" aria-hidden="true" />
              Trip Planner · {planned.length} experience{planned.length === 1 ? '' : 's'} ·{' '}
              <span className="text-primary">{formatINR(plannedTotal)}</span>
            </span>
            <button
              type="button"
              onClick={clearPlanner}
              className="text-xs font-semibold text-muted-foreground hover:text-destructive"
            >
              Clear all
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {planned.map((item) => (
              <span
                key={item.slug}
                className="flex items-center gap-1.5 rounded-full bg-card py-1 pr-1 pl-3 text-xs font-semibold text-foreground ring-1 ring-border"
              >
                <MapPin className="h-3 w-3 text-primary" aria-hidden="true" />
                <Link to={`/experiences/${item.slug}`} className="hover:text-primary">
                  {item.name}
                </Link>
                <button
                  type="button"
                  onClick={() => removeFromPlanner(item.slug)}
                  aria-label={`Remove ${item.name} from Trip Planner`}
                  className="flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </span>
            ))}
          </div>
        </motion.div>
      )}

      <div className="flex flex-col gap-6 lg:flex-row">
        <aside className="hidden lg:block lg:w-64 lg:shrink-0">
          <div className="sticky top-24 flex max-h-[calc(100vh-7rem)] flex-col overflow-y-auto rounded-2xl bg-card p-5 shadow-sm ring-1 ring-border">
            {filterPanel}
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-4">
            <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Experience categories">
              {categoryTabs.map((c) => (
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

            <p className="text-sm text-muted-foreground">
              {loading
                ? 'Searching Kerala...'
                : `${wishlistOnly ? `${displayed.length} of ` : ''}${total} experience${total === 1 ? '' : 's'} found`}
            </p>

            {loading ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: PAGE_SIZE }, (_, i) => (
                  <div key={i} className="flex flex-col gap-3 overflow-hidden rounded-2xl bg-card p-4 ring-1 ring-border">
                    <Skeleton className="h-52 w-full rounded-xl" />
                    <Skeleton className="h-5 w-2/3" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <ErrorState title="Could not load experiences" onRetry={load} />
            ) : displayed.length === 0 ? (
              <EmptyState
                icon={Compass}
                title={wishlistOnly ? 'No wishlisted experiences here yet' : 'No experiences match your filters'}
                message={
                  wishlistOnly
                    ? 'Tap the heart on any experience to save it to your wishlist.'
                    : 'Try a different category, widening your budget, or clearing some filters.'
                }
                actionLabel="Clear filters"
                onAction={resetFilters}
              />
            ) : (
              <div>
                {wishlistOnly && (
                  <div className="mb-4 flex flex-wrap gap-1.5">
                    {EXPERIENCE_CATEGORY_META.WILDLIFE && (
                      <span className="text-xs text-muted-foreground">Showing saved experiences only.</span>
                    )}
                  </div>
                )}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {displayed.map((exp, i) => (
                    <ExperienceCard key={exp.id} experience={exp} index={i} />
                  ))}
                </div>
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

            <p className="pt-2 text-center">
              <Link
                to="/destinations"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary transition-colors hover:text-primary/80"
              >
                Explore Kerala destinations
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
              </Link>
            </p>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {filtersOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
              onClick={() => setFiltersOpen(false)}
              aria-hidden="true"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              role="dialog"
              aria-label="Experience filters"
              className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xs flex-col bg-background shadow-xl"
            >
              <div className="flex items-center justify-between border-b border-border p-4">
                <span className="text-sm font-bold text-card-foreground">Filters</span>
                <button
                  type="button"
                  onClick={() => setFiltersOpen(false)}
                  aria-label="Close filters"
                  className="press flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-secondary-foreground"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">{filterPanel}</div>
              <div className="border-t border-border p-4">
                <Button size="lg" className="w-full" onClick={() => setFiltersOpen(false)}>
                  Show results ({wishlistOnly ? displayed.length : total})
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}