import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Bell, BellOff, CheckCheck, ChevronRight } from 'lucide-react'
import { notificationsApi } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { useNotifications, notificationTypeStyles } from '@/context/NotificationContext'
import { cn } from '@/lib/utils'

function timeAgo(value: string): string {
  const seconds = Math.floor((Date.now() - new Date(value).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

export function NotificationBell() {
  const { user } = useAuth()
  const { unread, markRead, markAllRead } = useNotifications()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<Array<{ id: string; type: string; title: string; body: string; link: string | null; read: boolean; createdAt: string }>>([])
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const load = async () => {
    if (!user) return
    setLoading(true)
    try {
      const res = await notificationsApi.list({ limit: 6 })
      setItems(res.data)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  const toggle = () => {
    const next = !open
    setOpen(next)
    if (next) void load()
  }

  const handleOpen = (item: { id: string; link: string | null; read: boolean }) => {
    if (!item.read) void markRead(item.id)
    setOpen(false)
    if (item.link) navigate(item.link)
  }

  if (!user) return null

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-label={`Notifications, ${unread} unread`}
        aria-expanded={open}
        className="relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-foreground transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <Bell className="h-5 w-5" aria-hidden="true" />
        {unread > 0 && (
          <span className="absolute top-0.5 right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.96 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-border bg-card shadow-xl sm:w-96"
            style={{ maxWidth: 'calc(100vw - 1.5rem)' }}
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
              <button
                type="button"
                onClick={() => void markAllRead()}
                className="flex cursor-pointer items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
                Mark all read
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {loading ? (
                <p className="px-4 py-8 text-center text-sm text-muted-foreground">Loading...</p>
              ) : items.length === 0 ? (
                <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-muted-foreground">
                    <BellOff className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <p className="text-sm font-medium text-foreground">You're all caught up</p>
                  <p className="text-xs text-muted-foreground">
                    Booking updates, trip reminders and announcements will appear here.
                  </p>
                </div>
              ) : (
                <ul className="flex flex-col divide-y divide-border/60">
                  {items.map((item) => {
                    const style = notificationTypeStyles[item.type as keyof typeof notificationTypeStyles]
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => handleOpen(item)}
                          className={cn(
                            'flex w-full cursor-pointer flex-col gap-1 px-4 py-3 text-left transition-colors hover:bg-secondary/60',
                            !item.read && 'bg-primary/[0.03]',
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={cn(
                                'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                                style?.badge ?? 'bg-secondary text-secondary-foreground',
                              )}
                            >
                              {style?.label ?? item.type}
                            </span>
                            <span className="shrink-0 text-[11px] text-muted-foreground">
                              {timeAgo(item.createdAt)}
                            </span>
                          </div>
                          <p className="text-sm font-semibold text-foreground">{item.title}</p>
                          <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">{item.body}</p>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>

            <div className="border-t border-border p-2">
              <Link
                to="/notifications"
                onClick={() => setOpen(false)}
                className="flex items-center justify-center gap-1 rounded-xl px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-secondary"
              >
                View all notifications
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
