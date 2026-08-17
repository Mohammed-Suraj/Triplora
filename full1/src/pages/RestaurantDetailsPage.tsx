import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Clock, Expand, Heart, Info, MapPin, Navigation, Phone, ShoppingBag, Star, UtensilsCrossed, X,
} from 'lucide-react'
import { restaurantsApi, type Restaurant, RESTAURANT_CATEGORY_LABELS, priceLevelInfo } from '@/lib/api'
import { RestaurantCard } from '@/components/restaurants/RestaurantCard'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState, ErrorState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { useRestaurantFavorites } from '@/context/RestaurantFavoritesContext'
import { restaurantStatus } from '@/lib/restaurantStatus'
import { formatCompact } from '@/lib/formatters'
import { cn } from '@/lib/utils'

function GalleryLightbox({
  images,
  startIndex,
  onClose,
}: {
  images: string[]
  startIndex: number
  onClose: () => void
}) {
  const [index, setIndex] = useState(startIndex)
  useEffect(() => {
    setIndex(startIndex)
  }, [startIndex])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') setIndex((i) => (i + 1) % images.length)
      if (e.key === 'ArrowLeft') setIndex((i) => (i - 1 + images.length) % images.length)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [images.length, onClose])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex flex-col bg-black/90 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="flex items-center justify-between text-white">
        <span className="text-sm font-medium">
          {index + 1} / {images.length}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close gallery"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="relative flex flex-1 items-center justify-center" onClick={(e) => e.stopPropagation()}>
        <AnimatePresence mode="wait">
          <motion.img
            key={index}
            src={images[index]}
            alt={`Restaurant photo ${index + 1}`}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="max-h-full max-w-full rounded-2xl object-contain shadow-2xl"
          />
        </AnimatePresence>
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => setIndex((i) => (i - 1 + images.length) % images.length)}
              aria-label="Previous photo"
              className="absolute left-2 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            >
              <Expand className="h-5 w-5 -scale-x-100" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setIndex((i) => (i + 1) % images.length)}
              aria-label="Next photo"
              className="absolute right-2 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            >
              <Expand className="h-5 w-5" aria-hidden="true" />
            </button>
          </>
        )}
      </div>
    </motion.div>
  )
}

