import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BedDouble, CalendarDays, Check, Search, SearchX, XCircle } from 'lucide-react'
import { hotelsApi, type HotelBookingResult } from '@/lib/api'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { useToast } from '@/context/ToastContext'
import { cn } from '@/lib/utils'
import { formatDate, formatINR } from '@/lib/formatters'
import { HOTEL_BOOKING_STATUS_LABELS } from '@/pages/HotelConfirmationPage'

const STATUSES = ['ALL', 'PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'] as const

export function AdminHotelBookingsPage() {
  const toast = useToast()
  const [bookings, setBookings] = useState<HotelBookingResult[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<(typeof STATUSES)[number]>('ALL')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const fetchBookings = useCallback(() => {
    setLoading(true)
    setError(null)
    hotelsApi
      .adminBookings({ page, limit: 20, status, search: search.trim() || undefined })
      .then((res) => {
        const items = Array.isArray(res.data) ? res.data : []
        setBookings(items)
        setTotal(res.meta?.total ?? items.length)
        setTotalPages(res.meta?.totalPages ?? 1)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load bookings'))
      .finally(() => setLoading(false))
  }, [page, status, search])

  useEffect(() => {
    fetchBookings()
  }, [fetchBookings])

  const handleStatus = async (booking: HotelBookingResult, nextStatus: string) => {
    setUpdatingId(booking.id)
    try {
      await hotelsApi.updateBookingStatus(booking.id, nextStatus)
      toast.success(`Booking ${booking.bookingId} marked ${nextStatus.toLowerCase()}`)
      fetchBookings()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update booking')
    } finally {
      setUpdatingId(null)
    }
  }

  const statusColor: Record<string, string> = {
    PENDING: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
    CONFIRMED: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
    CANCELLED: 'bg-red-500/15 text-red-600 dark:text-red-400',
    COMPLETED: 'bg-sky-500/15 text-sky-600 dark:text-sky-400',
  }

  return (
    <div>
      <AdminPageHeader
        title="Hotel Bookings"
        subtitle={`${total} hotel booking${total === 1 ? '' : 's'}`}
      />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search
            className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search by booking ID, name, hotel..."
            aria-label="Search hotel bookings"
            className="h-10 w-full rounded-full border border-border bg-card pr-4 pl-10 text-sm shadow-sm placeholder:text-muted-foreground focus:border-primary/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          />
        </div>
        <div className="flex items-center gap-1 overflow-x-auto rounded-full bg-secondary p-1" role="group" aria-label="Filter by status">
          {STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => { setStatus(s); setPage(1) }}
              aria-pressed={status === s}
              className={cn(
                'press shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                status === s ? 'bg-card text-card-foreground shadow-sm' : 'text-secondary-foreground hover:text-foreground',
              )}
            >
              {s === 'ALL' ? 'All' : HOTEL_BOOKING_STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3, 4, 5].map((n) => (
            <Skeleton key={n} className="h-24 w-full rounded-2xl" />
          ))}
        </div>
      ) : error ? (
        <EmptyState icon={SearchX} title="Could not load bookings" message={error} actionLabel="Try again" onAction={fetchBookings} />
      ) : bookings.length === 0 ? (
        <EmptyState
          icon={BedDouble}
          title="No hotel bookings found"
          message="Hotel bookings will appear here when travellers reserve stays."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {bookings.map((booking) => (
            <div key={booking.id} className="glass-strong flex flex-col gap-3 rounded-2xl p-4 shadow-sm ring-1 ring-border lg:flex-row lg:items-center">
              <Link to={`/hotels/${booking.hotel.slug || booking.hotel.id}`} className="shrink-0">
                <img src={booking.hotel.image} alt={booking.hotel.name} loading="lazy" className="h-20 w-full rounded-xl object-cover lg:h-20 lg:w-32" />
              </Link>
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <Link to={`/hotels/${booking.hotel.slug || booking.hotel.id}`} className="line-clamp-1 font-serif text-base font-semibold text-foreground hover:text-primary">
                    {booking.hotel.name}
                  </Link>
                  <span className={cn('flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold', statusColor[booking.status] ?? 'bg-secondary text-secondary-foreground')}>
                    {HOTEL_BOOKING_STATUS_LABELS[booking.status] ?? booking.status}
                  </span>
                </div>
                <p className="text-sm font-medium text-foreground">
                  {booking.fullName} · {booking.bookingId} · {booking.room.name}
                </p>
                <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                    {formatDate(booking.checkIn)} → {formatDate(booking.checkOut)}
                  </span>
                  <span>{booking.guests} guests · {booking.nights} nights</span>
                  <span className="font-semibold text-foreground">{formatINR(booking.amount)}</span>
                  <span className="truncate">{booking.email}</span>
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                {booking.status === 'PENDING' && (
                  <Button size="sm" disabled={updatingId === booking.id} onClick={() => handleStatus(booking, 'CONFIRMED')}>
                    <Check className="h-4 w-4" aria-hidden="true" />
                    Confirm
                  </Button>
                )}
                {booking.status !== 'CANCELLED' && booking.status !== 'COMPLETED' && (
                  <Button size="sm" variant="outline" disabled={updatingId === booking.id} onClick={() => handleStatus(booking, 'CANCELLED')} className="text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40">
                    <XCircle className="h-4 w-4" aria-hidden="true" />
                    Cancel
                  </Button>
                )}
                {booking.status === 'CONFIRMED' && (
                  <Button size="sm" variant="outline" disabled={updatingId === booking.id} onClick={() => handleStatus(booking, 'COMPLETED')}>
                    <Check className="h-4 w-4" aria-hidden="true" />
                    Complete
                  </Button>
                )}
              </div>
            </div>
          ))}

          {totalPages > 1 && (
            <nav className="mt-2 flex items-center justify-center gap-2" aria-label="Pagination">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </nav>
          )}
        </div>
      )}
    </div>
  )
}
