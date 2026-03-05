# CineMax — Cinema Booking System Documentation

> Full-stack cinema ticket booking platform built with **React 19 + Redux Toolkit** (frontend), **Express.js** (backend API), and **PostgreSQL 16** (database). Containerized with Docker, deployable to Kubernetes.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Database Schema](#database-schema)
3. [Backend API](#backend-api)
4. [Frontend](#frontend)
5. [Infrastructure & Deployment](#infrastructure--deployment)
6. [User Flows](#user-flows)

---

## Architecture Overview

```
┌─────────────────────┐     HTTP/REST     ┌──────────────────┐     SQL      ┌──────────────┐
│   React Frontend    │ ───────────────── │  Express Backend │ ──────────── │  PostgreSQL  │
│   (Vite + MUI)      │   Axios + JWT     │  (Node.js)       │   pg Pool    │  (Port 5432) │
│   Port 5173 (dev)   │                   │  Port 5000       │              │              │
│   Port 80 (prod)    │                   │                  │              │              │
└─────────────────────┘                   └──────────────────┘              └──────────────┘
```

**Frontend** → Single-page React app served by Vite (dev) or Nginx (prod). Uses Redux Toolkit for state, Axios for API calls, MUI for UI components.

**Backend** → RESTful Express API. JWT authentication, bcrypt password hashing, QR code generation, helmet/CORS/rate-limiting security middleware.

**Database** → PostgreSQL 16 with UUID primary keys, 9 tables, full foreign key integrity, and performance indexes.

---

## Database Schema

### Entity-Relationship Summary

| Table | Description | Key Relationships |
|-------|-------------|-------------------|
| **users** | Registered users (role: `user` or `admin`) | → orders |
| **cinemas** | Cinema locations | → halls |
| **halls** | Screens/auditoriums inside cinemas | → seats, → schedules |
| **seats** | Individual seats in a hall (regular/vip/couple) | → seat_locks, → order_items |
| **movies** | Film catalog with metadata | → schedules |
| **schedules** | Showtimes linking movies to halls with pricing | → seat_locks, → orders |
| **seat_locks** | Temporary seat holds during checkout (TTL-based) | → seats, → schedules, → users |
| **orders** | Completed/pending purchases with barcode | → order_items, → users, → schedules |
| **order_items** | Individual seats within an order | → orders, → seats |

### Table Details

#### `users`
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK, auto-generated |
| username | VARCHAR(80) | UNIQUE, NOT NULL |
| email | VARCHAR(120) | UNIQUE, NOT NULL |
| password_hash | TEXT | NOT NULL (bcrypt) |
| role | VARCHAR(20) | DEFAULT `'user'` — values: `user`, `admin` |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() |

#### `cinemas`
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| name | VARCHAR(200) | NOT NULL |
| location | TEXT | NOT NULL |
| image_url | TEXT | Optional |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |

#### `halls`
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| cinema_id | UUID | FK → cinemas(id) ON DELETE CASCADE |
| name | VARCHAR(100) | NOT NULL |
| rows | INT | DEFAULT 8 |
| cols | INT | DEFAULT 10 |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |

#### `seats`
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| hall_id | UUID | FK → halls(id) ON DELETE CASCADE |
| row_label | CHAR(1) | NOT NULL (e.g., `A`, `B`, `C`) |
| col_number | INT | NOT NULL |
| seat_type | VARCHAR(20) | DEFAULT `'regular'` — values: `regular`, `vip`, `couple` |
| | | UNIQUE(hall_id, row_label, col_number) |

#### `movies`
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| title | VARCHAR(300) | NOT NULL |
| description | TEXT | Optional |
| poster_url | TEXT | Optional |
| backdrop_url | TEXT | Optional |
| genre | VARCHAR(100) | Optional |
| duration_min | INT | DEFAULT 120 |
| rating | DECIMAL(3,1) | DEFAULT 0 |
| language | VARCHAR(50) | DEFAULT `'Indonesian'` |
| release_date | DATE | Optional |
| status | VARCHAR(20) | DEFAULT `'now_showing'` — values: `now_showing`, `coming_soon`, `ended` |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |

#### `schedules`
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| movie_id | UUID | FK → movies(id) ON DELETE CASCADE |
| hall_id | UUID | FK → halls(id) ON DELETE CASCADE |
| start_time | TIMESTAMPTZ | NOT NULL |
| end_time | TIMESTAMPTZ | NOT NULL (auto-calculated from movie duration) |
| price_regular | DECIMAL(12,2) | DEFAULT 50000 |
| price_vip | DECIMAL(12,2) | DEFAULT 100000 |
| price_couple | DECIMAL(12,2) | DEFAULT 150000 |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |

#### `seat_locks`
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| seat_id | UUID | FK → seats(id) ON DELETE CASCADE |
| schedule_id | UUID | FK → schedules(id) ON DELETE CASCADE |
| user_id | UUID | FK → users(id) ON DELETE CASCADE |
| locked_at | TIMESTAMPTZ | DEFAULT NOW() |
| expires_at | TIMESTAMPTZ | NOT NULL (default: 10 minutes from lock) |
| | | UNIQUE(seat_id, schedule_id) |

#### `orders`
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| user_id | UUID | FK → users(id) |
| schedule_id | UUID | FK → schedules(id) |
| total_price | DECIMAL(12,2) | NOT NULL |
| status | VARCHAR(30) | DEFAULT `'pending'` — values: `pending`, `paid`, `cancelled`, `used` |
| barcode_data | TEXT | UNIQUE, NOT NULL |
| payment_method | VARCHAR(50) | Optional |
| paid_at | TIMESTAMPTZ | Optional |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |

#### `order_items`
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| order_id | UUID | FK → orders(id) ON DELETE CASCADE |
| seat_id | UUID | FK → seats(id) |
| price | DECIMAL(12,2) | NOT NULL |
| | | UNIQUE(order_id, seat_id) |

### Indexes

| Index | On |
|-------|----|
| idx_schedules_movie | schedules(movie_id) |
| idx_schedules_hall | schedules(hall_id) |
| idx_schedules_start | schedules(start_time) |
| idx_seat_locks_schedule | seat_locks(schedule_id) |
| idx_seat_locks_expires | seat_locks(expires_at) |
| idx_orders_user | orders(user_id) |
| idx_order_items_order | order_items(order_id) |
| idx_order_items_seat | order_items(seat_id) |

---

## Backend API

### Entry Point & Middleware Stack

| File | Purpose |
|------|---------|
| `backend/src/index.js` | Loads `.env`, imports the Express app, starts listening on `PORT` (default 5000) |
| `backend/src/app.js` | Creates Express app with middleware: **helmet** (security headers), **CORS** (configurable origin), **rate limiter** (200 req/15min), **JSON parser**, **morgan** (HTTP logging). Mounts `/api` routes. Health check at `GET /health`. |
| `backend/src/db/pool.js` | PostgreSQL connection pool (max 20 connections). Configured via env vars: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`. |
| `backend/src/middleware/auth.js` | **`authenticate`** — Verifies JWT Bearer token, loads user from DB, attaches to `req.user`. **`requireAdmin`** — Checks `req.user.role === 'admin'`. |

### Route Map

All routes are prefixed with `/api`.

| Method | Endpoint | Auth | Controller | Description |
|--------|----------|------|------------|-------------|
| **Auth** (`/api/auth`) |
| POST | `/auth/register` | — | `auth.register` | Create account (username, email, password) → returns user + JWT |
| POST | `/auth/login` | — | `auth.login` | Login (email, password) → returns user + JWT |
| GET | `/auth/me` | ✅ | `auth.getMe` | Get current user from token |
| **Movies** (`/api/movies`) |
| GET | `/movies` | — | `movies.getAll` | List movies (optional filters: `status`, `genre`, `search`) |
| GET | `/movies/:id` | — | `movies.getById` | Single movie details |
| POST | `/movies` | ✅ Admin | `movies.create` | Create a movie |
| PUT | `/movies/:id` | ✅ Admin | `movies.update` | Update a movie (partial with COALESCE) |
| DELETE | `/movies/:id` | ✅ Admin | `movies.remove` | Delete a movie |
| **Cinemas** (`/api/cinemas`) |
| GET | `/cinemas` | — | `cinemas.getAll` | List all cinemas |
| GET | `/cinemas/:id` | — | `cinemas.getById` | Single cinema |
| GET | `/cinemas/:id/halls` | — | `cinemas.getHalls` | List halls in a cinema |
| POST | `/cinemas` | ✅ Admin | `cinemas.create` | Create cinema |
| PUT | `/cinemas/:id` | ✅ Admin | `cinemas.update` | Update cinema |
| DELETE | `/cinemas/:id` | ✅ Admin | `cinemas.remove` | Delete cinema |
| **Schedules** (`/api/schedules`) |
| GET | `/schedules` | — | `schedules.getAll` | List schedules (optional: `movie_id`, `date` filter) |
| GET | `/schedules/:id` | — | `schedules.getById` | Schedule details with movie/hall/cinema info |
| GET | `/schedules/:id/seats` | — | `schedules.getSeatsForSchedule` | All seats with real-time status (available/locked/booked) |
| POST | `/schedules` | ✅ Admin | `schedules.create` | Create schedule (auto-calculates `end_time` from movie duration) |
| PUT | `/schedules/:id` | ✅ Admin | `schedules.update` | Update schedule (recalculates `end_time` if `start_time` changes) |
| DELETE | `/schedules/:id` | ✅ Admin | `schedules.remove` | Delete schedule |
| **Seats** (`/api/seats`) |
| POST | `/seats/lock` | ✅ | `seats.lockSeats` | Lock seats for checkout (body: `schedule_id`, `seat_ids[]`) |
| POST | `/seats/unlock` | ✅ | `seats.unlockSeats` | Release locked seats (body: `schedule_id`, `seat_ids[]`) |
| **Tickets** (`/api/tickets`) |
| POST | `/tickets/buy` | ✅ | `tickets.buy` | Purchase tickets (body: `schedule_id`, `seat_ids[]`, `payment_method`) |
| GET | `/tickets/my` | ✅ | `tickets.getMyTickets` | User's order history with full details |
| GET | `/tickets/verify/:barcode` | — | `tickets.verify` | Verify ticket by barcode string |
| POST | `/tickets/use/:barcode` | ✅ Admin | `tickets.markUsed` | Mark ticket as used |
| GET | `/tickets/:id/barcode` | ✅ | `tickets.getBarcode` | Get QR code data URL for an order |
| **Admin** (`/api/admin`) |
| GET | `/admin/stats` | ✅ Admin | `admin.getStats` | Dashboard statistics (users, orders, revenue) |
| GET | `/admin/income` | ✅ Admin | `admin.getIncome` | Revenue trend (query: `period`, `days`) |
| GET | `/admin/orders` | ✅ Admin | `admin.getOrders` | Paginated order list (query: `page`, `limit`, `status`) |
| GET | `/admin/users` | ✅ Admin | `admin.getUsers` | User list with spend totals |
| PUT | `/admin/users/:id/role` | ✅ Admin | `admin.updateUserRole` | Change user role (body: `role`) |

### Controller → Database Connections

| Controller | Tables Queried |
|------------|----------------|
| `auth.controller` | users |
| `movies.controller` | movies |
| `cinemas.controller` | cinemas, halls |
| `schedules.controller` | schedules, movies, halls, cinemas, seats, seat_locks, orders, order_items |
| `seats.controller` | seat_locks, orders, order_items |
| `tickets.controller` | seat_locks, schedules, seats, orders, order_items, movies, halls, cinemas, users |
| `admin.controller` | users, orders, movies, schedules, halls, cinemas |

---

## Frontend

### Entry & Routing

| File | Purpose |
|------|---------|
| `src/main.tsx` | App entry — wraps `<App>` with Redux `<Provider>` and React `<StrictMode>` |
| `src/App.tsx` | Root component — MUI dark theme, `<BrowserRouter>`, `<Navbar>`, all `<Route>` definitions |

### Route → Page Map

| Route | Page Component | Auth Required | Description |
|-------|---------------|---------------|-------------|
| `/` | `HomePage` | — | Hero banner, now-showing movies, upcoming schedules |
| `/movies` | `MoviesPage` | — | Movie catalog with search/filter |
| `/movies/:id` | `MovieDetailPage` | — | Movie details + available schedules |
| `/schedule` | `SchedulePage` | — | Date-based schedule browser |
| `/cinema` | `CinemaPage` | — | Cinema locations list |
| `/login` | `LoginPage` | — | Login form |
| `/register` | `RegisterPage` | — | Registration form |
| `/verify` | `VerifyPage` | — | Ticket verification by barcode |
| `/schedules/:id/seats` | `SeatSelectionPage` | ✅ | Seat selection → lock → purchase flow |
| `/checkout/success` | `CheckoutSuccessPage` | ✅ | Post-purchase QR code & confirmation |
| `/tickets` | `TicketsPage` | ✅ | User's booking history |
| `/admin` | `AdminDashboard` | ✅ Admin | Full admin panel (5 tabs) |

### State Management (Redux Toolkit)

The store is configured in `src/app/store.ts` with 6 slices:

| Slice | State Shape | Async Thunks | Used By |
|-------|------------|--------------|---------|
| **auth** | `{ user, token, loading, error }` | `login`, `register` | Navbar, LoginPage, RegisterPage, ProtectedRoute |
| **movies** | `{ items[], selected, loading, error }` | `fetchMovies`, `fetchMovieById`, `createMovie`, `updateMovie`, `deleteMovie` | HomePage, MoviesPage, MovieDetailPage, AdminDashboard |
| **schedules** | `{ items[], selected, loading, error }` | `fetchSchedules`, `fetchScheduleById`, `createSchedule`, `deleteSchedule` | HomePage, MovieDetailPage, SchedulePage, SeatSelectionPage, AdminDashboard |
| **seats** | `{ seats[], selectedSeats[], lockExpiry, loading, lockLoading, error }` | `fetchSeatsForSchedule`, `lockSeats`, `unlockSeats` | SeatSelectionPage (via SeatMap component) |
| **tickets** | `{ tickets[], lastPurchase, verifyResult, loading, error }` | `buyTickets`, `fetchMyTickets`, `verifyTicket`, `getTicketBarcode` | SeatSelectionPage, CheckoutSuccessPage, TicketsPage, VerifyPage |
| **admin** | `{ stats, income[], orders[], users[], loading }` | `fetchAdminStats`, `fetchIncome`, `fetchAdminOrders`, `fetchAdminUsers`, `updateUserRole` | AdminDashboard |

### Shared Components

| Component | File | Props | Used By |
|-----------|------|-------|---------|
| **Navbar** | `src/components/Navbar.tsx` | — (reads auth state) | App.tsx (always rendered) |
| **ProtectedRoute** | `src/components/ProtectedRoute.tsx` | `children`, `requireAdmin?` | App.tsx (wraps protected routes) |
| **MovieCard** | `src/components/MovieCard.tsx` | `movie: Movie` | HomePage, MoviesPage |
| **SeatMap** | `src/components/SeatMap.tsx` | `seats`, `selectedSeats`, `currentUserId`, `onToggle` | SeatSelectionPage |

### API Communication Layer

`src/services/api.ts` creates a shared Axios instance:
- **Base URL**: `VITE_API_URL` env var or `http://localhost:5000/api`
- **Request interceptor**: Attaches `Authorization: Bearer <token>` from `localStorage('cinema_token')`
- **Response interceptor**: On 401, clears localStorage auth data and redirects to `/login`

Every Redux slice imports this `api` instance for its async thunks :

```
authSlice    → POST /auth/login, /auth/register
moviesSlice  → GET/POST/PUT/DELETE /movies
schedulesSlice → GET/POST/DELETE /schedules
seatsSlice   → GET /schedules/:id/seats, POST /seats/lock, /seats/unlock
ticketsSlice → POST /tickets/buy, GET /tickets/my, /tickets/verify/:barcode
adminSlice   → GET /admin/stats, /admin/income, /admin/orders, /admin/users, PUT /admin/users/:id/role
```

### Page Details

#### HomePage
Fetches `now_showing` movies and today's schedules on mount. Displays a hero section, 4 feature highlight cards, a movie grid (using `MovieCard`), and an upcoming schedules section with "Book Now" links.

#### MoviesPage
Fetches all movies on mount. Provides a search bar (client-side filtering on title) and status toggle buttons (All / Now Showing / Coming Soon). Renders filtered results as `MovieCard` grid.

#### MovieDetailPage
Reads `:id` from URL params. Fetches movie details and its schedules. Shows backdrop image, poster, metadata (genre, language, rating, duration, release date, status), description, and a list of schedule cards with "Select Seats" buttons linking to `/schedules/:id/seats`.

#### SchedulePage
Fetches schedules for a selected date (defaults to today). Groups showtimes by cinema. Each card shows the movie poster, title, hall, time, and regular price with a "Book" button.

#### CinemaPage
Calls `api.get('/cinemas')` directly (not via Redux). Renders cinema cards with image, name, location, and "View Schedules" link.

#### SeatSelectionPage
Two-step flow:
1. **Select** — Renders `SeatMap` component. User clicks seats to toggle selection. "Proceed to Checkout" dispatches `lockSeats()`.
2. **Review** — Shows selected seats with prices, payment method picker (online/bank transfer/cash), total. "Confirm Payment" dispatches `buyTickets()`. "Back to Selection" dispatches `unlockSeats()` and returns to step 1.

On cleanup (unmount), dispatches `clearSeats()`.

#### CheckoutSuccessPage
Reads `lastPurchase` from tickets Redux state. Displays QR code (via `qrcode.react`), order ID, status, seat list, and total price. Links to "View My Tickets" and "Back to Home".

#### TicketsPage
Fetches user's tickets on mount. Lists each order card with movie poster, title, cinema/hall, showtime, seat chips, total price, and status. Paid tickets have a "Show QR" button which opens a dialog with the QR code.

#### VerifyPage
Text input for barcode string, "Verify" button. Dispatches `verifyTicket()`. Shows valid/invalid result with full ticket details (movie, cinema, hall, showtime, customer info, seats, status) and QR code for valid tickets.

#### LoginPage
Email/password form. On submit dispatches `login()`. On success, navigates to `/`. If user is already logged in, redirects via `useEffect`.

#### RegisterPage
Username/email/password/confirm form. Client-side validation (password match, min 6 chars). Dispatches `register()`. On success, navigates to `/`.

#### AdminDashboard
5-tab panel (requires admin role):
- **Overview** — 4 stat cards (revenue, users, orders, movies) + revenue area chart + orders bar chart (via Recharts). Period toggle (daily/monthly).
- **Movies** — Table of all movies with add/delete. "Add Movie" dialog form.
- **Schedules** — Table of all schedules with add/delete. "Add Schedule" dialog form with movie/hall selectors.
- **Orders** — Table of all orders with customer, movie, showtime, total, status.
- **Users** — Table of all users with role, order count, total spent. Promote/demote buttons.

---

## Infrastructure & Deployment

### Docker Compose (`docker-compose.yml`)

3 services:

| Service | Image | Port | Depends On |
|---------|-------|------|------------|
| **postgres** | postgres:16-alpine | 5432 | — |
| **backend** | Built from `backend/Dockerfile` | 5000 | postgres (healthy) |
| **frontend** | Built from `Dockerfile` | 5173 → 80 | backend |

Backend runs `npm run migrate && npm run seed && npm start` on startup.

### Dockerfiles

**Frontend** (`Dockerfile`):
1. Build stage: Node 20 alpine → `npm run build` (Vite) with `VITE_API_URL` build arg
2. Serve stage: nginx:alpine with custom `nginx.conf`, serves `dist/`

**Backend** (`backend/Dockerfile`):
1. Build stage: Node 20 alpine → `npm ci --omit=dev`
2. Serve stage: node.js runs `node src/index.js`

### Nginx (`nginx.conf`)

- Gzip compression for text/JS/CSS/JSON/SVG
- 1-year cache for `/assets/` static files
- `try_files $uri $uri/ /index.html` — SPA fallback for client-side routing

### Kubernetes (`k8s/`)

| Manifest | Resources |
|----------|-----------|
| `namespace.yaml` | Namespace: `cinema` |
| `configmap-secret.yaml` | Secret: `cinema-secrets` (DB_PASSWORD, JWT_SECRET) + ConfigMap: `cinema-config` (all other env vars) |
| `postgres.yaml` | PVC (5Gi), Deployment (1 replica), ClusterIP Service (5432) |
| `backend.yaml` | Deployment (2 replicas, initContainer for migrate+seed, liveness/readiness probes at `/health`), ClusterIP Service (5000) |
| `frontend.yaml` | Deployment (2 replicas), LoadBalancer Service (80), Ingress (routes `/api` → backend, `/` → frontend) |

### Environment Variables

#### Backend
| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 5000 | Server port |
| `DB_HOST` | localhost | PostgreSQL host |
| `DB_PORT` | 5432 | PostgreSQL port |
| `DB_NAME` | cinema_db | Database name |
| `DB_USER` | postgres | Database user |
| `DB_PASSWORD` | — | Database password |
| `JWT_SECRET` | — | JWT signing secret |
| `JWT_EXPIRES_IN` | 7d | JWT token expiration |
| `SEAT_LOCK_TTL` | 600 | Seat lock duration in seconds |
| `FRONTEND_URL` | http://localhost:5173 | CORS allowed origin |
| `NODE_ENV` | — | production/development |

#### Frontend (build-time)
| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | http://localhost:5000/api | Backend API base URL |

---

## User Flows

### 1. Ticket Booking Flow

```
User browses movies (HomePage / MoviesPage)
  → Selects a movie (MovieDetailPage)
    → Picks a showtime (schedule)
      → SeatSelectionPage: selects seats on the interactive map
        → "Proceed to Checkout" → API: POST /seats/lock (10-min TTL)
          → Reviews order, selects payment method
            → "Confirm Payment" → API: POST /tickets/buy
              → Seat locks released, order created, QR generated
                → CheckoutSuccessPage: shows QR code + confirmation
```

### 2. Ticket Verification Flow

```
Staff/User opens VerifyPage
  → Enters barcode string (from printed ticket or QR scan)
    → API: GET /tickets/verify/:barcode
      → Shows valid/invalid + full ticket details
        → Admin can mark as used: POST /tickets/use/:barcode
```

### 3. Seat Locking Mechanism

```
1. User clicks "Proceed to Checkout"
2. Frontend dispatches lockSeats({ schedule_id, seat_ids })
3. Backend (in transaction):
   a. Cleans expired locks (DELETE WHERE expires_at <= NOW())
   b. Checks for conflicts (existing locks or booked seats)
   c. If conflict → 409 error
   d. If clear → INSERT locks with TTL (default 10 min)
4. Frontend shows review step with countdown
5. On purchase → locks are deleted, order_items created
6. On cancel/back → unlockSeats() releases the locks
7. On timeout → locks automatically expire (cleaned on next request)
```

### 4. Authentication Flow

```
Register/Login → Backend returns { user, token }
  → Frontend stores token in localStorage('cinema_token')
  → Frontend stores user in localStorage('cinema_user')  
  → Redux auth state updated
  → Axios interceptor auto-attaches Bearer token to all requests
  → On 401 → localStorage cleared, redirect to /login
```

---

## Seed Data

The `seed.js` script creates demo data for development:

| Entity | Details |
|--------|---------|
| Admin user | admin@cinemax.com / admin123 |
| Regular user | user@cinemax.com / user123 |
| 2 Cinemas | CineMax Grand Jakarta, CineMax Plaza Bandung |
| 2 Halls | Studio 1 (8×10 = 80 seats), Studio 2 |
| 80 Seats | Rows A-H, Cols 1-10 (row H = VIP) |
| 5 Movies | Pre-populated with posters, genres, ratings |
| 3 Schedules | Showtimes for today and tomorrow |
