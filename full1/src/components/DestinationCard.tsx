import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Clock, Heart, MapPin, Star } from 'lucide-react'
import type { Destination } from '@/data/destinations'
import { useWishlist } from '@/context/WishlistContext'
import { Badge } from '@/components/ui/Badge'
import { SmartImage } from '@/components/ui/SmartImage'
import { cn } from '@/lib/utils'

interface DestinationCardProps {
  destination: Destination
  index?: number
}

const FALLBACK_IMG =
  'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=800&q=80'

export function DestinationCard({ destination, index = 0 }: DestinationCardProps) {
  const { isWishlisted, toggleWishlist } = useWishlist()
  const wishlisted = isWishlisted(destination.id)

  return (
    <motion.article
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.55, delay: (index % 3) * 0.1, ease: 'easeOut' }}
      className="group relative flex h-full flex-col overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/10 hover:ring-primary/20 dark:hover:shadow-black/50"
    >
      <Link to={`/destinations/${destination.id}`} className="flex flex-1 flex-col focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
        <div className="relative aspect-[4/3] overflow-hidden">
          <SmartImage
            src={destination.image}
            alt={`${destination.name} — ${destination.tagline}`}
            loading="lazy"
            onError={(e) => {
              e.currentTarget.onerror = null
              e.currentTarget.src = FALLBACK_IMG
            }}
            className="h-full w-full transition-transform duration-700 ease-out group-hover:scale-105"
          />
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          <Badge variant="glass" className="absolute top-3 left-3 text-white">
            {destination.category}
          </Badge>
          <div className="absolute bottom-3 left-4 flex items-center gap-1.5 text-white drop-shadow-sm">
            <MapPin className="h-4 w-4" aria-hidden="true" />
            <span className="text-sm font-medium">{destination.region}, Kerala</span>
          </div>
        </div>
        <div className="flex flex-1 flex-col gap-2 p-5">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-serif text-xl font-semibold text-card-foreground transition-colors group-hover:text-primary">
              {destination.name}
            </h3>
            <span className="flex shrink-0 items-center gap-1 text-sm font-medium text-card-foreground">
              <Star className="h-4 w-4 fill-accent text-accent" aria-hidden="true" />
              {destination.rating}
              <span className="text-muted-foreground">({destination.reviews.toLocaleString()})</span>
            </span>
          </div>
          <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {destination.description}
          </p>
          <div className="mt-auto flex items-center justify-between border-t border-border/60 pt-3">
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" aria-hidden="true" />
              {destination.duration}
            </span>
            <span className="text-sm font-semibold text-card-foreground">
              {'\u20B9'}
              {destination.priceFrom.toLocaleString()}
              <span className="font-normal text-muted-foreground"> /person</span>
            </span>
          </div>
        </div>
      </Link>
      <button
        type="button"
        onClick={() => toggleWishlist(destination.id)}
        aria-label={wishlisted ? `Remove ${destination.name} from wishlist` : `Add ${destination.name} to wishlist`}
        aria-pressed={wishlisted}
        className="press glass absolute top-3 right-3 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full transition-transform duration-200 hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <motion.span
          key={String(wishlisted)}
          initial={{ scale: 0.6 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 18 }}
          className="flex"
        >
          <Heart
            className={cn(
              'h-4.5 w-4.5 transition-colors',
              wishlisted ? 'fill-red-500 text-red-500' : 'text-white',
            )}
            aria-hidden="true"
          />
        </motion.span>
      </button>
    </motion.article>
  )
}