export function RestaurantDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { isFavorite, toggleFavorite } = useRestaurantFavorites()

  const [restaurant, setRestaurant] = useState<(Restaurant & { similar: Restaurant[] }) | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [galleryOpen, setGalleryOpen] = useState(false)
  const [galleryStart, setGalleryStart] = useState(0)

  const load = useCallback(() => {
    if (!id) return
    setLoading(true)
    setError(false)
    restaurantsApi
      .get(id)
      .then((res) => setRestaurant(res.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [id])
  useEffect(() => {
    load()
  }, [load])

  if (loading) {
    return (
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 pt-24 pb-8 sm:px-6 md:pt-28">
        <Skeleton className="h-5 w-56" />
        <Skeleton className="h-[380px] w-full rounded-2xl" />
        <div className="flex flex-col gap-4">
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
        </div>
      </div>
    )
  }

  if (error || !restaurant) {
    return (
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 pt-24 pb-16 sm:px-6 md:pt-28">
        <ErrorState
          title="Could not load this restaurant"
          message="It may have been removed, or you may have followed an old link."
          onRetry={load}
        />
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => navigate('/restaurants')}>
            Browse all restaurants
          </Button>
        </div>
      </div>
    )
  }

  const wishlisted = isFavorite(restaurant.slug)
  const gallery = [restaurant.image, ...restaurant.gallery].filter(Boolean)
  const status = restaurantStatus(restaurant.openingHours)
  const price = priceLevelInfo(restaurant.priceLevel)
  const mapsUrl = restaurant.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${restaurant.name}, ${restaurant.city}`)}`
  const directionsUrl =
    restaurant.latitude != null && restaurant.longitude != null
      ? `https://www.google.com/maps/dir/?api=1&destination=${restaurant.latitude},${restaurant.longitude}`
      : mapsUrl

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 pt-24 pb-6 sm:px-6 md:pt-28">
      <motion.nav
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        aria-label="Breadcrumb"
        className="flex items-center gap-1.5 overflow-x-auto text-sm text-muted-foreground"
      >
        <Link to="/restaurants" className="flex shrink-0 items-center gap-1 font-medium hover:text-primary">
          <UtensilsCrossed className="h-3.5 w-3.5" aria-hidden="true" />
          Restaurants
        </Link>
        <span aria-hidden="true">/</span>
        <Link to={`/restaurants?q=${encodeURIComponent(restaurant.city)}`} className="shrink-0 hover:text-primary">
          {restaurant.city}
        </Link>
        <span aria-hidden="true">/</span>
        <span className="truncate font-medium text-foreground">{restaurant.name}</span>
      </motion.nav>

      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="flex flex-col gap-4"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="glass" className="bg-primary/15 text-primary">
                {RESTAURANT_CATEGORY_LABELS[restaurant.category] ?? restaurant.category}
              </Badge>
              <span className="flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-secondary-foreground">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />
                {restaurant.rating > 0 ? restaurant.rating.toFixed(1) : 'New'}
                {restaurant.reviewsCount > 0 && (
                  <span className="font-normal text-muted-foreground">({formatCompact(restaurant.reviewsCount)})</span>
                )}
              </span>
              {restaurant.ratingNote && (
                <span className="rounded-full border border-amber-300/60 bg-amber-300/10 px-2.5 py-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                  {restaurant.ratingNote}
                </span>
              )}
            </div>
            <h1 className="font-serif text-3xl font-bold text-foreground md:text-4xl">{restaurant.name}</h1>
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 text-primary" aria-hidden="true" />
              {restaurant.address}, {restaurant.city}
            </p>
            {restaurant.tagline && <p className="max-w-2xl text-sm text-foreground/80">{restaurant.tagline}</p>}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {restaurant.cuisines.map((cuisine) => (
                <Badge key={cuisine} variant="default" className="bg-secondary text-secondary-foreground">
                  {cuisine}
                </Badge>
              ))}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <motion.button
              key={String(wishlisted)}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              type="button"
              onClick={() => toggleFavorite(restaurant.slug, restaurant.name)}
              aria-pressed={wishlisted}
              aria-label={wishlisted ? `Remove ${restaurant.name} from favorites` : `Add ${restaurant.name} to favorites`}
              className={cn(
                'press flex h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors',
                wishlisted
                  ? 'border-red-300 bg-red-500/10 text-red-600 dark:text-red-400'
                  : 'border-border bg-card text-muted-foreground hover:border-red-300 hover:text-red-500',
              )}
            >
              <Heart className={cn('h-4 w-4', wishlisted ? 'fill-red-500 text-red-500' : '')} aria-hidden="true" />
              {wishlisted ? 'Saved' : 'Save'}
            </motion.button>
            <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-sm font-bold text-primary ring-1 ring-primary/20" aria-label={`${price.label} price level`}>
              <span aria-hidden="true">{price.symbol}</span>
              {price.label}
              <span className="font-semibold text-muted-foreground">· {restaurant.priceRange}</span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {gallery.slice(0, 4).map((src, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                setGalleryStart(i)
                setGalleryOpen(true)
              }}
              className={cn(
                'group relative overflow-hidden rounded-2xl ring-1 ring-border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                i === 0 ? 'sm:col-span-2 sm:row-span-2' : '',
              )}
              aria-label={`View photo ${i + 1}`}
            >
              <img
                src={src}
                alt={`${restaurant.name} photo ${i + 1}`}
                loading={i === 0 ? 'eager' : 'lazy'}
                className={cn(
                  'h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105',
                  i === 0 ? 'aspect-[16/9] sm:aspect-auto sm:h-full' : 'aspect-[4/3]',
                )}
              />
              {i === 3 && gallery.length > 4 && (
                <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-sm font-semibold text-white">
                  +{gallery.length - 4} photos
                </span>
              )}
              <span className="glass-strong absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full text-white opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
                <Expand className="h-4 w-4" aria-hidden="true" />
              </span>
            </button>
          ))}
        </div>
      </motion.section>

      <AnimatePresence>
        {galleryOpen && (
          <GalleryLightbox images={gallery} startIndex={galleryStart} onClose={() => setGalleryOpen(false)} />
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px] lg:items-start">
        <div className="flex min-w-0 flex-col gap-8">
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5 }}
            className="flex flex-col gap-4"
          >
            <h2 className="font-serif text-2xl font-semibold text-foreground md:text-3xl">About this place</h2>
            <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground md:text-base">
              {restaurant.longDescription || restaurant.description}
            </p>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="glass-strong flex flex-col gap-1 rounded-2xl p-4 shadow-sm">
                <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  <Clock className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                  Opening hours
                </span>
                <span className="text-sm font-semibold text-foreground">{restaurant.openingHours}</span>
                <span
                  className="flex items-center gap-1.5 text-xs font-semibold"
                  title={restaurant.openingHours}
                >
                  <span
                    className={cn(
                      'h-2 w-2 rounded-full',
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
              </div>
              <div className="glass-strong flex flex-col gap-1 rounded-2xl p-4 shadow-sm">
                <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  <ShoppingBag className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                  Price range
                </span>
                <span className="text-sm font-semibold text-foreground">{restaurant.priceRange}</span>
              </div>
              <div className="glass-strong flex flex-col gap-1 rounded-2xl p-4 shadow-sm">
                <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  <Info className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                  Best for
                </span>
                <span className="text-sm font-semibold text-foreground">{restaurant.bestFor.slice(0, 3).join(' · ')}</span>
              </div>
            </div>

            {restaurant.bestFor.length > 0 && (
              <div className="flex flex-col gap-3 rounded-2xl bg-card p-5 shadow-sm ring-1 ring-border">
                <h3 className="font-serif text-lg font-semibold text-card-foreground">Why you&apos;ll love it</h3>
                <ul className="flex flex-wrap gap-2">
                  {restaurant.bestFor.map((item) => (
                    <li key={item} className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-sm text-secondary-foreground">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </motion.section>
        </div>

        <aside className="lg:sticky lg:top-24">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15, ease: 'easeOut' }}
            className="flex flex-col gap-4 rounded-2xl bg-card p-5 shadow-lg ring-1 ring-border"
          >
            <h3 className="flex items-center gap-2 font-serif text-lg font-semibold text-card-foreground">
              <MapPin className="h-5 w-5 text-primary" aria-hidden="true" />
              Find us
            </h3>
            <p className="text-sm leading-relaxed text-muted-foreground">{restaurant.address}, {restaurant.city}</p>
            {restaurant.phone && (
              <a
                href={`tel:${restaurant.phone.replace(/[^\d+]/g, '')}`}
                className="flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
              >
                <Phone className="h-4 w-4" aria-hidden="true" />
                {restaurant.phone}
              </a>
            )}
            <div className="flex flex-col gap-2">
              <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="primary" size="lg" className="w-full">
                  <MapPin className="h-4 w-4" aria-hidden="true" />
                  Open in Google Maps
                </Button>
              </a>
              <a href={directionsUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="lg" className="w-full">
                  <Navigation className="h-4 w-4" aria-hidden="true" />
                  Get directions
                </Button>
              </a>
            </div>
            <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <span
                className={cn(
                  'h-2 w-2 rounded-full',
                  status.state === 'open' && 'bg-emerald-500',
                  status.state === 'closed' && 'bg-red-500',
                  status.state === 'unknown' && 'bg-muted-foreground/40',
                )}
                aria-hidden="true"
              />
              {status.state === 'open' && <span className="font-semibold text-emerald-600 dark:text-emerald-400">{status.summary}</span>}
              {status.state === 'closed' && <span className="font-semibold text-red-600 dark:text-red-400">{status.summary}</span>}
              <span> · {restaurant.openingHours}</span>
            </p>
          </motion.div>
        </aside>
      </div>

      {restaurant.similar && restaurant.similar.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h2 className="font-serif text-2xl font-semibold text-foreground md:text-3xl">
              More to try in {restaurant.city}
            </h2>
            <Link to={`/restaurants?q=${encodeURIComponent(restaurant.city)}`} className="text-sm font-semibold text-primary hover:underline">
              See all in {restaurant.city}
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {restaurant.similar.slice(0, 3).map((r, i) => (
              <RestaurantCard key={r.id} restaurant={r} index={i} />
            ))}
          </div>
        </motion.section>
      )}

      {restaurant.similar && restaurant.similar.length === 0 && (
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
        >
          <EmptyState
            icon={UtensilsCrossed}
            title={`Hungry for more in ${restaurant.city}?`}
            message="Browse the full collection of handpicked Kerala eateries."
            actionLabel="Explore all restaurants"
            onAction={() => navigate('/restaurants')}
          />
        </motion.section>
      )}

      <p className="flex items-center justify-center gap-1.5 pt-2 text-xs text-muted-foreground">
        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />
        {restaurant.ratingNote} — opening hours and prices are indicative and may vary; verify before visiting.
      </p>
    </div>
  )
}
