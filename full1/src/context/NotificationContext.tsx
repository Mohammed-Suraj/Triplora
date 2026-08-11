import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { notificationsApi, type NotificationItem } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'

interface NotificationContextValue {
  unread: number
  setUnread: (n: number) => void
  refresh: () => Promise<void>
  markRead: (id: string) => Promise<void>
  markAllRead: () => Promise<void>
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined)

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [unread, setUnread] = useState(0)
  const loggedInRef = useRef<boolean>(!!user)

  const refresh = useCallback(async () => {
    if (!loggedInRef.current) {
      setUnread(0)
      return
    }
    try {
      const res = await notificationsApi.unreadCount()
      setUnread(res.data.count)
    } catch {
      // ignore — bell badge is best-effort
    }
  }, [])

  useEffect(() => {
    loggedInRef.current = !!user
    if (!user) {
      setUnread(0)
      return
    }
    refresh()
    const interval = window.setInterval(refresh, 60_000)
    return () => window.clearInterval(interval)
  }, [user, refresh])

  const markRead = useCallback(
    async (id: string) => {
      try {
        await notificationsApi.markRead(id)
        setUnread((u) => Math.max(0, u - 1))
      } catch {
        // ignore
      }
    },
    [],
  )

  const markAllRead = useCallback(async () => {
    try {
      await notificationsApi.markAllRead()
      setUnread(0)
    } catch {
      // ignore
    }
  }, [])

  return (
    <NotificationContext.Provider value={{ unread, setUnread, refresh, markRead, markAllRead }}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications(): NotificationContextValue {
  const ctx = useContext(NotificationContext)
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider')
  return ctx
}

export const notificationTypeStyles: Record<
  NotificationItem['type'],
  { label: string; badge: string }
> = {
  BOOKING_CONFIRMED: { label: 'Booking confirmed', badge: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' },
  BOOKING_CANCELLED: { label: 'Booking cancelled', badge: 'bg-red-500/15 text-red-600 dark:text-red-400' },
  PAYMENT_SUCCESS: { label: 'Payment success', badge: 'bg-blue-500/15 text-blue-600 dark:text-blue-400' },
  TRIP_REMINDER: { label: 'Trip reminder', badge: 'bg-amber-500/15 text-amber-600 dark:text-amber-400' },
  WISHLIST_UPDATE: { label: 'Wishlist update', badge: 'bg-pink-500/15 text-pink-600 dark:text-pink-400' },
  ADMIN_ANNOUNCEMENT: { label: 'Announcement', badge: 'bg-purple-500/15 text-purple-600 dark:text-purple-400' },
}
