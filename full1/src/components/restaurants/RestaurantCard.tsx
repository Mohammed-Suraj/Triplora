import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Heart, MapPin, Star, UtensilsCrossed } from 'lucide-react'
import type { Restaurant, RestaurantCategory } from '@/lib/api'
import { RESTAURANT_CATEGORY_LABELS, priceLevelInfo } from '@/lib/api'
import { Badge } from '@/components/ui/Badge'
import { SmartImage } from '@/components/ui/SmartImage'
import { useRestaurantFavorites } from '@/context/RestaurantFavoritesContext'
import { restaurantStatus } from '@/lib/restaurantStatus'
import { formatCompact } from '@/lib/formatters'
import { cn } from '@/lib/utils'

export const RESTAURANT_CATEGORY_META: Record<RestaurantCategory, { icon: typeof UtensilsCrossed; className: string }> = {
  KERALA: { icon: UtensilsCrossed, className: 'bg-primary/15 text-primary' },
  SEAFOOD: { icon: UtensilsCrossed, className: 'bg-sky-500/15 text-sky-600 dark:text-sky-400' },
  VEGETARIAN: { icon: UtensilsCrossed, className: 'bg-green-500/15 text-green-600 dark:text-green-400' },
  CAFE: { icon: UtensilsCrossed, className: 'bg-amber-500/15 text-amber-600 dark:text-amber-400' },
  FINE_DINING: { icon: UtensilsCrossed, className: 'bg-purple-500/15 text-purple-600 dark:text-purple-400' },
  BAKERY: { icon: UtensilsCrossed, className: 'bg-orange-500/15 text-orange-600 dark:text-orange-400' },
  FAST_FOOD: { icon: UtensilsCrossed, className: 'bg-red-500/15 text-red-600 dark:text-red-400' },
}

interface RestaurantCardProps {
  restaurant: Restaurant
  index?: number
  compact?: boolean
}

export function RestaurantCard({ restaurant, index = 0, compact = false }: RestaurantCardProps) {
  const { isFavorite, toggleFavorite } = useRestaurantFavorites()
  const wishlisted = isFavorite(restaurant.slug)
  const status = restaurantStatus(restaurant.openingHours)
  const price = priceLevelInfo(restaurant.priceLevel)
  const CategoryIcon = RESTAURANT_CATEGORY_META[restaurant.category]?.icon ?? UtensilsCrossed
  const visibleCuisines = restaurant.cuisines.slice(0, 3)
  const extraCuisines = restaurant.cuisines.length - visibleCuisines.length

  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: Math.min(index * 0.06, 0.4), ease: 'easeOut' }}
      className="group flex h-full flex-col overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-border transition-all duration-500 ease-out hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-primary/5 hover:ring-primary/25"
    >
      <div className="relative h-44 shrink-0 overflow-hidden sm:h-48">
        <Link to={`/restaurants/${restaurant.slug || restaurant.id}`} className="absolute inset-0" aria-label={restaurant.name}>
          <SmartImage
            src={restaurant.image}
            alt={restaurant.name}
            loading="lazy"
            className="h-full w-full transition-transform duration-700 ease-out group-hover:scale-[1.06]"
          />
        </Link>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-black/0 to-black/10 transition-opacity duration-500" aria-hidden="true" />
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          <Badge variant="glass" className="text-white">
            <CategoryIcon className="h-3 w-3" aria-hidden="true" />
            {RESTAURANT_CATEGORY_LABELS[restaurant.category] ?? restaurant.category}
          </Badge>
        </div>
        <span className="glass-strong absolute right-3 bottom-3 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-white shadow-lg">
          <Star className="h-3.5 w-3.5 fill-amber-300 text-amber-300" aria-hidden="true" />
          {restaurant.rating > 0 ? restaurant.rating.toFixed(1) : 'New'}
          {restaurant.reviewsCount > 0 && (
            <span className="font-normal text-white/80">({formatCompact(restaurant.reviewsCount)})</span>
          )}
        </span>
        <motion.button
          key={String(wishlisted)}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          type="button"
          onClick={(e) => {
            e.preventDefault()
            toggleFavorite(restaurant.slug, restaurant.name)
          }}
          aria-pressed={wishlisted}
          aria-label={wishlisted ? `Remove ${restaurant.name} from favorites` : `Add ${restaurant.name} to favorites`}
          className="press glass absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full shadow-md transition-transform duration-300 hover:scale-110"
        >
          <HeartIcon wishlisted={wishlisted} />
        </motion.button>
      </div>

      <div className={cn('flex flex-1 flex-col gap-2.5', compact ? 'p-3.5' : 'p-4 sm:p-5')}>
        <Link to={`/restaurants/${restaurant.slug || restaurant.id}`} className="flex flex-col gap-1">
          <h3 className="font-serif text-lg leading-snug font-semibold text-card-foreground transition-colors group-hover:text-primary">
            {restaurant.name}
          </h3>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3 text-primary" aria-hidden="true" />
            {restaurant.city}
          </span>
        </Link>

        <span
          className="flex items-center gap-1.5 text-xs font-semibold"
          title={restaurant.openingHours}
        >
          <span
            className={cn(
              'h-2 w-2 shrink-0 rounded-full transition-shadow duration-300',
              status.state === 'open' && 'bg-emerald-500 shadow-[0_0_8px] shadow-emerald-500/70',
              status.state === 'closed' && 'bg-red-500',
              status.state === 'unknown' && 'bg-muted-foreground/40',
            )}
            aria-hidden="true"
          />
          {status.state === 'open' && (
            <span className="text-emerald-600 dark:text-emerald-400">
              {status.summary}
              {status.detail && <span className="font-normal text-muted-foreground"> · {status.detail}</span>}
            </span>
          )}
          {status.state === 'closed' && (
            <span className="text-red-600 dark:text-red-400">
              {status.summary}
              {status.detail && <span className="font-normal text-muted-foreground"> · {status.detail}</span>}
            </span>
          )}
          {status.state === 'unknown' && <span className="text-muted-foreground">{status.summary}</span>}
        </span>

        {restaurant.tagline && (
          <p className="text-sm leading-relaxed text-muted-foreground line-clamp-1">{restaurant.tagline}</p>
        )}

        {visibleCuisines.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {visibleCuisines.map((cuisine) => (
              <span
                key={cuisine}
                className="rounded-full bg-secondary/70 px-2.5 py-1 text-[11px] font-semibold text-secondary-foreground ring-1 ring-border/60 transition-all duration-300 hover:bg-primary/10 hover:text-primary hover:ring-primary/30"
              >
                {cuisine}
              </span>
            ))}
            {extraCuisines > 0 && (
              <span className="text-[11px] font-semibold text-muted-foreground">+{extraCuisines} more</span>
            )}
          </div>
        )}

        <div className="mt-auto flex items-center justify-between gap-3 border-t border-border/70 pt-3">
          <span className="min-w-0">
            <span className="block truncate text-sm font-bold text-card-foreground">{restaurant.priceRange}</span>
          </span>
          <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary ring-1 ring-primary/20 transition-all duration-300 group-hover:bg-primary group-hover:text-primary-foreground group-hover:ring-primary">
            <span aria-hidden="true">{price.symbol}</span>
            {price.label}
          </span>
        </div>
      </div>
    </motion.article>
  )
}

function HeartIcon({ wishlisted }: { wishlisted: boolean }) {
  return (
    <Heart
      className={cn('h-4 w-4 transition-colors', wishlisted ? 'fill-red-500 text-red-500' : 'text-white')}
      aria-hidden="true"
    />
  )
}