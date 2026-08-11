import { Suspense, lazy, useEffect, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  CalendarDays,
  Check,
  Clock,
  Heart,
  MapPin,
  Star,
  Ticket,
} from 'lucide-react'
import type { Destination } from '@/data/destinations'
import { destinationsApi } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { useWishlist } from '@/context/WishlistContext'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { DestinationCard } from '@/components/DestinationCard'
import { DestinationReviews } from '@/components/DestinationReviews'
import { BookingModal } from '@/components/BookingModal'
import { SmartImage } from '@/components/ui/SmartImage'
import { Skeleton } from '@/components/ui/Skeleton'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { cn } from '@/lib/utils'

const WeatherCard = lazy(() =>
  import('@/components/weather/WeatherCard').then((m) => ({ default: m.WeatherCard })),
)

const DestinationMapSection = lazy(() =>
  import('@/components/map/DestinationMapSection').then((m) => ({ default: m.DestinationMapSection })),
)

export function DestinationDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const { isWishlisted, toggleWishlist } = useWishlist()
  const [destination, setDestination] = useState<Destination | null>(null)
  const [related, setRelated] = useState<Destination[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [showBookingModal, setShowBookingModal] = useState(false)

  useEffect(() => {
    if (!id) return
    let active = true
    setLoading(true)
    setNotFound(false)
    destinationsApi
      .get(id)
      .then(async (res) => {
        if (!active) return
        setDestination(res.data)
        try {
          const relatedRes = await destinationsApi.list({ category: res.data.category, limit: '4' })
          if (active) {
            setRelated(relatedRes.data.filter((d) => d.id !== res.data.id).slice(0, 3))
          }
        } catch {
          // related destinations are non-critical
        }
      })
      .catch(() => {
        if (active) setNotFound(true)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen pt-16 md:pt-18">
        <div className="relative h-[60svh] bg-muted">
          <Skeleton className="h-full w-full rounded-none" />
        </div>
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <div className="-mt-8 relative z-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="glass-strong flex flex-col gap-2.5 rounded-2xl p-5">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-5 w-32" />
              </div>
            ))}
          </div>
          <div className="mt-14 grid grid-cols-1 gap-12 lg:grid-cols-3">
            <div className="flex flex-col gap-6 lg:col-span-2">
              <Skeleton className="h-8 w-56" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-40 w-full rounded-2xl" />
              <Skeleton className="h-40 w-full rounded-2xl" />
            </div>
            <div className="glass-strong flex flex-col gap-5 rounded-2xl p-6">
              <Skeleton className="h-9 w-32" />
              <Skeleton className="h-20 w-full rounded-xl" />
              <Skeleton className="h-12 w-full rounded-full" />
              <Skeleton className="h-12 w-full rounded-full" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (notFound || !destination) {
    return <NotFoundPage />
  }

  const wishlisted = isWishlisted(destination.id)

  const goBack = () => {
    const canGoBack =
      window.history.state !== null &&
      typeof window.history.state.idx === 'number' &&
      window.history.state.idx > 0
    if (canGoBack) {
      navigate(-1)
    } else {
      navigate('/explore')
    }
  }

  const facts = [
    { icon: MapPin, label: 'Region', value: `${destination.region}, Kerala` },
    { icon: Clock, label: 'Ideal Duration', value: destination.duration },
    { icon: CalendarDays, label: 'Best Season', value: destination.bestSeason },
    { icon: Ticket, label: 'Starting From', value: `\u20B9${destination.priceFrom.toLocaleString()} / person` },
  ]

  return (
    <div className="pt-16 pb-20 md:pt-18">
      <section className="relative flex min-h-[70svh] flex-col">
        <SmartImage
          src={destination.image}
          alt={`${destination.name} — ${destination.tagline}`}
          loading="eager"
          className="absolute inset-0 h-full w-full"
          skeletonClassName="rounded-none"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/30" />
        <button
          type="button"
          onClick={goBack}
          className="press absolute top-6 left-6 z-20 inline-flex cursor-pointer items-center gap-2 rounded-full bg-black/40 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-black/30 backdrop-blur-md transition-all duration-200 hover:bg-primary hover:text-primary-foreground hover:shadow-primary/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back
        </button>
        <div className="relative z-10 mx-auto mt-auto w-full max-w-7xl px-4 pt-28 pb-10 md:px-6">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="flex flex-col gap-4"
          >
            <Badge variant="glass" className="w-fit text-white">
              {destination.category}
            </Badge>
            <h1 className="font-serif text-4xl font-bold text-balance text-white md:text-6xl">
              {destination.name}
            </h1>
            <p className="max-w-xl text-lg text-white/85">{destination.tagline}</p>
            <div className="flex items-center gap-2 text-white">
              <Star className="h-5 w-5 fill-accent text-accent" aria-hidden="true" />
              <span className="font-semibold">{destination.rating}</span>
              <span className="text-white/70">
                ({destination.reviews.toLocaleString()} reviews)
              </span>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 md:px-6">
        <div className="-mt-8 relative z-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {facts.map((fact, index) => (
            <motion.div
              key={fact.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 + index * 0.08, ease: 'easeOut' }}
              className="glass-strong flex flex-col gap-1.5 rounded-2xl p-4 shadow-sm md:p-5"
            >
              <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                <fact.icon className="h-4 w-4 text-primary" aria-hidden="true" />
                {fact.label}
              </span>
              <span className="text-sm font-semibold text-foreground md:text-base">
                {fact.value}
              </span>
            </motion.div>
          ))}
        </div>

        <div className="mt-14 grid grid-cols-1 gap-12 lg:grid-cols-3">
          <div className="flex flex-col gap-10 lg:col-span-2">
            <div className="flex flex-col gap-4">
              <h2 className="font-serif text-2xl font-semibold text-foreground md:text-3xl">
                About {destination.name}
              </h2>
              <p className="leading-relaxed text-pretty text-muted-foreground">
                {destination.longDescription}
              </p>
            </div>

            {destination.latitude != null && destination.longitude != null && (
              <div className="flex flex-col gap-4">
                <Suspense
                  fallback={
                    <div className="glass-strong flex flex-col gap-4 rounded-2xl p-6 shadow-sm">
                      <span className="skeleton h-10 w-10 rounded-full" />
                      <span className="skeleton h-6 w-32 rounded-xl" />
                      <span className="skeleton h-24 w-full rounded-xl" />
                    </div>
                  }
                >
                  <WeatherCard
                    latitude={destination.latitude}
                    longitude={destination.longitude}
                    destinationName={destination.name}
                  />
                </Suspense>
              </div>
            )}

            <Suspense
              fallback={
                <div className="flex flex-col gap-4">
                  <span className="skeleton h-8 w-40 rounded-xl" />
                  <span className="skeleton block h-[420px] w-full rounded-2xl" />
                </div>
              }
            >
              <DestinationMapSection destination={destination} />
            </Suspense>

            <div className="flex flex-col gap-4">
              <h2 className="font-serif text-2xl font-semibold text-foreground md:text-3xl">
                Highlights
              </h2>
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {destination.highlights.map((highlight) => (
                  <li key={highlight} className="flex items-center gap-3 text-sm text-foreground">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                    {highlight}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col gap-4">
              <h2 className="font-serif text-2xl font-semibold text-foreground md:text-3xl">
                Things to Do
              </h2>
              <div className="flex flex-wrap gap-2">
                {destination.activities.map((activity) => (
                  <Badge key={activity} className="px-4 py-2 text-sm">
                    {activity}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <h2 className="font-serif text-2xl font-semibold text-foreground md:text-3xl">
                Gallery
              </h2>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                {destination.gallery.map((image, index) => (
                  <motion.div
                    key={image}
                    initial={{ opacity: 0, scale: 0.96 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true, margin: '-40px' }}
                    transition={{ duration: 0.5, delay: index * 0.08 }}
                    className={cn(
                      'group/img relative h-40 overflow-hidden rounded-2xl md:h-52',
                      index === 0 && 'col-span-2 h-56 md:col-span-1 md:h-52',
                    )}
                  >
                    <SmartImage
                      src={image}
                      alt={`${destination.name} gallery image ${index + 1}`}
                      loading="lazy"
                      className="h-full w-full transition-transform duration-700 ease-out group-hover/img:scale-105"
                    />
                  </motion.div>
                ))}
              </div>
            </div>

            <DestinationReviews destinationId={destination.id} />
          </div>

          <aside className="lg:col-span-1">
            <div className="glass-strong sticky top-24 flex flex-col gap-5 rounded-2xl p-6 shadow-lg shadow-black/5 transition-shadow duration-300 dark:shadow-black/30">
              <div className="flex flex-col gap-1">
                <span className="text-sm text-muted-foreground">Starting from</span>
                <span className="font-serif text-3xl font-bold text-foreground">
                  {'\u20B9'}
                  {destination.priceFrom.toLocaleString()}
                  <span className="font-sans text-sm font-normal text-muted-foreground">
                    {' '}
                    / person
                  </span>
                </span>
              </div>
              <div className="flex flex-col gap-3 border-y border-border py-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Duration</span>
                  <span className="font-medium text-foreground">{destination.duration}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Best time</span>
                  <span className="font-medium text-foreground">{destination.bestSeason}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Rating</span>
                  <span className="flex items-center gap-1 font-medium text-foreground">
                    <Star className="h-4 w-4 fill-accent text-accent" aria-hidden="true" />
                    {destination.rating}
                    <span className="font-normal text-muted-foreground">
                      ({destination.reviews.toLocaleString()})
                    </span>
                  </span>
                </div>
              </div>
              <Button
                size="lg"
                onClick={() => {
                  if (!user) {
                    navigate('/login', { state: { from: location.pathname } })
                  } else {
                    setShowBookingModal(true)
                  }
                }}
              >
                Reserve Your Journey
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => toggleWishlist(destination.id)}
                aria-pressed={wishlisted}
              >
                <Heart
                  className={cn('h-4 w-4', wishlisted && 'fill-red-500 text-red-500')}
                  aria-hidden="true"
                />
                {wishlisted ? 'Saved to Wishlist' : 'Save to Wishlist'}
              </Button>
              <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
                <Check className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                Free cancellation up to 7 days before departure
              </p>
            </div>
          </aside>
        </div>

        {destination && (
          <BookingModal
            destination={{
              id: destination.id,
              name: destination.name,
              image: destination.image,
              priceFrom: destination.priceFrom,
            }}
            open={showBookingModal}
            onClose={() => setShowBookingModal(false)}
          />
        )}

        {related.length > 0 && (
          <div className="mt-20 flex flex-col gap-8">
            <h2 className="font-serif text-2xl font-semibold text-foreground md:text-3xl">
              You may also love
            </h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((relatedDestination, index) => (
                <DestinationCard
                  key={relatedDestination.id}
                  destination={relatedDestination}
                  index={index}
                />
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
