import type { Destination } from '@/data/destinations'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api'
const TOKEN_KEY = 'triplora-token'

export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

export interface ApiEnvelope<T> {
  success: boolean
  message: string
  data: T
  meta?: PaginationMeta
}

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
    this.name = 'ApiError'
  }
}

export function getToken(): string | null {
  const token = localStorage.getItem(TOKEN_KEY)
  if (!token || token === 'null' || token === 'undefined' || token.trim() === '') {
    return null
  }
  return token
}

export function setToken(token: string | null | undefined): void {
  if (token && token !== 'null' && token !== 'undefined' && token.trim() !== '') {
    localStorage.setItem(TOKEN_KEY, token)
  } else {
    localStorage.removeItem(TOKEN_KEY)
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<ApiEnvelope<T>> {
  const token = getToken()
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    if (res.status === 401) {
      setToken(null)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('auth:unauthorized'))
      }
    }
    let msg = json?.message ?? 'Something went wrong. Please try again.'
    if (json?.errors && Array.isArray(json.errors) && json.errors.length > 0) {
      const detail = json.errors.map((e: { message: string }) => e.message).join('; ')
      msg = `${json.message ?? 'Validation failed'}: ${detail}`
    }
    throw new ApiError(msg, res.status)
  }
  return json as ApiEnvelope<T>
}

