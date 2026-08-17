import type {
  Experience,
  Hotel,
  PlannerPackingItem,
  PlannerTrip,
  PlannerTripDay,
  PlannerTripItem,
  Restaurant,
  WeatherDay,
} from '@/lib/api'
import type { Destination } from '@/data/destinations'

export const PLANNER_ITEM_LABELS: Record<PlannerTripItem['type'], string> = {
  HOTEL: 'Hotel',
  RESTAURANT: 'Restaurant',
  DESTINATION: 'Destination',
  EXPERIENCE: 'Experience',
}

/** Builds a PlannerTripItem snapshot from raw catalog records (shared by the
 *  add-items drawer and the empty-itinerary AI suggestions). */
export function hotelToPlannerItem(h: Hotel): PlannerTripItem {
  return {
    id: `${crypto.randomUUID()}`,
    type: 'HOTEL',
    refId: h.id,
    name: h.name,
    city: h.location,
    location: h.location,
    latitude: h.latitude,
    longitude: h.longitude,
    image: h.image,
    price: h.priceFrom,
    rating: h.rating,
    duration: '',
    category: h.hotelType,
    slug: h.slug,
    href: `/hotels/${h.slug}`,
  }
}

export function restaurantToPlannerItem(r: Restaurant): PlannerTripItem {
  return {
    id: `${crypto.randomUUID()}`,
    type: 'RESTAURANT',
    refId: r.id,
    name: r.name,
    city: r.city,
    location: r.address,
    latitude: r.latitude,
    longitude: r.longitude,
    image: r.image,
    price: restaurantEstimate(r.priceLevel),
    rating: r.rating,
    duration: '',
    category: r.category,
    slug: r.slug,
    href: `/restaurants/${r.slug}`,
  }
}

export function destinationToPlannerItem(d: Destination): PlannerTripItem {
  return {
    id: `${crypto.randomUUID()}`,
    type: 'DESTINATION',
    refId: d.id,
    name: d.name,
    city: d.region,
    location: `${d.name}, ${d.region}`,
    latitude: d.latitude ?? null,
    longitude: d.longitude ?? null,
    image: d.image,
    price: d.priceFrom,
    rating: d.rating,
    duration: d.duration,
    category: d.category,
    slug: d.slug,
    href: `/destinations/${d.slug}`,
  }
}

export function experienceToPlannerItem(e: Experience): PlannerTripItem {
  return {
    id: `${crypto.randomUUID()}`,
    type: 'EXPERIENCE',
    refId: e.id,
    name: e.name,
    city: e.city,
    location: e.location,
    latitude: e.latitude,
    longitude: e.longitude,
    image: e.image,
    price: e.price,
    rating: e.rating,
    duration: e.duration,
    category: e.category,
    slug: e.slug,
    href: `/experiences/${e.slug}`,
  }
}

/** Suggested start times along the day timeline (9 AM start, ~2h per item). */
export function timeForIndex(index: number): string {
  const start = 9 * 60
  const minutes = start + index * 2 * 60
  const h24 = Math.floor(minutes / 60) % 24
  const mins = minutes % 60
  const suffix = h24 >= 12 ? 'PM' : 'AM'
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12
  return `${h12}:${String(mins).padStart(2, '0')} ${suffix}`
}

/** Estimated per-person cost for a restaurant from its price level (1-4). */
export function restaurantEstimate(priceLevel: number): number {
  const table: Record<number, number> = { 1: 300, 2: 700, 3: 1200, 4: 2000 }
  return table[priceLevel] ?? 600
}

export function itemCostLabel(item: PlannerTripItem): string {
  if (item.type === 'HOTEL') return `from ₹${item.price.toLocaleString('en-IN')} / night`
  if (item.type === 'RESTAURANT') return `est. ₹${item.price.toLocaleString('en-IN')} / person`
  return `₹${item.price.toLocaleString('en-IN')} / person`
}

/** Great-circle distance in km between two coordinate pairs (haversine). */
export function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(bLat - aLat)
  const dLng = toRad(bLng - aLng)
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}

/**
 * Indicative transport estimate for a day: ~₹14/km between consecutive stops
 * with coordinates, with a ₹80 base fare per leg (auto/rickshaw) so tight
 * city hops still count. Rounded to the nearest ₹10.
 */
