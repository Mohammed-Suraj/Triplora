import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { CalendarDays, MapPin, Users, IndianRupee, ExternalLink, Clock, Ban, AlertCircle, RefreshCw, CreditCard } from 'lucide-react'
import { bookingApi, type BookingResult } from '@/lib/api'
import { initiatePayment } from '@/lib/payment'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { SmartImage } from '@/components/ui/SmartImage'
import { useToast } from '@/context/ToastContext'

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

export function MyBookingsPage() {
  const toast = useToast()
  const [bookings, setBookings] = useState<BookingResult[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [cancelModalBooking, setCancelModalBooking] = useState<BookingResult | null>(null)
  const [payingId, setPayingId] = useState<string | null>(null)

  const fetchBookings = () => {
    setLoading(true)
    setError(null)
    bookingApi
      .list()
      .then((res) => setBookings(res.data))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load bookings'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchBookings()
  }, [])

  const handleCancelBooking = async (id: string) => {
    setCancellingId(id)
    try {
      await bookingApi.cancel(id)
      setBookings((prev) =>
        prev.map((b) => (b.id === id ? { ...b, status: 'CANCELLED' } : b)),
      )
      toast.success('Booking cancelled successfully')
      setCancelModalBooking(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to cancel booking')
    } finally {
      setCancellingId(null)
    }
  }

  const handleRetryPayment = async (booking: BookingResult) => {
    setPayingId(booking.id)
    try {
      const result = await initiatePayment({
        bookingId: booking.bookingId,
        name: booking.fullName,
        email: booking.email,
        contact: booking.phone,
        isRetry: true,
      })
      if (result.status === 'success') {
        const updated = result.booking
        setBookings((prev) => prev.map((b) => (b.id === updated.id ? updated : b)))
        toast.success(`Payment successful! Booking ${updated.bookingId} is confirmed.`)
      } else if (result.status === 'failed') {
        toast.error(result.error ?? 'Payment failed. Please try again.')
        fetchBookings()
      } else {
        toast.info('Payment was not completed.')
        fetchBookings()
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to start payment.')
    } finally {
      setPayingId(null)
    }
  }

  return (
    <div className="mx-auto min-h-screen max-w-5xl px-4 pt-28 pb-20 md:px-6 md:pt-32">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="flex flex-col gap-2"
      >
        <h1 className="font-serif text-3xl font-bold text-foreground md:text-4xl">My Bookings</h1>
        <p className="text-muted-foreground">View and manage your trip reservations</p>
      </motion.div>

      {loading ? (
        <div className="mt-10 flex flex-col gap-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="flex flex-col gap-4 rounded-2xl bg-card p-5 ring-1 ring-border md:flex-row">
              <Skeleton className="h-28 w-full rounded-xl md:w-40" />
              <div className="flex flex-1 flex-col gap-3">
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="mt-16 flex flex-col items-center justify-center gap-4 rounded-2xl border border-red-200 bg-red-50/50 p-8 text-center dark:border-red-900/50 dark:bg-red-950/20">
          <AlertCircle className="h-10 w-10 text-red-500" />
          <p className="text-lg font-medium text-red-700 dark:text-red-300">{error}</p>
          <Button onClick={fetchBookings} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4" />
            Try again
          </Button>
        </div>
      ) : bookings.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            icon={CalendarDays}
            title="No bookings yet"
            message="Start exploring destinations and reserve your dream Kerala trip!"
          >
            <Link to="/explore">
              <Button size="lg">
                Explore Destinations
              </Button>
            </Link>
          </EmptyState>
        </div>
      ) : (
        <div className="mt-10 flex flex-col gap-6">
          {bookings.map((booking, index) => (
            <motion.div
              key={booking.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.05, ease: 'easeOut' }}
              className="glass-strong card-lift flex flex-col gap-4 rounded-2xl p-5 shadow-sm ring-1 ring-border md:flex-row md:items-start md:gap-6"
            >
              <SmartImage
                src={booking.destination.image}
                alt={booking.destination.name}
                className="h-28 w-full rounded-xl md:h-32 md:w-44 md:shrink-0"
              />
              <div className="flex flex-1 flex-col gap-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <Link
                      to={`/bookings/${booking.id}`}
                      className="font-serif text-lg font-semibold text-foreground transition-colors hover:text-primary"
                    >
                      {booking.destination.name}
                    </Link>
                    <p className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                      Booking ID:{' '}
                      <Link
                        to={`/bookings/${booking.id}`}
                        className="font-mono font-medium text-foreground transition-colors hover:text-primary"
                      >
                        {booking.bookingId}
                      </Link>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      className={`border px-3 py-1 text-xs font-medium ${
                        statusStyles[booking.status] ?? 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {booking.status}
                    </Badge>
                    <Badge
                      className={`border px-3 py-1 text-xs font-medium ${
                        paymentStatusStyles[booking.paymentStatus] ?? 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {booking.paymentStatus}
                    </Badge>
                  </div>
                </div>

                <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-foreground">
                  <span className="flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                    {new Date(booking.travelDate).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                    {booking.returnDate && (
                      <> — {new Date(booking.returnDate).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}</>
                    )}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                    {booking.numberOfTravelers} traveler{booking.numberOfTravelers > 1 ? 's' : ''}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <IndianRupee className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                    {'\u20B9'}{booking.budget.toLocaleString()}
                  </span>
                </div>

                {booking.specialRequests && (
                  <p className="text-sm italic text-muted-foreground">
                    "{booking.specialRequests}"
                  </p>
                )}

                {booking.paymentStatus === 'PAID' && (
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5 rounded-xl bg-emerald-50/60 px-3 py-2 text-xs font-medium text-emerald-800 ring-1 ring-emerald-200/60 dark:bg-emerald-900/20 dark:text-emerald-300 dark:ring-emerald-800/40">
                    <span className="flex items-center gap-1.5">
                      <IndianRupee className="h-3 w-3" aria-hidden="true" />
                      Paid {'\u20B9'}{(booking.amount ?? booking.budget).toLocaleString()} {booking.currency ?? 'INR'}
                    </span>
                    {booking.paidAt && (
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-3 w-3" aria-hidden="true" />
                        {formatDate(booking.paidAt)}
                      </span>
                    )}
                    {booking.paymentId && (
                      <span className="font-mono">
                        Tx ID: {booking.paymentId}
                      </span>
                    )}
                  </div>
                )}

                {booking.paymentStatus === 'FAILED' && (
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5 rounded-xl bg-red-50/60 px-3 py-2 text-xs font-medium text-red-700 ring-1 ring-red-200/60 dark:bg-red-900/20 dark:text-red-300 dark:ring-red-800/40">
                    <span>Payment failed. Please retry to confirm your booking.</span>
                  </div>
                )}

                {(booking.paymentStatus === 'PENDING' || booking.paymentStatus === 'FAILED') && (
                  <p className="text-xs text-muted-foreground">
                    Amount due: {'\u20B9'}{(booking.amount ?? booking.budget).toLocaleString()} {booking.currency ?? 'INR'}
                  </p>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/50 pt-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3 w-3" aria-hidden="true" />
                    Booked on{' '}
                    {new Date(booking.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>

                  <div className="flex items-center gap-2">
                    <Link
                      to={`/destinations/${booking.destination.slug}`}
                      className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                    >
                      View Details
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>

                    {(booking.paymentStatus === 'PENDING' || booking.paymentStatus === 'FAILED') &&
                      (booking.status === 'PENDING' || booking.status === 'CONFIRMED') && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={payingId === booking.id}
                          onClick={() => handleRetryPayment(booking)}
                        >
                          <CreditCard className="h-3.5 w-3.5" />
                          {payingId === booking.id ? 'Processing...' : 'Retry Payment'}
                        </Button>
                      )}

                    {(booking.status === 'PENDING' || booking.status === 'CONFIRMED') && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCancelModalBooking(booking)}
                        className="text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                      >
                        <Ban className="h-3.5 w-3.5" />
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      <AnimatePresence>
        {cancelModalBooking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setCancelModalBooking(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              role="dialog"
              aria-modal="true"
              aria-label="Cancel booking confirmation"
              className="relative z-10 w-full max-w-md rounded-2xl bg-card p-6 shadow-xl ring-1 ring-border"
            >
              <h3 className="font-serif text-xl font-bold text-card-foreground">Cancel Booking?</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Are you sure you want to cancel your reservation for{' '}
                <span className="font-semibold text-foreground">{cancelModalBooking.destination.name}</span> (ID:{' '}
                <span className="font-mono">{cancelModalBooking.bookingId}</span>)?
              </p>
              <div className="mt-6 flex justify-end gap-3">
                <Button variant="outline" onClick={() => setCancelModalBooking(null)}>
                  Keep Booking
                </Button>
                <Button
                  variant="outline"
                  disabled={cancellingId === cancelModalBooking.id}
                  onClick={() => handleCancelBooking(cancelModalBooking.id)}
                  className="bg-red-600 text-white hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800"
                >
                  {cancellingId === cancelModalBooking.id ? 'Cancelling...' : 'Confirm Cancellation'}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
