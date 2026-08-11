import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Users,
  MapPin,
  CalendarDays,
  Star,
  MessageSquare,
  Clock,
  ArrowRight,
} from 'lucide-react'
import { adminApi, type AdminStats } from '@/lib/api'
import { AdminPageHeader, AdminEmptyState } from '@/components/admin/AdminPageHeader'
import { AdminStatCard } from '@/components/admin/AdminStatCard'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'

const statusStyles: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700/50',
  CONFIRMED: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700/50',
  CANCELLED: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-700/50',
  COMPLETED: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700/50',
}

export function DashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = () => {
    setLoading(true)
    setError(null)
    adminApi
      .stats()
      .then((res) => setStats(res.data))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load dashboard'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchStats()
  }, [])

  return (
    <div>
      <AdminPageHeader title="Dashboard" subtitle="Overview of the Triplora platform" />

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {[1, 2, 3, 4, 5].map((n) => (
            <div key={n} className="flex flex-col gap-3 rounded-2xl bg-card p-5 ring-1 ring-border">
              <Skeleton className="h-11 w-11 rounded-xl" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
      ) : error ? (
        <EmptyState
          title="Could not load dashboard"
          message={error}
          actionLabel="Try again"
          onAction={fetchStats}
        />
      ) : stats ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col gap-8"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <AdminStatCard icon={Users} label="Total Users" value={stats.users} accent="bg-blue-500/10 text-blue-600 dark:text-blue-400" index={0} />
            <AdminStatCard icon={MapPin} label="Destinations" value={stats.destinations} accent="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" index={1} />
            <AdminStatCard icon={CalendarDays} label="Bookings" value={stats.bookings} hint={`${stats.pendingBookings} pending`} accent="bg-amber-500/10 text-amber-600 dark:text-amber-400" index={2} />
            <AdminStatCard icon={Star} label="Reviews" value={stats.reviews} accent="bg-purple-500/10 text-purple-600 dark:text-purple-400" index={3} />
            <AdminStatCard icon={MessageSquare} label="Contact Messages" value={stats.contactMessages} hint={`${stats.newContactMessages} new`} accent="bg-rose-500/10 text-rose-600 dark:text-rose-400" index={4} />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Recent bookings */}
            <section className="glass-strong rounded-2xl p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2 font-serif text-lg font-semibold text-foreground">
                  <Clock className="h-4 w-4 text-primary" aria-hidden="true" />
                  Recent Bookings
                </h2>
                <Link to="/admin/bookings" className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                  View all <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </div>
              {stats.recentBookings.length === 0 ? (
                <AdminEmptyState
                  icon={<CalendarDays className="h-6 w-6" aria-hidden="true" />}
                  title="No bookings yet"
                  subtitle="Bookings will appear here once customers reserve a trip."
                />
              ) : (
                <ul className="flex flex-col divide-y divide-border/60">
                  {stats.recentBookings.map((booking) => (
                    <li key={booking.id} className="flex items-center justify-between gap-3 py-3">
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <p className="truncate text-sm font-semibold text-foreground">{booking.destination.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {booking.user?.name ?? booking.fullName} · {booking.bookingId}
                        </p>
                      </div>
                      <Badge className={`border px-2.5 py-0.5 text-xs ${statusStyles[booking.status] ?? ''}`}>
                        {booking.status}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Recent contact messages */}
            <section className="glass-strong rounded-2xl p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2 font-serif text-lg font-semibold text-foreground">
                  <MessageSquare className="h-4 w-4 text-primary" aria-hidden="true" />
                  Recent Messages
                </h2>
                <Link to="/admin/contact-messages" className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                  View all <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </div>
              {stats.recentContactMessages.length === 0 ? (
                <AdminEmptyState
                  icon={<MessageSquare className="h-6 w-6" aria-hidden="true" />}
                  title="No messages yet"
                  subtitle="Contact form submissions will appear here."
                />
              ) : (
                <ul className="flex flex-col divide-y divide-border/60">
                  {stats.recentContactMessages.map((message) => (
                    <li key={message.id} className="flex items-center justify-between gap-3 py-3">
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <p className="truncate text-sm font-semibold text-foreground">{message.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{message.subject ?? message.email}</p>
                      </div>
                      <Badge
                        variant={message.status === 'NEW' ? 'accent' : 'default'}
                        className={message.status === 'NEW' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' : ''}
                      >
                        {message.status}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </motion.div>
      ) : null}
    </div>
  )
}
