# Connecting the Triplora Frontend to the Backend

Your frontend currently runs entirely on local, hardcoded data (`src/data/destinations.ts`) and local React state (`WishlistContext`) — there are **no API calls anywhere yet**. Per your instructions, I have not modified any frontend file. This guide shows the minimal, surgical changes needed to wire things up whenever you're ready. Nothing here changes any UI/JSX/styling — only data-fetching logic.

## 1. Add an API client (new file, doesn't touch anything existing)

Create `src/lib/api.ts`:

```ts
const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api'

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('triplora-token')
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.message ?? 'Request failed')
  return json
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}
```

Add `VITE_API_URL=http://localhost:5000/api` to a new `.env` file at the frontend root.

## 2. Destinations (`ExplorePage.tsx`, `HomePage.tsx`, `DestinationDetailsPage.tsx`)

Response shape from `GET /api/destinations` (and `/search`, `/category/:category`, `/:id`) matches your existing `Destination` interface field-for-field (`id` = slug, e.g. `munnar`), so swapping the import source is enough:

```ts
// instead of: import { destinations } from '@/data/destinations'
const { data } = await api.get<{ data: Destination[] }>('/destinations')
```

`GET /api/destinations/:id` returns the same shape as `getDestination()`.

## 3. Wishlist (`WishlistContext.tsx`)

Backend endpoints are auth-protected (`/api/wishlist`). The context's public interface (`wishlist`, `isWishlisted`, `toggleWishlist`) doesn't need to change — only its internals swap from `useState` to calling `api.get('/wishlist')`, `api.post('/wishlist', { destinationId })`, and `api.del('/wishlist/:id')`, keeping a local id→wishlistEntryId map so `toggleWishlist(destinationId)` still works the same way from every page that consumes it.

## 4. Trip Planner (`PlannerPage.tsx`)

Replace the `window.setTimeout` mock in `buildItinerary` with:
```ts
const { data } = await api.post<{ data: TripPlanDTO }>('/trip-plan', {
  budget: budget.toUpperCase(),       // 'relaxed' -> 'RELAXED'
  days,
  travelStyle: mapStyleId(style),     // 'romantic' -> 'ROMANTIC', etc.
  interests: selectedInterests,
})
setItinerary(data.itinerary)          // same { day, focus, destination } shape already used
```
No changes needed to the rendering JSX — `data.itinerary` matches the `ItineraryDay[]` shape already consumed below.

## 5. Contact form (`ContactPage.tsx`)

Wire the form's submit handler to:
```ts
await api.post('/contact', { name, email, phone, subject, message })
```

## 6. Reviews (new capability, no existing page)

There's no reviews UI in the current frontend. `GET /api/destinations/:id/reviews` and `POST /api/reviews` are ready whenever you add one — no frontend changes required until then.

## 7. Auth (new capability, no existing page)

The frontend has no login/register pages today. `POST /api/auth/register`, `/login`, `/logout`, and `GET /api/auth/profile` are ready to use whenever a login UI is added — wishlist, trip-plan, and review-writing all require a logged-in user (via the `Authorization: Bearer <token>` header or the `accessToken` cookie the backend sets automatically on login).

## CORS

The backend's `CLIENT_ORIGIN` env var must match your frontend's dev URL (default `http://localhost:5173`), which is already the Vite default — no change needed for local development.
