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

export interface BookingResult {
  id: string
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
