import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, MapPin, Sparkles, Star } from 'lucide-react'
import { hotelsApi, type Hotel } from '@/lib/api'
import { SmartImage } from '@/components/ui/SmartImage'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatINR } from '@/lib/formatters'
import { HOTEL_TYPE_LABELS } from '@/components/hotels/HotelCard'

const BUDGET_TO_STYLE: Record<string, string> = {
  relaxed: 'budget',
  premium: 'couple',
  luxury: 'luxury',
  RELAXED: 'budget',
  PREMIUM: 'couple',
  LUXURY: 'luxury',
  budget: 'budget',
  moderate: 'family',
  family: 'family',
  couple: 'couple',
  solo: 'solo',
  backpacker: 'backpacker',
  adventure: 'solo',
  culture: 'couple',
  wildlife: 'couple',
}

function resolveStyle(value?: string | null): string | undefined {
  if (!value) return undefined
  return BUDGET_TO_STYLE[value] ?? value.toLowerCase()
}

interface RecommendedStaysProps {
  slugs: string[]
  budget?: string
  style?: string
  limit?: number
}

export function RecommendedStays({ slugs, budget, style, limit = 4 }: RecommendedStaysProps) {
  const [hotels, setHotels] = useState<Hotel[]>([])
  const [loading, setLoading] = useState(true)

  const realSlugs = useMemo(() => slugs.filter((s) => s && !s.startsWith('custom-')), [slugs])
  const resolvedStyle = resolveStyle(style ?? budget)

  useEffect(() => {
    let active = true
    setLoading(true)
    const destination = realSlugs[0]
    hotelsApi
      .recommend({
        style: resolvedStyle,
        destination,
        limit,
      })
      .then((res) => {
        if (active) setHotels(res.data)
      })
      .catch(() => {
        if (active) setHotels([])
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [realSlugs.join(','), resolvedStyle, limit])

  if (loading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2 rounded-2xl bg-card p-3 ring-1 ring-border">
            <Skeleton className="aspect-[4/3] w-full rounded-xl" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    )
  }

  if (hotels.length === 0) return null

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      className="rounded-2xl bg-card p-5 shadow-sm ring-1 ring-border"
      aria-label="Recommended stays"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 font-serif text-lg font-semibold text-card-foreground">
          <Sparkles className="h-5 w-5 text-primary" aria-hidden="true" />
          Recommended stays
        </h3>
        <Link
          to="/hotels"
          className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
        >
          Browse all hotels
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {hotels.map((hotel) => (
          <Link
            key={hotel.id}
            to={`/hotels/${hotel.slug || hotel.id}`}
            className="group flex flex-col overflow-hidden rounded-xl bg-background ring-1 ring-border transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:ring-primary/20"
          >
            <div className="relative h-32 overflow-hidden">
              <SmartImage
                src={hotel.image}
                alt={hotel.name}
                loading="lazy"
                className="h-full w-full transition-transform duration-700 ease-out group-hover:scale-105"
              />
              <span className="glass-strong absolute top-2 left-2 flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold text-white">
                <Star className="h-3 w-3 fill-amber-300 text-amber-300" aria-hidden="true" />
                {hotel.rating > 0 ? hotel.rating.toFixed(1) : 'New'}
              </span>
            </div>
            <div className="flex flex-col gap-1 p-3">
              <span className="text-xs font-medium text-primary">
                {HOTEL_TYPE_LABELS[hotel.hotelType] ?? hotel.hotelType}
              </span>
              <span className="line-clamp-1 text-sm font-semibold text-card-foreground group-hover:text-primary">
                {hotel.name}
              </span>
              <span className="line-clamp-1 flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
                {hotel.location}
              </span>
              {hotel.priceFrom > 0 && (
                <span className="mt-1 text-sm font-bold text-primary">
                  {formatINR(hotel.priceFrom)}
                  <span className="text-xs font-medium text-muted-foreground"> / night</span>
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </motion.section>
  )
}
