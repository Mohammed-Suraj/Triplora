import { Suspense, lazy, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Activity,
  ArrowUpDown,
  CheckCircle2,
  ChevronDown,
  LayoutGrid,
  Map as MapIcon,
  MapPin,
  Search,
  Sparkles,
  Tag,
  X,
} from 'lucide-react'
import { categories, type Destination } from '@/data/destinations'
import { destinationsApi, smartSearchApi, type SmartSearchFilters, type SmartSearchItem, type SmartSearchSuggestion } from '@/lib/api'
import { DestinationCard } from '@/components/DestinationCard'
import { DestinationGridSkeleton, Skeleton } from '@/components/ui/Skeleton'
import { Button } from '@/components/ui/Button'
import { EmptyState, ErrorState } from '@/components/ui/EmptyState'
import { cn } from '@/lib/utils'

const ExploreMapView = lazy(() =>
  import('@/components/map/ExploreMapView').then((m) => ({ default: m.ExploreMapView })),
)

type SortOption = 'popularity' | 'price-asc' | 'price-desc' | 'rating-desc' | 'reviews-desc'
type ExploreView = 'grid' | 'map'

const EXPLORE_STATE_KEY = 'triplora-explore-state'
const SORT_OPTIONS: SortOption[] = ['popularity', 'price-asc', 'price-desc', 'rating-desc', 'reviews-desc']

interface SavedExploreState {
  query: string
  category: string
  sortBy: SortOption
  view: ExploreView
  scrollY: number
}