export const api = {
  get: <T>(path: string, signal?: AbortSignal) => request<T>(path, { signal }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body !== undefined ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PUT', body: body !== undefined ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: body !== undefined ? JSON.stringify(body) : undefined }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}

export interface SafeUser {
  id: string
  name: string
  email: string
  avatar: string | null
  role: 'USER' | 'ADMIN'
  createdAt: string
}

export interface EmailPreferences {
  bookingEmails: boolean
  marketingEmails: boolean
  aiPlannerEmails: boolean
  tripReminderEmails: boolean
}

export interface AuthResult {
  user: SafeUser
  accessToken: string
  refreshToken: string
}

export interface WishlistEntry {
  id: string
  createdAt: string
  destination: Destination
}

export interface ItineraryDay {
  day: number
  focus: string
  destination: Destination
}

export interface TripPlan {
  id: string
  title: string | null
  budget: string
  days: number
  travelStyle: string
  interests: string[]
  createdAt: string
  itinerary: ItineraryDay[]
  payload: AiTripPlanResult | null
}

export interface Review {
  id: string
  rating: number
  comment: string
  images: string[]
  createdAt: string
  likesCount: number
  likedByMe: boolean
  reportedByMe: boolean
  author: { id: string; name: string; avatar: string | null }
}

export interface ReviewStats {
  average: number
  total: number
  withImages: number
  distribution: Array<{ star: number; count: number }>
}

export interface ReviewListResult {
  items: Review[]
  stats: ReviewStats
}

export interface ReviewReportItem {
  id: string
  reason: string
  status: 'OPEN' | 'RESOLVED' | 'DISMISSED'
  createdAt: string
  user: { id: string; name: string; email: string }
  review: {
    id: string
    rating: number
    comment: string
    createdAt: string
    user: { id: string; name: string }
    destination: { id: string; name: string; slug: string }
  }
}

export interface AdminCategory {
  id: string
  name: string
  slug: string
  description: string | null
}

export interface DestinationInput {
  name: string
  tagline: string
  region: string
  categoryId: string
  priceFrom: number
  duration: string
  bestSeason: string
  description: string
  longDescription: string
  highlights: string[]
  activities: string[]
  gallery: string[]
  image: string
  isFeatured?: boolean
  latitude?: number | null
  longitude?: number | null
}

export const categoriesApi = {
  list: () => api.get<AdminCategory[]>('/categories'),
}

export const destinationsApi = {
  list: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString()
    return api.get<Destination[]>('/destinations' + (qs ? '?' + qs : ''))
  },
  get: (idOrSlug: string) => api.get<Destination>('/destinations/' + idOrSlug),
  search: (q: string, limit = 8) =>
    api.get<Destination[]>('/destinations/search?q=' + encodeURIComponent(q) + '&limit=' + limit),
  create: (body: DestinationInput) => api.post<Destination>('/destinations', body),
  update: (id: string, body: Partial<DestinationInput>) =>
    api.patch<AdminDestination>('/admin/destinations/' + id, body),
  remove: (id: string) => api.del<null>('/admin/destinations/' + id),
}

export const authApi = {
  register: (body: { name: string; email: string; password: string }) =>
    api.post<AuthResult>('/auth/register', body),
  login: (body: { email: string; password: string }) => api.post<AuthResult>('/auth/login', body),
  logout: () => api.post<null>('/auth/logout'),
  profile: () => api.get<SafeUser>('/auth/profile'),
  updateProfile: (body: { name?: string; avatar?: string | null }) => api.put<SafeUser>('/auth/profile', body),
  changePassword: (body: { oldPassword: string; newPassword: string }) =>
    api.post<null>('/auth/change-password', body),
  getEmailPreferences: () => api.get<EmailPreferences>('/auth/email-preferences'),
  updateEmailPreferences: (body: Partial<EmailPreferences>) =>
    api.put<EmailPreferences>('/auth/email-preferences', body),
}

export const wishlistApi = {
  list: () => api.get<WishlistEntry[]>('/wishlist'),
  add: (destinationId: string) => api.post<WishlistEntry>('/wishlist', { destinationId }),
  remove: (wishlistId: string) => api.del<null>('/wishlist/' + wishlistId),
}

export const tripPlanApi = {
  create: (body: { budget: string; days: number; travelStyle: string; interests: string[] }) =>
    api.post<TripPlan>('/trip-plan', body),
  save: (body: {
    title?: string
    budget: string
    days: number
    travelStyle: string
    interests: string[]
    payload: AiTripPlanResult
  }) => api.post<TripPlan>('/trip-plan/save', body),
  list: () => api.get<TripPlan[]>('/trip-plan'),
  get: (id: string) => api.get<TripPlan>('/trip-plan/' + id),
  updateTitle: (id: string, title: string) => api.patch<TripPlan>('/trip-plan/' + id, { title }),
  duplicate: (id: string) => api.post<TripPlan>('/trip-plan/' + id + '/duplicate'),
  remove: (id: string) => api.del<null>('/trip-plan/' + id),
  chat: (id: string, body: { message: string; history: ChatMessage[] }) =>
    api.post<TripPlan>('/trip-plan/' + id + '/chat', body),
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface EmergencyContact {
  label: string
  phone: string
}

export interface AiItineraryDay {
  day: number
  focus: string
  morning: string
  afternoon: string
  evening: string
  hotels: string[]
  restaurants: string[]
  foodRecommendations: string[]
  estimatedDailyCost: string
  localTransportation: string[]
  nearbyAttractions: string[]
  hiddenGems: string[]
  shopping: string[]
  travelNotes: string
  destination: Destination
}

export interface AiTripPlanResult {
  title: string
  summary: string
  bestSeason: string
  weatherAdvice: string
  packingChecklist: string[]
  travelTips: string[]
  emergencyContacts: EmergencyContact[]
  estimatedTotalBudget: string
  itinerary: AiItineraryDay[]
}

export interface AiTripPlanParsed {
  destination: string | null
  days: number
  budget: 'RELAXED' | 'PREMIUM' | 'LUXURY'
  travelStyle: 'ROMANTIC' | 'FAMILY' | 'SOLO' | 'FRIENDS'
  interests: string[]
  travelers: string | null
}

export interface AiNaturalTripResult {
  plan: AiTripPlanResult
  parsed: AiTripPlanParsed
}

export const aiTripPlanApi = {
  generate: (body: {
    budget: string
    days: number
    travelStyle: string
    interests: string[]
    destination?: string | null
  }) => api.post<AiTripPlanResult>('/ai/trip-plan', body),
  natural: (prompt: string) => api.post<AiNaturalTripResult>('/ai/trip-plan/natural', { prompt }),
}

export const contactApi = {
  send: (body: { name: string; email: string; phone?: string; subject?: string; message: string }) =>
    api.post('/contact', body),
}

export interface WeatherCurrent {
  temperature: number
  feelsLike: number
  condition: string
  code: number
  humidity: number
  windSpeed: number
  rainProbability: number
  uvIndex: number
  visibilityKm: number
  sunrise: string
  sunset: string
}

export interface WeatherDay {
  date: string
  dayLabel: string
  condition: string
  code: number
  min: number
  max: number
}

export interface WeatherData {
  location: { latitude: number; longitude: number }
  current: WeatherCurrent
  daily: WeatherDay[]
  fetchedAt: string
}

export const weatherApi = {
  get: (latitude: number, longitude: number) =>
    api.get<WeatherData | null>(`/weather?latitude=${latitude}&longitude=${longitude}`),
}

export const reviewsApi = {
  listByDestination: (destinationId: string) =>
    api.get<ReviewListResult>('/destinations/' + destinationId + '/reviews'),
  stats: (destinationId: string) => api.get<ReviewStats>('/reviews/stats/' + destinationId),
  create: (body: { destinationId: string; rating: number; comment: string; images?: string[] }) =>
    api.post<Review>('/reviews', body),
  update: (id: string, body: { rating?: number; comment?: string; images?: string[] }) =>
    api.patch<Review>('/reviews/' + id, body),
  remove: (id: string) => api.del<null>('/reviews/' + id),
  toggleLike: (id: string) => api.post<{ liked: boolean; likesCount: number }>('/reviews/' + id + '/like'),
  report: (id: string, reason: string) => api.post<null>('/reviews/' + id + '/report', { reason }),
  uploadImage: (file: File) => {
    const form = new FormData()
    form.append('image', file)
    const token = getToken()
    return fetch(`${BASE_URL}/reviews/upload`, {
      method: 'POST',
      credentials: 'include',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    }).then(async (res) => {
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new ApiError(json?.message ?? 'Image upload failed', res.status)
      return json as ApiEnvelope<{ url: string }>
    })
  },
}

export interface AssistantMessageDto {
  id: string
  role: 'USER' | 'ASSISTANT'
  content: string
  createdAt: string
}

export interface AssistantConversationSummary {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  messageCount: number
  lastMessage: string | null
}

export interface AssistantChatResult {
  conversationId: string
  title: string
  reply: string
  destinations: Destination[]
}

export interface AssistantConversationDetail {
  conversation: AssistantConversationSummary
  messages: AssistantMessageDto[]
}

export const assistantApi = {
  chat: (message: string, conversationId?: string | null) =>
    api.post<AssistantChatResult>('/ai/assistant/chat', { message, conversationId: conversationId ?? null }),
  conversations: () => api.get<AssistantConversationSummary[]>('/ai/assistant/conversations'),
  get: (id: string) => api.get<AssistantConversationDetail>('/ai/assistant/conversations/' + id),
  remove: (id: string) => api.del<null>('/ai/assistant/conversations/' + id),
}

export interface NotificationItem {
  id: string
  type:
    | 'BOOKING_CONFIRMED'
    | 'BOOKING_CANCELLED'
    | 'PAYMENT_SUCCESS'
    | 'TRIP_REMINDER'
    | 'WISHLIST_UPDATE'
    | 'ADMIN_ANNOUNCEMENT'
  title: string
  body: string
  link: string | null
  read: boolean
  createdAt: string
}

export const notificationsApi = {
  list: (params: { page?: number; limit?: number } = {}) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString()
    return api.get<NotificationItem[]>('/notifications' + (qs ? '?' + qs : ''))
  },
  unreadCount: () => api.get<{ count: number }>('/notifications/unread-count'),
  markRead: (id: string) => api.patch<NotificationItem>('/notifications/' + id + '/read'),
  markAllRead: () => api.patch<{ updated: number }>('/notifications/read-all'),
}

export interface SmartSearchFilters {
  categories: string[]
  region: string | null
  maxPrice: number | null
  minPrice: number | null
  minRating: number | null
  duration: string | null
  travelStyle: string | null
  season: string | null
  crowd: string | null
  proximity: { label: string; radiusKm: number } | null
  keywords: string[]
}

export interface SmartSearchItem {
  destination: Destination
  score: number
  reasons: string[]
}

export interface SmartSearchResult {
  items: SmartSearchItem[]
  filters: SmartSearchFilters
  explanation: string
  usedAi: boolean
  noExactMatch: boolean
  suggestions: string[]
  meta?: PaginationMeta
}

export interface SmartSearchSuggestion {
  type: 'destination' | 'category' | 'region' | 'activity'
  label: string
  value: string
}

export const smartSearchApi = {
  search: (q: string) =>
    api.get<SmartSearchResult>('/destinations/smart-search?q=' + encodeURIComponent(q) + '&limit=24'),
  suggest: (q: string, signal?: AbortSignal) =>
    api.get<SmartSearchSuggestion[]>('/destinations/suggest?q=' + encodeURIComponent(q), signal),
}

export interface Recommendation {
  destination: Destination
  score: number
  reasons: string[]
}

export const recommendationsApi = {
  list: (limit = 8) => api.get<Recommendation[]>('/recommendations?limit=' + limit),
}

export type HotelType = 'HOTEL' | 'RESORT' | 'VILLA' | 'HOMESTAY' | 'BACKPACKER'

export interface HotelRoom {
  id: string
  name: string
  description: string | null
  pricePerNight: number
  maxGuests: number
  bedType: string
  totalRooms: number
  amenities: string[]
  images: string[]
}

export interface Hotel {
  id: string
  slug: string
  name: string
  tagline: string
  description: string
  longDescription: string
  image: string
  gallery: string[]
  starRating: number
  rating: number
  reviewsCount: number
  popularityScore: number
  priceFrom: number
  hotelType: HotelType
  location: string
  latitude: number | null
  longitude: number | null
  distanceFromAttraction: number
  checkIn: string
  checkOut: string
  cancellationPolicy: string
  amenities: string[]
  familyFriendly: boolean
  coupleFriendly: boolean
  freeBreakfast: boolean
  freeWiFi: boolean
  swimmingPool: boolean
  parking: boolean
  airConditioning: boolean
  nearbyAttractions: string[]
  nearbyRestaurants: string[]
  nearbyTransport: string[]
  destination: { id: string; name: string; slug: string; region: string }
  rooms?: HotelRoom[]
  similar?: Hotel[]
  isActive?: boolean
}

export interface HotelListResult extends Array<Hotel> {}

export interface HotelBookingResult {
  id: string
  bookingId: string
  checkIn: string
  checkOut: string
  guests: number
  rooms: number
  nights: number
  pricePerNight: number
  taxes: number
  amount: number
  fullName: string
  email: string
  phone: string
  specialRequests: string | null
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED'
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED'
  createdAt: string
  hotel: {
    id: string
    name: string
    slug: string
    image: string
    location: string
    latitude: number | null
    longitude: number | null
  }
  room: { id: string; name: string; bedType: string; maxGuests: number; images: string[] }
}

export interface HotelBookingsResult {
  upcoming: HotelBookingResult[]
  past: HotelBookingResult[]
  all: HotelBookingResult[]
}

export interface HotelReview {
  id: string
  rating: number
  comment: string
  images: string[]
  stayDate: string | null
  createdAt: string
  user: { id: string; name: string; avatar: string | null }
}

export interface HotelReviewListResult {
  items: HotelReview[]
  stats: {
    average: number
    total: number
    withImages: number
    distribution: Array<{ star: number; count: number }>
  }
}

export interface HotelFilters {
  q?: string
  destination?: string
  hotelType?: string
  minPrice?: number | null
  maxPrice?: number | null
  minRating?: number | null
  familyFriendly?: boolean
  coupleFriendly?: boolean
  freeBreakfast?: boolean
  freeWiFi?: boolean
  swimmingPool?: boolean
  parking?: boolean
  airConditioning?: boolean
}

export interface HotelInput {
  name: string
  tagline: string
  description: string
  longDescription?: string
  image: string
  gallery: string[]
  starRating: number
  priceFrom: number
  hotelType: HotelType
  location: string
  latitude?: number | null
  longitude?: number | null
  distanceFromAttraction: number
  checkIn: string
  checkOut: string
  cancellationPolicy: string
  amenities: string[]
  familyFriendly: boolean
  coupleFriendly: boolean
  freeBreakfast: boolean
  freeWiFi: boolean
  swimmingPool: boolean
  parking: boolean
  airConditioning: boolean
  nearbyAttractions: string[]
  nearbyRestaurants: string[]
  nearbyTransport: string[]
  destinationId: string
}

export interface HotelRoomInput {
  name: string
  description?: string | null
  pricePerNight: number
  maxGuests: number
  bedType: string
  totalRooms: number
  amenities: string[]
  images: string[]
}

export const hotelsApi = {
  list: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString()
    return api.get<HotelListResult>('/hotels' + (qs ? '?' + qs : ''))
  },
  get: (idOrSlug: string) => api.get<Hotel & { similar: Hotel[] }>('/hotels/' + idOrSlug),
  byDestination: (destinationIdOrSlug: string, params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString()
    return api.get<HotelListResult>('/hotels/destination/' + destinationIdOrSlug + (qs ? '?' + qs : ''))
  },
  recommend: (params: { style?: string; destination?: string; limit?: number }) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString()
    return api.get<Hotel[]>('/hotels/recommend?' + qs)
  },
  create: (body: HotelInput) => api.post<Hotel>('/hotels', body),
  update: (id: string, body: Partial<HotelInput> & { isActive?: boolean }) =>
    api.patch<Hotel>('/hotels/' + id, body),
  remove: (id: string) => api.del<null>('/hotels/' + id),
  uploadImage: (file: File) => {
    const form = new FormData()
    form.append('image', file)
    const token = getToken()
    return fetch(`${BASE_URL}/hotels/upload`, {
      method: 'POST',
      credentials: 'include',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    }).then(async (res) => {
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new ApiError(json?.message ?? 'Image upload failed', res.status)
      return json as ApiEnvelope<{ url: string }>
    })
  },
  createRoom: (hotelId: string, body: HotelRoomInput) => api.post<HotelRoom>('/hotels/' + hotelId + '/rooms', body),
  updateRoom: (roomId: string, body: Partial<HotelRoomInput>) => api.patch<HotelRoom>('/hotels/rooms/' + roomId, body),
  removeRoom: (roomId: string) => api.del<null>('/hotels/rooms/' + roomId),
  book: (body: {
    hotelId: string
    roomId: string
    checkIn: string
    checkOut: string
    guests: number
    rooms: number
    fullName: string
    email: string
    phone: string
    specialRequests?: string
  }) => api.post<HotelBookingResult>('/hotels/' + body.hotelId + '/book', body),
  myBookings: () => api.get<HotelBookingsResult>('/hotels/bookings/mine'),
  getBooking: (id: string) => api.get<HotelBookingResult>('/hotels/bookings/' + id),
  getBookingByBookingId: (bookingId: string) =>
    api.get<HotelBookingResult>('/hotels/bookings/booking-id/' + bookingId),
  cancelBooking: (id: string) => api.patch<HotelBookingResult>('/hotels/bookings/' + id + '/cancel'),
  adminBookings: (params: { page?: number; limit?: number; status?: string; search?: string } = {}) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString()
    return api.get<HotelBookingResult[]>('/hotels/bookings/admin' + (qs ? '?' + qs : ''))
  },
  updateBookingStatus: (id: string, status: string) =>
    api.patch<HotelBookingResult>('/hotels/bookings/' + id + '/status', { status }),
}