export function transportEstimate(day: PlannerTripDay): number {
  const legs: Array<{ from: PlannerTripItem; to: PlannerTripItem }> = []
  for (let i = 0; i + 1 < day.items.length; i++) {
    const a = day.items[i]
    const b = day.items[i + 1]
    const bothHaveCoords =
      a.latitude != null && a.longitude != null && b.latitude != null && b.longitude != null
    if (bothHaveCoords) legs.push({ from: a, to: b })
  }
  const total = legs.reduce((sum, leg) => {
    const km = haversineKm(leg.from.latitude!, leg.from.longitude!, leg.to.latitude!, leg.to.longitude!)
    return sum + Math.max(80, Math.round(km * 14))
  }, 0)
  return Math.round(total / 10) * 10
}

export const PLANNER_BUDGET_CATEGORIES: Array<{ key: PlannerBudgetSectionType; label: string }> = [
  { key: 'HOTEL', label: 'Hotels' },
  { key: 'RESTAURANT', label: 'Restaurants' },
  { key: 'DESTINATION', label: 'Destinations' },
  { key: 'EXPERIENCE', label: 'Experiences' },
  { key: 'TRANSPORT', label: 'Transport' },
]

export type PlannerBudgetSectionType = PlannerTripItem['type'] | 'TRANSPORT'

export interface BudgetSection {
  type: PlannerBudgetSectionType
  label: string
  total: number
  count: number
}

export interface BudgetBreakdown {
  total: number
  byDay: Array<{ dayId: string; title: string; total: number; count: number; transport: number }>
  byCategory: BudgetSection[]
}

export function computeBudget(trip: Pick<PlannerTrip, 'days'>): BudgetBreakdown {
  const byCategory = new Map<PlannerBudgetSectionType, BudgetSection>()
  const dayTotals: Array<{ dayId: string; title: string; total: number; count: number; transport: number }> = []
  let total = 0

  for (const day of trip.days) {
    let dayTotal = 0
    for (const item of day.items) {
      dayTotal += item.price
      const entry = byCategory.get(item.type) ?? { type: item.type, label: PLANNER_ITEM_LABELS[item.type], total: 0, count: 0 }
      entry.total += item.price
      entry.count += 1
      byCategory.set(item.type, entry)
    }
    const transport = transportEstimate(day)
    dayTotal += transport
    total += dayTotal
    dayTotals.push({ dayId: day.id, title: day.title, total: dayTotal, count: day.items.length, transport })
  }

  const transportTotal = dayTotals.reduce((sum, day) => sum + day.transport, 0)
  if (transportTotal > 0) {
    byCategory.set('TRANSPORT', { type: 'TRANSPORT', label: 'Transport', total: transportTotal, count: dayTotals.length })
  }

  const ordered: BudgetSection[] = []
  for (const cat of PLANNER_BUDGET_CATEGORIES) {
    const entry = byCategory.get(cat.key)
    if (entry) ordered.push(entry)
  }

  return { total, byDay: dayTotals, byCategory: ordered }
}

/** Packing checklist auto-generated from the trip's categories (deterministic). */
export function generatePackingList(trip: Pick<PlannerTrip, 'days'>): string[] {
  const all = trip.days
    .flatMap((d) => d.items)
    .flatMap((item) => `${item.name} ${item.category} ${item.location}`.toLowerCase())
    .join(' ')
  const has = (...terms: string[]) => terms.some((t) => all.includes(t))

  const list: string[] = [
    'Valid ID cards & booking confirmations',
    'Light cotton clothing',
    'Comfortable walking shoes',
    'Rain jacket or compact umbrella',
    'Sunscreen (SPF 50+)',
    'Personal medicines & basic first-aid kit',
    'Reusable water bottle',
    'Phone charger & power bank',
    'Small daypack',
  ]

  if (has('beach', 'varkala', 'kovalam', 'marari', 'cherai', 'kappad', 'swim', 'surf')) {
    list.push('Swimsuit', 'Beach towel', 'Flip-flops', 'Sunglasses', 'Waterproof phone pouch')
  }
  if (has('wildlife', 'elephant', 'tiger', 'safari', 'forest', 'bird')) {
    list.push('Binoculars', 'Neutral-coloured clothing', 'Camera with zoom lens')
  }
  if (has('hill', 'waterfall', 'trek', 'adventure', 'peak', 'munnar', 'vagamon')) {
    list.push('Trekking shoes', 'Light raincoat', 'Insect repellent', 'Energy snacks')
  }
  if (has('backwater', 'houseboat', 'kayak', 'canoe', 'kumarakom', 'boat', 'alleppey')) {
    list.push('Dry bag or zip pouches', 'Hat / cap', 'Waterproof case for phone')
  }
  if (has('ayurveda', 'wellness', 'spa', 'yoga', 'massage')) {
    list.push('Loose, comfortable spa clothing')
  }
  if (has('heritage', 'temple', 'theyyam', 'culture', 'kathakali', 'palace', 'museum')) {
    list.push('Modest clothing (shoulders & knees covered)', 'Sarong or scarf')
  }
  if (has('food', 'spice', 'sadhya', 'toddy', 'biryani', 'cooking')) {
    list.push('Wet wipes & tissues')
  }
  if (has('camp', 'fire', 'night')) {
    list.push('Headlamp / torch', 'Light jacket or sweater')
  }

  return [...new Set(list)]
}

