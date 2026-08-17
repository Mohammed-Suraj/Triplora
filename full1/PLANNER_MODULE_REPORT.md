# Trip Planner 2.0 — Final Report

A complete premium multi-day trip builder for Triplora: a day-by-day Kerala
itinerary planner with drag-and-drop, four stop types (hotels, restaurants,
destinations, experiences), live budget, Google Maps routes (no API key), dual
AI optimization, daily weather, a packing checklist, per-day notes, and
save / duplicate / share / PDF export. The old AI generator now lives at
`/planner/ai`; the new builder owns `/planner`.

## Routes

- `/planner` (protected) — Trip Planner 2.0: my-trips list + full day-by-day builder.
- `/planner/ai` (protected) — the previous AI itinerary generator (unchanged).
- `/planner/share/:code` (public) — read-only shared trip view, no login needed.

## Database Changes

- `prisma/schema.prisma`: new `PlannerTrip` model — `id` (uuid), `title`,
  `startDate` (nullable), `days` (JSON array of day objects, rich item
  snapshots), `packing` (JSON array), `shareCode` (nullable, unique),
  `createdAt`/`updatedAt`, `userId` FK → `users` with `onDelete: Cascade`;
  index on `userId`; `@@map("planner_trips")`. Added `plannerTrips` relation to
  `User`.
- Migration `20260812070258_add_planner_trip` applied (PostgreSQL `triplora`).

## API (`/api/planner`)

All routes behind `requireAuth` except the public share lookup:

- `GET /` — list current user's trips (newest first).
- `POST /` — create a trip (zod: 1–30 days, ≤200 packing items).
- `GET /:id` — own trip detail. Patch `PATCH /:id` (≥1 field required),
  `DELETE /:id`, `POST /:id/duplicate` (deep copy with fresh day/item ids,
  "(copy)" title), `POST /:id/share` (8-char collision-proof share code).
- `GET /share/:code` — **public** read-only view.
- `POST /optimize-ai` (rate-limited by `aiLimiter`) — Groq deep optimize:
  sends only slim item ids + coordinates; LLM returns day/item assignments;
  rich snapshots merged back server-side with an orphaned-item safety net.
  Logs `PLANNER_OPTIMIZE` analytics event.

Validation (`validators/plannerTrip.validator.ts`), repository
(`repositories/plannerTrip.repository.ts`), service
(`services/plannerTrip.service.ts`) and controller follow the existing
hotels/restaurants module pattern.

## Frontend

- `src/lib/api.ts` — `plannerApi` client + `PlannerTrip*` types.
- `src/lib/planner.ts` — time slots (9 AM + 2 h), restaurant per-person
  estimates by price level, budget breakdown by category and day, keyword-based
  deterministic packing-list generator, `weatherForDay`, day anchor city, and
  keyless Google Maps URLs (`saddr/daddr+to: waypoints&output=embed`).
- `src/lib/plannerOptimizer.ts` — rule-based smart optimizer: centroid
  regrouping by proximity, empty-day rebalance, nearest-neighbour ordering,
  meals at thirds, hotels last.
- `src/lib/pdf.ts` — `exportPlannerPdf`: teal cover with QR + facts, packing
  checklist table, day-wise itinerary tables (`[Time, Type, Stop, Est. cost]`),
  day notes, page footers.
- `src/components/planner/` — `PlannerItemRow` (draggable rows, per-type
  colours, read-only mode with external links), `PlannerDayCard` (inline
  title/notes, weather glyph, map iframe toggle, drop targets, read-only mode),
  `PlannerAddDrawer` (slide-in search tabs for all four stop types),
  `PlannerBudgetPanel`, `PlannerPackingPanel` (progress + regenerate),
  `PlannerWeatherStrip` (per-day forecast cards), `PlannerShareModal`
  (generate/copy/native-share).
- `src/pages/PlannerBuilderPage.tsx` — trips grid + editor with autosave
  (1.2 s debounce), start date, per-coordinate weather fetch, AI Optimize
  (instant smart, 0.5 s) and Deep AI Optimize (Groq with smart fallback),
  share modal, PDF, duplicate, delete.
- `src/pages/PlannerSharePage.tsx` — public read-only page: trip header,
  day cards + maps, budget + packing, PDF export, "Build your own trip" CTA.
- `src/App.tsx` — lazy routes wired; existing `/planner` links (Navbar,
  Footer, Hero, About, PlannerCta) now land on the new builder untouched.

## Verification

- Backend `tsc --noEmit`: clean.
- Frontend `npm run build` (tsc + vite): clean.
- Live API smoke tests (demo user, `demo@triplora.travel`): list → create (2
  days, 4 stops) → patch → duplicate (fresh ids) → share code → public
  no-auth fetch → Groq `optimize-ai` (all item ids preserved) → cleanup. All
  passed; 401 without auth; 404 for an unknown share code.
- Dev server: `/planner`, `/planner/ai`, `/planner/share/:code` all return 200.