export type RestaurantCategory = 'KERALA' | 'SEAFOOD' | 'VEGETARIAN' | 'CAFE' | 'FINE_DINING' | 'BAKERY' | 'FAST_FOOD'

export const RESTAURANT_CATEGORY_LABELS: Record<RestaurantCategory, string> = {
  KERALA: 'Kerala',
  SEAFOOD: 'Seafood',
  VEGETARIAN: 'Vegetarian',
  CAFE: 'Café',
  FINE_DINING: 'Fine Dining',
  BAKERY: 'Bakery',
  FAST_FOOD: 'Fast Food',
}

export interface RestaurantPriceLevel {
  level: number
  symbol: string
  label: string
}

export const RESTAURANT_PRICE_LEVELS: RestaurantPriceLevel[] = [
  { level: 1, symbol: '₹', label: 'Budget' },
  { level: 2, symbol: '₹₹', label: 'Moderate' },
  { level: 3, symbol: '₹₹₹', label: 'Premium' },
  { level: 4, symbol: '₹₹₹₹', label: 'Luxury' },
]

export function priceLevelInfo(level: number): RestaurantPriceLevel {
  return RESTAURANT_PRICE_LEVELS.find((p) => p.level === level) ?? RESTAURANT_PRICE_LEVELS[1]
}

