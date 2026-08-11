import { useEffect, useState } from 'react'
import { CalendarDays, CreditCard, Trash2 } from 'lucide-react'
import { adminApi, type AdminBooking } from '@/lib/api'
import { AdminPageHeader, AdminEmptyState } from '@/components/admin/AdminPageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { ErrorState } from '@/components/ui/EmptyState'
import { SmartImage } from '@/components/ui/SmartImage'
import { useToast } from '@/context/ToastContext'

const bookingStatuses = ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'] as const
const paymentStatuses = ['PENDING', 'PAID', 'FAILED', 'REFUNDED'] as const

const statusStyles: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700/50',
  CONFIRMED: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700/50',
  CANCELLED: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-700/50',
  COMPLETED: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700/50',
}

const paymentStatusStyles: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700/50',
  PAID: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700/50',
  FAILED: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-700/50',
  REFUNDED: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-700/50',
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function BookingsPage() {
  const toast = useToast()
  const [bookings, setBookings] = useState<AdminBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>('')
  const [paymentFilter, setPaymentFilter] = useState<string>('')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchBookings = (status = filter, paymentStatus = paymentFilter) => {
    setLoading(true)
    setError(null)
    adminApi
      .bookings({
        limit: 100,
        ...(status ? { status } : {}),
        ...(paymentStatus ? { paymentStatus } : {}),
      })
      .then((res) => setBookings(res.data))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load bookings'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchBookings('', '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleStatusChange = async (booking: AdminBooking, status: string) => {
    if (status === booking.status) return
    setUpdatingId(booking.id)
    try {
      await adminApi.updateBookingStatus(booking.id, status)
      setBookings((prev) => prev.map((b) => (b.id === booking.id ? { ...b, status } : b)))
      toast.success(`Booking ${booking.bookingId} marked ${status}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update booking status')
    } finally {
      setUpdatingId(null)
    }
  }

  const handleDelete = async (booking: AdminBooking) => {
    if (!window.confirm(`Delete booking ${booking.bookingId} for ${booking.fullName}?`)) return
    setDeletingId(booking.id)
    try {
      await adminApi.deleteBooking(booking.id)
      setBookings((prev) => prev.filter((b) => b.id !== booking.id))
      toast.success('Booking deleted successfully')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete booking')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div>
      <AdminPageHeader title="Bookings" subtitle="Manage customer reservations" />

      <div className="mb-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => { setFilter(''); fetchBookings('', paymentFilter) }}
          className={`press rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            filter === '' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
          }`}
        >
          All
        </button>
        {bookingStatuses.map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => { setFilter(status); fetchBookings(status, paymentFilter) }}
            className={`press rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              filter === status ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            {status}
          </button>
        ))}
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <CreditCard className="h-3.5 w-3.5" aria-hidden="true" />
          Payment
        </span>
        <button
          type="button"
          onClick={() => { setPaymentFilter(''); fetchBookings(filter, '') }}
          className={`press rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
            paymentFilter === '' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
          }`}
        >
          All
        </button>
        {paymentStatuses.map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => { setPaymentFilter(status); fetchBookings(filter, status) }}
            className={`press rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              paymentFilter === status ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="flex items-center gap-4 rounded-2xl bg-card p-4 ring-1 ring-border">
              <Skeleton className="h-16 w-16 rounded-xl" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-8 w-28 rounded-full" />
            </div>
          ))}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={fetchBookings} />
      ) : bookings.length === 0 ? (
        <AdminEmptyState
          icon={<CalendarDays className="h-6 w-6" aria-hidden="true" />}
          title="No bookings found"
          subtitle={filter || paymentFilter ? `No bookings match the selected filters.` : 'Bookings will appear here once customers reserve a trip.'}
        />
      ) : (
        <ul className="flex flex-col divide-y divide-border/60 overflow-hidden rounded-2xl bg-card ring-1 ring-border">
          {bookings.map((booking) => (
            <li key={booking.id} className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center">
              <SmartImage
                src={booking.destination.image}
                alt={booking.destination.name}
                className="h-16 w-16 shrink-0 rounded-xl"
              />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <p className="truncate text-sm font-semibold text-foreground">
                  {booking.destination.name}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {booking.fullName} · {booking.bookingId}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {booking.numberOfTravelers} traveler{booking.numberOfTravelers > 1 ? 's' : ''} ·{' '}
                  {'\u20B9'}{booking.budget.toLocaleString()} ·{' '}
                  {new Date(booking.travelDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
                {booking.paymentStatus === 'PAID' ? (
                  <p className="truncate text-xs text-muted-foreground">
                    Paid {'\u20B9'}{(booking.amount ?? booking.budget).toLocaleString()} {booking.currency ?? 'INR'}
                    {booking.paidAt ? ` · ${formatDate(booking.paidAt)}` : ''}
                    {booking.paymentId ? ` · ${booking.paymentId}` : ''}
                  </p>
                ) : booking.paymentStatus === 'FAILED' ? (
                  <p className="truncate text-xs font-medium text-red-600 dark:text-red-400">
                    Payment failed{booking.orderId ? ` · order ${booking.orderId}` : ''}
                  </p>
                ) : (
                  <p className="truncate text-xs text-muted-foreground">
                    Amount due: {'\u20B9'}{(booking.amount ?? booking.budget).toLocaleString()} {booking.currency ?? 'INR'}
                    {booking.orderId ? ` · order ${booking.orderId}` : ''}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <div className="flex flex-col items-end gap-1.5">
                  <Badge className={`border ${statusStyles[booking.status] ?? ''}`}>{booking.status}</Badge>
                  <Badge className={`border ${paymentStatusStyles[booking.paymentStatus] ?? ''}`}>
                    <CreditCard className="mr-1 h-3 w-3" aria-hidden="true" />
                    {booking.paymentStatus}
                  </Badge>
                </div>
                <select
                  aria-label={`Update status for ${booking.bookingId}`}
                  value={booking.status}
                  disabled={updatingId === booking.id}
                  onChange={(e) => handleStatusChange(booking, e.target.value)}
                  className="h-9 w-32 rounded-full border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
                >
                  {bookingStatuses.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={deletingId === booking.id}
                  onClick={() => handleDelete(booking)}
                  className="text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="sr-only">Delete booking</span>
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}