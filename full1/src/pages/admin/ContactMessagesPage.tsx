import { useEffect, useState } from 'react'
import { MessageSquare, Trash2 } from 'lucide-react'
import { adminApi, type AdminContactMessage } from '@/lib/api'
import { AdminPageHeader, AdminEmptyState } from '@/components/admin/AdminPageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { ErrorState } from '@/components/ui/EmptyState'
import { useToast } from '@/context/ToastContext'

const contactStatuses = ['NEW', 'READ', 'RESPONDED'] as const

const contactStatusStyles: Record<string, string> = {
  NEW: 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-900/40 dark:text-rose-300 dark:border-rose-700/50',
  READ: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700/50',
  RESPONDED: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700/50',
}

export function ContactMessagesPage() {
  const toast = useToast()
  const [messages, setMessages] = useState<AdminContactMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const loadMessages = () => {
    adminApi
      .contactMessages({ limit: 100 })
      .then((res) => setMessages(res.data))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load messages'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadMessages()
  }, [])

  const handleStatusChange = async (message: AdminContactMessage, status: (typeof contactStatuses)[number]) => {
    if (status === message.status) return
    setUpdatingId(message.id)
    try {
      await adminApi.updateContactStatus(message.id, status)
      setMessages((prev) => prev.map((m) => (m.id === message.id ? { ...m, status } : m)))
      toast.success(`Message from ${message.name} marked ${status}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update message status')
    } finally {
      setUpdatingId(null)
    }
  }

  const handleDelete = async (message: AdminContactMessage) => {
    if (!window.confirm(`Delete message from ${message.name}?`)) return
    setDeletingId(message.id)
    try {
      await adminApi.deleteContactMessage(message.id)
      setMessages((prev) => prev.filter((m) => m.id !== message.id))
      toast.success('Message deleted successfully')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete message')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div>
      <AdminPageHeader title="Contact Messages" subtitle="Enquiries submitted through the contact form" />

      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="flex flex-col gap-3 rounded-2xl bg-card p-5 ring-1 ring-border">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          ))}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={loadMessages} />
      ) : messages.length === 0 ? (
        <AdminEmptyState
          icon={<MessageSquare className="h-6 w-6" aria-hidden="true" />}
          title="No messages yet"
          subtitle="Contact form submissions will appear here."
        />
      ) : (
        <ul className="flex flex-col divide-y divide-border/60 overflow-hidden rounded-2xl bg-card ring-1 ring-border">
          {messages.map((message) => (
            <li key={message.id} className="flex flex-col gap-3 px-5 py-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{message.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {message.email}
                    {message.phone ? ` · ${message.phone}` : ''}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <Badge className={`border ${contactStatusStyles[message.status] ?? ''}`}>{message.status}</Badge>
                  <select
                    aria-label={`Update status for message from ${message.name}`}
                    value={message.status}
                    disabled={updatingId === message.id}
                    onChange={(e) => handleStatusChange(message, e.target.value as (typeof contactStatuses)[number])}
                    className="h-9 w-32 rounded-full border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
                  >
                    {contactStatuses.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={deletingId === message.id}
                    onClick={() => handleDelete(message)}
                    className="text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Delete message</span>
                  </Button>
                </div>
              </div>
              {message.subject && <p className="text-sm font-medium text-foreground">{message.subject}</p>}
              <p className="text-sm leading-relaxed text-muted-foreground">{message.message}</p>
              <p className="text-xs text-muted-foreground/70">
                {new Date(message.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}