import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { BedDouble, MapPin, Star, Users } from 'lucide-react'
import type { Hotel } from '@/lib/api'
import { Badge } from '@/components/ui/Badge'
import { SmartImage } from '@/components/ui/SmartImage'
import { cn } from '@/lib/utils'
import { formatINR } from '@/lib/formatters'

export const HOTEL_TYPE_LABELS: Record<string, string> = {
  HOTEL: 'Hotel',
  RESORT: 'Resort',
  VILLA: 'Villa',
  HOMESTAY: 'Homestay',
  BACKPACKER: 'Backpacker',
}

export function hotelPriceFrom(hotel: Hotel): number {
  if (hotel.priceFrom > 0) return hotel.priceFrom
  const prices = (hotel.rooms ?? []).map((r) => r.pricePerNight)
  return prices.length > 0 ? Math.min(...prices) : 0
}

interface HotelCardProps {
  hotel: Hotel
  index?: number
  compact?: boolean
}

export function HotelCard({ hotel, index = 0, compact = false }: HotelCardProps) {
  const price = hotelPriceFrom(hotel)

  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: Math.min(index * 0.06, 0.4), ease: 'easeOut' }}
      className="group flex h-full flex-col overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:ring-primary/20"
    >
      <Link
        to={`/hotels/${hotel.slug || hotel.id}`}
        className="relative block h-52 shrink-0 overflow-hidden"
        aria-label={hotel.name}
      >
        <SmartImage
          src={hotel.image}
          alt={hotel.name}
          loading="lazy"
          className="h-full w-full transition-transform duration-700 ease-out group-hover:scale-105"
        />
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          <Badge variant="glass" className="text-white">
            {HOTEL_TYPE_LABELS[hotel.hotelType] ?? hotel.hotelType}
          </Badge>
          {hotel.starRating > 0 && (
            <span className="glass flex h-6 items-center gap-0.5 rounded-full px-2.5 text-xs font-bold text-white shadow-sm">
              {'★'.repeat(Math.min(hotel.starRating, 5))}
            </span>
          )}
        </div>
        <span className="glass-strong absolute right-3 bottom-3 flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-white shadow-lg">
          <Star className="h-3 w-3 fill-amber-300 text-amber-300" aria-hidden="true" />
          {hotel.rating > 0 ? hotel.rating.toFixed(1) : 'New'}
          {hotel.reviewsCount > 0 && <span className="font-normal opacity-80">({hotel.reviewsCount})</span>}
        </span>
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <Link to={`/hotels/${hotel.slug || hotel.id}`} className="flex flex-col gap-0.5">
          <h3 className="font-serif text-lg leading-snug font-semibold text-card-foreground transition-colors group-hover:text-primary">
            {hotel.name}
          </h3>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3 text-primary" aria-hidden="true" />
            {hotel.location}
            {hotel.destination?.name && <span aria-hidden="true"> · </span>}
            {hotel.destination?.name}
          </span>
        </Link>

        {hotel.tagline && (
          <p className={cn('text-sm leading-relaxed text-muted-foreground', compact ? 'line-clamp-1' : 'line-clamp-2')}>
            {hotel.tagline}
          </p>
        )}

        <div className="mt-auto flex flex-wrap items-end justify-between gap-2 pt-2">
          <span className="flex flex-col">
            {price > 0 && (
              <>
                <span className="text-xs text-muted-foreground">from</span>
                <span className="text-lg font-bold text-primary">
                  {formatINR(price)}
                  <span className="text-xs font-medium text-muted-foreground"> / night</span>
                </span>
              </>
            )}
          </span>
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            {(hotel.rooms?.length ?? 0) > 0 && (
              <span className="flex items-center gap-1">
                <BedDouble className="h-3.5 w-3.5" aria-hidden="true" />
                {(hotel.rooms ?? []).length}
              </span>
            )}
            {hotel.familyFriendly && (
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" aria-hidden="true" />
                Family
              </span>
            )}
          </span>
        </div>
      </div>
    </motion.article>
  )
}