export interface Restaurant {
  id: string
  slug: string
  name: string
  tagline: string
  description: string
  longDescription: string
  category: RestaurantCategory
  cuisines: string[]
  priceRange: string
  priceLevel: number
  openingHours: string
  phone: string | null
  address: string
  city: string
  latitude: number | null
  longitude: number | null
  googleMapsUrl: string
  rating: number
  ratingNote: string
  reviewsCount: number
  popularityScore: number
  bestFor: string[]
  image: string
  gallery: string[]
  similar?: Restaurant[]
  isActive?: boolean
}

export interface RestaurantListResult extends Array<Restaurant> {}

export interface RestaurantFilters {
  q?: string
  category?: string
  city?: string
  minPriceLevel?: number | null
  maxPriceLevel?: number | null
  minRating?: number | null
}

export const restaurantsApi = {
  list: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString()
    return api.get<RestaurantListResult>('/restaurants' + (qs ? '?' + qs : ''))
  },
  get: (idOrSlug: string) => api.get<Restaurant & { similar: Restaurant[] }>('/restaurants/' + idOrSlug),
  recommend: (params: { craving?: string; category?: string; city?: string; limit?: number }) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString()
    return api.get<Restaurant[]>('/restaurants/recommend?' + qs)
  },
  create: (body: Partial<Restaurant>) => api.post<Restaurant>('/restaurants', body),
  update: (id: string, body: Partial<Restaurant>) => api.patch<Restaurant>('/restaurants/' + id, body),
  remove: (id: string) => api.del<null>('/restaurants/' + id),
}

