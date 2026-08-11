import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  BookmarkCheck,
  BookmarkPlus,
  CalendarDays,
  Check,
  MapPin,
  MessageSquareText,
  Search,
  Sparkles,
  Star,
  Wallet,
  X,
} from 'lucide-react'
import type { Destination } from '@/data/destinations'
import { aiTripPlanApi, destinationsApi, tripPlanApi } from '@/lib/api'
import type { AiTripPlanResult } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { AiTripPlanView } from '@/components/trips/AiTripPlanView'
import { DownloadPdfButton } from '@/components/trips/DownloadPdfButton'
import { cn } from '@/lib/utils'
import { useToast } from '@/context/ToastContext'

const budgets = [
  { id: 'relaxed', label: 'Relaxed', hint: 'Comfort & value' },
  { id: 'premium', label: 'Premium', hint: 'Boutique stays' },
  { id: 'luxury', label: 'Luxury', hint: 'The very best' },
] as const

const dayOptions = [3, 5, 7, 10] as const

const styles = [
  { id: 'romantic', label: 'Romantic escape' },
  { id: 'family', label: 'Family adventure' },
  { id: 'solo', label: 'Solo journey' },
  { id: 'friends', label: 'Friends getaway' },
] as const

const interests = [
  'Hill Stations',
  'Backwaters',
  'Beaches',
  'Wildlife',
  'Heritage',
  'Waterfalls',
  'Ayurveda',
  'Food & Culture',
]

const budgetToApi: Record<string, string> = { relaxed: 'RELAXED', premium: 'PREMIUM', luxury: 'LUXURY' }
const apiBudgetToUi: Record<string, string> = { RELAXED: 'relaxed', PREMIUM: 'premium', LUXURY: 'luxury' }
const styleToApi: Record<string, string> = {
  romantic: 'ROMANTIC',
  family: 'FAMILY',
  solo: 'SOLO',
  friends: 'FRIENDS',
}
const apiStyleToUi: Record<string, string> = {
  ROMANTIC: 'romantic',
  FAMILY: 'family',
  SOLO: 'solo',
  FRIENDS: 'friends',
}

const clampDays = (value: number) => Math.min(30, Math.max(1, Math.round(value)))

