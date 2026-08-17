import { useEffect, useMemo, useState } from 'react'
import { Mail } from 'lucide-react'
import { adminApi, type AdminEmailLog } from '@/lib/api'
import { AdminPageHeader, AdminEmptyState } from '@/components/admin/AdminPageHeader'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { ErrorState } from '@/components/ui/EmptyState'

const EMAIL_TYPES = [
  'WELCOME',
  'VERIFICATION',
  'FORGOT_PASSWORD',
  'PASSWORD_RESET',
  'BOOKING_CONFIRMATION',
  'PAYMENT_SUCCESS',
  'BOOKING_CANCELLED',
  'AI_TRIP_SAVED',
  'TRIP_REMINDER',
] as const

const STATUSES = ['PENDING', 'SENT', 'FAILED', 'SKIPPED'] as const

const statusStyles: Record<string, string> = {
  SENT: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400',
  PENDING: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-400',
  FAILED: 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400',
  SKIPPED: 'border-gray-200 bg-gray-50 text-gray-600 dark:border-gray-800 dark:bg-gray-900/40 dark:text-gray-400',
}

function typeLabel(type: string): string {
  return type
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function formatDate(value: string | null): string {
  if (!value) return '—'
  return new Date(value).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function EmailLogsPage() {
  const [logs, setLogs] = useState<AdminEmailLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const fetchLogs = useMemo(
    () => async () => {
      setLoading(true)
      setError(null)
      try {
        const params: { limit: number; type?: string; status?: string } = { limit: 50 }
        if (typeFilter) params.type = typeFilter
        if (statusFilter) params.status = statusFilter
        const res = await adminApi.emailLogs(params)
        setLogs(res.data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load email logs')
      } finally {
        setLoading(false)
      }
    },
    [typeFilter, statusFilter],
  )

  useEffect(() => {
    void fetchLogs()
  }, [fetchLogs])

  const sentCount = logs.filter((l) => l.status === 'SENT').length
  const failedCount = logs.filter((l) => l.status === 'FAILED').length

  return (
    <div>
      <AdminPageHeader
        title="Email Logs"
        subtitle={`${logs.length} log${logs.length === 1 ? '' : 's'} · ${sentCount} sent · ${failedCount} failed`}
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="h-9 rounded-lg border border-border bg-card px-3 text-sm text-foreground outline-none transition-colors focus:border-primary"
          aria-label="Filter by email type"
        >
          <option value="">All types</option>
          {EMAIL_TYPES.map((t) => (
            <option key={t} value={t}>
              {typeLabel(t)}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 rounded-lg border border-border bg-card px-3 text-sm text-foreground outline-none transition-colors focus:border-primary"
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="rounded-2xl bg-card p-5 ring-1 ring-border">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="mt-2 h-3 w-2/3" />
            </div>
          ))}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={() => void fetchLogs()} />
      ) : logs.length === 0 ? (
        <AdminEmptyState icon={<Mail className="h-6 w-6" aria-hidden="true" />} title="No email logs found" />
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-card ring-1 ring-border">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-border/60 text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-5 py-3 font-medium">Recipient</th>
                <th className="px-5 py-3 font-medium">Type</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Sent Time</th>
                <th className="px-5 py-3 font-medium">Failure Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {logs.map((log) => (
                <tr key={log.id} className="align-top">
                  <td className="px-5 py-3">
                    <p className="font-medium text-foreground">{log.to}</p>
                    <p className="mt-0.5 max-w-[220px] truncate text-xs text-muted-foreground">{log.subject}</p>
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">{typeLabel(log.type)}</td>
                  <td className="px-5 py-3">
                    <Badge className={`border ${statusStyles[log.status] ?? ''}`}>{log.status}</Badge>
                    {log.status !== 'SENT' && log.attempts > 0 && (
                      <p className="mt-1 text-xs text-muted-foreground">{log.attempts} attempt{log.attempts === 1 ? '' : 's'}</p>
                    )}
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">{formatDate(log.sentAt)}</td>
                  <td className="max-w-[260px] px-5 py-3 text-xs text-red-500">{log.error ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
