import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Mail,
  MapPin,
  Phone,
  ReceiptText,
  Star,
  Users,
} from 'lucide-react'
import { hotelsApi, type HotelBookingResult } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { ErrorState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { Badge } from '@/components/ui/Badge'
import { formatDate, formatDateTime, formatINR } from '@/lib/formatters'

export const HOTEL_BOOKING_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  CANCELLED: 'Cancelled',
  COMPLETED: 'Completed',
}

export function HotelConfirmationPage() {
  const { bookingId } = useParams<{ bookingId: string }>()
  const navigate = useNavigate()

  const [booking, setBooking] = useState<HotelBookingResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!bookingId) return
    hotelsApi
      .getBooking(bookingId)
      .then((res) => setBooking(res.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [bookingId])

  if (loading) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 pt-24 pb-14 sm:px-6 md:pt-28">
        <Skeleton className="h-40 w-full rounded-3xl" />
        <Skeleton className="h-64 w-full rounded-3xl" />
      </div>
    )
  }

  if (error || !booking) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 pt-24 pb-16 sm:px-6 md:pt-28">
        <ErrorState
          title="Could not find this booking"
          message="Double-check the link or open My Stays to see your reservations."
          onRetry={() => navigate('/my-stays')}
        />
      </div>
    )
  }

  const cancelled = booking.status === 'CANCELLED'

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pt-24 pb-10 sm:px-6 md:pt-28">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="flex flex-col items-center gap-3 rounded-3xl bg-card p-8 text-center shadow-lg ring-1 ring-border"
      >
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.15, type: 'spring', stiffness: 200, damping: 15 }}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15"
        >
          <CheckCircle2 className="h-9 w-9 text-emerald-500" aria-hidden="true" />
        </motion.span>
        <h1 className="font-serif text-3xl font-bold text-foreground">
          {cancelled ? 'Booking cancelled' : 'Stay reserved!'}
        </h1>
        <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
          {cancelled
            ? 'Your stay was cancelled. We hope to host you again soon.'
            : `Your stay at ${booking.hotel.name} is confirmed. A confirmation has been sent to ${booking.email}.`}
        </p>
        <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
          <Badge className={cancelled ? 'bg-red-500/15 text-red-500' : 'bg-emerald-500/15 text-emerald-500'}>
            <ClipboardCheck className="h-3.5 w-3.5" aria-hidden="true" />
            {booking.bookingId}
          </Badge>
          <Badge>
            <ReceiptText className="h-3.5 w-3.5" aria-hidden="true" />
            {HOTEL_BOOKING_STATUS_LABELS[booking.status] ?? booking.status}
          </Badge>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15, ease: 'easeOut' }}
        className="flex flex-col gap-4 rounded-2xl bg-card p-5 shadow-sm ring-1 ring-border"
      >
        <div className="flex gap-4">
          <img src={booking.hotel.image} alt={booking.hotel.name} className="h-20 w-28 shrink-0 rounded-xl object-cover" />
          <div className="flex min-w-0 flex-col gap-1">
            <Link to={`/hotels/${booking.hotel.slug || booking.hotel.id}`} className="line-clamp-1 font-serif text-lg font-semibold text-foreground hover:text-primary">
              {booking.hotel.name}
            </Link>
            <span className="line-clamp-1 flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
              {booking.hotel.location}
            </span>
            <span className="text-sm font-semibold text-foreground">{booking.room.name} · {booking.room.bedType}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 border-t border-border pt-4 sm:grid-cols-4">
          <div className="flex flex-col gap-1">
            <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              <CalendarDays className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              Check-in
            </span>
            <span className="text-sm font-semibold text-foreground">{formatDate(booking.checkIn)}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              <CalendarDays className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              Check-out
            </span>
            <span className="text-sm font-semibold text-foreground">{formatDate(booking.checkOut)}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              <Users className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              Guests
            </span>
            <span className="text-sm font-semibold text-foreground">
              {booking.guests} · {booking.nights} night{booking.nights === 1 ? '' : 's'}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              <Star className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              Booked on
            </span>
            <span className="text-sm font-semibold text-foreground">{formatDateTime(booking.createdAt)}</span>
          </div>
        </div>

        <div className="flex flex-col gap-2 rounded-xl bg-secondary p-4 text-sm">
          <div className="flex justify-between text-secondary-foreground">
            <span>{booking.room.name} × {booking.nights} night{booking.nights === 1 ? '' : 's'} × {booking.rooms} room{booking.rooms === 1 ? '' : 's'}</span>
            <span>{formatINR(booking.pricePerNight * booking.nights * booking.rooms)}</span>
          </div>
          <div className="flex justify-between text-secondary-foreground">
            <span>GST (18%)</span>
            <span>{formatINR(booking.taxes)}</span>
          </div>
          <div className="flex justify-between border-t border-border pt-2 text-base font-bold text-foreground">
            <span>Total paid</span>
            <span>{formatINR(booking.amount)}</span>
          </div>
        </div>

        {booking.specialRequests && (
          <p className="rounded-xl bg-primary/5 px-4 py-3 text-sm text-primary">
            Special requests: {booking.specialRequests}
          </p>
        )}

        <div className="flex flex-wrap gap-x-5 gap-y-2 border-t border-border pt-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Mail className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            {booking.email}
          </span>
          <span className="flex items-center gap-1.5">
            <Phone className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            {booking.phone}
          </span>
        </div>
      </motion.div>

      <div className="flex flex-wrap justify-center gap-3">
        <Button variant="outline" onClick={() => navigate('/my-stays')}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          View My Stays
        </Button>
        <Button variant="secondary" onClick={() => navigate('/hotels')}>
          Book another stay
        </Button>
      </div>
    </div>
  )
}