export function withChecked(labels: string[], existing: PlannerPackingItem[]): PlannerPackingItem[] {
  const existingMap = new Map(existing.map((item) => [item.label, item.checked]))
  return labels.map((label) => ({ label, checked: existingMap.get(label) ?? false }))
}

/** Picks the weather forecast row for a trip day (respects a start date). */
export function weatherForDay(
  daily: WeatherDay[] | undefined,
  dayIndex: number,
  startDate: string | null,
): WeatherDay | null {
  if (!daily || daily.length === 0) return null
  if (startDate) {
    const target = new Date(startDate)
    target.setDate(target.getDate() + dayIndex)
    const key = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}-${String(target.getDate()).padStart(2, '0')}`
    const match = daily.find((d) => d.date.startsWith(key))
    if (match) return match
  }
  return daily[dayIndex] ?? null
}

export function dayAnchorCity(day: PlannerTripDay): string {
  const cities = new Map<string, number>()
  for (const item of day.items) {
    const key = item.city.trim()
    if (!key) continue
    cities.set(key, (cities.get(key) ?? 0) + 1)
  }
  let best = ''
  let bestCount = 0
  for (const [city, count] of cities) {
    if (count > bestCount) {
      best = city
      bestCount = count
    }
  }
  return best
}

/** Google Maps directions link for a day's route (origin -> stops -> destination). */
export function googleMapsDayUrl(day: PlannerTripDay, title: string): string {
  const stops = day.items.filter((item) => item.latitude != null && item.longitude != null).slice(0, 10)
  if (stops.length === 0) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(title || day.title || 'Kerala')}`
  }
  const first = stops[0]
  const rest = stops.slice(1)
  const base = `https://www.google.com/maps/dir/?api=1&origin=${first.latitude},${first.longitude}&destination=${first.latitude},${first.longitude}`
  if (rest.length === 0) return base
  const waypoints = rest.map((s) => `${s.latitude},${s.longitude}`).join('|')
  return `${base}&waypoints=${encodeURIComponent(waypoints)}`
}

/**
 * Keyless Google Maps embed iframe URL rendering the day's route polyline
 * (saddr/daddr + intermediate stops with output=embed). Falls back to a plain
 * map centred on the day's anchor when fewer than 2 stops have coordinates.
 */
export function googleMapsEmbedUrl(day: PlannerTripDay): string {
  const stops = day.items.filter((item) => item.latitude != null && item.longitude != null).slice(0, 10)
  const first = stops[0]
  if (!first || stops.length < 2) {
    if (!first) {
      const city = dayAnchorCity(day)
      return `https://maps.google.com/maps?q=${encodeURIComponent(city || day.title || 'Kerala')}&output=embed&z=10`
    }
    return `https://maps.google.com/maps?q=${first.latitude},${first.longitude}&output=embed&z=12`
  }
  const saddr = `${first.latitude},${first.longitude}`
  const daddr = stops
    .slice(1)
    .map((s) => `${s.latitude},${s.longitude}`)
    .join('+to:')
  return `https://maps.google.com/maps?saddr=${saddr}&daddr=${encodeURIComponent(daddr)}&output=embed&z=11`
}