export function ExplorePage() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string>('All')
  const [sortBy, setSortBy] = useState<SortOption>('popularity')
  const [view, setView] = useState<ExploreView>('grid')
  const [destinations, setDestinations] = useState<Destination[]>([])
  const [loading, setLoading] = useState(true)
  const pendingScrollRef = useRef<number | null>(null)

  // Smart search state
  const [smartQuery, setSmartQuery] = useState('')
  const [smartActive, setSmartActive] = useState(false)
  const [smartResults, setSmartResults] = useState<SmartSearchItem[]>([])
  const [smartFilters, setSmartFilters] = useState<SmartSearchFilters | null>(null)
  const [smartExplanation, setSmartExplanation] = useState('')
  const [smartUsedAi, setSmartUsedAi] = useState(false)
  const [smartNoExact, setSmartNoExact] = useState(false)
  const [smartSuggestions, setSmartSuggestions] = useState<string[]>([])
  const [smartLoading, setSmartLoading] = useState(false)
  const [smartError, setSmartError] = useState<string | null>(null)

  // Autocomplete state
  const [autoSuggestions, setAutoSuggestions] = useState<SmartSearchSuggestion[]>([])
  const [autoOpen, setAutoOpen] = useState(false)
  const autoAbortRef = useRef<AbortController | null>(null)
  const autoDebounceRef = useRef<number | null>(null)
  const smartInputRef = useRef<HTMLInputElement | null>(null)
  const autoBoxRef = useRef<HTMLDivElement | null>(null)

  const runSmartSearch = async (e?: FormEvent<HTMLFormElement>, preset?: string) => {
    e?.preventDefault()
    const q = (preset ?? smartQuery).trim()
    if (!q || smartLoading) return
    setSmartQuery(q)
    setAutoOpen(false)
    setSmartLoading(true)
    setSmartError(null)
    try {
      const res = await smartSearchApi.search(q)
      setSmartResults(res.data.items)
      setSmartFilters(res.data.filters)
      setSmartExplanation(res.data.explanation)
      setSmartUsedAi(res.data.usedAi)
      setSmartNoExact(res.data.noExactMatch)
      setSmartSuggestions(res.data.suggestions ?? [])
      setSmartActive(true)
    } catch (err) {
      setSmartError(err instanceof Error ? err.message : 'Smart search is unavailable right now.')
      setSmartActive(false)
    } finally {
      setSmartLoading(false)
    }
  }

  const fetchAutoSuggestions = (value: string) => {
    if (autoAbortRef.current) autoAbortRef.current.abort()
    if (autoDebounceRef.current) window.clearTimeout(autoDebounceRef.current)
    const trimmed = value.trim()
    if (trimmed.length < 2) {
      setAutoSuggestions([])
      setAutoOpen(false)
      return
    }
    autoDebounceRef.current = window.setTimeout(async () => {
      const controller = new AbortController()
      autoAbortRef.current = controller
      try {
        const res = await smartSearchApi.suggest(trimmed, controller.signal)
        setAutoSuggestions(res.data)
        setAutoOpen(true)
      } catch {
        // ignore aborts/errors — dropdown just stays closed
      }
    }, 200)
  }

  const handleSmartInputChange = (value: string) => {
    setSmartQuery(value)
    fetchAutoSuggestions(value)
  }

  const pickSuggestion = (s: SmartSearchSuggestion) => {
    void runSmartSearch(undefined, s.value)
  }

  const clearSmart = () => {
    setSmartActive(false)
    setSmartQuery('')
    setSmartResults([])
    setSmartFilters(null)
    setSmartExplanation('')
    setSmartError(null)
    setSmartNoExact(false)
    setSmartSuggestions([])
    setAutoSuggestions([])
    setAutoOpen(false)
  }

  useEffect(() => {
    const onClick = (ev: MouseEvent) => {
      if (autoBoxRef.current && !autoBoxRef.current.contains(ev.target as Node)) setAutoOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => {
      document.removeEventListener('mousedown', onClick)
      if (autoDebounceRef.current) window.clearTimeout(autoDebounceRef.current)
      if (autoAbortRef.current) autoAbortRef.current.abort()
    }
  }, [])

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(EXPLORE_STATE_KEY)
      if (raw) {
        const saved = JSON.parse(raw) as Partial<SavedExploreState>
        if (typeof saved.query === 'string') setQuery(saved.query)
        if (typeof saved.category === 'string') setCategory(saved.category)
        if (saved.sortBy && SORT_OPTIONS.includes(saved.sortBy)) setSortBy(saved.sortBy)
        if (saved.view === 'grid' || saved.view === 'map') setView(saved.view)
        if (typeof saved.scrollY === 'number') pendingScrollRef.current = saved.scrollY
      }
    } catch {
      // ignore corrupted saved state
    }
  }, [])

  useEffect(() => {
    const save = () => {
      try {
        const raw = sessionStorage.getItem(EXPLORE_STATE_KEY)
        const saved = raw ? JSON.parse(raw) : {}
        sessionStorage.setItem(
          EXPLORE_STATE_KEY,
          JSON.stringify({ ...saved, query, category, sortBy, view }),
        )
      } catch {
        // ignore storage failures
      }
    }
    const onScroll = () => {
      try {
        const raw = sessionStorage.getItem(EXPLORE_STATE_KEY)
        const saved = raw ? JSON.parse(raw) : {}
        sessionStorage.setItem(
          EXPLORE_STATE_KEY,
          JSON.stringify({ ...saved, scrollY: window.scrollY }),
        )
      } catch {
        // ignore storage failures
      }
    }
    save()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [query, category, sortBy, view])

  useEffect(() => {
    let active = true
    setLoading(true)
    ;(async () => {
      try {
        const pageSize = 50
        const first = await destinationsApi.list({ limit: String(pageSize), page: '1' })
        let all = [...first.data]
        const total = first.meta?.total ?? all.length
        for (let page = 2; all.length < total; page++) {
          const next = await destinationsApi.list({ limit: String(pageSize), page: String(page) })
          all = [...all, ...next.data]
        }
        if (active) {
          setDestinations(all)
          const target = pendingScrollRef.current
          if (target !== null) {
            pendingScrollRef.current = null
            window.setTimeout(() => window.scrollTo(0, target), 150)
          }
        }
      } catch {
        // keep empty state
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [])

  const filteredAndSorted = useMemo(() => {
    const filtered = destinations.filter((d) => {
      const matchesCategory = category === 'All' || d.category === category
      const q = query.trim().toLowerCase()
      const matchesQuery =
        q === '' ||
        d.name.toLowerCase().includes(q) ||
        d.region.toLowerCase().includes(q) ||
        d.tagline.toLowerCase().includes(q)
      return matchesCategory && matchesQuery
    })

    return [...filtered].sort((a, b) => {
      if (sortBy === 'price-asc') return a.priceFrom - b.priceFrom
      if (sortBy === 'price-desc') return b.priceFrom - a.priceFrom
      if (sortBy === 'rating-desc') return b.rating - a.rating
      if (sortBy === 'reviews-desc') return b.reviews - a.reviews
      return 0 // popularity / default order (handled by the API)
    })
  }, [destinations, query, category, sortBy])

  return (
    <div className="mx-auto max-w-7xl px-4 pt-28 pb-20 md:px-6 md:pt-32">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="flex flex-col items-center gap-4 text-center"
      >
        <span className="text-sm font-semibold uppercase tracking-widest text-primary">
          Explore Kerala
        </span>
        <h1 className="max-w-2xl font-serif text-4xl font-bold text-balance text-foreground md:text-5xl">
          Where will Kerala take you?
        </h1>
        <p className="max-w-xl text-base leading-relaxed text-pretty text-muted-foreground">
          Browse seventy-four unforgettable destinations across hills, backwaters, beaches and forests.
        </p>
      </motion.div>

      <div className="mt-10 flex flex-col items-center gap-5">
        <div className="flex w-full max-w-2xl flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-muted-foreground transition-colors"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search destinations, regions..."
              aria-label="Search destinations"
              className="h-12 w-full rounded-full border border-border bg-card pr-5 pl-12 text-sm text-card-foreground shadow-sm transition-all duration-200 placeholder:text-muted-foreground focus:border-primary/40 focus:shadow-md focus:shadow-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            />
          </div>

          <div className="relative flex shrink-0 items-center">
            <ArrowUpDown className="pointer-events-none absolute left-3.5 h-4 w-4 text-muted-foreground" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="h-12 cursor-pointer appearance-none rounded-full border border-border bg-card pr-9 pl-10 text-sm font-medium text-card-foreground shadow-sm transition-all duration-200 hover:border-foreground/20 hover:shadow-md focus:border-primary/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <option value="popularity">Most Popular</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="rating-desc">Highest Rated</option>
              <option value="reviews-desc">Most Reviewed</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 h-4 w-4 text-muted-foreground" aria-hidden="true" />
          </div>
        </div>

        <form
          onSubmit={runSmartSearch}
          className="flex w-full max-w-2xl items-center gap-2"
          role="search"
          aria-label="AI smart search"
        >
          <div ref={autoBoxRef} className="relative flex-1">
            <Sparkles
              className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-primary"
              aria-hidden="true"
            />
            <input
              ref={smartInputRef}
              type="search"
              value={smartQuery}
              onChange={(e) => handleSmartInputChange(e.target.value)}
              onFocus={() => {
                if (autoSuggestions.length > 0) setAutoOpen(true)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setAutoOpen(false)
                if (e.key === 'ArrowDown' && autoOpen && autoSuggestions.length > 0) {
                  e.preventDefault()
                  setAutoSuggestions((prev) => prev)
                  smartInputRef.current?.focus()
                }
              }}
              placeholder="Ask AI — e.g. 'cheap beaches under ₹5000 near Kochi'"
              aria-label="Smart search destinations"
              aria-expanded={autoOpen}
              role="combobox"
              className="h-12 w-full rounded-full border border-primary/30 bg-card pr-4 pl-11 text-sm text-card-foreground shadow-sm transition-all duration-200 placeholder:text-muted-foreground focus:border-primary/50 focus:shadow-md focus:shadow-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            />
            {autoOpen && autoSuggestions.length > 0 && (
              <div
                role="listbox"
                aria-label="Search suggestions"
                className="animate-scale-in absolute top-full left-0 z-30 mt-2 w-full origin-top overflow-hidden rounded-2xl border border-border bg-card shadow-xl shadow-black/10"
              >
                {autoSuggestions.map((s) => (
                  <button
                    key={`${s.type}-${s.label}`}
                    type="button"
                    role="option"
                    onClick={() => pickSuggestion(s)}
                    className="flex w-full cursor-pointer items-center gap-2.5 px-4 py-2.5 text-left text-sm text-card-foreground transition-colors hover:bg-secondary/70 focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-ring"
                  >
                    <SuggestionIcon type={s.type} />
                    <span className="font-medium">{s.label}</span>
                    <span className="ml-auto text-xs text-muted-foreground capitalize">
                      {s.type}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <Button
            type="submit"
            size="md"
            loading={smartLoading}
            disabled={!smartQuery.trim()}
            className="h-12 shrink-0 px-6"
          >
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">{smartLoading ? 'Searching…' : 'Smart Search'}</span>
          </Button>
        </form>

        <div className="no-scrollbar -mx-4 flex w-full max-w-4xl justify-start gap-2 overflow-x-auto px-4 pb-1 sm:justify-center sm:flex-wrap sm:overflow-visible" role="group" aria-label="Filter by category">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              aria-pressed={category === cat}
              className={cn(
                'press shrink-0 cursor-pointer rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                category === cat
                  ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/70 hover:shadow-sm',
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 rounded-full bg-secondary p-1 shadow-sm" role="group" aria-label="Explore view">
          <button
            type="button"
            onClick={() => setView('grid')}
            aria-pressed={view === 'grid'}
            className={cn(
              'press flex cursor-pointer items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
              view === 'grid'
                ? 'bg-card text-card-foreground shadow-sm'
                : 'text-secondary-foreground hover:text-foreground',
            )}
          >
            <LayoutGrid className="h-4 w-4" aria-hidden="true" />
            Grid View
          </button>
          <button
            type="button"
            onClick={() => setView('map')}
            aria-pressed={view === 'map'}
            className={cn(
              'press flex cursor-pointer items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
              view === 'map'
                ? 'bg-card text-card-foreground shadow-sm'
                : 'text-secondary-foreground hover:text-foreground',
            )}
          >
            <MapIcon className="h-4 w-4" aria-hidden="true" />
            Map View
          </button>
        </div>
      </div>

      {loading ? (
        <div className="mt-12">
          <DestinationGridSkeleton count={6} />
        </div>
      ) : smartActive ? (
        <div className="mt-10">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              'mb-6 flex flex-col gap-3 rounded-2xl p-5 shadow-sm ring-1',
              smartNoExact ? 'bg-amber-50 ring-amber-200 dark:bg-amber-950/30 dark:ring-amber-800' : 'bg-card ring-border',
            )}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                  {smartUsedAi ? 'AI matched' : 'Smart matched'}
                </span>
                {smartFilters?.categories?.map((cat) => (
                  <span key={cat} className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
                    {cat}
                  </span>
                ))}
                {smartFilters?.region && (
                  <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
                    Region: {smartFilters.region}
                  </span>
                )}
                {smartFilters?.proximity && (
                  <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
                    Within {smartFilters.proximity.radiusKm} km of {smartFilters.proximity.label}
                  </span>
                )}
                {smartFilters?.maxPrice !== null && smartFilters?.maxPrice !== undefined && (
                  <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
                    Under ₹{smartFilters.maxPrice.toLocaleString('en-IN')}
                  </span>
                )}
                {smartFilters?.minPrice !== null && smartFilters?.minPrice !== undefined && (
                  <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
                    Over ₹{smartFilters.minPrice.toLocaleString('en-IN')}
                  </span>
                )}
                {smartFilters?.minRating !== null && smartFilters?.minRating !== undefined && (
                  <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
                    Rated {smartFilters.minRating}+
                  </span>
                )}
                {smartFilters?.duration && (
                  <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
                    {smartFilters.duration}
                  </span>
                )}
                {smartFilters?.travelStyle && (
                  <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
                    {smartFilters.travelStyle} travel
                  </span>
                )}
                {smartFilters?.season && (
                  <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
                    {smartFilters.season}
                  </span>
                )}
                {smartFilters?.crowd && (
                  <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
                    {smartFilters.crowd}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={clearSmart}
                className="flex cursor-pointer items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
                Clear
              </button>
            </div>
            {smartExplanation && (
              <p className="text-sm leading-relaxed text-muted-foreground">
                <span className={cn('font-semibold', smartNoExact ? 'text-amber-700 dark:text-amber-300' : 'text-foreground')}>
                  {smartNoExact ? 'No exact match found' : 'Why these?'}
                </span>{' '}
                {smartExplanation}
              </p>
            )}
            {smartNoExact && smartSuggestions.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">Try instead:</span>
                {smartSuggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => void runSmartSearch(undefined, s)}
                    className="cursor-pointer rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              {smartResults.length} destination{smartResults.length === 1 ? '' : 's'} matched
            </p>
          </motion.div>

          {smartResults.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {smartResults.map((item, index) => (
                <div key={item.destination.id} className="flex flex-col gap-3">
                  <DestinationCard destination={item.destination} index={index} />
                  <div className="animate-fade-in rounded-2xl border border-dashed border-border bg-card/70 p-3.5">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                        Why this match
                      </span>
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                        {item.score}% match
                      </span>
                    </div>
                    <ul className="space-y-1.5">
                      {item.reasons.map((reason, ri) => (
                        <li key={ri} className="flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground">
                          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                          {reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-10">
              <EmptyState
                icon={smartNoExact ? Search : Sparkles}
                title={smartNoExact ? 'No exact match found' : 'I could not understand that query'}
                message={
                  smartNoExact
                    ? 'No destination matches every condition you asked for — try one of the suggested searches.'
                    : 'Try a natural sentence like "beaches under ₹4,000" or "waterfalls near Thrissur".'
                }
              >
                {smartSuggestions.length > 0 && (
                  <div className="flex flex-wrap justify-center gap-2">
                    {smartSuggestions.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => void runSmartSearch(undefined, s)}
                        className="press cursor-pointer rounded-full border border-primary/30 bg-primary/5 px-4 py-2 text-sm font-medium text-primary transition-all duration-200 hover:bg-primary/10 hover:shadow-sm"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </EmptyState>
            </div>
          )}
        </div>
      ) : smartError ? (
        <div className="mt-10">
          <ErrorState
            title="Smart search unavailable"
            message={smartError}
            onRetry={() => void runSmartSearch()}
          />
        </div>
      ) : view === 'map' ? (
        <Suspense
          fallback={
            <div className="mt-12 flex h-[520px] w-full flex-col gap-3 rounded-2xl p-4 shadow-sm ring-1 ring-border">
              <Skeleton className="h-full w-full rounded-xl" />
            </div>
          }
        >
          <ExploreMapView
            destinations={filteredAndSorted}
            query={query}
            onOpenDestination={(id) => navigate(`/destinations/${id}`)}
          />
        </Suspense>
      ) : filteredAndSorted.length > 0 ? (
        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredAndSorted.map((destination, index) => (
            <DestinationCard key={destination.id} destination={destination} index={index} />
          ))}
        </div>
      ) : (
        <div className="mt-12">
          <EmptyState
            title="No destinations found"
            message="Try a different search term or category — Kerala has something for everyone."
            actionLabel="Reset Filters"
            onAction={() => {
              setQuery('')
              setCategory('All')
              setSortBy('popularity')
              clearSmart()
            }}
          />
        </div>
      )}
    </div>
  )
}

function SuggestionIcon({ type }: { type: SmartSearchSuggestion['type'] }) {
  const cls = 'h-4 w-4 shrink-0 text-primary'
  switch (type) {
    case 'destination':
      return <MapPin className={cls} aria-hidden="true" />
    case 'category':
      return <Tag className={cls} aria-hidden="true" />
    case 'region':
      return <MapIcon className={cls} aria-hidden="true" />
    case 'activity':
      return <Activity className={cls} aria-hidden="true" />
  }
}