// ---------------------------------------------------------------------------
// Local Experiences
// ---------------------------------------------------------------------------

export type ExperienceCategory =
  | 'ADVENTURE'
  | 'CULTURE'
  | 'WILDLIFE'
  | 'FOOD'
  | 'WELLNESS'
  | 'NATURE'
  | 'WATER_ACTIVITIES'

export const EXPERIENCE_CATEGORY_LABELS: Record<ExperienceCategory, string> = {
  ADVENTURE: 'Adventure',
  CULTURE: 'Culture',
  WILDLIFE: 'Wildlife',
  FOOD: 'Food',
  WELLNESS: 'Wellness',
  NATURE: 'Nature',
  WATER_ACTIVITIES: 'Water Activities',
}

export type ExperienceDifficulty = 'EASY' | 'MODERATE' | 'CHALLENGING'

export const EXPERIENCE_DIFFICULTY_LABELS: Record<ExperienceDifficulty, string> = {
  EASY: 'Easy',
  MODERATE: 'Moderate',
  CHALLENGING: 'Challenging',
}

export const EXPERIENCE_SUITABLE_FOR = ['Solo', 'Couple', 'Family', 'Friends'] as const

export interface Experience {
  id: string
  slug: string
  name: string
  tagline: string
  description: string
  longDescription: string
  category: ExperienceCategory
  duration: string
  price: number
  location: string
  city: string
  latitude: number | null
  longitude: number | null
  difficulty: ExperienceDifficulty
  bestSeason: string
  suitableFor: string[]
  highlights: string[]
  rating: number
  ratingNote: string
  reviewsCount: number
  popularityScore: number
  isFeatured: boolean
  image: string
  gallery: string[]
  similar?: Experience[]
  isActive?: boolean
}

