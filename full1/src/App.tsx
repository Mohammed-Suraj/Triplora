import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ThemeProvider } from '@/context/ThemeContext'
import { AuthProvider } from '@/context/AuthContext'
import { WishlistProvider } from '@/context/WishlistContext'
import { RestaurantFavoritesProvider } from '@/context/RestaurantFavoritesContext'
import { ExperienceWishlistProvider } from '@/context/ExperienceWishlistContext'
import { ExperiencePlannerProvider } from '@/context/ExperiencePlannerContext'
import { NotificationProvider } from '@/context/NotificationContext'
import { ToastProvider } from '@/context/ToastContext'
import { Layout } from '@/components/Layout'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { HomePage } from '@/pages/HomePage'
import { ExplorePage } from '@/pages/ExplorePage'
import { DestinationDetailsPage } from '@/pages/DestinationDetailsPage'
import { PlannerPage } from '@/pages/PlannerPage'
import { WishlistPage } from '@/pages/WishlistPage'
import { AboutPage } from '@/pages/AboutPage'
import { ContactPage } from '@/pages/ContactPage'
import { LoginPage } from '@/pages/LoginPage'
import { RegisterPage } from '@/pages/RegisterPage'
import { ProfilePage } from '@/pages/ProfilePage'
import { MyBookingsPage } from '@/pages/MyBookingsPage'
import { BookingDetailsPage } from '@/pages/BookingDetailsPage'
import { MyAiTripsPage } from '@/pages/MyAiTripsPage'
import { TripPlanDetailPage } from '@/pages/TripPlanDetailPage'
import { HotelsPage } from '@/pages/HotelsPage'
import { HotelDetailsPage } from '@/pages/HotelDetailsPage'
import { HotelBookingPage } from '@/pages/HotelBookingPage'
import { HotelConfirmationPage } from '@/pages/HotelConfirmationPage'
import { MyStaysPage } from '@/pages/MyStaysPage'
import { RestaurantsPage } from '@/pages/RestaurantsPage'
import { RestaurantDetailsPage } from '@/pages/RestaurantDetailsPage'
import { ExperiencesPage } from '@/pages/ExperiencesPage'
import { ExperienceDetailsPage } from '@/pages/ExperienceDetailsPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { ProtectedAdminRoute } from '@/components/admin/ProtectedAdminRoute'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { AdminLoginPage } from '@/pages/admin/AdminLoginPage'
import { DashboardPage } from '@/pages/admin/DashboardPage'
import { UsersPage } from '@/pages/admin/UsersPage'
import { DestinationsPage } from '@/pages/admin/DestinationsPage'
import { BookingsPage } from '@/pages/admin/BookingsPage'
import { ReviewsPage } from '@/pages/admin/ReviewsPage'
import { ContactMessagesPage } from '@/pages/admin/ContactMessagesPage'
import { EmailLogsPage } from '@/pages/admin/EmailLogsPage'
import { SettingsPage } from '@/pages/admin/SettingsPage'
import { HotelsPage as AdminHotelsPage } from '@/pages/admin/HotelsPage'
import { AdminHotelBookingsPage } from '@/pages/admin/AdminHotelBookingsPage'

const AiAssistantPage = lazy(() =>
  import('@/pages/AiAssistantPage').then((m) => ({ default: m.AiAssistantPage })),
)
const ComparePage = lazy(() =>
  import('@/pages/ComparePage').then((m) => ({ default: m.ComparePage })),
)
const NotificationsPage = lazy(() =>
  import('@/pages/NotificationsPage').then((m) => ({ default: m.NotificationsPage })),
)
const AnalyticsPage = lazy(() =>
  import('@/pages/admin/AnalyticsPage').then((m) => ({ default: m.AnalyticsPage })),
)
const ReviewReportsPage = lazy(() =>
  import('@/pages/admin/ReviewReportsPage').then((m) => ({ default: m.ReviewReportsPage })),
)
const PlannerBuilderPage = lazy(() =>
  import('@/pages/PlannerBuilderPage').then((m) => ({ default: m.PlannerBuilderPage })),
)
const PlannerSharePage = lazy(() =>
  import('@/pages/PlannerSharePage').then((m) => ({ default: m.PlannerSharePage })),
)

