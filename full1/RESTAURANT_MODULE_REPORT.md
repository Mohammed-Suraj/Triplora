# Restaurant Discovery Module — Final Report

A complete restaurant discovery module for Triplora, mirroring the Hotels module's
architecture end-to-end (Express + Prisma + PostgreSQL backend, React + Vite frontend).

## Restaurant Data — 24 Real Kerala Restaurants

24 real, well-known eateries across **9 cities** (Kozhikode, Kochi, Thiruvananthapuram,
Munnar, Varkala, Alappuzha, Wayanad, Thrissur, Kannur), including century-old
institutions (Paragon since 1939, Hotel Rahmaniya since 1919, Kayees since 1951,
East End since 1890, Zam Zam since 1948, Lucky Star, Paris Bakery, Thalassery).

| Category | Count | Examples |
|---|---|---|
| Kerala | 7 | Paragon, Rahmaniya, Zain's, Kayees, Dhe Puttu, Zam Zam, Rapsy |
| Seafood | 3 | Fort House, The Rice Boat, Rayirathu Kada Kari |
| Vegetarian | 4 | Angeethi, Gurubhavan, Wilton, Arya Bhavan |
| Café | 3 | Kashi Art Café, Darjeeling Café, Café Italiano |
| Fine Dining | 3 | East End, Malabar Junction, Villa Maya |
| Bakery | 2 | Lucky Star, Paris Bakery |
| Fast Food | 2 | Café Junction, Tasty Cafeteria |

Every restaurant includes: name, address + city, cuisines, price range + ₹–₹₹₹₹ level,
opening hours, phone (where public), coordinates, Google Maps link, category, best-for
tags, long description, and **hero + 5-gallery images**.

**Ratings are clearly marked as sample/demo** — every restaurant has a
`ratingNote: "Sample rating"` surfaced in the UI (amber badge on the details page,
note beside the price on cards, and a disclaimer in the filter panel + page footer).
Opening hours/prices are indicative public info, not scraped.

## Images — Royalty-Free

52 royalty-free photos downloaded from Unsplash's CDN into
`full1/public/images/restaurants/` (exteriors, interiors, table settings, Kerala
meals/thali, dosa, biryani, seafood, veg plates, café, coffee, juice, pastry, dessert,
fast food, fine dining). No images were scraped from Google/Booking/review sites.

Deterministic assignment in `restaurantSeedHelpers.ts`: category-appropriate hero
(`restaurantHero`) + 5-image gallery templates per category (`restaurantGallery`),
seeded by slug hash so re-seeds are stable.

## Database Changes

- `prisma/schema.prisma`: `Restaurant` model + `RestaurantCategory` enum
  (KERALA, SEAFOOD, VEGETARIAN, CAFE, FINE_DINING, BAKERY, FAST_FOOD);
  migration `add_restaurants` applied.
- `prisma/seed.ts`: idempotent upsert-by-slug loop; re-runs refresh only
  image/gallery (admin edits preserved), matching the hotels pattern.
- Verified: 24 restaurants, 0 bad hero/gallery references, all ratingNotes marked
  sample, 39 unique gallery files all present on disk.

## API (`/api/restaurants`)

- `GET /` — paginated list (`{ items, meta }`), search `q` (name, tagline, address,
  description, cuisine), filters `category`, `city`, `minPriceLevel/maxPriceLevel`,
  `minRating`, combined `sort` (`recommended|rating|popularity|price_asc|price_desc`).
- `GET /:id` — detail by id or slug + `similar` (same city, top-rated).
- `GET /recommend` — AI-style craving matching: `craving` ∈
  `authentic|seafood|veg|quick|cozy|splurge` (+ optional `category`/`city`/`limit`),
  scored via `cravingScore` (category/cuisine/price bonuses), mirrors hotels'
  `recommendByStyle`.
- Admin CRUD: `POST /`, `PATCH /:id`, `DELETE /:id` (ADMIN role, optional image upload
  to `triplora/restaurants`).

Files: `restaurant.repository.ts`, `restaurant.service.ts`, `restaurant.controller.ts`,
`restaurant.validator.ts`, `restaurant.routes.ts`; mounted in `routes/index.ts`.
`npx tsc --noEmit` clean.

## Frontend

- `/restaurants` — `RestaurantsPage` (HotelsPage pattern): hero + search + sort,
  **craving chips → AI-recommended strip** (4 cards, refreshed per craving), category
  chips row, filter sidebar + mobile slide-over (category, ₹-level grid, min rating,
  **My Favorites** toggle), inline pagination, skeletons, empty/error states.
- `/restaurants/:id` — `RestaurantDetailsPage`: breadcrumb, category badge, rating +
  **Sample rating** badge, favorites heart, cuisines, gallery + lightbox (keyboard
  nav), opening hours / price range / best-for tiles, **Google Maps open + directions**
  buttons (coords or name query), similar restaurants in the same city.
- **Favorites**: `RestaurantFavoritesContext` (localStorage, works for guests), hearts
  on cards + details page, favorites filter + count badge.
- `api.ts`: `Restaurant` type, `RESTAURANT_CATEGORY_LABELS`, `restaurantsApi`.
- `Navbar` gains a **Restaurants** link (desktop + mobile); routes added in `App.tsx`
  (provider-wrapped, eager imports like hotels).
- `npm run build` clean; pages verified live on :5173 with backend :5001.

## Remaining Improvements

- Live ratings/reviews (currently sample-marked); could add a `RestaurantReview`
  stack mirroring `HotelReview`.
- Server-backed favorites for signed-in users (current: localStorage).
- Restaurant bookings/reservations or waitlist.
- Admin UI page for restaurant CRUD (API + schema are ready).
- Expand to 40+ restaurants and more towns (Kanjirapally, Kollam, Palakkad, Idukki…).
