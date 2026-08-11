import { useState, type FormEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CalendarDays, Users, Phone, IndianRupee, MessageSquare, User, Mail, RefreshCw, CreditCard } from 'lucide-react'
import { bookingApi } from '@/lib/api'
import { initiatePayment } from '@/lib/payment'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { Button } from '@/components/ui/Button'
import { SmartImage } from '@/components/ui/SmartImage'
import { cn } from '@/lib/utils'

interface BookingModalProps {
  destination: {
    id: string
    name: string
    image: string
    priceFrom: number
  }
  open: boolean
  onClose: () => void
}

interface FormErrors {
  fullName?: string
  email?: string
  phone?: string
  numberOfTravelers?: string
  travelDate?: string
  budget?: string
}

export function BookingModal({ destination, open, onClose }: BookingModalProps) {
  const { user } = useAuth()
  const toast = useToast()
  const [fullName, setFullName] = useState(user?.name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [phone, setPhone] = useState('')
  const [numberOfTravelers, setNumberOfTravelers] = useState(1)
  const [travelDate, setTravelDate] = useState('')
  const [returnDate, setReturnDate] = useState('')
  const [budget, setBudget] = useState(destination.priceFrom.toString())
  const [specialRequests, setSpecialRequests] = useState('')
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [paying, setPaying] = useState(false)
  const [paymentFailed, setPaymentFailed] = useState(false)
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const [paymentBookingId, setPaymentBookingId] = useState<string | null>(null)

  const validate = (): FormErrors => {
    const errs: FormErrors = {}
    if (!fullName.trim()) errs.fullName = 'Full name is required'
    if (!email.trim()) errs.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Invalid email address'
    if (!phone.trim()) errs.phone = 'Phone number is required'
    else if (!/^\+?[\d\s\-()]{7,15}$/.test(phone.trim())) errs.phone = 'Invalid phone number'
    if (!numberOfTravelers || numberOfTravelers < 1) errs.numberOfTravelers = 'At least 1 traveler required'
    if (!travelDate) errs.travelDate = 'Travel date is required'
    else {
      const selected = new Date(travelDate)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      if (selected < today) errs.travelDate = 'Travel date cannot be in the past'
    }
    if (returnDate && travelDate) {
      const travel = new Date(travelDate)
      const returnD = new Date(returnDate)
      if (returnD < travel) {
        errs.travelDate = 'Return date cannot be before travel date'
      }
    }
    if (!budget || Number(budget) <= 0) errs.budget = 'Budget must be greater than 0'
    return errs
  }

  const runPayment = async (bookingId: string, isRetry: boolean) => {
    setPaying(true)
    setPaymentError(null)
    setPaymentFailed(false)
    try {
      const result = await initiatePayment({
        bookingId,
        name: fullName.trim(),
        email: email.trim(),
        contact: phone.trim(),
        isRetry,
      })

      if (result.status === 'success') {
        const booking = result.booking
        const amount = booking.amount ?? booking.budget
        const successMsg = `Payment of \u20B9${amount.toLocaleString()} successful! Booking ${booking.bookingId} confirmed.`
        setSuccess(successMsg)
        toast.success(successMsg)
        setTimeout(() => {
          onClose()
          window.location.href = '/my-bookings'
        }, 1800)
      } else if (result.status === 'failed') {
        setPaymentFailed(true)
        setPaymentError(result.error ?? 'Payment failed. Please try again.')
        toast.error('Payment failed. You can retry now or from My Bookings.')
      } else {
        setPaymentFailed(true)
        setPaymentError('Payment was not completed. You can retry now or from My Bookings.')
        toast.info('Payment was not completed')
      }
    } catch (err) {
      setPaymentFailed(true)
      setPaymentError(err instanceof Error ? err.message : 'Payment could not be started. Please try again.')
      toast.error(err instanceof Error ? err.message : 'Payment could not be started.')
    } finally {
      setPaying(false)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitError(null)
    setSuccess(null)
    setPaymentFailed(false)
    setPaymentError(null)

    const validationErrors = validate()
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) return

    setSubmitting(true)
    try {
      const body: {
        destinationId: string
        fullName: string
        email: string
        phone: string
        numberOfTravelers: number
        travelDate: string
        budget: number
        returnDate?: string
        specialRequests?: string
      } = {
        destinationId: destination.id,
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        numberOfTravelers,
        travelDate: new Date(travelDate).toISOString(),
        budget: Number(budget),
      }
      if (returnDate) body.returnDate = new Date(returnDate).toISOString()
      if (specialRequests.trim()) body.specialRequests = specialRequests.trim()

      const res = await bookingApi.create(body)
      const bookingId = res.data.bookingId
      setPaymentBookingId(bookingId)
      await runPayment(bookingId, false)
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      setSubmitError(errMsg)
      toast.error(errMsg)
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!submitting && !paying) {
      setErrors({})
      setSubmitError(null)
      setSuccess(null)
      setPaymentFailed(false)
      setPaymentError(null)
      setPaymentBookingId(null)
      onClose()
    }
  }

  const todayStr = new Date().toISOString().split('T')[0]

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="booking-modal-title"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={handleClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col overflow-y-auto rounded-2xl bg-card shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 id="booking-modal-title" className="font-serif text-xl font-bold text-card-foreground">Reserve Your Journey</h2>
              <button
                onClick={handleClose}
                disabled={submitting || paying}
                aria-label="Close booking dialog"
                className="press flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="flex items-center gap-3 border-b border-border px-6 py-3">
              <SmartImage
                src={destination.image}
                alt={destination.name}
                className="h-12 w-12 shrink-0 rounded-lg"
              />
              <div>
                <p className="font-semibold text-foreground">{destination.name}</p>
                <p className="text-sm text-muted-foreground">
                  From {'\u20B9'}{destination.priceFrom.toLocaleString()} / person
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-6 py-5">
              {success && (
                <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
                  {success}
                </div>
              )}

              {submitError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {submitError}
                </div>
              )}

              {paymentFailed && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  <p className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4" aria-hidden="true" />
                    {paymentError ?? 'Payment failed. Please try again.'}
                  </p>
                  {paymentBookingId && (
                    <div className="mt-3 flex flex-col gap-2">
                      <Button
                        type="button"
                        size="sm"
                        disabled={paying}
                        onClick={() => runPayment(paymentBookingId, true)}
                        className="w-full"
                      >
                        <CreditCard className="h-4 w-4" />
                        {paying ? 'Processing Payment...' : 'Retry Payment'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={paying}
                        onClick={() => {
                          onClose()
                          window.location.href = '/my-bookings'
                        }}
                        className="w-full"
                      >
                        Go to My Bookings
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {paying && !success && (
                <div className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700">
                  <CreditCard className="h-4 w-4 animate-pulse" aria-hidden="true" />
                  Processing payment... Please complete the Razorpay checkout.
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="booking-fullName" className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    Full Name
                  </label>
                  <input
                    id="booking-fullName"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => { setFullName(e.target.value); setErrors((prev) => ({ ...prev, fullName: undefined })) }}
                    className={cn(
                      'h-11 w-full rounded-xl border bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                      errors.fullName ? 'border-red-500' : 'border-input',
                    )}
                    placeholder="Your full name"
                  />
                  {errors.fullName && <p className="text-xs text-red-500">{errors.fullName}</p>}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="booking-email" className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                    Email
                  </label>
                  <input
                    id="booking-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setErrors((prev) => ({ ...prev, email: undefined })) }}
                    className={cn(
                      'h-11 w-full rounded-xl border bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                      errors.email ? 'border-red-500' : 'border-input',
                    )}
                    placeholder="you@example.com"
                  />
                  {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="booking-phone" className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                  Phone Number
                </label>
                <input
                  id="booking-phone"
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => { setPhone(e.target.value); setErrors((prev) => ({ ...prev, phone: undefined })) }}
                  className={cn(
                    'h-11 w-full rounded-xl border bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                    errors.phone ? 'border-red-500' : 'border-input',
                  )}
                  placeholder="+91 98765 43210"
                />
                {errors.phone && <p className="text-xs text-red-500">{errors.phone}</p>}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="booking-travelers" className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                    Number of Travelers
                  </label>
                  <input
                    id="booking-travelers"
                    type="number"
                    required
                    min={1}
                    value={numberOfTravelers}
                    onChange={(e) => { setNumberOfTravelers(Number(e.target.value)); setErrors((prev) => ({ ...prev, numberOfTravelers: undefined })) }}
                    className={cn(
                      'h-11 w-full rounded-xl border bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                      errors.numberOfTravelers ? 'border-red-500' : 'border-input',
                    )}
                  />
                  {errors.numberOfTravelers && <p className="text-xs text-red-500">{errors.numberOfTravelers}</p>}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="booking-budget" className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                    <IndianRupee className="h-3.5 w-3.5 text-muted-foreground" />
                    Estimated Budget
                  </label>
                  <input
                    id="booking-budget"
                    type="number"
                    required
                    min={1}
                    value={budget}
                    onChange={(e) => { setBudget(e.target.value); setErrors((prev) => ({ ...prev, budget: undefined })) }}
                    className={cn(
                      'h-11 w-full rounded-xl border bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                      errors.budget ? 'border-red-500' : 'border-input',
                    )}
                  />
                  {errors.budget && <p className="text-xs text-red-500">{errors.budget}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="booking-travelDate" className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                    <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                    Travel Date
                  </label>
                  <input
                    id="booking-travelDate"
                    type="date"
                    required
                    min={todayStr}
                    value={travelDate}
                    onChange={(e) => { setTravelDate(e.target.value); setErrors((prev) => ({ ...prev, travelDate: undefined })) }}
                    onClick={(e) => {
                      try {
                        e.currentTarget.showPicker();
                      } catch (err) {
                        // ignore if showPicker is not supported
                      }
                    }}
                    className={cn(
                      'h-11 w-full rounded-xl border bg-background px-4 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                      errors.travelDate ? 'border-red-500' : 'border-input',
                    )}
                  />
                  {errors.travelDate && <p className="text-xs text-red-500">{errors.travelDate}</p>}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="booking-returnDate" className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                    <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                    Return Date <span className="text-xs text-muted-foreground">(optional)</span>
                  </label>
                  <input
                    id="booking-returnDate"
                    type="date"
                    min={travelDate || todayStr}
                    value={returnDate}
                    onChange={(e) => setReturnDate(e.target.value)}
                    onClick={(e) => {
                      try {
                        e.currentTarget.showPicker();
                      } catch (err) {
                        // ignore if showPicker is not supported
                      }
                    }}
                    className="h-11 w-full rounded-xl border border-input bg-background px-4 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="booking-requests" className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                  <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                  Special Requests <span className="text-xs text-muted-foreground">(optional)</span>
                </label>
                <textarea
                  id="booking-requests"
                  rows={3}
                  value={specialRequests}
                  onChange={(e) => setSpecialRequests(e.target.value)}
                  className="h-20 w-full resize-none rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  placeholder="Any special requirements or preferences..."
                />
              </div>

              <Button type="submit" size="lg" disabled={submitting || paying || success !== null} className="w-full">
                {submitting
                  ? 'Confirming Booking...'
                  : paying
                  ? 'Processing Payment...'
                  : success
                  ? 'Booking Confirmed!'
                  : 'Confirm Booking & Pay'}
              </Button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
