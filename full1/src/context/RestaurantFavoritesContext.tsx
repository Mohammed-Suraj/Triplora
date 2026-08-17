import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useToast } from '@/context/ToastContext'

const STORAGE_KEY = 'triplora-restaurant-favorites'

interface RestaurantFavoritesContextValue {
  favorites: string[]
  isFavorite: (slug: string) => boolean
  toggleFavorite: (slug: string, name?: string) => void
  favoriteCount: number
}

const RestaurantFavoritesContext = createContext<RestaurantFavoritesContextValue | undefined>(undefined)

export function RestaurantFavoritesProvider({ children }: { children: ReactNode }) {
  const toast = useToast()
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? (JSON.parse(raw) as string[]) : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites))
    } catch {
      // storage unavailable — ignore
    }
  }, [favorites])

  const isFavorite = useCallback((slug: string) => favorites.includes(slug), [favorites])

  const toggleFavorite = useCallback(
    (slug: string, name?: string) => {
      const exists = favorites.includes(slug)
      if (exists) {
        setFavorites((prev) => prev.filter((s) => s !== slug))
        toast.info(`Removed ${name ?? 'restaurant'} from Favorites`)
      } else {
        setFavorites((prev) => [...prev, slug])
        toast.success(`Saved ${name ?? 'restaurant'} to Favorites`)
      }
    },
    [favorites, toast],
  )

  const value = useMemo(
    () => ({ favorites, isFavorite, toggleFavorite, favoriteCount: favorites.length }),
    [favorites, isFavorite, toggleFavorite],
  )

  return <RestaurantFavoritesContext.Provider value={value}>{children}</RestaurantFavoritesContext.Provider>
}

export function useRestaurantFavorites() {
  const ctx = useContext(RestaurantFavoritesContext)
  if (!ctx) throw new Error('useRestaurantFavorites must be used within RestaurantFavoritesProvider')
  return ctx
}
