export interface Destination {
  id: string
  slug: string
  name: string
  tagline: string
  region: string
  category: string
  image: string
  rating: number
  reviews: number
  popularityScore?: number
  priceFrom: number
  latitude?: number | null
  longitude?: number | null
  duration: string
  bestSeason: string
  description: string
  longDescription: string
  highlights: string[]
  activities: string[]
  gallery: string[]
}

export const categories = [
  'All',
  'Hill Station',
  'Backwaters',
  'Beach',
  'Heritage',
  'Wildlife',
  'Waterfall',
  'Tea Plantation',
  'Island',
  'Pilgrimage',
  'Adventure',
  'Eco-Tourism',
  'Museum',
  'Zoo',
  'Church',
  'Mosque',
  'National Park',
  'Viewpoint',
  'Dam',
] as const