export interface ExperienceListResult extends Array<Experience> {}

export interface ExperienceFilters {
  q?: string
  category?: string
  city?: string
  difficulty?: string
  minPrice?: number | null
  maxPrice?: number | null
  minRating?: number | null
}

export const experiencesApi = {
  list: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString()
    return api.get<ExperienceListResult>('/experiences' + (qs ? '?' + qs : ''))
  },
  get: (idOrSlug: string) => api.get<Experience & { similar: Experience[] }>('/experiences/' + idOrSlug),
  create: (body: Partial<Experience>) => api.post<Experience>('/experiences', body),
  update: (id: string, body: Partial<Experience>) => api.patch<Experience>('/experiences/' + id, body),
  remove: (id: string) => api.del<null>('/experiences/' + id),
}

export const hotelReviewsApi = {
  list: (hotelIdOrSlug: string) => api.get<HotelReviewListResult>('/hotels/' + hotelIdOrSlug + '/reviews'),
  create: (hotelId: string, body: { rating: number; comment: string; images?: string[]; stayDate?: string | null }) =>
    api.post<HotelReview>('/hotels/' + hotelId + '/reviews', body),
  update: (hotelId: string, reviewId: string, body: { rating?: number; comment?: string; images?: string[] }) =>
    api.patch<HotelReview>('/hotels/' + hotelId + '/reviews/' + reviewId, body),
  remove: (hotelId: string, reviewId: string) =>
    api.del<null>('/hotels/' + hotelId + '/reviews/' + reviewId),
  uploadImage: (file: File) => {
    const form = new FormData()
    form.append('image', file)
    const token = getToken()
    return fetch(`${BASE_URL}/hotels/upload`, {
      method: 'POST',
      credentials: 'include',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    }).then(async (res) => {
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new ApiError(json?.message ?? 'Image upload failed', res.status)
      return json as ApiEnvelope<{ url: string }>
    })
  },
}

export interface BookingResult {  id: string
  bookingId: string
  fullName: string
  email: string
  phone: string
  numberOfTravelers: number
  travelDate: string
  returnDate: string | null
  budget: number
  specialRequests: string | null
  status: string
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED'
  paymentId: string | null
  orderId: string | null
  amount: number | null
  currency: string | null
  paidAt: string | null
  paymentMethod: string | null
  createdAt: string
  destination: {
    id: string
    name: string
    slug: string
    image: string
    region?: string
  }
}

export const bookingApi = {
  create: (body: {
    destinationId: string
    fullName: string
    email: string
    phone: string
    numberOfTravelers: number
    travelDate: string
    returnDate?: string
    budget: number
    specialRequests?: string
  }) => api.post<BookingResult>('/bookings', body),
  list: () => api.get<BookingResult[]>('/bookings'),
  getById: (id: string) => api.get<BookingResult>('/bookings/' + id),
  getByBookingId: (bookingId: string) => api.get<BookingResult>('/bookings/booking-id/' + bookingId),
  cancel: (id: string) => api.patch<null>('/bookings/' + id + '/cancel'),
}

export interface CreateOrderResult {
  bookingId: string
  orderId: string
  amount: number
  amountInRupees: number
  currency: string
  keyId: string
}

export interface VerifyPaymentBody {
  bookingId: string
  razorpayOrderId: string
  razorpayPaymentId: string
  razorpaySignature: string
}

export interface PaymentInfo {
  bookingId: string
  bookingStatus: string
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED'
  paymentId: string | null
  orderId: string | null
  amount: number | null
  currency: string | null
  paidAt: string | null
  paymentMethod: string | null
}

export const paymentApi = {
  createOrder: (bookingId: string) => api.post<CreateOrderResult>('/payments/create-order', { bookingId }),
  verify: (body: VerifyPaymentBody) => api.post<BookingResult>('/payments/verify', body),
  retry: (bookingId: string) => api.post<CreateOrderResult>('/payments/retry', { bookingId }),
  getByBookingId: (bookingId: string) => api.get<PaymentInfo>('/payments/' + bookingId),
}

