# Triplora Backend

Production-ready REST API for **Triplora — AI Powered Kerala Tourism Platform**, built with Node.js, Express, TypeScript, PostgreSQL and Prisma.

This backend was built to sit alongside the existing Triplora frontend **without changing any frontend file**. See `FRONTEND_INTEGRATION.md` at the repo root for exact, copy-pasteable wiring instructions.

## Tech Stack

- Node.js + Express.js + TypeScript
- PostgreSQL + Prisma ORM
- JWT + bcrypt authentication
- Zod validation
- Cloudinary (destination image storage)
- Helmet, CORS, Morgan, compression, express-rate-limit
- nodemon + tsx for development

## Architecture

```
backend/
  prisma/
    schema.prisma        # data model
    seed.ts               # seeds categories, destinations, demo users
  src/
    config/                # env, prisma client, cloudinary
    types/                  # shared TS types + Express augmentation
    utils/                  # ApiError, ApiResponse, jwt, hash, pagination, asyncHandler
    validators/              # Zod schemas per domain
    middlewares/             # auth, validation, error handling, rate limiting, uploads
    repositories/            # Prisma data-access layer (one per model)
    services/                # business logic (one per domain)
    controllers/             # thin HTTP layer, calls services
    dto/                     # response shaping (Prisma -> frontend-friendly DTOs)
    routes/                  # Express routers
    app.ts                   # Express app + middleware pipeline
    server.ts                # bootstrap, DB connect, graceful shutdown
```

Each layer only talks to the layer directly below it (Controller → Service → Repository → Prisma), which keeps the code testable and swappable (e.g. you could replace Prisma/Postgres without touching controllers).

## Getting Started

### 1. Prerequisites
- Node.js 18+
- A PostgreSQL database (local or hosted, e.g. Supabase/Neon/Railway)
- (Optional) A Cloudinary account for image uploads

### 2. Install dependencies
```bash
cd backend
npm install
```

### 3. Configure environment
```bash
cp .env.example .env
```
Edit `.env` and set at minimum:
- `DATABASE_URL` — your Postgres connection string
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` — long random strings
- `CLIENT_ORIGIN` — your frontend URL (default `http://localhost:5173`)
- `CLOUDINARY_*` — if you want image uploads to work

### 4. Set up the database
```bash
npm run prisma:migrate   # creates tables from schema.prisma
npm run seed              # populates categories, the 9 Kerala destinations, and demo/admin users
```

### 5. Run the dev server
```bash
npm run dev
```
The API will be available at `http://localhost:5000/api` (health check: `GET /api/health`).

### 6. Build for production
```bash
npm run build
npm start
```

## Demo accounts (created by `npm run seed`)
| Role  | Email                     | Password       |
|-------|---------------------------|-----------------|
| User  | demo@triplora.travel      | Password@123    |
| Admin | admin@triplora.travel     | Password@123    |

## API Reference

All responses follow the shape:
```json
{ "success": true, "message": "...", "data": ..., "meta": { "page": 1, "limit": 12, "total": 42, "totalPages": 4, "hasNextPage": true, "hasPrevPage": false } }
```
Errors follow:
```json
{ "success": false, "message": "...", "errors": [ { "path": "body.email", "message": "..." } ] }
```

### Auth
| Method | Endpoint             | Auth | Description |
|--------|-----------------------|------|-------------|
| POST   | `/api/auth/register`  | –    | Create account, returns user + JWT tokens |
| POST   | `/api/auth/login`     | –    | Log in, returns user + JWT tokens |
| POST   | `/api/auth/logout`    | –    | Clears the auth cookie |
| GET    | `/api/auth/profile`   | ✅   | Returns the logged-in user |

Tokens are returned in the JSON body **and** set as an httpOnly `accessToken` cookie. You can authenticate either via `Authorization: Bearer <token>` or the cookie.

### Destinations
| Method | Endpoint                              | Auth      | Description |
|--------|----------------------------------------|-----------|-------------|
| GET    | `/api/destinations`                    | –         | Paginated list. Query: `page, limit, sortBy(createdAt|rating|priceFrom|name), sortOrder, category, region, minPrice, maxPrice` |
| GET    | `/api/destinations/search?q=...`       | –         | Full-text style search across name/region/tagline/description |
| GET    | `/api/destinations/category/:category` | –         | Filter by category (use `All` for everything) |
| GET    | `/api/destinations/:id`                | –         | Fetch by id **or** slug (e.g. `munnar`) |
| POST   | `/api/destinations`                    | Admin     | Create a destination (`multipart/form-data` with `image` file, or JSON with `image` URL) |
| GET    | `/api/destinations/:destinationId/reviews` | –     | Paginated reviews for a destination |

### Categories
| Method | Endpoint          | Auth | Description |
|--------|--------------------|------|-------------|
| GET    | `/api/categories`  | –    | List all categories |

### Wishlist (requires auth)
| Method | Endpoint             | Description |
|--------|-----------------------|-------------|
| GET    | `/api/wishlist`       | List the current user's wishlist |
| POST   | `/api/wishlist`       | Body: `{ destinationId }` |
| DELETE | `/api/wishlist/:id`   | Remove by wishlist entry id |

### Trip Planner (requires auth)
| Method | Endpoint              | Description |
|--------|------------------------|-------------|
| POST   | `/api/trip-plan`       | Body: `{ title?, budget(RELAXED|PREMIUM|LUXURY), days, travelStyle(ROMANTIC|FAMILY|SOLO|FRIENDS), interests[] }`. Generates and persists a day-by-day itinerary using **backend logic only** (no AI). |
| GET    | `/api/trip-plan`       | List the current user's saved trip plans |
| GET    | `/api/trip-plan/:id`   | Fetch one trip plan with its itinerary |
| DELETE | `/api/trip-plan/:id`   | Delete a trip plan |

### Reviews
| Method | Endpoint            | Auth | Description |
|--------|----------------------|------|-------------|
| POST   | `/api/reviews`       | ✅   | Body: `{ destinationId, rating(1-5), comment }`. One review per user per destination; updates the destination's aggregate rating. |
| DELETE | `/api/reviews/:id`   | ✅   | Owner or Admin only |

### Contact
| Method | Endpoint         | Auth  | Description |
|--------|-------------------|-------|-------------|
| POST   | `/api/contact`    | –     | Body: `{ name, email, phone?, subject?, message }` |
| GET    | `/api/contact`    | Admin | Paginated list of submitted messages |

## Security notes
- Passwords hashed with bcrypt (12 salt rounds by default).
- JWT access + refresh tokens; access token also set as httpOnly cookie.
- Zod validation on every mutating endpoint.
- Helmet security headers, CORS locked to `CLIENT_ORIGIN`, global + auth-specific rate limiting.
- Centralized error handler normalizes Prisma errors (unique constraint, not found, FK violations) into clean HTTP responses.

## Notes on scope
- The itinerary generator is intentionally rule-based (destination rating + interest-tag matching), per the "no AI integration for now" requirement. It lives entirely in `src/services/itinerary.service.ts`, so swapping in a real AI call later only touches that one file.
