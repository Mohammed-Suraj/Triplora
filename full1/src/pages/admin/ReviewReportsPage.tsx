import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CheckCircle2, Flag, Star, XCircle } from 'lucide-react'
import { adminApi, type ReviewReportItem } from '@/lib/api'
import { AdminPageHeader, AdminEmptyState } from '@/components/admin/AdminPageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/context/ToastContext'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 10

const statusStyles: Record<string, string> = {
  OPEN: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700/50',
  RESOLVED: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700/50',
  DISMISSED: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700/50',
}

export function ReviewReportsPage() {
  const toast = useToast()
  const [reports, setReports] = useState<ReviewReportItem[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const load = useCallback(
    async (targetPage: number, append = false) => {
      if (targetPage === 1) setLoading(true)
      try {
        const res = await adminApi.reviewReports({
          page: targetPage,
          limit: PAGE_SIZE,
          status: statusFilter === 'ALL' ? undefined : statusFilter,
        })
        setReports((prev) => (append ? [...prev, ...res.data] : res.data))
        setHasMore(res.data.length === PAGE_SIZE)
        setPage(targetPage)
      } catch {
        toast.error('Could not load review reports.')
      } finally {
        setLoading(false)
      }
    },
    [statusFilter, toast],
  )

  useEffect(() => {
    void load(1)
  }, [load])

  const setStatus = async (id: string, status: 'RESOLVED' | 'DISMISSED') => {
    setUpdatingId(id)
    try {
      const res = await adminApi.updateReportStatus(id, status)
      setReports((prev) => prev.map((r) => (r.id === id ? res.data : r)))
      toast.success(status === 'RESOLVED' ? 'Report marked as resolved.' : 'Report dismissed.')
    } catch {
      toast.error('Could not update the report.')
    } finally {
      setUpdatingId(null)
    }
  }

  const openReports = reports.filter((r) => r.status === 'OPEN').length

  return (
    <div>
      <AdminPageHeader
        title="Review Reports"
        subtitle={`${openReports} open report${openReports === 1 ? '' : 's'} waiting for moderation`}
      />

      <div className="mb-4 flex flex-wrap items-center gap-2" role="group" aria-label="Filter reports by status">
        {['ALL', 'OPEN', 'RESOLVED', 'DISMISSED'].map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setStatusFilter(status)}
            aria-pressed={statusFilter === status}
            className={cn(
              'cursor-pointer rounded-full px-4 py-2 text-sm font-medium transition-colors',
              statusFilter === status
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/70',
            )}
          >
            {status === 'ALL' ? 'All' : status.charAt(0) + status.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {loading && reports.length === 0 ? (
        <div className="flex flex-col gap-4">
          {[1, 2, 3].map((n) => (
            <Skeleton key={n} className="h-24 w-full rounded-2xl" />
          ))}
        </div>
      ) : reports.length === 0 ? (
        <AdminEmptyState
          icon={<Flag className="h-6 w-6" aria-hidden="true" />}
          title="No reports found"
          subtitle="When travellers flag a review, it appears here for moderation."
        />
      ) : (
        <>
          <div className="flex flex-col gap-4">
            {reports.map((report) => (
              <motion.div
                key={report.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={cn(
                  'rounded-2xl bg-card p-5 shadow-sm ring-1 ring-border',
                  report.status === 'OPEN' && 'ring-amber-300/60 dark:ring-amber-700/40',
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={`border px-2.5 py-0.5 text-xs ${statusStyles[report.status] ?? ''}`}>
                      {report.status}
                    </Badge>
                    <span className="text-sm font-semibold text-foreground">{report.review.destination.name}</span>
                    <Link
                      to={`/destinations/${report.review.destination.slug}`}
                      className="text-xs text-primary hover:underline"
                    >
                      view
                    </Link>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Reported by {report.user.name} · {new Date(report.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <div className="mt-3 rounded-xl bg-secondary/50 p-3">
                  <p className="text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">Reason:</span> {report.reason}
                  </p>
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-sm font-medium text-foreground">
                      <Star className="h-4 w-4 fill-accent text-accent" aria-hidden="true" />
                      {report.review.rating}
                    </span>
                    <p className="line-clamp-2 max-w-xl text-sm text-muted-foreground">
                      "{report.review.comment}" — {report.review.user.name}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {report.status === 'OPEN' ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={updatingId === report.id}
                          onClick={() => void setStatus(report.id, 'RESOLVED')}
                        >
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                          Resolve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={updatingId === report.id}
                          onClick={() => void setStatus(report.id, 'DISMISSED')}
                        >
                          <XCircle className="h-4 w-4 text-slate-500" aria-hidden="true" />
                          Dismiss
                        </Button>
                      </>
                    ) : (
                      <span className="text-xs text-muted-foreground">Moderated</span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {hasMore && (
            <div className="mt-6 text-center">
              <Button variant="outline" onClick={() => void load(page + 1, true)} disabled={loading}>
                {loading ? 'Loading...' : 'Load more'}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