export interface AdminStats {
  users: number
  destinations: number
  bookings: number
  pendingBookings: number
  hotelBookings: number
  pendingHotelBookings: number
  reviews: number
  newContactMessages: number
  contactMessages: number
  recentBookings: AdminBooking[]
  recentUsers: AdminUser[]
  recentContactMessages: AdminContactMessage[]
}

export interface AdminUser {
  id: string
  name: string
  email: string
  avatar: string | null
  role: 'USER' | 'ADMIN'
  createdAt: string
  _count: { bookings: number; reviews: number; wishlists: number }
}

export interface AdminDestination {
  id: string
  slug: string
  name: string
  tagline: string
  region: string
  image: string
  gallery: string[]
  rating: number
  reviewsCount: number
  priceFrom: number
  duration: string
  bestSeason: string
  description: string
  longDescription: string
  highlights: string[]
  activities: string[]
  isFeatured: boolean
  latitude: number | null
  longitude: number | null
  categoryId: string
  category: { id: string; name: string; slug: string }
}

export interface AdminBooking extends BookingResult {
  user: { id: string; name: string; email: string }
}

export interface AdminReview {
  id: string
  rating: number
  comment: string
  createdAt: string
  user: { id: string; name: string; email: string; avatar: string | null }
  destination: { id: string; name: string; slug: string }
}

export interface AdminContactMessage {
  id: string
  name: string
  email: string
  phone: string | null
  subject: string | null
  message: string
  status: 'NEW' | 'READ' | 'RESPONDED'
  createdAt: string
}

export interface AdminEmailLog {
  id: string
  to: string
  type: string
  subject: string
  status: 'PENDING' | 'SENT' | 'FAILED' | 'SKIPPED'
  attempts: number
  error: string | null
  sentAt: string | null
  metadata: string | null
  createdAt: string
}

export interface AnalyticsOverview {
  revenue: number
  paidBookings: number
  bookings: number
  hotelBookings: number
  users: number
  aiUsage: number
  searches: number
  reviews: number
  averageRating: number
}

export interface BookingGrowthPoint {
  month: string
  bookings: number
  revenue: number
}

export interface PopularDestination {
  id: string
  name: string
  slug: string
  image: string
  category: string
  rating: number
  reviewsCount: number
  bookings: number
  revenue: number
}

export interface TrendingDestination {
  id: string
  name: string
  slug: string
  image: string
  category: string
  rating: number
  bookings30d: number
  reviews30d: number
  score: number
}

export interface TopSearch {
  query: string
  count: number
}

export interface AiUsageData {
  total: number
  byType: Array<{ type: string; count: number }>
  series: Array<{ date: string; count: number }>
}

export interface DestinationPerformanceRow {
  id: string
  name: string
  slug: string
  image: string
  region: string
  category: string
  rating: number
  reviewsCount: number
  popularityScore: number
  bookings: number
  revenue: number
}

export interface MonthlyReport {
  month: string
  revenue: number
  bookings: number
  newUsers: number
  newReviews: number
  newSearches: number
  aiUsage: number
  previousMonthRevenue: number
  growthPct: number | null
  topDestinations: Array<{ id: string; name: string; slug: string; bookings: number; revenue: number }>
  bookingsList: Array<{
    id: string
    bookingId: string
    budget: number
    amount: number | null
    paymentStatus: string
    createdAt: string
    destination: { id: string; name: string; slug: string }
  }>
}

