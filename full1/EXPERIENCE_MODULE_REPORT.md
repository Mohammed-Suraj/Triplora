# Local Experiences Module — Final Report

A complete "Local Experiences" module for Triplora: 157 curated Kerala experiences
across 7 categories, built end-to-end mirroring the Hotels / Restaurants module
architecture (Express + Prisma + PostgreSQL backend, React + Vite frontend).

## Experience Data — 157 Curated Experiences

157 hand-curated experiences across 13+ Kerala cities (Alleppey, Munnar, Kochi,
Thiruvananthapuram, Varkala, Kozhikode, Wayanad, Thekkady, Kannur, Kumarakom,
Athirappilly, Vagamon, Nelliyampathy) covering authentic houseboats, tea-plantation
treks, spice walks, backwater village tours, theyyam performances, ayurveda
treatments, waterfalls, beaches, wildlife safaris and more.

| Category | Count | Examples |
|---|---|---|
| Adventure | 24 | Meesapulimala sunrise trek, Periyar bamboo rafting, zip line at Athirappilly |
| Culture | 27 | Theyyam ritual at Kannur, Kathakali workshop, Coir craft in Alleppey |
| Wildlife | 20 | Periyar tiger trail, Thattekad birding walk, Wayanad elephant safari |
| Food | 22 | Sadhya lunch, spice-trade walk in Kozhikode, toddy-shop tasting |
| Wellness | 20 | Kalari chikitsa, ayurveda spa day, yoga at sunrise in Varkala |
| Nature | 24 | Tea-field sunrise walk, Chembra heart lake hike, Meenmutty waterfalls |
| Water Activities | 20 | Houseboat overnight cruise, canoe trails, kayaking in Vembanad |

Every experience includes: hero image + 6-image gallery, short + long description,
tagline, duration, price (₹), location + city, coordinates, difficulty
(EASY/MODERATE/CHALLENGING), best season, suitable-for tags
(Solo/Couple/Family/Friends), 4–6 highlights, rating (sample note), reviews count,
and featured flags.

## Images — Local, No Downloads

All 157 experiences reuse the project's existing royalty-free destination photo
sets already in `public/images/` (63+ destinations, `{place}-cover.jpg` +
`{place}-gallery-1..6.jpg`). Category-appropriate image pools per destination in
`experienceSeedHelpers.ts` choose hero + gallery deterministically via slug-hash,
so re-seeds are stable and every reference resolves on disk.

## Database Changes

- `prisma/schema.prisma`: `Experience` model + `ExperienceCategory` enum
  (7 values) + `ExperienceDifficulty` enum (3 values); indexes on
  `category`, `city`, `isActive`; migration `add_experiences` applied.
- `prisma/seed.ts`: idempotent upsert-by-slug loop; re-runs refresh only
  image/gallery/rating fields (admin edits preserved), matching the hotels pattern.
- Verified: 157 records, 157 unique slugs, 0 duplicate names, all 7 categories
  represented.

## API (`/api/experiences`)

- `GET /` — paginated list, search `q` (name, tagline, city, description, highlights),
  filters `category`, `city`, `difficulty`, `minPrice`/`maxPrice`,
  `minRating`, `featured`, combined `sort`
  (`recommended|popularity|rating|price_asc|price_desc`).
- `GET /:id` — detail by id or slug + `similar` (same category, top-rated).
- `POST /` / `PATCH /:id` / `DELETE /:id` — admin-only CRUD with image upload,
  mirroring the restaurants module. Full zod validation.

## Frontend

- **`src/pages/ExperiencesPage.tsx`** — list page: hero header, search, category
  tabs (7 colour-coded), sort dropdown, filter sidebar + mobile drawer (city,
  difficulty, budget, min rating, wishlist-only), persistent Trip Planner banner
  (chip count + total), skeleton loaders, pagination, empty/error states, URL
  sync via `useSearchParams`.
- **`src/pages/ExperienceDetailsPage.tsx`** — gallery + lightbox (keyboard
  navigable), About, stat cards (duration/difficulty/best season), highlights,
  "Perfect for" chips, **Nearby stay / eat / attractions** (closest 3 hotels,
  restaurants and destinations computed client-side via haversine distance from
  the experience's coordinates, paginated API fetches), sticky booking-style
  aside card with **Add to Trip Planner** (toggle), **Wishlist** and **Share**
  (native share sheet with clipboard fallback), OpenStreetMap location link,
  similar-experiences grid.
- **`src/components/experiences/ExperienceCard.tsx`** — motion card with category
  + Featured badges, rating, hover lift, wishlist + planner overlay buttons,
  duration/difficulty pills, price/best-season footer.
- **`src/context/ExperienceWishlistContext.tsx`** + **`ExperiencePlannerContext.tsx`**
  — localStorage-persisted (keys `triplora-experience-wishlist`,
  `triplora-experience-planner`) with toast feedback; planner stores
  slug/name/city/price/duration per item.
- Wired in `src/App.tsx` (routes `/experiences`, `/experiences/:id`, providers)
  and Navbar link "Experiences".

## Verification

- Backend: `tsc --noEmit` clean; `prisma db seed` → "Seed complete";
  API smoke tests pass (157 total, filters, sort, detail + similar, 401 on
  unauthenticated admin create).
- Frontend: `npm run build` clean (tsc + vite).
- Live: `http://localhost:5173/experiences` and detail pages return 200;
  nearby computation verified against live APIs (e.g. Alleppey houseboat →
  nearest hotels within ~1.5–2 km).