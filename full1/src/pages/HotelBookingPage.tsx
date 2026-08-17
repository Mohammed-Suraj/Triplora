import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  CalendarDays,
  CreditCard,
  IndianRupee,
  Landmark,
  Loader2,
  Lock,
  MapPin,
  Phone,
  ShieldCheck,
  Smartphone,
  Star,
  User,
  Users,
} from 'lucide-react'
import { hotelsApi, type Hotel, type HotelRoom } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { Button } from '@/components/ui/Button'
import { ErrorState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { cn } from '@/lib/utils'
import { formatDate, formatINR, nightsBetween, taxFor } from '@/lib/formatters'

const inputClass =
  'h-11 w-full rounded-xl border border-input bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring'

const PAYMENT_METHODS = [
  { id: 'upi', label: 'UPI', icon: Smartphone, hint: 'GPay, PhonePe, Paytm' },
  { id: 'card', label: 'Card', icon: CreditCard, hint: 'Credit / debit card' },
  { id: 'netbanking', label: 'Net banking', icon: Landmark, hint: 'All major banks' },
]

export function HotelBookingPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const toast = useToast()

  const hotelId = searchParams.get('hotelId') ?? ''
  const roomId = searchParams.get('roomId') ?? ''
  const checkIn = searchParams.get('checkIn') ?? ''
  const checkOut = searchParams.get('checkOut') ?? ''
  const guests = Math.max(1, Number(searchParams.get('guests') ?? 1))

  const [hotel, setHotel] = useState<Hotel | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const [fullName, setFullName] = useState(user?.name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [phone, setPhone] = useState('')
  const [specialRequests, setSpecialRequests] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('upi')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    if (!hotelId) {
      setError(true)
      setLoading(false)
      return
    }
    hotelsApi
      .get(hotelId)
      .then((res) => setHotel(res.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [hotelId])

  useEffect(() => {
    if (user) {
      setFullName((prev) => prev || user.name || '')
      setEmail((prev) => prev || user.email || '')
    }
  }, [user])

  const room: HotelRoom | undefined = useMemo(
    () => hotel?.rooms?.find((r) => r.id === roomId) ?? hotel?.rooms?.[0],
    [hotel, roomId],
  )

  const nights = nightsBetween(checkIn, checkOut)
  const baseTotal = room ? room.pricePerNight * nights : 0
  const taxes = taxFor(baseTotal)
  const total = baseTotal + taxes

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setFormError(null)
    if (!hotel || !room) {
      setFormError('Please choose a room to continue.')
      return
    }
    if (nights < 1 || !checkIn || !checkOut) {
      setFormError('Please choose valid check-in and check-out dates.')
      return
    }
    if (guests > room.maxGuests) {
      setFormError(`This room fits up to ${room.maxGuests} guests.`)
      return
    }
    if (!/^[A-Za-z\s.'-]{2,}$/.test(fullName.trim())) {
      setFormError('Please enter the lead guest name.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setFormError('Please enter a valid email address.')
      return
    }
    if (!/^[6-9]\d{9}$/.test(phone.trim())) {
      setFormError('Please enter a valid 10-digit Indian mobile number.')
      return
    }

    setSubmitting(true)
    try {
      const res = await hotelsApi.book({
        hotelId: hotel.id,
        roomId: room.id,
        checkIn,
        checkOut,
        guests,
        rooms: 1,
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        specialRequests: specialRequests.trim() || undefined,
      })
      toast.success('Stay reserved successfully!')
      navigate(`/hotels/bookings/confirmation/${res.data.id}`, { replace: true })
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Booking failed. Please try again.')
      toast.error(err instanceof Error ? err.message : 'Booking failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 pt-24 pb-10 sm:px-6 md:pt-28">
        <Skeleton className="h-6 w-48" />
        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <Skeleton className="h-96 w-full rounded-2xl" />
          <Skeleton className="h-80 w-full rounded-2xl" />
        </div>
      </div>
    )
  }

  if (error || !hotel || !room) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 pt-24 pb-16 sm:px-6 md:pt-28">
        <ErrorState
          title="Booking unavailable"
          message="We could not find this stay or room. It may have been removed."
          onRetry={() => navigate('/hotels')}
        />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 pt-24 pb-16 text-center sm:px-6 md:pt-28">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-border bg-card/50 px-6 py-14"
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary text-primary">
            <Lock className="h-7 w-7" aria-hidden="true" />
          </span>
          <h1 className="font-serif text-2xl font-bold text-foreground">Sign in to reserve your stay</h1>
          <p className="max-w-sm text-sm text-muted-foreground">
            You need an account to book {hotel.name}. Sign in or create one — it takes less than a minute.
          </p>
          <div className="mt-1 flex gap-3">
            <Button onClick={() => navigate('/login', { state: { from: window.location.pathname + window.location.search } })}>
              Sign in
            </Button>
            <Button variant="outline" onClick={() => navigate('/register')}>
              Create account
            </Button>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 pt-24 pb-8 sm:px-6 md:pt-28">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center gap-2 text-sm text-muted-foreground"
      >
        <Link to={`/hotels/${hotel.slug || hotel.id}`} className="inline-flex items-center gap-1 font-medium text-foreground hover:text-primary">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to {hotel.name}
        </Link>
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="font-serif text-3xl font-bold text-foreground md:text-4xl"
      >
        Reserve your stay
      </motion.h1>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px] lg:items-start">
        <div className="flex flex-col gap-6">
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="flex flex-col gap-4 rounded-2xl bg-card p-5 shadow-sm ring-1 ring-border"
          >
            <h2 className="font-serif text-lg font-semibold text-card-foreground">Guest details</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5">
                <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                  <User className="h-4 w-4 text-primary" aria-hidden="true" />
                  Full name
                </span>
                <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Lead guest name" required className={inputClass} />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                  Phone
                </span>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10-digit mobile number" inputMode="numeric" required className={inputClass} />
              </label>
              <label className="flex flex-col gap-1.5 sm:col-span-2">
                <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                  Email
                </span>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Booking confirmation will be sent here" required className={inputClass} />
              </label>
              <label className="flex flex-col gap-1.5 sm:col-span-2">
                <span className="text-sm font-medium text-foreground">Special requests <span className="text-xs text-muted-foreground">(optional)</span></span>
                <textarea
                  value={specialRequests}
                  onChange={(e) => setSpecialRequests(e.target.value)}
                  rows={3}
                  placeholder="Early check-in, airport pickup, anniversary cake, etc."
                  className="w-full resize-none rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                />
              </label>
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="flex flex-col gap-4 rounded-2xl bg-card p-5 shadow-sm ring-1 ring-border"
          >
            <h2 className="font-serif text-lg font-semibold text-card-foreground">Payment method</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {PAYMENT_METHODS.map((method) => (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => setPaymentMethod(method.id)}
                  className={cn(
                    'flex flex-col items-start gap-1 rounded-xl border p-4 text-left transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                    paymentMethod === method.id
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'border-input bg-background hover:border-primary/40',
                  )}
                >
                  <method.icon className="h-5 w-5 text-primary" aria-hidden="true" />
                  <span className="text-sm font-semibold text-foreground">{method.label}</span>
                  <span className="text-xs text-muted-foreground">{method.hint}</span>
                </button>
              ))}
            </div>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Lock className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              This is a demo checkout — no money will be charged. Your booking is confirmed instantly.
            </p>
          </motion.section>

          {formError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-300">
              {formError}
            </div>
          )}

          <Button type="submit" size="lg" disabled={submitting} className="lg:hidden">
            {submitting && <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />}
            Confirm booking · {formatINR(total)}
          </Button>
        </div>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-24">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.12 }}
            className="flex flex-col gap-4 rounded-2xl bg-card p-5 shadow-lg ring-1 ring-border"
          >
            <div className="flex gap-3">
              <img src={hotel.image} alt={hotel.name} className="h-16 w-24 shrink-0 rounded-xl object-cover" />
              <div className="flex min-w-0 flex-col">
                <span className="line-clamp-1 font-serif text-base font-semibold text-foreground">{hotel.name}</span>
                <span className="line-clamp-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3 shrink-0 text-primary" aria-hidden="true" />
                  {hotel.location}
                </span>
                <span className="flex items-center gap-1 text-xs font-semibold text-foreground">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" aria-hidden="true" />
                  {hotel.rating > 0 ? hotel.rating.toFixed(1) : 'New'}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2 border-t border-border pt-3 text-sm">
              <div className="flex items-center justify-between text-secondary-foreground">
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="h-4 w-4 text-primary" aria-hidden="true" />
                  Check-in
                </span>
                <span className="font-semibold text-foreground">{checkIn ? formatDate(checkIn) : '—'}</span>
              </div>
              <div className="flex items-center justify-between text-secondary-foreground">
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="h-4 w-4 text-primary" aria-hidden="true" />
                  Check-out
                </span>
                <span className="font-semibold text-foreground">{checkOut ? formatDate(checkOut) : '—'}</span>
              </div>
              <div className="flex items-center justify-between text-secondary-foreground">
                <span className="flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-primary" aria-hidden="true" />
                  Guests
                </span>
                <span className="font-semibold text-foreground">{guests}</span>
              </div>
              <div className="flex items-center justify-between text-secondary-foreground">
                <span className="flex items-center gap-1.5">
                  <Phone className="h-4 w-4 text-primary" aria-hidden="true" />
                  Room
                </span>
                <span className="line-clamp-1 font-semibold text-foreground">{room.name}</span>
              </div>
            </div>

            <div className="flex flex-col gap-2 rounded-xl bg-secondary p-4 text-sm">
              <div className="flex justify-between text-secondary-foreground">
                <span>{room.name} × {nights} night{nights === 1 ? '' : 's'}</span>
                <span>{formatINR(baseTotal)}</span>
              </div>
              <div className="flex justify-between text-secondary-foreground">
                <span>GST (18%)</span>
                <span>{formatINR(taxes)}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-2 text-base font-bold text-foreground">
                <span className="flex items-center gap-1.5">
                  <IndianRupee className="h-4 w-4 text-primary" aria-hidden="true" />
                  Total
                </span>
                <span>{formatINR(total)}</span>
              </div>
            </div>

            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              {hotel.cancellationPolicy || 'Free cancellation as per hotel policy'}
            </p>

            <Button type="submit" size="lg" disabled={submitting} className="hidden lg:flex">
              {submitting && <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />}
              Confirm booking · {formatINR(total)}
            </Button>
          </motion.div>
        </aside>
      </form>
    </div>
  )
}