export const adminApi = {
  stats: () => api.get<AdminStats>('/admin/stats'),
  users: (params: { page?: number; limit?: number } = {}) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString()
    return api.get<AdminUser[]>('/admin/users' + (qs ? '?' + qs : ''))
  },
  updateUserRole: (id: string, role: 'USER' | 'ADMIN') =>
    api.patch<AdminUser>('/admin/users/' + id + '/role', { role }),
  deleteUser: (id: string) => api.del<null>('/admin/users/' + id),
  destinations: (params: { page?: number; limit?: number } = {}) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString()
    return api.get<AdminDestination[]>('/admin/destinations' + (qs ? '?' + qs : ''))
  },
  bookings: (params: { page?: number; limit?: number; status?: string; paymentStatus?: string } = {}) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString()
    return api.get<AdminBooking[]>('/admin/bookings' + (qs ? '?' + qs : ''))
  },
  updateBookingStatus: (id: string, status: string) =>
    api.patch<AdminBooking>('/admin/bookings/' + id + '/status', { status }),
  deleteBooking: (id: string) => api.del<null>('/admin/bookings/' + id),
  reviews: (params: { page?: number; limit?: number } = {}) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString()
    return api.get<AdminReview[]>('/admin/reviews' + (qs ? '?' + qs : ''))
  },
  deleteReview: (id: string) => api.del<null>('/admin/reviews/' + id),
  contactMessages: (params: { page?: number; limit?: number } = {}) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString()
    return api.get<AdminContactMessage[]>('/admin/contact-messages' + (qs ? '?' + qs : ''))
  },
  updateContactStatus: (id: string, status: string) =>
    api.patch<AdminContactMessage>('/admin/contact-messages/' + id + '/status', { status }),
  deleteContactMessage: (id: string) => api.del<null>('/admin/contact-messages/' + id),
  emailLogs: (params: { page?: number; limit?: number; type?: string; status?: string } = {}) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString()
    return api.get<AdminEmailLog[]>('/admin/email-logs' + (qs ? '?' + qs : ''))
  },
  reviewReports: (params: { page?: number; limit?: number; status?: string } = {}) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString()
    return api.get<ReviewReportItem[]>('/admin/review-reports' + (qs ? '?' + qs : ''))
  },
  updateReportStatus: (id: string, status: string) =>
    api.patch<ReviewReportItem>('/admin/review-reports/' + id + '/status', { status }),
  createAnnouncement: (body: { title: string; body: string; link?: string }) =>
    api.post<{ recipients: number }>('/admin/announcements', body),
  analyticsOverview: () => api.get<AnalyticsOverview>('/admin/analytics/overview'),
  bookingGrowth: (months = 6) => api.get<BookingGrowthPoint[]>('/admin/analytics/booking-growth?months=' + months),
  popularDestinations: (limit = 6) =>
    api.get<PopularDestination[]>('/admin/analytics/popular-destinations?limit=' + limit),
  trending: (limit = 6) => api.get<TrendingDestination[]>('/admin/analytics/trending?limit=' + limit),
  topSearches: (limit = 10) => api.get<TopSearch[]>('/admin/analytics/searches?limit=' + limit),
  aiUsage: (days = 14) => api.get<AiUsageData>('/admin/analytics/ai-usage?days=' + days),
  destinationPerformance: () =>
    api.get<DestinationPerformanceRow[]>('/admin/analytics/destination-performance'),
  monthlyReport: (month?: string) =>
    api.get<MonthlyReport>('/admin/analytics/monthly-report' + (month ? '?month=' + month : '')),
}

// ---------------------------------------------------------------------------
// Trip Planner 2.0
// ---------------------------------------------------------------------------

export type PlannerItemType = 'HOTEL' | 'RESTAURANT' | 'DESTINATION' | 'EXPERIENCE'

export interface PlannerTripItem {
  id: string
  type: PlannerItemType
  refId: string | null
  name: string
  city: string
  location: string
  latitude: number | null
  longitude: number | null
  image: string
  price: number
  rating: number
  duration: string
  category: string
  slug: string
  href: string
}

export interface PlannerTripDay {
  id: string
  title: string
  notes: string
  /** AI-generated content (added by Deep AI Optimize; optional for hand-built trips). */
  description?: string
  morning?: string
  afternoon?: string
  evening?: string
  estimatedDailyCost?: string
  localTransportation?: string[]
  nearbyAttractions?: string[]
  hiddenGems?: string[]
  shopping?: string[]
  travelTips?: string[]
  items: PlannerTripItem[]
}

export interface PlannerPackingItem {
  label: string
  checked: boolean
}

export interface PlannerTrip {
  id: string
  title: string
  startDate: string | null
  days: PlannerTripDay[]
  packing: PlannerPackingItem[]
  shareCode: string | null
  createdAt: string
  updatedAt: string
}

export const plannerApi = {
  list: () => api.get<PlannerTrip[]>('/planner'),
  create: (body: { title: string; startDate?: string | null; days?: PlannerTripDay[]; packing?: PlannerPackingItem[] }) =>
    api.post<PlannerTrip>('/planner', body),
  get: (id: string) => api.get<PlannerTrip>('/planner/' + id),
  update: (id: string, body: { title?: string; startDate?: string | null; days?: PlannerTripDay[]; packing?: PlannerPackingItem[] }) =>
    api.patch<PlannerTrip>('/planner/' + id, body),
  remove: (id: string) => api.del<null>('/planner/' + id),
  duplicate: (id: string) => api.post<PlannerTrip>('/planner/' + id + '/duplicate'),
  generateShareCode: (id: string) => api.post<PlannerTrip>('/planner/' + id + '/share'),
  getShared: (code: string) => api.get<PlannerTrip>('/planner/share/' + code),
  optimizeAi: (body: { title: string; days: PlannerTripDay[] }) =>
    api.post<{ days: PlannerTripDay[]; insights: string[] }>('/planner/optimize-ai', body),
}
