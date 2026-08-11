import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  Ban,
  CalendarDays,
  CalendarRange,
  CreditCard,
  ExternalLink,
  IndianRupee,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  RefreshCw,
  User,
  Users,
} from 'lucide-react'
import { bookingApi, type BookingResult } from '@/lib/api'
import { initiatePayment } from '@/lib/payment'
import { useToast } from '@/context/ToastContext'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { SmartImage } from '@/components/ui/SmartImage'
import { NotFoundPage } from '@/pages/NotFoundPage'

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

export function BookingDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const toast = useToast()
  const [booking, setBooking] = useState<BookingResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [paying, setPaying] = useState(false)

  const fetchBooking = () => {
    if (!id) return
    setLoading(true)
    setError(null)
    setNotFound(false)
    bookingApi
      .getById(id)
      .then((res) => setBooking(res.data))
      .catch((err) => {
        if (err instanceof Error && /not found/i.test(err.message)) {
          setNotFound(true)
        } else {
          setError(err instanceof Error ? err.message : 'Failed to load booking')
        }
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchBooking()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const handleCancel = async () => {
    if (!booking) return
    setCancelling(true)
    try {
      await bookingApi.cancel(booking.id)
      setBooking({ ...booking, status: 'CANCELLED' })
      toast.success('Booking cancelled successfully')
      setShowCancelModal(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to cancel booking')
    } finally {
      setCancelling(false)
    }
  }

  const handleRetryPayment = async () => {
    if (!booking) return
    setPaying(true)
    try {
      const result = await initiatePayment({
        bookingId: booking.bookingId,
        name: booking.fullName,
        email: booking.email,
        contact: booking.phone,
        isRetry: true,
      })
      if (result.status === 'success') {
        setBooking(result.booking)
        toast.success(`Payment successful! Booking ${result.booking.bookingId} is confirmed.`)
      } else if (result.status === 'failed') {
        toast.error(result.error ?? 'Payment failed. Please try again.')
        fetchBooking()
      } else {
        toast.info('Payment was not completed.')
        fetchBooking()
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to start payment.')
    } finally {
      setPaying(false)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 pt-28 pb-20 md:px-6 md:pt-32">
        <div className="flex flex-col gap-6">
          <Skeleton className="h-8 w-64" />
          <div className="flex flex-col gap-4 rounded-2xl bg-card p-5 ring-1 ring-border md:flex-row md:gap-6">
            <Skeleton className="h-40 w-full rounded-xl md:w-56" />
            <div className="flex flex-1 flex-col gap-4">
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-28 w-full" />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[1, 2].map((n) => (
              <Skeleton key={n} className="h-40 w-full rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (notFound || (!loading && !error && !booking)) {
    return <NotFoundPage />
  }

  if (error && !booking) {
    return (
      <div className="mx-auto max-w-5xl px-4 pt-28 pb-20 md:px-6 md:pt-32">
        <div className="mt-16 flex flex-col items-center justify-center gap-4 rounded-2xl border border-red-200 bg-red-50/50 p-8 text-center dark:border-red-900/50 dark:bg-red-950/20">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40">
            <RefreshCw className="h-6 w-6 text-red-500" />
          </span>
          <p className="text-lg font-medium text-red-700 dark:text-red-300">{error}</p>
          <Button onClick={fetchBooking} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4" />
            Try again
          </Button>
        </div>
      </div>
    )
  }

  if (!booking) return null

  const canCancel = booking.status === 'PENDING' || booking.status === 'CONFIRMED'

  const details: Array<{ icon: typeof CalendarDays; label: string; value: string }> = [
    { icon: User, label: 'Full Name', value: booking.fullName },
    { icon: Mail, label: 'Email', value: booking.email },
    { icon: Phone, label: 'Phone', value: booking.phone },
    { icon: Users, label: 'Travelers', value: `${booking.numberOfTravelers} traveler${booking.numberOfTravelers > 1 ? 's' : ''}` },
    {
      icon: CalendarDays,
      label: 'Travel Date',
      value: formatDate(booking.travelDate),
    },
    {
      icon: CalendarRange,
      label: 'Return Date',
      value: booking.returnDate ? formatDate(booking.returnDate) : 'Not specified',
    },
    {
      icon: IndianRupee,
      label: 'Estimated Budget',
      value: '\u20B9' + booking.budget.toLocaleString(),
    },
    {
      icon: MapPin,
      label: 'Region',
      value: booking.destination.region ? `${booking.destination.region}, Kerala` : 'Kerala',
    },
  ]

  return (
    <div className="mx-auto min-h-screen max-w-5xl px-4 pt-28 pb-20 md:px-6 md:pt-32">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="flex flex-col gap-3"
      >
        <Link
          to="/my-bookings"
          className="inline-flex w-fit items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to My Bookings
        </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-serif text-3xl font-bold text-foreground md:text-4xl">
              Booking Details
            </h1>
            <Badge
              className={`border px-3 py-1 text-xs font-medium uppercase tracking-wide ${
                statusStyles[booking.status] ?? 'bg-gray-100 text-gray-700'
              }`}
            >
              {booking.status}
            </Badge>
            <Badge
              className={`border px-3 py-1 text-xs font-medium uppercase tracking-wide ${
                paymentStatusStyles[booking.paymentStatus] ?? 'bg-gray-100 text-gray-700'
              }`}
            >
              {booking.paymentStatus}
            </Badge>
          </div>
        <p className="text-muted-foreground">
          Booking ID:{' '}
          <span className="font-mono font-medium text-foreground">{booking.bookingId}</span>
        </p>
      </motion.div>

      {/* Destination hero */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.05, ease: 'easeOut' }}
        className="glass-strong mt-8 flex flex-col gap-4 rounded-2xl p-5 shadow-sm md:flex-row md:items-center md:gap-6"
      >
        <SmartImage
          src={booking.destination.image}
          alt={booking.destination.name}
          className="h-40 w-full rounded-xl md:h-40 md:w-56"
        />
        <div className="flex flex-1 flex-col gap-2">
          <h2 className="font-serif text-xl font-semibold text-foreground md:text-2xl">
            {booking.destination.name}
          </h2>
          {booking.destination.region && (
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" aria-hidden="true" />
              {booking.destination.region}, Kerala
            </p>
          )}
          <p className="text-sm text-muted-foreground">
            Booked on{' '}
            {new Date(booking.createdAt).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Link to={`/destinations/${booking.destination.slug}`}>
              <Button variant="outline" size="sm">
                <ExternalLink className="h-4 w-4" />
                View Destination
              </Button>
            </Link>
            {(booking.paymentStatus === 'PENDING' || booking.paymentStatus === 'FAILED') &&
              (booking.status === 'PENDING' || booking.status === 'CONFIRMED') && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={paying}
                  onClick={handleRetryPayment}
                >
                  <CreditCard className="h-4 w-4" />
                  {paying ? 'Processing...' : 'Retry Payment'}
                </Button>
              )}
            {canCancel && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCancelModal(true)}
                className="text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
              >
                <Ban className="h-4 w-4" />
                Cancel Booking
              </Button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Details grid */}
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {details.map((detail, index) => (
          <motion.div
            key={detail.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 + index * 0.05, ease: 'easeOut' }}
            className="glass flex flex-col gap-1.5 rounded-2xl p-5 shadow-sm"
          >
            <span className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <detail.icon className="h-4 w-4 text-primary" aria-hidden="true" />
              {detail.label}
            </span>
            <span className="text-sm font-semibold text-foreground md:text-base">
              {detail.value}
            </span>
          </motion.div>
        ))}
      </div>

      {/* Payment details */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.35, ease: 'easeOut' }}
        className="glass mt-6 flex flex-col gap-3 rounded-2xl p-5 shadow-sm"
      >
        <span className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <CreditCard className="h-4 w-4 text-primary" aria-hidden="true" />
          Payment Details
        </span>

        {booking.paymentStatus === 'PAID' ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Amount Paid</span>
              <span className="text-sm font-semibold text-foreground">
                {'\u20B9'}{(booking.amount ?? booking.budget).toLocaleString()} {booking.currency ?? 'INR'}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Payment Date</span>
              <span className="text-sm font-semibold text-foreground">
                {booking.paidAt ? formatDate(booking.paidAt) : '—'}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Transaction ID</span>
              <span className="font-mono text-sm font-semibold text-foreground">
                {booking.paymentId ?? '—'}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Method</span>
              <span className="text-sm font-semibold capitalize text-foreground">
                {booking.paymentMethod ?? '—'}
              </span>
            </div>
          </div>
        ) : booking.paymentStatus === 'FAILED' ? (
          <div className="flex flex-col gap-2 rounded-xl border border-red-200 bg-red-50/60 px-4 py-3 text-sm text-red-700 dark:border-red-800/40 dark:bg-red-950/20 dark:text-red-300">
            <span>Payment failed. Please retry to confirm your booking.</span>
            <span className="text-xs">
              Amount due: {'\u20B9'}{(booking.amount ?? booking.budget).toLocaleString()} {booking.currency ?? 'INR'}
            </span>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            This booking has not been paid yet. Amount due:{' '}
            <span className="font-semibold text-foreground">
              {'\u20B9'}{(booking.amount ?? booking.budget).toLocaleString()} {booking.currency ?? 'INR'}
            </span>
          </p>
        )}
      </motion.div>

      {booking.specialRequests && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.35, ease: 'easeOut' }}
          className="glass mt-6 flex flex-col gap-2 rounded-2xl p-5 shadow-sm"
        >
          <span className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <MessageSquare className="h-4 w-4 text-primary" aria-hidden="true" />
            Special Requests
          </span>
          <p className="text-sm leading-relaxed text-foreground">"{booking.specialRequests}"</p>
        </motion.div>
      )}

      {/* Cancelled notice */}
      {(booking.status === 'CANCELLED' || booking.status === 'COMPLETED') && (
        <div className="mt-6 rounded-2xl border border-border bg-card px-5 py-4 text-sm text-muted-foreground">
          {booking.status === 'CANCELLED'
            ? 'This booking has been cancelled and can no longer be modified.'
            : 'This trip has been completed. Thank you for travelling with Triplora!'}
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      <AnimatePresence>
        {showCancelModal && booking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowCancelModal(false)}
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
              <h3 className="font-serif text-xl font-bold text-card-foreground">
                Cancel Booking?
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Are you sure you want to cancel your reservation for{' '}
                <span className="font-semibold text-foreground">
                  {booking.destination.name}
                </span>{' '}
                (ID: <span className="font-mono">{booking.bookingId}</span>)?
              </p>
              <div className="mt-6 flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowCancelModal(false)}>
                  Keep Booking
                </Button>
                <Button
                  variant="outline"
                  disabled={cancelling}
                  onClick={handleCancel}
                  className="bg-red-600 text-white hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800"
                >
                  {cancelling ? 'Cancelling...' : 'Confirm Cancellation'}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}