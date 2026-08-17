import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  BedDouble,
  CalendarDays,
  CheckCircle2,
  MapPin,
  ReceiptText,
  TicketX,
  Users,
  XCircle,
} from 'lucide-react'
import { hotelsApi, type HotelBookingResult } from '@/lib/api'
import { useToast } from '@/context/ToastContext'
import { Button } from '@/components/ui/Button'
import { EmptyState, ErrorState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { cn } from '@/lib/utils'
import { formatDate, formatINR } from '@/lib/formatters'
import { HOTEL_BOOKING_STATUS_LABELS } from '@/pages/HotelConfirmationPage'

type Tab = 'upcoming' | 'past' | 'cancelled'

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'past', label: 'Past stays' },
  { id: 'cancelled', label: 'Cancelled' },
]

export function MyStaysPage() {
  const navigate = useNavigate()
  const toast = useToast()

  const [bookings, setBookings] = useState<HotelBookingResult[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [tab, setTab] = useState<Tab>('upcoming')
  const [cancellingId, setCancellingId] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    setError(false)
    hotelsApi
      .myBookings()
      .then((res) => setBookings(res.data.all))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const visible = useMemo(() => {
    if (tab === 'upcoming') return bookings.filter((b) => b.status === 'PENDING' || b.status === 'CONFIRMED')
    if (tab === 'past') return bookings.filter((b) => b.status === 'COMPLETED')
    return bookings.filter((b) => b.status === 'CANCELLED')
  }, [bookings, tab])

  const handleCancel = async (booking: HotelBookingResult) => {
    if (!window.confirm(`Cancel booking ${booking.bookingId} for ${booking.hotel.name}?`)) return
    setCancellingId(booking.id)
    try {
      await hotelsApi.cancelBooking(booking.id)
      toast.success('Stay cancelled successfully')
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not cancel booking')
    } finally {
      setCancellingId(null)
    }
  }

  const statusColor: Record<string, string> = {
    PENDING: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
    CONFIRMED: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
    CANCELLED: 'bg-red-500/15 text-red-600 dark:text-red-400',
    COMPLETED: 'bg-sky-500/15 text-sky-600 dark:text-sky-400',
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 pt-24 pb-10 sm:px-6 md:pt-28">
      <motion.header
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="flex flex-col gap-3"
      >
        <h1 className="flex items-center gap-3 font-serif text-3xl font-bold text-foreground md:text-4xl">
          <BedDouble className="h-8 w-8 text-primary" aria-hidden="true" />
          My Stays
        </h1>
        <p className="text-sm text-muted-foreground">
          Track your hotel reservations, view upcoming trips and revisit past stays.
        </p>

        <div className="mt-1 flex w-fit rounded-full bg-secondary p-1" role="tablist" aria-label="Booking history">
          {TABS.map((t) => {
            const count =
              t.id === 'upcoming'
                ? bookings.filter((b) => b.status === 'PENDING' || b.status === 'CONFIRMED').length
                : t.id === 'past'
                  ? bookings.filter((b) => b.status === 'COMPLETED').length
                  : bookings.filter((b) => b.status === 'CANCELLED').length
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  'rounded-full px-4 py-2 text-sm font-medium transition-colors',
                  tab === t.id ? 'bg-primary text-primary-foreground shadow-sm' : 'text-secondary-foreground hover:text-foreground',
                )}
              >
                {t.label}
                <span className={cn('ml-1.5 text-xs font-semibold', tab === t.id ? 'text-primary-foreground/80' : 'text-muted-foreground')}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </motion.header>

      {loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-36 w-full rounded-2xl" />
          ))}
        </div>
      ) : error ? (
        <ErrorState title="Could not load your stays" onRetry={load} />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={tab === 'upcoming' ? BedDouble : tab === 'past' ? CheckCircle2 : TicketX}
          title={
            tab === 'upcoming'
              ? 'No upcoming stays'
              : tab === 'past'
                ? 'No past stays yet'
                : 'No cancelled bookings'
          }
          message={
            tab === 'upcoming'
              ? 'Find a hotel, resort or homestay that fits your next Kerala escape.'
              : 'Your booking history will appear here.'
          }
          actionLabel={tab === 'upcoming' ? 'Explore hotels' : undefined}
          onAction={tab === 'upcoming' ? () => navigate('/hotels') : undefined}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {visible.map((booking, i) => (
            <motion.li
              key={booking.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: Math.min(i * 0.05, 0.3) }}
              className="flex flex-col gap-3 rounded-2xl bg-card p-4 shadow-sm ring-1 ring-border transition-all hover:shadow-md sm:flex-row sm:items-center"
            >
              <Link to={`/hotels/${booking.hotel.slug || booking.hotel.id}`} className="shrink-0">
                <img
                  src={booking.hotel.image}
                  alt={booking.hotel.name}
                  loading="lazy"
                  className="h-28 w-full rounded-xl object-cover sm:h-24 sm:w-40"
                />
              </Link>
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Link to={`/hotels/${booking.hotel.slug || booking.hotel.id}`} className="line-clamp-1 font-serif text-lg font-semibold text-foreground hover:text-primary">
                    {booking.hotel.name}
                  </Link>
                  <span className={cn('flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold', statusColor[booking.status] ?? 'bg-secondary text-secondary-foreground')}>
                    {booking.status === 'CONFIRMED' && <CheckCircle2 className="h-3 w-3" aria-hidden="true" />}
                    {booking.status === 'CANCELLED' && <XCircle className="h-3 w-3" aria-hidden="true" />}
                    {HOTEL_BOOKING_STATUS_LABELS[booking.status] ?? booking.status}
                  </span>
                </div>
                <p className="line-clamp-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                  {booking.hotel.location}
                </p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                    {formatDate(booking.checkIn)} → {formatDate(booking.checkOut)}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                    {booking.guests} guest{booking.guests === 1 ? '' : 's'} · {booking.nights} night{booking.nights === 1 ? '' : 's'}
                  </span>
                  <span className="flex items-center gap-1.5 font-semibold text-foreground">
                    <ReceiptText className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                    {booking.bookingId} · {formatINR(booking.amount)}
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {(booking.status === 'PENDING' || booking.status === 'CONFIRMED') && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={cancellingId === booking.id}
                    onClick={() => handleCancel(booking)}
                    className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/40"
                  >
                    <XCircle className="h-4 w-4" aria-hidden="true" />
                    {cancellingId === booking.id ? 'Cancelling...' : 'Cancel'}
                  </Button>
                )}
                <Button variant="secondary" size="sm" onClick={() => navigate(`/hotels/bookings/confirmation/${booking.id}`)}>
                  <ReceiptText className="h-4 w-4" aria-hidden="true" />
                  Details
                </Button>
              </div>
            </motion.li>
          ))}
        </ul>
      )}
    </div>
  )
}
