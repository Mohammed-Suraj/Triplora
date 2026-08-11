import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { wishlistApi, type WishlistEntry } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import type { Destination } from '@/data/destinations'

interface WishlistContextValue {
  wishlist: string[]
  wishlistDestinations: Destination[]
  isWishlisted: (id: string) => boolean
  toggleWishlist: (id: string) => void
  loading: boolean
}

const WishlistContext = createContext<WishlistContextValue | undefined>(undefined)

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [entries, setEntries] = useState<WishlistEntry[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!user) {
      setEntries([])
      return
    }
    let active = true
    setLoading(true)
    wishlistApi
      .list()
      .then((res) => {
        if (active) setEntries(res.data)
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [user])

  const wishlist = useMemo(() => entries.map((entry) => entry.destination.id), [entries])
  const wishlistDestinations = useMemo(() => entries.map((entry) => entry.destination), [entries])

  const isWishlisted = useCallback((id: string) => wishlist.includes(id), [wishlist])

  const toggleWishlist = useCallback(
    (id: string) => {
      if (!user) {
        toast.info('Please log in to save destinations to your wishlist')
        navigate('/login')
        return
      }
      const existing = entries.find((entry) => entry.destination.id === id)
      if (existing) {
        setEntries((prev) => prev.filter((entry) => entry.id !== existing.id))
        toast.info(`Removed ${existing.destination.name} from Wishlist`)
        wishlistApi.remove(existing.id).catch(() => {
          setEntries((prev) => [...prev, existing])
          toast.error('Failed to update wishlist')
        })
      } else {
        wishlistApi
          .add(id)
          .then((res) => {
            setEntries((prev) => [...prev, res.data])
            toast.success(`Saved ${res.data.destination.name} to Wishlist`)
          })
          .catch(() => {
            toast.error('Failed to add destination to wishlist')
          })
      }
    },
    [entries, user, navigate, toast],
  )

  const value = useMemo(
    () => ({ wishlist, wishlistDestinations, isWishlisted, toggleWishlist, loading }),
    [wishlist, wishlistDestinations, isWishlisted, toggleWishlist, loading],
  )

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>
}

export function useWishlist() {
  const ctx = useContext(WishlistContext)
  if (!ctx) throw new Error('useWishlist must be used within WishlistProvider')
  return ctx
}
