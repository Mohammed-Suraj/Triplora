import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Bot,
  CalendarDays,
  Download,
  IndianRupee,
  Megaphone,
  MessageSquare,
  Search,
  Star,
  TrendingUp,
  Users,
  BedDouble,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  adminApi,
  type AiUsageData,
  type AnalyticsOverview,
  type BookingGrowthPoint,
  type DestinationPerformanceRow,
  type MonthlyReport,
  type PopularDestination,
  type TopSearch,
  type TrendingDestination,
} from '@/lib/api'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { AdminStatCard } from '@/components/admin/AdminStatCard'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/context/ToastContext'
import { cn } from '@/lib/utils'

const PIE_COLORS = ['#0d9488', '#f59e0b', '#8b5cf6', '#3b82f6', '#ec4899', '#10b981', '#f97316']

const money = (n: number) => '₹' + n.toLocaleString('en-IN')
const num = (n: number) => n.toLocaleString('en-IN')

function ChartCard({
  title,
  subtitle,
  children,
  className,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={cn('rounded-2xl bg-card p-5 shadow-sm ring-1 ring-border', className)}>
      <h2 className="font-serif text-lg font-semibold text-foreground">{title}</h2>
      {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </section>
  )
}

function formatMonth(value: string): string {
  const date = new Date(value + '-01T00:00:00')
  return date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
}

function currentMonthValue(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function monthOptions(): string[] {
  const options: string[] = []
  const now = new Date()
  for (let i = 0; i < 12; i += 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    options.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`)
  }
  return options
}

export function AnalyticsPage() {
  const toast = useToast()
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null)
  const [growthMonths, setGrowthMonths] = useState(6)
  const [growth, setGrowth] = useState<BookingGrowthPoint[]>([])
  const [popular, setPopular] = useState<PopularDestination[]>([])
  const [trending, setTrending] = useState<TrendingDestination[]>([])
  const [searches, setSearches] = useState<TopSearch[]>([])
  const [aiUsage, setAiUsage] = useState<AiUsageData | null>(null)
  const [performance, setPerformance] = useState<DestinationPerformanceRow[]>([])
  const [loading, setLoading] = useState(true)

  const [month, setMonth] = useState(currentMonthValue())
  const [monthly, setMonthly] = useState<MonthlyReport | null>(null)
  const [monthlyLoading, setMonthlyLoading] = useState(false)

  const [announcementTitle, setAnnouncementTitle] = useState('')
  const [announcementBody, setAnnouncementBody] = useState('')
  const [announcementLink, setAnnouncementLink] = useState('')
  const [sendingAnnouncement, setSendingAnnouncement] = useState(false)

  const loadAll = useCallback(() => {
    setLoading(true)
    Promise.all([
      adminApi.analyticsOverview(),
      adminApi.bookingGrowth(growthMonths),
      adminApi.popularDestinations(6),
      adminApi.trending(6),
      adminApi.topSearches(10),
      adminApi.aiUsage(14),
      adminApi.destinationPerformance(),
    ])
      .then(([o, g, p, t, s, a, perf]) => {
        setOverview(o.data)
        setGrowth(g.data)
        setPopular(p.data)
        setTrending(t.data)
        setSearches(s.data)
        setAiUsage(a.data)
        setPerformance(perf.data)
      })
      .catch(() => toast.error('Could not load analytics. Try again.'))
      .finally(() => setLoading(false))
  }, [growthMonths, toast])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const loadMonthly = useCallback(() => {
    setMonthlyLoading(true)
    adminApi
      .monthlyReport(month)
      .then((res) => setMonthly(res.data))
      .catch(() => toast.error('Could not load the monthly report.'))
      .finally(() => setMonthlyLoading(false))
  }, [month, toast])

  useEffect(() => {
    loadMonthly()
  }, [loadMonthly])

  const growthData = useMemo(
    () => growth.map((g) => ({ ...g, label: formatMonth(g.month) })),
    [growth],
  )

  const topRevenueDestination = useMemo(
    () => [...performance].sort((a, b) => b.revenue - a.revenue)[0],
    [performance],
  )

  const handleAnnouncement = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!announcementTitle.trim() || !announcementBody.trim() || sendingAnnouncement) return
    setSendingAnnouncement(true)
    try {
      const res = await adminApi.createAnnouncement({
        title: announcementTitle.trim(),
        body: announcementBody.trim(),
        link: announcementLink.trim() || undefined,
      })
      toast.success(`Announcement sent to ${res.data.recipients} users.`)
      setAnnouncementTitle('')
      setAnnouncementBody('')
      setAnnouncementLink('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not send the announcement.')
    } finally {
      setSendingAnnouncement(false)
    }
  }

  const exportMonthly = () => {
    if (!monthly) return
    const payload = {
      month: monthly.month,
      revenue: monthly.revenue,
      bookings: monthly.bookings,
      newUsers: monthly.newUsers,
      newReviews: monthly.newReviews,
      newSearches: monthly.newSearches,
      aiUsage: monthly.aiUsage,
      growthPct: monthly.growthPct,
      topDestinations: monthly.topDestinations,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `triplora-report-${monthly.month}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading && !overview) {
    return (
      <div>
        <AdminPageHeader title="Analytics" subtitle="Revenue, bookings, AI usage, search trends and destination performance" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
            <div key={n} className="flex flex-col gap-3 rounded-2xl bg-card p-5 ring-1 ring-border">
              <Skeleton className="h-11 w-11 rounded-xl" />
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Skeleton className="h-80 w-full rounded-2xl" />
          <Skeleton className="h-80 w-full rounded-2xl" />
        </div>
      </div>
    )
  }

  return (
    <div>
      <AdminPageHeader
        title="Analytics"
        subtitle="Revenue, bookings, AI usage, search trends and destination performance"
      />

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="flex flex-col gap-6">
        {/* Overview cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
          <AdminStatCard icon={IndianRupee} label="Revenue" value={money(overview?.revenue ?? 0)} accent="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" index={0} />
          <AdminStatCard icon={CalendarDays} label="Paid Bookings" value={num(overview?.paidBookings ?? 0)} accent="bg-blue-500/10 text-blue-600 dark:text-blue-400" index={1} />
          <AdminStatCard icon={BedDouble} label="Hotel Bookings" value={num(overview?.hotelBookings ?? 0)} accent="bg-teal-500/10 text-teal-600 dark:text-teal-400" index={2} />
          <AdminStatCard icon={Users} label="Users" value={num(overview?.users ?? 0)} accent="bg-slate-500/10 text-slate-600 dark:text-slate-400" index={3} />
          <AdminStatCard icon={Bot} label="AI Requests" value={num(overview?.aiUsage ?? 0)} accent="bg-purple-500/10 text-purple-600 dark:text-purple-400" index={4} />
          <AdminStatCard icon={Search} label="Searches" value={num(overview?.searches ?? 0)} accent="bg-amber-500/10 text-amber-600 dark:text-amber-400" index={5} />
          <AdminStatCard icon={MessageSquare} label="Reviews" value={num(overview?.reviews ?? 0)} accent="bg-rose-500/10 text-rose-600 dark:text-rose-400" index={6} />
          <AdminStatCard icon={Star} label="Avg Rating" value={(overview?.averageRating ?? 0).toFixed(1)} accent="bg-teal-500/10 text-teal-600 dark:text-teal-400" index={7} />
        </div>

        {/* Revenue & bookings chart */}
        <ChartCard
          title="Revenue & bookings trend"
          subtitle="Monthly bookings and paid revenue"
          className="xl:col-span-2"
        >
          <div className="mb-3 flex gap-1 rounded-full bg-secondary p-1" role="group" aria-label="Chart range">
            {[6, 12, 24].map((months) => (
              <button
                key={months}
                type="button"
                onClick={() => setGrowthMonths(months)}
                aria-pressed={growthMonths === months}
                className={cn(
                  'cursor-pointer rounded-full px-4 py-1.5 text-xs font-medium transition-colors',
                  growthMonths === months ? 'bg-card text-card-foreground shadow-sm' : 'text-secondary-foreground hover:text-foreground',
                )}
              >
                {months} months
              </button>
            ))}
          </div>
          <div className="h-72">
            {growthData.length === 0 ? (
              <p className="text-sm text-muted-foreground">No booking data yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={growthData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={56} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: '1px solid var(--color-border)', fontSize: 12 }}
                    formatter={(value: unknown, name: unknown) =>
                      name === 'revenue' ? [money(Number(value)), 'Revenue'] : [Number(value), 'Bookings']
                    }
                  />
                  <Bar dataKey="revenue" name="revenue" fill="#0d9488" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="bookings" name="bookings" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </ChartCard>

        {/* AI usage */}
        <ChartCard
          title="AI usage"
          subtitle="Assistant and planner requests over the last 14 days"
        >
          <div className="mb-3 flex flex-wrap gap-1.5">
            {aiUsage?.byType.map((entry) => (
              <span key={entry.type} className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
                {entry.type}: {num(entry.count)}
              </span>
            ))}
          </div>
          <div className="h-60">
            {aiUsage && aiUsage.series.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={aiUsage.series} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={40} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: '1px solid var(--color-border)', fontSize: 12 }}
                  />
                  <Line type="monotone" dataKey="count" name="Requests" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground">No AI usage recorded yet.</p>
            )}
          </div>
        </ChartCard>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Popular destinations */}
          <ChartCard title="Popular destinations" subtitle="By bookings and revenue">
            {popular.length === 0 ? (
              <p className="text-sm text-muted-foreground">No bookings yet.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-border/60">
                {popular.map((d, i) => (
                  <li key={d.id} className="flex items-center gap-3 py-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground">
                      {i + 1}
                    </span>
                    <img src={d.image} alt="" className="h-10 w-10 rounded-lg object-cover" loading="lazy" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">{d.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {d.bookings} bookings · {money(d.revenue)}
                      </p>
                    </div>
                    <span className="flex items-center gap-1 text-xs font-medium text-foreground">
                      <Star className="h-3.5 w-3.5 fill-accent text-accent" aria-hidden="true" />
                      {d.rating}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </ChartCard>

          {/* Trending now */}
          <ChartCard title="Trending now" subtitle="Highest 30-day engagement">
            {trending.length === 0 ? (
              <p className="text-sm text-muted-foreground">Not enough activity yet.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-border/60">
                {trending.map((d, i) => (
                  <li key={d.id} className="flex items-center gap-3 py-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground">
                      {i + 1}
                    </span>
                    <img src={d.image} alt="" className="h-10 w-10 rounded-lg object-cover" loading="lazy" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">{d.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {d.bookings30d} bookings · {d.reviews30d} reviews in 30d
                      </p>
                    </div>
                    <span className="flex items-center gap-1 text-xs font-medium text-primary">
                      <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
                      {d.score}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </ChartCard>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Top searches */}
          <ChartCard title="Top searches" subtitle="Most common destination queries">
            {searches.length === 0 ? (
              <p className="text-sm text-muted-foreground">No searches recorded yet.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {searches.map((s, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="w-6 text-right text-xs font-semibold text-muted-foreground">{i + 1}</span>
                    <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                      {s.query}
                    </span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${(s.count / Math.max(1, searches[0].count)) * 100}%` }}
                      />
                    </div>
                    <span className="w-10 text-right text-xs text-muted-foreground">{num(s.count)}</span>
                  </div>
                ))}
              </div>
            )}
          </ChartCard>

          {/* AI usage by type pie */}
          <ChartCard title="AI usage by feature" subtitle="Where AI is helping travellers">
            {aiUsage && aiUsage.byType.length > 0 ? (
              <div className="flex h-64 items-center justify-center gap-6">
                <ResponsiveContainer width="55%" height="100%">
                  <PieChart>
                    <Pie
                      data={aiUsage.byType}
                      dataKey="count"
                      nameKey="type"
                      innerRadius={48}
                      outerRadius={80}
                      paddingAngle={3}
                    >
                      {aiUsage.byType.map((entry, i) => (
                        <Cell key={entry.type} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid var(--color-border)', fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No AI usage recorded yet.</p>
            )}
          </ChartCard>
        </div>

        {/* Destination performance table */}
        <ChartCard
          title="Destination performance"
          subtitle={`${performance.length} destinations · top earner: ${topRevenueDestination?.name ?? '—'} (${money(topRevenueDestination?.revenue ?? 0)})`}
        >
          {performance.length === 0 ? (
            <p className="text-sm text-muted-foreground">No destination data yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="py-2.5 pr-4 font-semibold">Destination</th>
                    <th className="py-2.5 pr-4 font-semibold">Region</th>
                    <th className="py-2.5 pr-4 font-semibold">Category</th>
                    <th className="py-2.5 pr-4 text-right font-semibold">Rating</th>
                    <th className="py-2.5 pr-4 text-right font-semibold">Reviews</th>
                    <th className="py-2.5 pr-4 text-right font-semibold">Bookings</th>
                    <th className="py-2.5 text-right font-semibold">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {performance.slice(0, 20).map((d) => (
                    <tr key={d.id} className="transition-colors hover:bg-secondary/40">
                      <td className="py-2.5 pr-4">
                        <Link to={`/destinations/${d.slug}`} className="flex items-center gap-2.5">
                          <img src={d.image} alt="" className="h-8 w-8 rounded-md object-cover" loading="lazy" />
                          <span className="font-medium text-foreground hover:text-primary">{d.name}</span>
                        </Link>
                      </td>
                      <td className="py-2.5 pr-4 text-muted-foreground">{d.region}</td>
                      <td className="py-2.5 pr-4">
                        <Badge className="bg-secondary text-secondary-foreground">{d.category}</Badge>
                      </td>
                      <td className="py-2.5 pr-4 text-right text-muted-foreground">{d.rating.toFixed(1)}</td>
                      <td className="py-2.5 pr-4 text-right text-muted-foreground">{num(d.reviewsCount)}</td>
                      <td className="py-2.5 pr-4 text-right text-muted-foreground">{num(d.bookings)}</td>
                      <td className="py-2.5 text-right font-semibold text-foreground">{money(d.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ChartCard>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Monthly report */}
          <ChartCard
            title="Monthly report"
            subtitle="Business snapshot for a single month"
          >
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="h-10 cursor-pointer rounded-xl border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-ring"
                aria-label="Select month"
              >
                {monthOptions().map((m) => (
                  <option key={m} value={m}>
                    {formatMonth(m)}
                  </option>
                ))}
              </select>
              <Button variant="outline" size="sm" onClick={exportMonthly} disabled={!monthly}>
                <Download className="h-4 w-4" aria-hidden="true" />
                Export JSON
              </Button>
            </div>

            {monthlyLoading ? (
              <p className="mt-4 text-sm text-muted-foreground">Loading report...</p>
            ) : monthly ? (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-secondary/60 p-3">
                  <p className="text-xs text-muted-foreground">Revenue</p>
                  <p className="text-lg font-bold text-foreground">{money(monthly.revenue)}</p>
                  {monthly.growthPct !== null && (
                    <p className={cn('text-xs font-medium', monthly.growthPct >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500')}>
                      {monthly.growthPct >= 0 ? '+' : ''}
                      {monthly.growthPct.toFixed(1)}% MoM
                    </p>
                  )}
                </div>
                <div className="rounded-xl bg-secondary/60 p-3">
                  <p className="text-xs text-muted-foreground">Bookings</p>
                  <p className="text-lg font-bold text-foreground">{num(monthly.bookings)}</p>
                </div>
                <div className="rounded-xl bg-secondary/60 p-3">
                  <p className="text-xs text-muted-foreground">New users</p>
                  <p className="text-lg font-bold text-foreground">{num(monthly.newUsers)}</p>
                </div>
                <div className="rounded-xl bg-secondary/60 p-3">
                  <p className="text-xs text-muted-foreground">New reviews</p>
                  <p className="text-lg font-bold text-foreground">{num(monthly.newReviews)}</p>
                </div>
                <div className="rounded-xl bg-secondary/60 p-3">
                  <p className="text-xs text-muted-foreground">Searches</p>
                  <p className="text-lg font-bold text-foreground">{num(monthly.newSearches)}</p>
                </div>
                <div className="rounded-xl bg-secondary/60 p-3">
                  <p className="text-xs text-muted-foreground">AI usage</p>
                  <p className="text-lg font-bold text-foreground">{num(monthly.aiUsage)}</p>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">No data for this month yet.</p>
            )}
          </ChartCard>

          {/* Announcements */}
          <ChartCard
            title="Send announcement"
            subtitle="Broadcast a notification to every user"
          >
            <form onSubmit={handleAnnouncement} className="flex flex-col gap-3">
              <input
                type="text"
                value={announcementTitle}
                onChange={(e) => setAnnouncementTitle(e.target.value)}
                maxLength={120}
                required
                placeholder="Announcement title (e.g. Monsoon sale is live!)"
                aria-label="Announcement title"
                className="h-10 w-full rounded-xl border border-input bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring"
              />
              <textarea
                rows={3}
                value={announcementBody}
                onChange={(e) => setAnnouncementBody(e.target.value)}
                maxLength={600}
                required
                placeholder="Message body"
                aria-label="Announcement body"
                className="w-full resize-none rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring"
              />
              <input
                type="text"
                value={announcementLink}
                onChange={(e) => setAnnouncementLink(e.target.value)}
                placeholder="Link (optional, e.g. /explore)"
                aria-label="Announcement link"
                className="h-10 w-full rounded-xl border border-input bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring"
              />
              <Button type="submit" disabled={sendingAnnouncement || !announcementTitle.trim() || !announcementBody.trim()} className="w-fit">
                <Megaphone className="h-4 w-4" aria-hidden="true" />
                {sendingAnnouncement ? 'Broadcasting...' : 'Send to all users'}
              </Button>
            </form>
          </ChartCard>
        </div>
      </motion.div>
    </div>
  )
}
