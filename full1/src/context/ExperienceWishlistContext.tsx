import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useToast } from '@/context/ToastContext'

const STORAGE_KEY = 'triplora-experience-wishlist'

interface ExperienceWishlistContextValue {
  wishlist: string[]
  isWishlisted: (slug: string) => boolean
  toggleWishlist: (slug: string, name?: string) => void
  wishlistCount: number
}

const ExperienceWishlistContext = createContext<ExperienceWishlistContextValue | undefined>(undefined)

export function ExperienceWishlistProvider({ children }: { children: ReactNode }) {
  const toast = useToast()
  const [wishlist, setWishlist] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? (JSON.parse(raw) as string[]) : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(wishlist))
    } catch {
      // storage unavailable — ignore
    }
  }, [wishlist])

  const isWishlisted = useCallback((slug: string) => wishlist.includes(slug), [wishlist])

  const toggleWishlist = useCallback(
    (slug: string, name?: string) => {
      const exists = wishlist.includes(slug)
      if (exists) {
        setWishlist((prev) => prev.filter((s) => s !== slug))
        toast.info(`Removed ${name ?? 'experience'} from Wishlist`)
      } else {
        setWishlist((prev) => [...prev, slug])
        toast.success(`Saved ${name ?? 'experience'} to Wishlist`)
      }
    },
    [wishlist, toast],
  )

  const value = useMemo(
    () => ({ wishlist, isWishlisted, toggleWishlist, wishlistCount: wishlist.length }),
    [wishlist, isWishlisted, toggleWishlist],
  )

  return <ExperienceWishlistContext.Provider value={value}>{children}</ExperienceWishlistContext.Provider>
}

export function useExperienceWishlist() {
  const ctx = useContext(ExperienceWishlistContext)
  if (!ctx) throw new Error('useExperienceWishlist must be used within ExperienceWishlistProvider')
  return ctx
}