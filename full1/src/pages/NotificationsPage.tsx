import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, BellOff, CheckCheck, ChevronRight } from 'lucide-react'
import { notificationsApi, type NotificationItem } from '@/lib/api'
import { useNotifications, notificationTypeStyles } from '@/context/NotificationContext'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 20

function formatDate(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function NotificationsPage() {
  const navigate = useNavigate()
  const { unread, setUnread, markRead, markAllRead } = useNotifications()
  const [items, setItems] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)

  const load = async (targetPage: number, append = false) => {
    if (targetPage === 1) setLoading(true)
    try {
      const res = await notificationsApi.list({ page: targetPage, limit: PAGE_SIZE })
      const next = append ? [...items, ...res.data] : res.data
      setItems(next)
      setHasMore(res.data.length === PAGE_SIZE)
      setPage(targetPage)
    } catch {
      // keep current state
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleOpen = (item: NotificationItem) => {
    if (!item.read) {
      void markRead(item.id)
      setItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, read: true } : it)))
      setUnread(Math.max(0, unread - 1))
    }
    if (item.link) navigate(item.link)
  }

  return (
    <div className="mx-auto max-w-3xl px-4 pt-28 pb-20 md:px-6 md:pt-32">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="flex flex-wrap items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label="Back to home"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </Link>
          <div>
            <h1 className="font-serif text-2xl font-bold text-foreground md:text-3xl">Notifications</h1>
            <p className="text-sm text-muted-foreground">
              {unread > 0 ? `${unread} unread` : 'You are all caught up'}
            </p>
          </div>
        </div>
        {items.some((item) => !item.read) && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void markAllRead()
              setItems((prev) => prev.map((it) => ({ ...it, read: true })))
              setUnread(0)
            }}
          >
            <CheckCheck className="h-4 w-4" aria-hidden="true" />
            Mark all read
          </Button>
        )}
      </motion.div>

      {loading && items.length === 0 ? (
        <div className="mt-10 flex flex-col gap-3">
          {[1, 2, 3, 4, 5].map((n) => (
            <div key={n} className="skeleton h-24 rounded-2xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="mt-16 flex flex-col items-center gap-4 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary text-muted-foreground">
            <BellOff className="h-8 w-8" aria-hidden="true" />
          </span>
          <h2 className="font-serif text-xl font-semibold text-foreground">No notifications yet</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            When your bookings change, payments succeed or trip reminders come due, you will see them here.
          </p>
        </div>
      ) : (
        <>
          <ul className="mt-8 flex flex-col gap-3">
            {items.map((item, index) => {
              const style = notificationTypeStyles[item.type]
              return (
                <motion.li
                  key={item.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.04 }}
                  className={cn(
                    'rounded-2xl bg-card p-4 shadow-sm ring-1 transition-shadow hover:shadow-md',
                    item.read ? 'ring-border' : 'ring-primary/30',
                  )}
                >
                  <button
                    type="button"
                    onClick={() => handleOpen(item)}
                    className="flex w-full cursor-pointer flex-col gap-1.5 text-left"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-semibold', style?.badge ?? 'bg-secondary text-secondary-foreground')}>
                        {style?.label ?? item.type}
                      </span>
                      <span className="flex items-center gap-2 text-xs text-muted-foreground">
                        {!item.read && <span className="h-2 w-2 rounded-full bg-primary" aria-label="Unread" />}
                        {formatDate(item.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-foreground">{item.title}</p>
                    <p className="text-sm leading-relaxed text-muted-foreground">{item.body}</p>
                    {item.link && (
                      <span className="mt-1 flex items-center gap-1 text-xs font-medium text-primary">
                        View details
                        <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </span>
                    )}
                  </button>
                </motion.li>
              )
            })}
          </ul>

          {hasMore && (
            <div className="mt-8 text-center">
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
