import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BedDouble,
  CalendarDays,
  CalendarPlus,
  Check,
  Clock,
  Expand,
  Heart,
  IndianRupee,
  Landmark,
  MapPin,
  Mountain,
  Navigation,
  Share2,
  Star,
  Users,
  UtensilsCrossed,
  X,
} from 'lucide-react'
import {
  destinationsApi,
  experiencesApi,
  hotelsApi,
  restaurantsApi,
  type Experience,
  type Hotel,
  type Restaurant,
  EXPERIENCE_CATEGORY_LABELS,
  EXPERIENCE_DIFFICULTY_LABELS,
} from '@/lib/api'
import type { Destination } from '@/data/destinations'
import { EXPERIENCE_CATEGORY_META } from '@/components/experiences/ExperienceCard'
import { ExperienceCard } from '@/components/experiences/ExperienceCard'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState, ErrorState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { SmartImage } from '@/components/ui/SmartImage'
import { useExperienceWishlist } from '@/context/ExperienceWishlistContext'
import { useExperiencePlanner } from '@/context/ExperiencePlannerContext'
import { useToast } from '@/context/ToastContext'
import { formatCompact } from '@/lib/formatters'
import { formatDistance, haversineKm, isValidCoord, osmMapLink } from '@/lib/geo'
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
            alt={`Experience photo ${index + 1}`}
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

interface NearbyRowProps {
  image: string
  name: string
  subtitle: string
  distanceKm: number | null
  href: string
}

function NearbyRow({ image, name, subtitle, distanceKm, href }: NearbyRowProps) {
  return (
    <Link
      to={href}
      className="group flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-secondary/60"
    >
      <SmartImage
        src={image}
        alt={name}
        loading="lazy"
        className="h-14 w-14 shrink-0 rounded-xl object-cover ring-1 ring-border"
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-card-foreground group-hover:text-primary">
          {name}
        </span>
        <span className="block truncate text-xs text-muted-foreground">{subtitle}</span>
      </span>
      {distanceKm != null && (
        <span className="shrink-0 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold text-secondary-foreground ring-1 ring-border/60">
          {formatDistance(distanceKm)}
        </span>
      )}
    </Link>
  )
}

