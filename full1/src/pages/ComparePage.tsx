import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, ArrowUpDown, Minus, Scale, Star, Trophy } from 'lucide-react'
import type { Destination } from '@/data/destinations'
import { destinationsApi } from '@/lib/api'
import { Skeleton } from '@/components/ui/Skeleton'
import { SmartImage } from '@/components/ui/SmartImage'
import { cn } from '@/lib/utils'

type Side = 1 | 2

function DestinationPicker({
  side,
  value,
  onChange,
  label,
  destinations,
}: {
  side: Side
  value: string
  onChange: (value: string) => void
  label: string
  destinations: Destination[]
}) {
  return (
    <div className="relative">
      <label htmlFor={`compare-${side}`} className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      <select
        id={`compare-${side}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className="h-12 w-full cursor-pointer rounded-xl border border-input bg-card px-4 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <option value="">Choose a destination...</option>
        {destinations.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name} — {d.category}
          </option>
        ))}
      </select>
    </div>
  )
}

function CompareRow({
  label,
  a,
  b,
  winner,
  invert,
}: {
  label: string
  a: string
  b: string
  winner?: Side
  invert?: boolean
}) {
  const getCellClass = (side: Side) =>
    winner === side
      ? 'font-semibold text-primary bg-primary/5'
      : 'text-muted-foreground'
  return (
    <div className="grid grid-cols-3 border-b border-border/60 last:border-b-0">
      <div className={cn('flex min-w-0 items-center justify-center px-2 py-3 text-center text-xs break-words transition-colors sm:px-4 sm:text-sm', getCellClass(1))}>{a}</div>
      <div className="flex min-w-0 items-center justify-center border-x border-border/60 bg-secondary/40 px-2 py-3 text-center text-[10px] font-semibold tracking-wide text-muted-foreground uppercase sm:text-xs">
        {winner ? (invert ? 'Cheaper' : 'Better') : label}
      </div>
      <div className={cn('flex min-w-0 items-center justify-center px-2 py-3 text-center text-xs break-words sm:px-4 sm:text-sm', getCellClass(2))}>{b}</div>
    </div>
  )
}

export function ComparePage() {
  const [leftId, setLeftId] = useState('')
  const [rightId, setRightId] = useState('')
  const [all, setAll] = useState<Destination[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const pageSize = 50
        const first = await destinationsApi.list({ limit: String(pageSize), page: '1' })
        let items = [...first.data]
        const total = first.meta?.total ?? items.length
        for (let page = 2; items.length < total; page++) {
          const next = await destinationsApi.list({ limit: String(pageSize), page: String(page) })
          items = [...items, ...next.data]
        }
        if (active) setAll(items)
      } catch {
        // keep empty list
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [])

  const left = useMemo(() => all.find((d) => d.id === leftId) ?? null, [all, leftId])
  const right = useMemo(() => all.find((d) => d.id === rightId) ?? null, [all, rightId])

  const swap = () => {
    setLeftId(rightId)
    setRightId(leftId)
  }

  const winnerFor = (aValue: number, bValue: number, lowerIsBetter = false): Side | undefined => {
    if (aValue === bValue) return undefined
    if (lowerIsBetter) return aValue < bValue ? 1 : 2
    return aValue > bValue ? 1 : 2
  }

  const ratingWinner = left && right ? winnerFor(left.rating, right.rating) : undefined
  const reviewsWinner = left && right ? winnerFor(left.reviews, right.reviews) : undefined
  const priceWinner = left && right ? winnerFor(left.priceFrom, right.priceFrom, true) : undefined

  const overallWinner: Side | undefined =
    left && right
      ? (() => {
          const score: Record<Side, number> = { 1: 0, 2: 0 }
          if (priceWinner) score[priceWinner] += 1
          if (ratingWinner) score[ratingWinner] += 1
          if (reviewsWinner) score[reviewsWinner] += 1
          return score[1] === score[2] ? undefined : score[1] > score[2] ? 1 : 2
        })()
      : undefined

  const slots: Array<Destination | null> = [left, right]

  return (
    <div className="mx-auto max-w-6xl px-4 pt-28 pb-20 md:px-6 md:pt-32">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="flex flex-col items-center gap-4 text-center"
      >
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Scale className="h-7 w-7" aria-hidden="true" />
        </span>
        <span className="text-sm font-semibold uppercase tracking-widest text-primary">Compare</span>
        <h1 className="max-w-2xl font-serif text-4xl font-bold text-balance text-foreground md:text-5xl">
          Two destinations. Side by side.
        </h1>
        <p className="max-w-xl text-base leading-relaxed text-pretty text-muted-foreground">
          Pick any two places in Kerala and see how they stack up on budget, season, ratings and experiences.
        </p>
      </motion.div>

      <div className="mt-10 grid grid-cols-1 items-end gap-3 sm:grid-cols-[1fr_auto_1fr]">
        {loading ? (
          <>
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="mb-1 h-10 w-10 rounded-full" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </>
        ) : (
          <>
            <DestinationPicker side={1} label="Destination A" value={leftId} onChange={setLeftId} destinations={all} />
            <button
              type="button"
              onClick={swap}
              disabled={!leftId || !rightId}
              aria-label="Swap destinations"
              className="mb-1 mx-auto flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-secondary text-secondary-foreground transition-colors hover:bg-primary hover:text-primary-foreground disabled:cursor-not-allowed disabled:opacity-40 sm:mx-0"
            >
              <ArrowUpDown className="h-4 w-4" aria-hidden="true" />
            </button>
            <DestinationPicker side={2} label="Destination B" value={rightId} onChange={setRightId} destinations={all} />
          </>
        )}
      </div>

      {!leftId && !rightId && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-16 flex flex-col items-center gap-3 text-center"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-muted-foreground">
            <ArrowUpDown className="h-6 w-6" aria-hidden="true" />
          </span>
          <p className="text-sm text-muted-foreground">
            Choose two destinations above to start comparing. <Minus className="inline h-3.5 w-3.5" aria-hidden="true" />
          </p>
        </motion.div>
      )}

      {(left || right) && (
        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
          {slots.map((destination, slotIndex) => {
            const side = (slotIndex + 1) as Side
            if (!destination) {
              return (
                <div
                  key={`empty-${side}`}
                  className="flex min-h-96 flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-border bg-card/40 p-8 text-center"
                >
                  <span className="text-sm text-muted-foreground">Choose a destination</span>
                </div>
              )
            }
            return (
              <motion.div
                key={destination.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: slotIndex * 0.06 }}
                className={cn(
                  'flex flex-col overflow-hidden rounded-3xl bg-card shadow-sm ring-1 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg',
                  overallWinner === side
                    ? 'ring-2 ring-primary/50 shadow-lg shadow-primary/10'
                    : 'ring-border',
                )}
              >
                {overallWinner === side && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-center gap-1.5 bg-primary py-1.5 text-xs font-bold text-primary-foreground"
                  >
                    <Trophy className="h-3.5 w-3.5" aria-hidden="true" />
                    Best overall pick
                  </motion.div>
                )}
                <div className="relative h-52 overflow-hidden">
                  <SmartImage
                    src={destination.image}
                    alt={destination.name}
                    loading="lazy"
                    className="h-full w-full transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                  <span className="glass absolute top-3 left-3 rounded-full px-3 py-1 text-xs font-bold text-white">
                    {side === 1 ? 'A' : 'B'}
                  </span>
                </div>
                <div className="flex flex-1 flex-col gap-3 p-5">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-serif text-2xl font-bold text-foreground">{destination.name}</h2>
                    <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                      {destination.category}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{destination.tagline}</p>

                  <dl className="flex flex-col gap-2 text-sm">
                    <div className="flex items-center justify-between border-b border-border/60 pb-2">
                      <dt className="text-muted-foreground">Region</dt>
                      <dd className="font-medium text-foreground">{destination.region}</dd>
                    </div>
                    <div className="flex items-center justify-between border-b border-border/60 pb-2">
                      <dt className="text-muted-foreground">Best season</dt>
                      <dd className="font-medium text-foreground">{destination.bestSeason}</dd>
                    </div>
                    <div className="flex items-center justify-between border-b border-border/60 pb-2">
                      <dt className="text-muted-foreground">Suggested stay</dt>
                      <dd className="font-medium text-foreground">{destination.duration}</dd>
                    </div>
                    <div className="flex items-center justify-between border-b border-border/60 pb-2">
                      <dt className="text-muted-foreground">Price from</dt>
                      <dd className="font-semibold text-primary">
                        ₹{destination.priceFrom.toLocaleString('en-IN')}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between border-b border-border/60 pb-2">
                      <dt className="text-muted-foreground">Rating</dt>
                      <dd className="flex items-center gap-1 font-medium text-foreground">
                        <Star className="h-3.5 w-3.5 fill-accent text-accent" aria-hidden="true" />
                        {destination.rating}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between border-b border-border/60 pb-2">
                      <dt className="text-muted-foreground">Reviews</dt>
                      <dd className="font-medium text-foreground">{destination.reviews.toLocaleString('en-IN')}</dd>
                    </div>
                    <div className="flex items-center justify-between border-b border-border/60 pb-2">
                      <dt className="text-muted-foreground">Highlights</dt>
                      <dd className="flex flex-wrap justify-end gap-1">
                        {destination.highlights.slice(0, 4).map((h) => (
                          <span key={h} className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
                            {h}
                          </span>
                        ))}
                      </dd>
                    </div>
                  </dl>

                  <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                    {destination.description}
                  </p>

                  <Link
                    to={`/destinations/${destination.id}`}
                    className="mt-auto inline-flex w-fit items-center gap-1 pt-1 text-sm font-semibold text-primary hover:underline"
                  >
                    View details
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {left && right && (
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mt-8 overflow-hidden rounded-3xl bg-card shadow-sm ring-1 ring-border"
        >
          <h2 className="border-b border-border px-5 py-4 font-serif text-lg font-semibold text-foreground">
            Head to head
          </h2>
          <div className="grid grid-cols-3">
            <div className="min-w-0 px-2 py-3 text-center text-xs font-bold break-words text-foreground sm:px-4 sm:text-base">{left.name}</div>
            <div className="flex min-w-0 items-center justify-center border-x border-border/60 bg-secondary/40 px-2 py-3 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase sm:text-xs">
              Metric
            </div>
            <div className="min-w-0 px-2 py-3 text-center text-xs font-bold break-words text-foreground sm:px-4 sm:text-base">{right.name}</div>

            <CompareRow label="Price from" a={`₹${left.priceFrom.toLocaleString('en-IN')}`} b={`₹${right.priceFrom.toLocaleString('en-IN')}`} winner={priceWinner} invert />
            <CompareRow label="Rating" a={`${left.rating} / 5`} b={`${right.rating} / 5`} winner={ratingWinner} />
            <CompareRow label="Reviews" a={left.reviews.toLocaleString('en-IN')} b={right.reviews.toLocaleString('en-IN')} winner={reviewsWinner} />
            <CompareRow label="Category" a={left.category} b={right.category} />
            <CompareRow label="Region" a={left.region} b={right.region} />
            <CompareRow label="Best season" a={left.bestSeason} b={right.bestSeason} />
            <CompareRow label="Stay" a={left.duration} b={right.duration} />

            <div className="flex min-w-0 items-center justify-center gap-1 border-x border-t border-b border-border/60 px-2 py-3 text-center text-[10px] font-semibold tracking-wide bg-secondary/40 text-muted-foreground uppercase sm:px-4 sm:text-xs">
              Activities
            </div>
            <div className="px-4 py-3">
              <div className="flex flex-wrap justify-center gap-1">
                {left.activities.slice(0, 6).map((a) => (
                  <span key={a} className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">{a}</span>
                ))}
              </div>
            </div>
            <div className="px-4 py-3">
              <div className="flex flex-wrap justify-center gap-1">
                {right.activities.slice(0, 6).map((a) => (
                  <span key={a} className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">{a}</span>
                ))}
              </div>
            </div>
          </div>
        </motion.section>
      )}
    </div>
  )
}
