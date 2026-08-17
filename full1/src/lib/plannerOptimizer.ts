import type { PlannerTripDay, PlannerTripItem } from '@/lib/api'
import { haversineKm } from '@/lib/geo'

interface Coord {
  latitude: number
  longitude: number
}

function coordOf(item: PlannerTripItem): Coord | null {
  return typeof item.latitude === 'number' && typeof item.longitude === 'number'
    ? { latitude: item.latitude, longitude: item.longitude }
    : null
}

function centroid(items: PlannerTripItem[]): Coord | null {
  const coords = items.map(coordOf).filter((c): c is Coord => c !== null)
  if (coords.length === 0) return null
  const sum = coords.reduce(
    (acc, c) => ({ latitude: acc.latitude + c.latitude, longitude: acc.longitude + c.longitude }),
    { latitude: 0, longitude: 0 },
  )
  return { latitude: sum.latitude / coords.length, longitude: sum.longitude / coords.length }
}

function distanceTo(item: PlannerTripItem, target: Coord | null): number {
  const c = coordOf(item)
  if (!c || !target) return 0
  return haversineKm(c.latitude, c.longitude, target.latitude, target.longitude)
}

/**
 * Instant rule-based "AI Optimize": assigns every item to its geographically
 * closest day, orders stops nearest-first, places restaurants mid-day and
 * hotels at the end (overnight stay). Deterministic, offline, no API cost.
 */
export function optimizePlannerTripSmart(days: PlannerTripDay[]): PlannerTripDay[] {
  if (days.length === 0) return days

  const itemById = new Map<string, PlannerTripItem>()
  const originalDayOf = new Map<string, string>()
  for (const day of days) {
    for (const item of day.items) {
      itemById.set(item.id, item)
      originalDayOf.set(item.id, day.id)
    }
  }

  const dayCentroids = new Map<string, Coord | null>()
  for (const day of days) {
    dayCentroids.set(day.id, centroid(day.items))
  }

  const assigned = new Map<string, PlannerTripItem[]>(days.map((day) => [day.id, []]))
  for (const item of itemById.values()) {
    let bestDay = originalDayOf.get(item.id) ?? days[0].id
    let bestDistance = Infinity
    for (const day of days) {
      const d = distanceTo(item, dayCentroids.get(day.id) ?? null)
      if (d < bestDistance) {
        bestDistance = d
        bestDay = day.id
      }
    }
    assigned.get(bestDay)?.push(item)
  }

  // Safety: every day keeps at least one item; take extras from the fullest day.
  for (const day of days) {
    const list = assigned.get(day.id) ?? []
    if (list.length > 0 || itemById.size === 0) continue
    let source: string | null = null
    let sourceItems: PlannerTripItem[] = []
    for (const other of days) {
      const otherList = assigned.get(other.id) ?? []
      if (otherList.length > 1 && otherList.length > sourceItems.length) {
        source = other.id
        sourceItems = otherList
      }
    }
    if (source) {
      const moved = sourceItems.pop()!
      assigned.set(day.id, [moved])
    }
  }

  const orderWithin = (items: PlannerTripItem[]): PlannerTripItem[] => {
    if (items.length <= 1) return items
    const start = centroid(items)
    const ordered: PlannerTripItem[] = []
    const remaining = [...items]
    let cursor = start
    while (remaining.length > 0) {
      let nextIndex = 0
      let nextDistance = Infinity
      remaining.forEach((item, index) => {
        const d = distanceTo(item, cursor)
        if (d < nextDistance) {
          nextDistance = d
          nextIndex = index
        }
      })
      const next = remaining.splice(nextIndex, 1)[0]
      ordered.push(next)
      cursor = coordOf(next) ?? cursor
    }
    return ordered
  }

  return days.map((day) => {
    const items = assigned.get(day.id) ?? []
    const hotels = items.filter((item) => item.type === 'HOTEL')
    const attractions = items.filter((item) => item.type === 'DESTINATION' || item.type === 'EXPERIENCE')
    const restaurants = items.filter((item) => item.type === 'RESTAURANT')

    const routed = orderWithin([...attractions, ...restaurants])
    const meals: PlannerTripItem[] = []
    const stops: PlannerTripItem[] = []
    for (const item of routed) {
      if (item.type === 'RESTAURANT') meals.push(item)
      else stops.push(item)
    }
    // Insert meals at sensible spots: after 1/3 and 2/3 of the stops.
    const layout: PlannerTripItem[] = []
    const thirds = Math.max(1, Math.ceil(stops.length / 3))
    for (let i = 0; i < stops.length; i += 1) {
      layout.push(stops[i])
      const isMidPoint = (i + 1) % thirds === 0
      const isEarly = i < thirds
      if (isMidPoint && !isEarly && meals.length > 0) {
        layout.push(meals.shift()!)
      }
    }
    layout.push(...meals, ...hotels)
    return { ...day, title: day.title, notes: day.notes, items: layout }
  })
}