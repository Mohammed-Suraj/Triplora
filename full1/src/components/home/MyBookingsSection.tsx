import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CalendarDays, MapPin, Users, IndianRupee, ArrowRight, Clock } from 'lucide-react'
import { bookingApi, type BookingResult } from '@/lib/api'
import { Badge } from '@/components/ui/Badge'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { SmartImage } from '@/components/ui/SmartImage'

const statusStyles: Record<string, string> = {
  PENDING: 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/30',
  CONFIRMED: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  CANCELLED: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
  COMPLETED: 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30',
}

export function MyBookingsSection() {
  const [bookings, setBookings] = useState<BookingResult[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    bookingApi
      .list()
      .then((res) => {
        if (active && Array.isArray(res.data)) {
          setBookings(res.data)
        }
      })
      .catch(() => {
        if (active) setBookings([])
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  if (loading || bookings.length === 0) {
    return null
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 md:px-6 md:py-16">
      <SectionHeading
        eyebrow="Your Reservations"
        title="My Bookings"
        description="Track your upcoming trips and current booking statuses."
      />

      <div className="mt-10 flex flex-col gap-6">
        {bookings.map((booking, index) => (
          <motion.div
            key={booking.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: index * 0.05, ease: 'easeOut' }}
            className="glass-strong flex flex-col gap-4 rounded-2xl p-5 shadow-sm md:flex-row md:items-center md:gap-6"
          >
            <SmartImage
              src={booking.destination.image}
              alt={booking.destination.name}
              className="h-28 w-full rounded-xl md:h-28 md:w-44"
            />
            <div className="flex flex-1 flex-col gap-2.5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="font-serif text-xl font-semibold text-foreground">
                    {booking.destination.name}
                  </h3>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                    Booking ID: {booking.bookingId}
                  </p>
                </div>
                <Badge
                  className={`border px-3 py-1 text-xs font-semibold uppercase tracking-wider ${
                    statusStyles[booking.status] ?? 'bg-gray-500/15 text-gray-700 border-gray-300'
                  }`}
                >
                  {booking.status}
                </Badge>
              </div>

              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-foreground">
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="h-4 w-4 text-primary" aria-hidden="true" />
                  {new Date(booking.travelDate).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                  {booking.returnDate && (
                    <>
                      {' '}
                      —{' '}
                      {new Date(booking.returnDate).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </>
                  )}
                </span>
                <span className="flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-primary" aria-hidden="true" />
                  {booking.numberOfTravelers} traveler{booking.numberOfTravelers > 1 ? 's' : ''}
                </span>
                <span className="flex items-center gap-1.5 font-medium">
                  <IndianRupee className="h-4 w-4 text-primary" aria-hidden="true" />
                  {'\u20B9'}{booking.budget.toLocaleString()}
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" aria-hidden="true" />
                Booked on{' '}
                {new Date(booking.createdAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </div>
            </div>

            <div className="flex shrink-0 items-center">
              <Link
                to="/my-bookings"
                className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
              >
                View Details
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
