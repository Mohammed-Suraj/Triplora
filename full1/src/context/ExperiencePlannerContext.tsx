import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useToast } from '@/context/ToastContext'

const STORAGE_KEY = 'triplora-experience-planner'

export interface PlannedExperience {
  slug: string
  name: string
  city: string
  price: number
  duration: string
}

interface ExperiencePlannerContextValue {
  planned: PlannedExperience[]
  isPlanned: (slug: string) => boolean
  addToPlanner: (item: PlannedExperience) => void
  removeFromPlanner: (slug: string) => void
  clearPlanner: () => void
  plannedCount: number
  plannedTotal: number
}

const ExperiencePlannerContext = createContext<ExperiencePlannerContextValue | undefined>(undefined)

export function ExperiencePlannerProvider({ children }: { children: ReactNode }) {
  const toast = useToast()
  const [planned, setPlanned] = useState<PlannedExperience[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? (JSON.parse(raw) as PlannedExperience[]) : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(planned))
    } catch {
      // storage unavailable — ignore
    }
  }, [planned])

  const isPlanned = useCallback((slug: string) => planned.some((p) => p.slug === slug), [planned])

  const addToPlanner = useCallback(
    (item: PlannedExperience) => {
      setPlanned((prev) => {
        if (prev.some((p) => p.slug === item.slug)) return prev
        return [...prev, item]
      })
      toast.success(`Added ${item.name} to Trip Planner`)
    },
    [toast],
  )

  const removeFromPlanner = useCallback(
    (slug: string) => {
      setPlanned((prev) => prev.filter((p) => p.slug !== slug))
      toast.info('Removed from Trip Planner')
    },
    [toast],
  )

  const clearPlanner = useCallback(() => {
    setPlanned([])
    toast.info('Trip Planner cleared')
  }, [toast])

  const value = useMemo(
    () => ({
      planned,
      isPlanned,
      addToPlanner,
      removeFromPlanner,
      clearPlanner,
      plannedCount: planned.length,
      plannedTotal: planned.reduce((sum, p) => sum + p.price, 0),
    }),
    [planned, isPlanned, addToPlanner, removeFromPlanner, clearPlanner],
  )

  return <ExperiencePlannerContext.Provider value={value}>{children}</ExperiencePlannerContext.Provider>
}

export function useExperiencePlanner() {
  const ctx = useContext(ExperiencePlannerContext)
  if (!ctx) throw new Error('useExperiencePlanner must be used within ExperiencePlannerProvider')
  return ctx
}