export function ExperienceDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const toast = useToast()
  const { isWishlisted, toggleWishlist } = useExperienceWishlist()
  const { isPlanned, addToPlanner, removeFromPlanner } = useExperiencePlanner()

  const [experience, setExperience] = useState<(Experience & { similar: Experience[] }) | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [galleryOpen, setGalleryOpen] = useState(false)
  const [galleryStart, setGalleryStart] = useState(0)

  const [nearby, setNearby] = useState<{
    hotels: Array<{ item: Hotel; km: number }>
    restaurants: Array<{ item: Restaurant; km: number }>
    attractions: Array<{ item: Destination; km: number }>
  } | null>(null)
  const [nearbyLoading, setNearbyLoading] = useState(false)
  const cancelledRef = useRef(false)

  const load = useCallback(() => {
    if (!id) return
    setLoading(true)
    setError(false)
    setNearby(null)
    experiencesApi
      .get(id)
      .then((res) => setExperience(res.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [id])
  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!experience || !isValidCoord(experience.latitude, experience.longitude)) return
    cancelledRef.current = false
    setNearbyLoading(true)

    const fetchAll = async <T,>(
      list: (params: Record<string, string>) => Promise<{ data: T[]; meta?: { total?: number } }>,
    ): Promise<T[]> => {
      const pageSize = 50
      const first = await list({ limit: String(pageSize), page: '1' })
      const total = first.meta?.total ?? first.data.length
      const pages = Math.ceil(total / pageSize)
      const rest = await Promise.all(
        Array.from({ length: pages - 1 }, (_, i) => list({ limit: String(pageSize), page: String(i + 2) })),
      )
      return [first, ...rest].flatMap((r) => r.data)
    }

    Promise.allSettled([
      fetchAll<Hotel>(hotelsApi.list),
      fetchAll<Restaurant>(restaurantsApi.list),
      fetchAll<Destination>(destinationsApi.list),
    ]).then(([hotelsRes, restaurantsRes, attractionsRes]) => {
      if (cancelledRef.current) return
      const lat = experience.latitude!
      const lng = experience.longitude!
      const rank = <T extends { latitude?: number | null; longitude?: number | null }>(items: T[]) =>
        items
          .filter((i) => isValidCoord(i.latitude, i.longitude))
          .map((item) => ({ item, km: haversineKm(lat, lng, item.latitude!, item.longitude!) }))
          .sort((a, b) => a.km - b.km)
          .slice(0, 3)
      setNearby({
        hotels: hotelsRes.status === 'fulfilled' ? rank(hotelsRes.value) : [],
        restaurants: restaurantsRes.status === 'fulfilled' ? rank(restaurantsRes.value) : [],
        attractions: attractionsRes.status === 'fulfilled' ? rank(attractionsRes.value) : [],
      })
      setNearbyLoading(false)
    })
    return () => {
      cancelledRef.current = true
    }
  }, [experience])

  const share = useCallback(async () => {
    if (!experience) return
    const text = `${experience.name} — ${experience.tagline} (₹${experience.price.toLocaleString('en-IN')}) on Triplora`
    const url = window.location.href
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: experience.name, text, url })
        return
      } catch {
        return
      }
    }
    try {
      await navigator.clipboard.writeText(`${text}\n${url}`)
      toast.success('Link copied to clipboard')
    } catch {
      toast.error('Could not share — copy the URL manually')
    }
  }, [experience, toast])

  const mapsUrl =
    isValidCoord(experience?.latitude, experience?.longitude) && experience
      ? osmMapLink(experience.latitude!, experience.longitude!)
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(experience?.location ?? experience?.name ?? '')}`

  if (loading) {
    return (
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 pt-24 pb-8 sm:px-6 md:pt-28">
        <Skeleton className="h-5 w-56" />
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-[380px] w-full rounded-2xl" />
        <div className="flex flex-col gap-4">
          <Skeleton className="h-10 w-1/3" />
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
        </div>
      </div>
    )
  }

  if (error || !experience) {
    return (
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 pt-24 pb-16 sm:px-6 md:pt-28">
        <ErrorState
          title="Could not load this experience"
          message="It may have been removed, or you may have followed an old link."
          onRetry={load}
        />
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => navigate('/experiences')}>
            Browse all experiences
          </Button>
        </div>
      </div>
    )
  }

  const wishlisted = isWishlisted(experience.slug)
  const planned = isPlanned(experience.slug)
  const gallery = [experience.image, ...experience.gallery].filter(Boolean)
  const categoryMeta = EXPERIENCE_CATEGORY_META[experience.category]
  const hasLocation = isValidCoord(experience.latitude, experience.longitude)

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 pt-24 pb-6 sm:px-6 md:pt-28">
      <motion.nav
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        aria-label="Breadcrumb"
        className="flex items-center gap-1.5 overflow-x-auto text-sm text-muted-foreground"
      >
        <Link to="/experiences" className="flex shrink-0 items-center gap-1 font-medium hover:text-primary">
          <Mountain className="h-3.5 w-3.5" aria-hidden="true" />
          Experiences
        </Link>
        <span aria-hidden="true">/</span>
        <Link to={`/experiences?city=${encodeURIComponent(experience.city)}`} className="shrink-0 hover:text-primary">
          {experience.city}
        </Link>
        <span aria-hidden="true">/</span>
        <span className="truncate font-medium text-foreground">{experience.name}</span>
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
              <Badge variant="glass" className={cn(categoryMeta.className, 'ring-1 ring-border/60')}>
                {EXPERIENCE_CATEGORY_LABELS[experience.category] ?? experience.category}
              </Badge>
              {experience.isFeatured && (
                <Badge variant="glass" className="bg-amber-400/90 text-amber-950">
                  ✦ Featured
                </Badge>
              )}
              <span className="flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-secondary-foreground">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />
                {experience.rating > 0 ? experience.rating.toFixed(1) : 'New'}
                {experience.reviewsCount > 0 && (
                  <span className="font-normal text-muted-foreground">({formatCompact(experience.reviewsCount)})</span>
                )}
              </span>
              {experience.ratingNote && (
                <span className="rounded-full border border-amber-300/60 bg-amber-300/10 px-2.5 py-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                  {experience.ratingNote}
                </span>
              )}
            </div>
            <h1 className="font-serif text-3xl font-bold text-foreground md:text-4xl">{experience.name}</h1>
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 text-primary" aria-hidden="true" />
              {experience.location}
            </p>
            {experience.tagline && <p className="max-w-2xl text-sm text-foreground/80">{experience.tagline}</p>}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {experience.suitableFor.map((who) => (
                <Badge key={who} variant="default" className="bg-secondary text-secondary-foreground">
                  {who}
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
              onClick={() => toggleWishlist(experience.slug, experience.name)}
              aria-pressed={wishlisted}
              aria-label={wishlisted ? `Remove ${experience.name} from wishlist` : `Add ${experience.name} to wishlist`}
              className={cn(
                'press flex h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors',
                wishlisted
                  ? 'border-red-300 bg-red-500/10 text-red-600 dark:text-red-400'
                  : 'border-border bg-card text-muted-foreground hover:border-red-300 hover:text-red-500',
              )}
            >
              <Heart className={cn('h-4 w-4', wishlisted ? 'fill-red-500 text-red-500' : '')} aria-hidden="true" />
              {wishlisted ? 'Wishlisted' : 'Wishlist'}
            </motion.button>
            <motion.button
              key={String(planned)}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              type="button"
              onClick={share}
              className="press flex h-11 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
            >
              <Share2 className="h-4 w-4" aria-hidden="true" />
              Share
            </motion.button>
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
                alt={`${experience.name} photo ${i + 1}`}
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
            <h2 className="font-serif text-2xl font-semibold text-foreground md:text-3xl">About this experience</h2>
            <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground md:text-base">
              {experience.longDescription || experience.description}
            </p>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="glass-strong flex flex-col gap-1 rounded-2xl p-4 shadow-sm">
                <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  <Clock className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                  Duration
                </span>
                <span className="text-sm font-semibold text-foreground">{experience.duration}</span>
              </div>
              <div className="glass-strong flex flex-col gap-1 rounded-2xl p-4 shadow-sm">
                <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  <Mountain className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                  Difficulty
                </span>
                <span className="text-sm font-semibold text-foreground">
                  {EXPERIENCE_DIFFICULTY_LABELS[experience.difficulty] ?? experience.difficulty}
                </span>
              </div>
              <div className="glass-strong flex flex-col gap-1 rounded-2xl p-4 shadow-sm">
                <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  <CalendarDays className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                  Best season
                </span>
                <span className="text-sm font-semibold text-foreground">{experience.bestSeason}</span>
              </div>
            </div>

            {experience.highlights.length > 0 && (
              <div className="flex flex-col gap-3 rounded-2xl bg-card p-5 shadow-sm ring-1 ring-border">
                <h3 className="font-serif text-lg font-semibold text-card-foreground">Highlights</h3>
                <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {experience.highlights.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                        <Check className="h-3 w-3" aria-hidden="true" />
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {experience.suitableFor.length > 0 && (
              <div className="flex flex-col gap-3 rounded-2xl bg-card p-5 shadow-sm ring-1 ring-border">
                <h3 className="font-serif text-lg font-semibold text-card-foreground">Perfect for</h3>
                <ul className="flex flex-wrap gap-2">
                  {experience.suitableFor.map((who) => (
                    <li key={who} className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-sm text-secondary-foreground">
                      <Users className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                      {who}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5 }}
            className="flex flex-col gap-4"
          >
            <h2 className="font-serif text-2xl font-semibold text-foreground md:text-3xl">What&apos;s nearby</h2>
            {!hasLocation ? (
              <EmptyState
                icon={MapPin}
                title="Location not available"
                message="We don't have coordinates for this experience yet, so nearby suggestions are unavailable."
              />
            ) : nearbyLoading && !nearby ? (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-64 w-full rounded-2xl" />
                ))}
              </div>
            ) : nearby && (nearby.hotels.length > 0 || nearby.restaurants.length > 0 || nearby.attractions.length > 0) ? (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <div className="flex flex-col gap-2 rounded-2xl bg-card p-4 shadow-sm ring-1 ring-border">
                  <h3 className="flex items-center gap-2 font-serif text-base font-semibold text-card-foreground">
                    <BedDouble className="h-4 w-4 text-primary" aria-hidden="true" />
                    Stay nearby
                  </h3>
                  {nearby.hotels.length > 0 ? (
                    nearby.hotels.map(({ item, km }) => (
                      <NearbyRow
                        key={item.id}
                        image={item.image}
                        name={item.name}
                        subtitle={`${item.hotelType} · from ₹${item.priceFrom.toLocaleString('en-IN')}`}
                        distanceKm={km}
                        href={`/hotels/${item.slug}`}
                      />
                    ))
                  ) : (
                    <p className="px-2 text-sm text-muted-foreground">No nearby hotels found.</p>
                  )}
                </div>
                <div className="flex flex-col gap-2 rounded-2xl bg-card p-4 shadow-sm ring-1 ring-border">
                  <h3 className="flex items-center gap-2 font-serif text-base font-semibold text-card-foreground">
                    <UtensilsCrossed className="h-4 w-4 text-primary" aria-hidden="true" />
                    Eat nearby
                  </h3>
                  {nearby.restaurants.length > 0 ? (
                    nearby.restaurants.map(({ item, km }) => (
                      <NearbyRow
                        key={item.id}
                        image={item.image}
                        name={item.name}
                        subtitle={item.cuisines.slice(0, 2).join(' · ')}
                        distanceKm={km}
                        href={`/restaurants/${item.slug}`}
                      />
                    ))
                  ) : (
                    <p className="px-2 text-sm text-muted-foreground">No nearby restaurants found.</p>
                  )}
                </div>
                <div className="flex flex-col gap-2 rounded-2xl bg-card p-4 shadow-sm ring-1 ring-border">
                  <h3 className="flex items-center gap-2 font-serif text-base font-semibold text-card-foreground">
                    <Landmark className="h-4 w-4 text-primary" aria-hidden="true" />
                    Attractions nearby
                  </h3>
                  {nearby.attractions.length > 0 ? (
                    nearby.attractions.map(({ item, km }) => (
                      <NearbyRow
                        key={item.id}
                        image={item.image}
                        name={item.name}
                        subtitle={item.tagline || item.region}
                        distanceKm={km}
                        href={`/destinations/${item.slug}`}
                      />
                    ))
                  ) : (
                    <p className="px-2 text-sm text-muted-foreground">No nearby attractions found.</p>
                  )}
                </div>
              </div>
            ) : (
              <EmptyState
                icon={MapPin}
                title="Nothing nearby yet"
                message="No stays, bites or sights were found close to this experience."
              />
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
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="flex items-center text-2xl font-bold text-card-foreground">
                <IndianRupee className="mr-0.5 h-5 w-5 text-primary" aria-hidden="true" />
                {experience.price > 0 ? experience.price.toLocaleString('en-IN') : 'Free'}
              </span>
              <span className="text-xs font-medium text-muted-foreground">
                per person · {experience.duration}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 border-t border-border/70 pt-4">
              <div className="flex flex-col gap-0.5">
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Duration</span>
                <span className="flex items-center gap-1 text-sm font-semibold text-foreground">
                  <Clock className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                  {experience.duration}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Difficulty</span>
                <span className="flex items-center gap-1 text-sm font-semibold text-foreground">
                  <Mountain className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                  {EXPERIENCE_DIFFICULTY_LABELS[experience.difficulty] ?? experience.difficulty}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Best in</span>
                <span className="flex items-center gap-1 text-sm font-semibold text-foreground">
                  <CalendarDays className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                  {experience.bestSeason}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <motion.button
                key={String(planned)}
                initial={{ scale: 0.98, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                type="button"
                onClick={() => {
                  if (planned) {
                    removeFromPlanner(experience.slug)
                  } else {
                    addToPlanner({
                      slug: experience.slug,
                      name: experience.name,
                      city: experience.city,
                      price: experience.price,
                      duration: experience.duration,
                    })
                  }
                }}
                aria-pressed={planned}
                className={cn(
                  'press flex h-11 w-full items-center justify-center gap-2 rounded-full text-sm font-semibold transition-colors',
                  planned
                    ? 'bg-primary/15 text-primary ring-1 ring-primary/30'
                    : 'bg-primary text-primary-foreground shadow-md shadow-primary/25 hover:bg-primary/90',
                )}
              >
                {planned ? (
                  <>
                    <Check className="h-4 w-4" aria-hidden="true" />
                    In Trip Planner
                  </>
                ) : (
                  <>
                    <CalendarPlus className="h-4 w-4" aria-hidden="true" />
                    Add to Trip Planner
                  </>
                )}
              </motion.button>
              <button
                type="button"
                onClick={share}
                className="press flex h-11 w-full items-center justify-center gap-2 rounded-full border border-border bg-card text-sm font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
              >
                <Share2 className="h-4 w-4" aria-hidden="true" />
                Share this experience
              </button>
            </div>

            <div className="flex flex-col gap-2 border-t border-border/70 pt-4">
              <p className="flex items-start gap-1.5 text-sm leading-relaxed text-muted-foreground">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                {experience.location}
              </p>
              <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="lg" className="w-full">
                  <Navigation className="h-4 w-4" aria-hidden="true" />
                  View on map
                </Button>
              </a>
            </div>
          </motion.div>
        </aside>
      </div>

      {experience.similar && experience.similar.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h2 className="font-serif text-2xl font-semibold text-foreground md:text-3xl">
              You might also love
            </h2>
            <Link to={`/experiences?category=${experience.category}`} className="text-sm font-semibold text-primary hover:underline">
              See all {EXPERIENCE_CATEGORY_LABELS[experience.category] ?? 'experiences'}
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {experience.similar.slice(0, 3).map((e, i) => (
              <ExperienceCard key={e.id} experience={e} index={i} />
            ))}
          </div>
        </motion.section>
      )}

      {experience.similar && experience.similar.length === 0 && (
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
        >
          <EmptyState
            icon={Mountain}
            title="Looking for more adventures?"
            message="Browse the full collection of handpicked Kerala experiences."
            actionLabel="Explore all experiences"
            onAction={() => navigate('/experiences')}
          />
        </motion.section>
      )}

      <p className="flex items-center justify-center gap-1.5 pt-2 text-xs text-muted-foreground">
        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />
        {experience.ratingNote} — prices, seasons and distances are indicative; verify before booking.
      </p>
    </div>
  )
}