function PageFallback() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="flex flex-col items-center gap-4">
        <span className="h-12 w-12 animate-spin rounded-full border-[3px] border-primary/15 border-t-primary" aria-hidden="true" />
        <span className="text-sm font-medium text-muted-foreground" role="status">
          Loading…
        </span>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <BrowserRouter>
          <AuthProvider>
            <NotificationProvider>
              <WishlistProvider>
                <RestaurantFavoritesProvider>
                  <ExperienceWishlistProvider>
                    <ExperiencePlannerProvider>
                      <Suspense fallback={<PageFallback />}>
                  <Routes>
                  <Route path="/admin/login" element={<AdminLoginPage />} />
                  <Route path="/admin" element={<ProtectedAdminRoute />}>
                    <Route element={<AdminLayout />}>
                      <Route index element={<Navigate to="/admin/dashboard" replace />} />
                      <Route path="dashboard" element={<DashboardPage />} />
                      <Route path="users" element={<UsersPage />} />
                      <Route path="destinations" element={<DestinationsPage />} />
                      <Route path="hotels" element={<AdminHotelsPage />} />
                      <Route path="hotel-bookings" element={<AdminHotelBookingsPage />} />
                      <Route path="bookings" element={<BookingsPage />} />
                      <Route path="reviews" element={<ReviewsPage />} />
                      <Route path="review-reports" element={<ReviewReportsPage />} />
                      <Route path="analytics" element={<AnalyticsPage />} />
                      <Route path="contact-messages" element={<ContactMessagesPage />} />
                      <Route path="email-logs" element={<EmailLogsPage />} />
                      <Route path="settings" element={<SettingsPage />} />
                    </Route>
                  </Route>
                  <Route element={<Layout />}>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/explore" element={<ExplorePage />} />
                    <Route path="/hotels" element={<HotelsPage />} />
                    <Route path="/hotels/:id" element={<HotelDetailsPage />} />
                    <Route path="/restaurants" element={<RestaurantsPage />} />
                    <Route path="/restaurants/:id" element={<RestaurantDetailsPage />} />
                    <Route path="/experiences" element={<ExperiencesPage />} />
                    <Route path="/experiences/:id" element={<ExperienceDetailsPage />} />
                    <Route path="/destinations/:id" element={<DestinationDetailsPage />} />
                    <Route path="/compare" element={<ComparePage />} />
                    <Route path="/about" element={<AboutPage />} />
                    <Route path="/contact" element={<ContactPage />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />
                    <Route path="/planner/share/:code" element={<PlannerSharePage />} />
                    <Route element={<ProtectedRoute />}>
                      <Route path="/planner" element={<PlannerPage />} />
                      <Route path="/planner/builder" element={<PlannerBuilderPage />} />
                      <Route path="/planner/ai" element={<PlannerPage />} />
                      <Route path="/ai-assistant" element={<AiAssistantPage />} />
                      <Route path="/notifications" element={<NotificationsPage />} />
                      <Route path="/wishlist" element={<WishlistPage />} />
                      <Route path="/profile" element={<ProfilePage />} />
                      <Route path="/my-bookings" element={<MyBookingsPage />} />
                      <Route path="/bookings/:id" element={<BookingDetailsPage />} />
                      <Route path="/hotels/book" element={<HotelBookingPage />} />
                      <Route path="/hotels/bookings/confirmation/:bookingId" element={<HotelConfirmationPage />} />
                      <Route path="/my-stays" element={<MyStaysPage />} />
                      <Route path="/my-ai-trips" element={<MyAiTripsPage />} />
                      <Route path="/my-ai-trips/:id" element={<TripPlanDetailPage />} />
                    </Route>
                    <Route path="*" element={<NotFoundPage />} />
                  </Route>
                  </Routes>
                    </Suspense>
                  </ExperiencePlannerProvider>
                </ExperienceWishlistProvider>
                </RestaurantFavoritesProvider>
              </WishlistProvider>
            </NotificationProvider>
          </AuthProvider>
        </BrowserRouter>
      </ToastProvider>
    </ThemeProvider>
  )
}
