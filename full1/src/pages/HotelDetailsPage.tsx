import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  BedDouble,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Expand,
  IndianRupee,
  MapPin,
  ShieldCheck,
  Star,
  Users,
  X,
} from 'lucide-react'
import { hotelsApi, type Hotel, type HotelRoom } from '@/lib/api'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState, ErrorState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { HotelCard, HOTEL_TYPE_LABELS } from '@/components/hotels/HotelCard'
import { HotelMapSection } from '@/components/hotels/HotelMapSection'
import { HotelReviews } from '@/components/hotels/HotelReviews'
import { cn } from '@/lib/utils'
import { addDaysISO, formatINR, nightsBetween, taxFor, todayISO } from '@/lib/formatters'

const inputClass =
  'h-11 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring'

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
            alt={`Hotel photo ${index + 1}`}
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
              className="absolute left-2 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => setIndex((i) => (i + 1) % images.length)}
              aria-label="Next photo"
              className="absolute right-2 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}
      </div>
    </motion.div>
  )
}

export function HotelDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [hotel, setHotel] = useState<(Hotel & { similar: Hotel[] }) | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [galleryOpen, setGalleryOpen] = useState(false)
  const [galleryStart, setGalleryStart] = useState(0)

  const [selectedRoomId, setSelectedRoomId] = useState<string>('')
  const [checkIn, setCheckIn] = useState(todayISO())
  const [checkOut, setCheckOut] = useState(addDaysISO(todayISO(), 1))
  const [guests, setGuests] = useState(2)

  const load = useCallback(() => {
    if (!id) return
    setLoading(true)
    setError(false)
    hotelsApi
      .get(id)
      .then((res) => {
        setHotel(res.data)
        const firstRoom = res.data.rooms?.[0]
        if (firstRoom) setSelectedRoomId((prev) => prev || firstRoom.id)
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  const selectedRoom: HotelRoom | undefined = useMemo(
    () => hotel?.rooms?.find((r) => r.id === selectedRoomId) ?? hotel?.rooms?.[0],
    [hotel, selectedRoomId],
  )

  const nights = Math.max(0, nightsBetween(checkIn, checkOut))
  const baseTotal = selectedRoom ? selectedRoom.pricePerNight * nights : 0
  const taxes = taxFor(baseTotal)

  const startBooking = () => {
    if (!hotel || !selectedRoom) return
    navigate(
      `/hotels/book?hotelId=${hotel.id}&roomId=${selectedRoom.id}&checkIn=${checkIn}&checkOut=${checkOut}&guests=${guests}`,
    )
  }

  if (loading) {
    return (
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 pt-24 pb-8 sm:px-6 md:pt-28">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-[380px] w-full rounded-2xl" />
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="flex flex-col gap-4">
            <Skeleton className="h-10 w-2/3" />
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-32 w-full rounded-2xl" />
            <Skeleton className="h-40 w-full rounded-2xl" />
          </div>
          <Skeleton className="h-96 w-full rounded-2xl" />
        </div>
      </div>
    )
  }

  if (error || !hotel) {
    return (
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 pt-24 pb-16 sm:px-6 md:pt-28">
        <ErrorState
          title="Could not load this stay"
          message="It may have been removed, or you may have followed an old link."
          onRetry={load}
        />
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => navigate('/hotels')}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Browse all hotels
          </Button>
        </div>
      </div>
    )
  }

  const gallery = [hotel.image, ...hotel.gallery].filter(Boolean)

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 pt-24 pb-6 sm:px-6 md:pt-28">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground"
      >
        <Link to="/hotels" className="inline-flex items-center gap-1 font-medium text-foreground hover:text-primary">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Hotels
        </Link>
        <span aria-hidden="true">/</span>
        <Link to={`/destinations/${hotel.destination.slug}`} className="hover:text-primary">
          {hotel.destination.name}
        </Link>
        <span aria-hidden="true">/</span>
        <span className="truncate font-medium text-foreground">{hotel.name}</span>
      </motion.div>

      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="flex flex-col gap-4"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="glass" className="bg-primary/15 text-primary">{HOTEL_TYPE_LABELS[hotel.hotelType] ?? hotel.hotelType}</Badge>
              {hotel.starRating > 0 && (
                <span className="flex items-center gap-0.5 text-amber-400" aria-label={`${hotel.starRating} star`}>
                  {'★'.repeat(Math.min(hotel.starRating, 5))}
                </span>
              )}
              <span className="flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-secondary-foreground">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />
                {hotel.rating > 0 ? hotel.rating.toFixed(1) : 'New'}
                {hotel.reviewsCount > 0 && <span className="font-normal">({hotel.reviewsCount})</span>}
              </span>
            </div>
            <h1 className="font-serif text-3xl font-bold text-foreground md:text-4xl">{hotel.name}</h1>
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 text-primary" aria-hidden="true" />
              {hotel.location}, {hotel.destination.name}
            </p>
            {hotel.tagline && <p className="max-w-2xl text-sm text-foreground/80">{hotel.tagline}</p>}
          </div>
          <div className="flex flex-col items-end gap-1">
            {hotel.priceFrom > 0 && (
              <p className="text-right text-sm text-muted-foreground">
                from <span className="text-2xl font-bold text-primary">{formatINR(hotel.priceFrom)}</span>
                <span className="text-xs"> / night</span>
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {gallery.slice(0, 4).map((src, i) => (
            <button
              key={i}
              type="button"
              onClick={() => { setGalleryStart(i); setGalleryOpen(true) }}
              className={cn(
                'group relative overflow-hidden rounded-2xl ring-1 ring-border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                i === 0 ? 'sm:col-span-2 sm:row-span-2' : '',
              )}
              aria-label={`View photo ${i + 1}`}
            >
              <img
                src={src}
                alt={`${hotel.name} photo ${i + 1}`}
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
            <h2 className="font-serif text-2xl font-semibold text-foreground md:text-3xl">About this stay</h2>
            <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground md:text-base">{hotel.longDescription || hotel.description}</p>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="glass-strong flex flex-col gap-1 rounded-2xl p-4 shadow-sm">
                <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  <Clock className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                  Check-in / out
                </span>
                <span className="text-sm font-semibold text-foreground">
                  {hotel.checkIn} / {hotel.checkOut}
                </span>
              </div>
              <div className="glass-strong flex flex-col gap-1 rounded-2xl p-4 shadow-sm">
                <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  <Users className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                  Guests
                </span>
                <span className="text-sm font-semibold text-foreground">
                  {selectedRoom ? `Up to ${selectedRoom.maxGuests}` : '—'}
                </span>
              </div>
              <div className="glass-strong flex flex-col gap-1 rounded-2xl p-4 shadow-sm">
                <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  <MapPin className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                  Distance
                </span>
                <span className="text-sm font-semibold text-foreground">
                  {hotel.distanceFromAttraction > 0 ? `${hotel.distanceFromAttraction} km` : '—'}
                </span>
              </div>
              <div className="glass-strong flex flex-col gap-1 rounded-2xl p-4 shadow-sm">
                <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  <ShieldCheck className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                  Cancellation
                </span>
                <span className="text-sm font-semibold text-foreground">{hotel.cancellationPolicy || '—'}</span>
              </div>
            </div>

            {hotel.amenities.length > 0 && (
              <div className="flex flex-col gap-3 rounded-2xl bg-card p-5 shadow-sm ring-1 ring-border">
                <h3 className="font-serif text-lg font-semibold text-card-foreground">Amenities</h3>
                <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {hotel.amenities.map((amenity) => (
                    <li key={amenity} className="flex items-center gap-2 text-sm text-foreground/80">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Check className="h-3 w-3" aria-hidden="true" />
                      </span>
                      {amenity}
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
            <h2 className="flex items-center gap-2 font-serif text-2xl font-semibold text-foreground md:text-3xl">
              <BedDouble className="h-6 w-6 text-primary" aria-hidden="true" />
              Rooms &amp; suites
            </h2>
            {!hotel.rooms || hotel.rooms.length === 0 ? (
              <EmptyState
                icon={BedDouble}
                title="Rooms coming soon"
                message="This stay has not published room rates yet. Please check back shortly."
              />
            ) : (
              <ul className="flex flex-col gap-3">
                {hotel.rooms.map((room) => (
                  <li
                    key={room.id}
                    className={cn(
                      'flex flex-col gap-3 rounded-2xl bg-card p-4 shadow-sm ring-1 ring-border transition-all sm:flex-row',
                      selectedRoom?.id === room.id && 'ring-2 ring-primary',
                    )}
                  >
                    <img
                      src={room.images[0] || hotel.image}
                      alt={room.name}
                      loading="lazy"
                      className="h-40 w-full shrink-0 rounded-xl object-cover sm:h-auto sm:w-48"
                    />
                    <div className="flex min-w-0 flex-1 flex-col gap-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="font-serif text-lg font-semibold text-card-foreground">{room.name}</h3>
                        <p className="text-right">
                          <span className="text-xl font-bold text-primary">{formatINR(room.pricePerNight)}</span>
                          <span className="text-xs text-muted-foreground"> / night</span>
                        </p>
                      </div>
                      <p className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" aria-hidden="true" />
                          Up to {room.maxGuests} guests
                        </span>
                        <span className="flex items-center gap-1">
                          <BedDouble className="h-3.5 w-3.5" aria-hidden="true" />
                          {room.bedType}
                        </span>
                        <span>{room.totalRooms} room{room.totalRooms === 1 ? '' : 's'}</span>
                      </p>
                      {room.description && (
                        <p className="text-sm leading-relaxed text-muted-foreground">{room.description}</p>
                      )}
                      {room.amenities.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {room.amenities.map((a) => (
                            <span key={a} className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
                              {a}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="mt-auto flex justify-end pt-2 sm:justify-start">
                        <Button
                          size="sm"
                          variant={selectedRoom?.id === room.id ? 'primary' : 'outline'}
                          onClick={() => setSelectedRoomId(room.id)}
                        >
                          {selectedRoom?.id === room.id && <Check className="h-4 w-4" aria-hidden="true" />}
                          {selectedRoom?.id === room.id ? 'Selected' : 'Select room'}
                        </Button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </motion.section>

          <HotelMapSection hotel={hotel} />

          <HotelReviews hotelId={hotel.id} hotelName={hotel.name} />
        </div>

        <aside className="lg:sticky lg:top-24">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15, ease: 'easeOut' }}
            className="flex flex-col gap-4 rounded-2xl bg-card p-5 shadow-lg ring-1 ring-border"
          >
            <h3 className="font-serif text-lg font-semibold text-card-foreground">Reserve your stay</h3>

            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1">
                <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                  <CalendarDays className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                  Check-in
                </span>
                <input
                  type="date"
                  min={todayISO()}
                  value={checkIn}
                  onChange={(e) => {
                    setCheckIn(e.target.value)
                    if (nightsBetween(e.target.value, checkOut) < 1) setCheckOut(addDaysISO(e.target.value, 1))
                  }}
                  className={inputClass}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                  <CalendarDays className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                  Check-out
                </span>
                <input
                  type="date"
                  min={addDaysISO(checkIn, 1)}
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                  className={inputClass}
                />
              </label>
            </div>

            <label className="flex flex-col gap-1">
              <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                <Users className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                Guests
              </span>
              <select
                value={guests}
                onChange={(e) => setGuests(Number(e.target.value))}
                className={inputClass}
              >
                {Array.from({ length: Math.max(selectedRoom?.maxGuests ?? 4, 4) }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>{n} guest{n > 1 ? 's' : ''}</option>
                ))}
              </select>
            </label>

            <div className="flex flex-col gap-2 rounded-xl bg-secondary p-4 text-sm">
              <div className="flex justify-between text-secondary-foreground">
                <span>
                  {selectedRoom?.name ?? 'Select a room'} × {nights} night{nights === 1 ? '' : 's'}
                </span>
                <span>{formatINR(baseTotal)}</span>
              </div>
              <div className="flex justify-between text-secondary-foreground">
                <span>GST (18%)</span>
                <span>{formatINR(taxes)}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-2 text-base font-bold text-foreground">
                <span>Total</span>
                <span>{formatINR(baseTotal + taxes)}</span>
              </div>
              {nights === 0 && (
                <p className="text-xs font-medium text-red-500">Check-out must be after check-in.</p>
              )}
              {guests > (selectedRoom?.maxGuests ?? 99) && (
                <p className="text-xs font-medium text-red-500">
                  This room fits up to {selectedRoom?.maxGuests} guests.
                </p>
              )}
            </div>

            <Button
              onClick={startBooking}
              disabled={!selectedRoom || nights < 1 || guests > (selectedRoom?.maxGuests ?? 99)}
              size="lg"
            >
              Reserve
            </Button>
            <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              Free cancellation as per policy · Pay securely at checkout
            </p>
          </motion.div>
        </aside>
      </div>

      {hotel.similar && hotel.similar.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h2 className="font-serif text-2xl font-semibold text-foreground md:text-3xl">
              Similar stays nearby
            </h2>
            <Link to={`/hotels?destination=${hotel.destination.slug}`} className="text-sm font-semibold text-primary hover:underline">
              See all in {hotel.destination.name}
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {hotel.similar.slice(0, 3).map((h, i) => (
              <HotelCard key={h.id} hotel={h} index={i} />
            ))}
          </div>
        </motion.section>
      )}

      <p className="flex items-center justify-center gap-1.5 pt-2 text-xs text-muted-foreground">
        <IndianRupee className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
        All prices include applicable taxes. Final amount confirmed at checkout.
      </p>
    </div>
  )
}