export function PlannerPage() {
  const toast = useToast()
  const [budget, setBudget] = useState<string>('premium')
  const [days, setDays] = useState<number>(5)
  const [style, setStyle] = useState<string>('romantic')
  const [selectedInterests, setSelectedInterests] = useState<string[]>(['Hill Stations', 'Backwaters'])

  // Destination autocomplete (any place is allowed - catalog or custom).
  const [destinationInput, setDestinationInput] = useState('')
  const [suggestions, setSuggestions] = useState<Destination[]>([])
  const [suggestionsOpen, setSuggestionsOpen] = useState(false)

  // Natural language input.
  const [prompt, setPrompt] = useState('')

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [plan, setPlan] = useState<AiTripPlanResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const q = destinationInput.trim()
    if (q.length < 2) {
      setSuggestions([])
      setSuggestionsOpen(false)
      return
    }
    const timer = setTimeout(async () => {
      try {
        const res = await destinationsApi.search(q, 6)
        setSuggestions(res.data)
        setSuggestionsOpen(res.data.length > 0)
      } catch {
        setSuggestions([])
        setSuggestionsOpen(false)
      }
    }, 250)
    return () => clearTimeout(timer)
  }, [destinationInput])

  const exactSuggestionMatch = suggestions.some(
    (s) => s.name.toLowerCase() === destinationInput.trim().toLowerCase(),
  )

  const toggleInterest = (interest: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest],
    )
  }

  const showPlan = (next: AiTripPlanResult) => {
    setPlan(next)
    setSaved(false)
    setError(null)
  }

  const buildItinerary = async () => {
    setLoading(true)
    setPlan(null)
    setError(null)
    try {
      const res = await aiTripPlanApi.generate({
        budget: budgetToApi[budget] ?? 'RELAXED',
        days,
        travelStyle: styleToApi[style] ?? 'SOLO',
        interests: selectedInterests,
        destination: destinationInput.trim() || null,
      })
      showPlan(res.data)
      toast.success(`Generated a ${days}-day Kerala itinerary!`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not generate an itinerary. Please try again.'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const buildFromPrompt = async () => {
    const text = prompt.trim()
    if (text.length < 3) {
      toast.error('Describe your trip first - for example "Plan a 5-day honeymoon in Kerala under ₹30000".')
      return
    }
    setLoading(true)
    setPlan(null)
    setError(null)
    try {
      const res = await aiTripPlanApi.natural(text)
      const { plan: parsedPlan, parsed } = res.data
      // Auto-update the planner UI with the parsed trip details (no manual selection needed).
      setDays(parsed.days)
      if (parsed.budget) setBudget(apiBudgetToUi[parsed.budget] ?? budget)
      if (parsed.travelStyle) setStyle(apiStyleToUi[parsed.travelStyle] ?? style)
      if (parsed.destination) setDestinationInput(parsed.destination)
      if (Array.isArray(parsed.interests) && parsed.interests.length > 0) {
        setSelectedInterests(
          parsed.interests.filter((interest) => interests.includes(interest)).slice(0, 8),
        )
      }
      showPlan(parsedPlan)
      toast.success('AI planned your trip from your description!')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not generate an itinerary. Please try again.'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!plan) return
    setSaving(true)
    try {
      await tripPlanApi.save({
        title: plan.title,
        budget: budgetToApi[budget] ?? 'PREMIUM',
        days: plan.itinerary.length || days,
        travelStyle: styleToApi[style] ?? 'FAMILY',
        interests: selectedInterests,
        payload: plan,
      })
      setSaved(true)
      toast.success('Itinerary saved to My AI Trips!')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not save the itinerary.'
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  const reset = () => {
    setPlan(null)
    setSaved(false)
    setPrompt('')
    setDestinationInput('')
    setSuggestions([])
    setSuggestionsOpen(false)
    setLoading(false)
  }

  return (
    <div className="pt-28 pb-20 md:pt-32">
      {/* Heading */}
      <section className="mx-auto max-w-7xl px-4 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="flex flex-col items-center gap-4 text-center"
        >
          <Badge variant="accent">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            AI Trip Planner
          </Badge>
          <h1 className="max-w-2xl font-serif text-4xl font-bold text-balance text-foreground md:text-5xl">
            Design your perfect Kerala journey
          </h1>
          <p className="max-w-xl text-base leading-relaxed text-pretty text-muted-foreground">
            Describe your dream trip in plain words, or fine-tune every detail - and let Triplora compose a
            day-by-day itinerary tailored to you.
          </p>
        </motion.div>
      </section>

      <section className="mx-auto mt-12 grid max-w-7xl grid-cols-1 gap-8 px-4 md:px-6 lg:grid-cols-[380px_1fr]">
        {/* Preferences panel */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="flex flex-col gap-7 self-start rounded-2xl bg-card p-6 shadow-sm ring-1 ring-border md:p-8 lg:sticky lg:top-24"
        >
          {/* Natural language */}
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 flex items-center gap-2 text-sm font-semibold text-card-foreground">
              <MessageSquareText className="h-4 w-4 text-primary" aria-hidden="true" />
              Describe your trip
            </legend>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              placeholder='Try: "Plan a 5-day honeymoon in Kerala under ₹30000" or "Solo trip to Munnar"'
              className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-card-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            />
            <Button size="sm" onClick={buildFromPrompt} loading={loading} className="w-full">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Let AI plan it
            </Button>
          </fieldset>

          {/* Destination */}
          <fieldset className="relative flex flex-col gap-2">
            <legend className="mb-1 flex items-center gap-2 text-sm font-semibold text-card-foreground">
              <MapPin className="h-4 w-4 text-primary" aria-hidden="true" />
              Destination (optional)
            </legend>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <input
                type="text"
                value={destinationInput}
                onChange={(e) => {
                  setDestinationInput(e.target.value)
                  setSuggestionsOpen(true)
                }}
                onBlur={() => setTimeout(() => setSuggestionsOpen(false), 150)}
                placeholder="Search or type any place - Munnar, Goa, Dubai..."
                className="w-full rounded-xl border border-border bg-background py-2.5 pr-9 pl-9 text-sm text-card-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              />
              {destinationInput && (
                <button
                  type="button"
                  onClick={() => {
                    setDestinationInput('')
                    setSuggestions([])
                  }}
                  aria-label="Clear destination"
                  className="absolute top-1/2 right-2 flex h-6 w-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-muted-foreground hover:bg-secondary"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
            </div>
            {suggestionsOpen && suggestions.length > 0 && (
              <div className="absolute top-full left-0 z-20 mt-1 w-full overflow-hidden rounded-xl border border-border bg-card shadow-lg">
                <div className="flex max-h-56 flex-col overflow-y-auto py-1">
                  {suggestions.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault()
                        setDestinationInput(s.name)
                        setSuggestionsOpen(false)
                      }}
                      className="flex cursor-pointer items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-card-foreground transition-colors hover:bg-secondary"
                    >
                      <img
                        src={s.image}
                        alt=""
                        loading="lazy"
                        className="h-7 w-7 shrink-0 rounded-lg object-cover"
                      />
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate font-medium">{s.name}</span>
                        {s.region && <span className="truncate text-xs text-muted-foreground">{s.region}</span>}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {destinationInput.trim().length >= 2 && !exactSuggestionMatch && (
              <p className="text-xs text-muted-foreground">
                We&apos;ll plan &quot;{destinationInput.trim()}&quot; as a custom destination.
              </p>
            )}
          </fieldset>

          {/* Budget */}
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-1 flex items-center gap-2 text-sm font-semibold text-card-foreground">
              <Wallet className="h-4 w-4 text-primary" aria-hidden="true" />
              Budget
            </legend>
            <div className="grid grid-cols-3 gap-2">
              {budgets.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setBudget(b.id)}
                  aria-pressed={budget === b.id}
                  className={cn(
                    'flex cursor-pointer flex-col items-center gap-0.5 rounded-xl border px-2 py-3 text-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                    budget === b.id
                      ? 'border-primary bg-primary/10'
                      : 'border-border bg-background hover:bg-secondary',
                  )}
                >
                  <span className="text-sm font-semibold text-card-foreground">{b.label}</span>
                  <span className="text-[11px] text-muted-foreground">{b.hint}</span>
                </button>
              ))}
            </div>
          </fieldset>

          {/* Days */}
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-1 flex items-center gap-2 text-sm font-semibold text-card-foreground">
              <CalendarDays className="h-4 w-4 text-primary" aria-hidden="true" />
              Trip length
            </legend>
            <div className="grid grid-cols-4 gap-2">
              {dayOptions.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDays(d)}
                  aria-pressed={days === d}
                  className={cn(
                    'cursor-pointer rounded-xl border py-3 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                    days === d
                      ? 'border-primary bg-primary/10 text-card-foreground'
                      : 'border-border bg-background text-card-foreground hover:bg-secondary',
                  )}
                >
                  {d}
                  <span className="block text-[11px] font-normal text-muted-foreground">days</span>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <label
                htmlFor="trip-days-input"
                className="flex-1 text-xs font-medium text-muted-foreground"
              >
                Or any length 1–30 days
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setDays(clampDays(days - 1))}
                  aria-label="Decrease trip length"
                  className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-border bg-background text-lg font-semibold text-card-foreground transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  −
                </button>
                <input
                  id="trip-days-input"
                  type="number"
                  min={1}
                  max={30}
                  value={days}
                  onChange={(e) => {
                    const value = Number(e.target.value)
                    if (Number.isFinite(value)) setDays(clampDays(value))
                  }}
                  aria-label="Trip length in days (1 to 30)"
                  className="h-9 w-16 rounded-lg border border-border bg-background text-center text-sm font-semibold text-card-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                />
                <button
                  type="button"
                  onClick={() => setDays(clampDays(days + 1))}
                  aria-label="Increase trip length"
                  className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-border bg-background text-lg font-semibold text-card-foreground transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  +
                </button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{days} day{days === 1 ? '' : 's'} selected</p>
          </fieldset>

          {/* Travel style */}
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-1 flex items-center gap-2 text-sm font-semibold text-card-foreground">
              <Star className="h-4 w-4 text-primary" aria-hidden="true" />
              Travel style
            </legend>
            <div className="grid grid-cols-2 gap-2">
              {styles.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStyle(s.id)}
                  aria-pressed={style === s.id}
                  className={cn(
                    'press cursor-pointer rounded-xl border px-3 py-2.5 text-sm font-medium transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                    style === s.id
                      ? 'border-primary bg-primary/10 text-card-foreground shadow-sm'
                      : 'border-border bg-background text-card-foreground hover:bg-secondary',
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </fieldset>

          {/* Interests */}
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-1 text-sm font-semibold text-card-foreground">Interests</legend>
            <div className="flex flex-wrap gap-2">
              {interests.map((interest) => {
                const active = selectedInterests.includes(interest)
                return (
                  <button
                    key={interest}
                    type="button"
                    onClick={() => toggleInterest(interest)}
                    aria-pressed={active}
                  className={cn(
                    'press flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                    active
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/70',
                  )}
                  >
                    {active && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                    {interest}
                  </button>
                )
              })}
            </div>
          </fieldset>

          <Button size="lg" onClick={buildItinerary} loading={loading} className="w-full">
            {!loading && <Sparkles className="h-4 w-4" aria-hidden="true" />}
            {loading ? 'Crafting your journey…' : 'Generate itinerary'}
          </Button>
          {error && (
            <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-600 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </p>
          )}
        </motion.div>

        {/* Result / chat panel */}
        <div className="min-h-96">
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex h-full min-h-96 flex-col items-center justify-center gap-6 rounded-2xl bg-card p-8 text-center shadow-sm ring-1 ring-border"
                role="status"
                aria-live="polite"
              >
                <div className="relative flex h-16 w-16 items-center justify-center">
                  <motion.span
                    className="absolute inset-0 rounded-full border-2 border-primary/20 border-t-primary"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  />
                  <Sparkles className="h-6 w-6 text-primary" aria-hidden="true" />
                </div>
                <div className="flex flex-col gap-1">
                  <p className="font-serif text-lg font-semibold text-card-foreground">
                    Composing your Kerala itinerary
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Matching {selectedInterests.length || 'your'} interests across {days} days...
                  </p>
                </div>
                <div className="w-full max-w-sm space-y-2.5" aria-hidden="true">
                  <div className="skeleton h-14 w-full rounded-xl" />
                  <div className="skeleton h-14 w-5/6 rounded-xl" />
                  <div className="skeleton h-14 w-full rounded-xl" />
                </div>
              </motion.div>
            ) : plan ? (
              <AiTripPlanView
                key="result"
                plan={plan}
                onStartOver={reset}
                actions={
                  <>
                    <DownloadPdfButton plan={plan} />
                    <Button size="sm" onClick={handleSave} disabled={saving || saved}>
                    {saved ? (
                      <BookmarkCheck className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <BookmarkPlus className="h-4 w-4" aria-hidden="true" />
                    )}
                    {saved ? 'Saved' : saving ? 'Saving...' : 'Save itinerary'}
                  </Button>
                  </>
                }
              />
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex h-full min-h-96 flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center"
              >
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Sparkles className="h-8 w-8" aria-hidden="true" />
                </span>
                <h2 className="font-serif text-xl font-semibold text-foreground">
                  Your itinerary awaits
                </h2>
                <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
                  Describe your trip in plain words, pick a destination - or fine-tune the options on the
                  left, then generate a personalised journey. Save it anytime to My AI Trips.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>
    </div>
  )
}
