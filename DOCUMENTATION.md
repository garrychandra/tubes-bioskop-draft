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
┌─────────────────────┐     HTTP/REST     ┌──────────────────┐   Sequelize  ┌──────────────┐
│   React Frontend    │ ───────────────── │  Express Backend │ ──────────── │  PostgreSQL  │
│   (Vite + MUI)      │   Axios + JWT     │  (Node.js)       │    ORM/SQL   │  (Port 5432) │
│   Port 5173 (dev)   │                   │  Port 5000       │              │              │
│   Port 80 (prod)    │                   │                  │              │              │
└─────────────────────┘                   └──────────────────┘              └──────────────┘
```

**Frontend** → Single-page React app served by Vite (dev) or Nginx (prod). Uses Redux Toolkit for state, Axios for API calls, MUI for UI components.

**Backend** → RESTful Express API. JWT authentication, bcrypt password hashing, QR code generation, helmet/CORS/rate-limiting security middleware. Database access via **Sequelize ORM v6** with PostgreSQL dialect.

**Database** → PostgreSQL 16 with UUID primary keys, 12 tables, full foreign key integrity, and performance indexes.

---

## Database Schema

### Entity-Relationship Summary

| Table | Description | Key Relationships |
|-------|-------------|-------------------|
| **users** | Registered users (role: `User` or `Admin`) | → transaksi, rating, kursi_locks |
| **film** | Film catalog with metadata and average rating | → jadwal, rating |
| **bioskop** | Cinema locations | → studio |
| **studio** | Screens/auditoriums inside a bioskop | → kursi, jadwal |
| **kursi** | Individual seats in a studio | → tiket, kursi_locks |
| **jadwal** | Showtimes linking a film to a studio | → tiket, kursi_locks |
| **kursi_locks** | Temporary seat holds during checkout (10-min TTL) | → kursi, jadwal, users |
| **transaksi** | Completed purchases | → tiket, detail_fnb, users |
| **tiket** | Individual seat tickets in a transaksi | → transaksi, jadwal, kursi |
| **fnb** | Food & beverage menu items | → detail_fnb |
| **detail_fnb** | F&B line items in a transaksi | → transaksi, fnb |
| **rating** | User film ratings (1–10, one per user per film) | → users, film |

### Table Details

#### `users`
| Column | Type | Constraints |
|--------|------|-------------|
| id_user | UUID | PK, auto-generated (UUIDV4) |
| nama | VARCHAR(80) | NOT NULL |
| email | VARCHAR(120) | UNIQUE, NOT NULL |
| password | TEXT | NOT NULL (bcrypt) |
| role | VARCHAR(20) | DEFAULT `'User'` — values: `User`, `Admin` |

#### `film`
| Column | Type | Constraints |
|--------|------|-------------|
| id_film | UUID | PK |
| judul | VARCHAR(300) | NOT NULL |
| deskripsi | TEXT | Optional |
| poster_url | TEXT | Optional |
| durasi | INTEGER | NOT NULL, DEFAULT 120 (minutes) |
| genre | VARCHAR(100) | Optional |
| avg_rating | DECIMAL(3,1) | DEFAULT 0 (auto-recalculated on each rating change) |
| status | VARCHAR(20) | DEFAULT `'now_showing'` — values: `now_showing`, `coming_soon`, `ended` |
| release_date | DATE | Optional |

#### `bioskop`
| Column | Type | Constraints |
|--------|------|-------------|
| id_bioskop | UUID | PK |
| nama_bioskop | VARCHAR(200) | NOT NULL |
| lokasi | TEXT | NOT NULL |
| image_url | TEXT | Optional |

#### `studio`
| Column | Type | Constraints |
|--------|------|-------------|
| id_studio | UUID | PK |
| id_bioskop | UUID | FK → bioskop(id_bioskop) ON DELETE CASCADE |
| nama_studio | VARCHAR(100) | NOT NULL |
| kapasitas | INTEGER | NOT NULL |

#### `kursi`
| Column | Type | Constraints |
|--------|------|-------------|
| id_kursi | UUID | PK |
| id_studio | UUID | FK → studio(id_studio) ON DELETE CASCADE |
| nomor_kursi | VARCHAR(10) | NOT NULL |
| | | UNIQUE(id_studio, nomor_kursi) |

#### `jadwal`
| Column | Type | Constraints |
|--------|------|-------------|
| id_jadwal | UUID | PK |
| id_film | UUID | FK → film(id_film) ON DELETE CASCADE |
| id_studio | UUID | FK → studio(id_studio) ON DELETE CASCADE |
| jam_tayang | TIMESTAMPTZ | NOT NULL |
| jam_selesai | TIMESTAMPTZ | NOT NULL (auto-calculated from film.durasi) |
| harga_tiket | DECIMAL(12,2) | NOT NULL |

#### `kursi_locks`
| Column | Type | Constraints |
|--------|------|-------------|
| id_lock | UUID | PK |
| id_kursi | UUID | FK → kursi(id_kursi) ON DELETE CASCADE |
| id_jadwal | UUID | FK → jadwal(id_jadwal) ON DELETE CASCADE |
| id_user | UUID | FK → users(id_user) ON DELETE CASCADE |
| locked_at | TIMESTAMPTZ | DEFAULT NOW() |
| expires_at | TIMESTAMPTZ | NOT NULL (locked_at + SEAT_LOCK_TTL seconds) |
| | | UNIQUE(id_kursi, id_jadwal) |

#### `transaksi`
| Column | Type | Constraints |
|--------|------|-------------|
| id_transaksi | UUID | PK |
| id_user | UUID | FK → users(id_user) |
| total_harga | DECIMAL(12,2) | NOT NULL |
| barcode | TEXT | UNIQUE, NOT NULL |
| status_bayar | VARCHAR(30) | DEFAULT `'paid'` |
| tanggal_bayar | TIMESTAMPTZ | DEFAULT NOW() |

#### `tiket`
| Column | Type | Constraints |
|--------|------|-------------|
| id_tiket | UUID | PK |
| id_transaksi | UUID | FK → transaksi(id_transaksi) ON DELETE CASCADE |
| id_jadwal | UUID | FK → jadwal(id_jadwal) |
| id_kursi | UUID | FK → kursi(id_kursi) |
| barcode | TEXT | UNIQUE |
| status_tiket | VARCHAR(20) | DEFAULT `'active'` — values: `active`, `used` |
| | | UNIQUE(id_kursi, id_jadwal) |

#### `fnb`
| Column | Type | Constraints |
|--------|------|-------------|
| id_item | UUID | PK |
| nama_item | VARCHAR(200) | NOT NULL |
| harga | DECIMAL(12,2) | NOT NULL |
| kategori | VARCHAR(100) | Optional |
| image_url | TEXT | Optional |

#### `detail_fnb`
| Column | Type | Constraints |
|--------|------|-------------|
| id_detail | UUID | PK |
| id_transaksi | UUID | FK → transaksi(id_transaksi) ON DELETE CASCADE |
| id_item | UUID | FK → fnb(id_item) |
| jumlah | INTEGER | NOT NULL |
| harga_satuan | DECIMAL(12,2) | NOT NULL |

#### `rating`
| Column | Type | Constraints |
|--------|------|-------------|
| id_rating | UUID | PK |
| id_user | UUID | FK → users(id_user) ON DELETE CASCADE |
| id_film | UUID | FK → film(id_film) ON DELETE CASCADE |
| nilai | INTEGER | NOT NULL, validate min: 1, max: 10 |
| ulasan | TEXT | Optional |
| | | UNIQUE(id_user, id_film) |

### Indexes

| Index | On |
|-------|----|
| idx_jadwal_film | jadwal(id_film) |
| idx_jadwal_studio | jadwal(id_studio) |
| idx_jadwal_jam | jadwal(jam_tayang) |
| idx_kursi_studio | kursi(id_studio) |
| idx_kursi_locks_jadwal | kursi_locks(id_jadwal) |
| idx_kursi_locks_expires | kursi_locks(expires_at) |
| idx_transaksi_user | transaksi(id_user) |
| idx_tiket_transaksi | tiket(id_transaksi) |
| idx_detail_fnb_transaksi | detail_fnb(id_transaksi) |

---

## Backend API

### Entry Point & Middleware Stack

| File | Purpose |
|------|---------|
| `backend/src/index.js` | Loads `.env`, imports the Express app, starts listening on `PORT` (default 5000) |
| `backend/src/app.js` | Creates Express app with middleware: **helmet** (security headers), **CORS** (configurable origin), **rate limiter** (200 req/15min), **JSON parser**, **morgan** (HTTP logging). Mounts `/api` routes. Health check at `GET /health`. |
| `backend/src/db/sequelize.js` | Sequelize ORM instance (postgres dialect, max 20 connections). Configured via env vars: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`. |
| `backend/src/models/index.js` | Barrel file — imports all 12 Sequelize models, defines all FK associations, exports `{ sequelize, User, Film, Bioskop, Studio, Jadwal, Kursi, KursiLock, Transaksi, Tiket, Fnb, DetailFnb, Rating }`. |
| `backend/src/middleware/auth.js` | **`authenticate`** — Verifies JWT Bearer token, loads user via `User.findByPk`, attaches to `req.user`. **`requireAdmin`** — Checks `req.user.role === 'Admin'`. |

### Route Map

All routes are prefixed with `/api`.

| Method | Endpoint | Auth | Controller | Description |
|--------|----------|------|------------|-------------|
| **Auth** (`/api/auth`) |
| POST | `/auth/register` | — | `auth.register` | Create account (nama, email, password) → returns user + JWT |
| POST | `/auth/login` | — | `auth.login` | Login (email, password) → returns user + JWT |
| GET | `/auth/me` | ✅ | `auth.getMe` | Get current user from token |
| **Films** (`/api/film`) |
| GET | `/film` | — | `film.getAll` | List films (optional filters: `status`, `genre`, `search`) |
| GET | `/film/:id` | — | `film.getById` | Single film details |
| POST | `/film` | ✅ Admin | `film.create` | Create a film |
| PUT | `/film/:id` | ✅ Admin | `film.update` | Update a film (partial — skips undefined fields) |
| DELETE | `/film/:id` | ✅ Admin | `film.remove` | Delete a film |
| **Cinemas** (`/api/bioskop`) |
| GET | `/bioskop` | — | `bioskop.getAll` | List all cinemas |
| GET | `/bioskop/:id` | — | `bioskop.getById` | Single cinema with its studios |
| POST | `/bioskop` | ✅ Admin | `bioskop.create` | Create cinema |
| PUT | `/bioskop/:id` | ✅ Admin | `bioskop.update` | Update cinema |
| DELETE | `/bioskop/:id` | ✅ Admin | `bioskop.remove` | Delete cinema |
| GET | `/bioskop/:id/studios` | — | `bioskop.getStudios` | List studios in a cinema |
| POST | `/bioskop/:id/studios` | ✅ Admin | `bioskop.createStudio` | Add a studio to a cinema |
| PUT | `/bioskop/:id/studios/:studioId` | ✅ Admin | `bioskop.updateStudio` | Update a studio |
| DELETE | `/bioskop/:id/studios/:studioId` | ✅ Admin | `bioskop.removeStudio` | Delete a studio |
| **Schedules** (`/api/jadwal`) |
| GET | `/jadwal` | — | `jadwal.getAll` | List jadwal (optional: `id_film`, `date` filter) |
| GET | `/jadwal/:id` | — | `jadwal.getById` | Jadwal details with film/studio/bioskop info |
| GET | `/jadwal/:id/seats` | — | `jadwal.getSeatsForSchedule` | All kursi with real-time status (available/locked/booked) |
| POST | `/jadwal` | ✅ Admin | `jadwal.create` | Create jadwal (auto-calculates `jam_selesai` from film.durasi) |
| PUT | `/jadwal/:id` | ✅ Admin | `jadwal.update` | Update jadwal (recalculates `jam_selesai` if `jam_tayang` changes) |
| DELETE | `/jadwal/:id` | ✅ Admin | `jadwal.remove` | Delete jadwal |
| **Kursi** (`/api/kursi`) |
| GET | `/kursi/studio/:studioId` | — | `kursi.getByStudio` | List all kursi in a studio |
| POST | `/kursi` | ✅ Admin | `kursi.create` | Add a kursi to a studio |
| DELETE | `/kursi/:id` | ✅ Admin | `kursi.remove` | Delete a kursi |
| **Seat Locks** (`/api/seats`) |
| POST | `/seats/lock` | ✅ | `kursi_locks.lockSeats` | Lock kursi for checkout (body: `id_jadwal`, `kursi_ids[]`) |
| POST | `/seats/unlock` | ✅ | `kursi_locks.unlockSeats` | Release locked kursi |
| **Tickets** (`/api/tiket`) |
| POST | `/tiket/buy` | ✅ | `tiket.buy` | Purchase tickets + optional F&B (body: `id_jadwal`, `kursi_ids[]`, `fnb_items[]`) |
| GET | `/tiket/my` | ✅ | `tiket.getMyTransactions` | User's transaksi history with full details |
| GET | `/tiket/verify/:barcode` | — | `tiket.verify` | Verify ticket by barcode string |
| POST | `/tiket/use/:barcode` | ✅ Admin | `tiket.markUsed` | Mark tiket as used |
| GET | `/tiket/:id/barcode` | ✅ | `tiket.getBarcode` | Get QR code data URL for a transaksi |
| **Ratings** (`/api/rating`) |
| GET | `/rating/film/:filmId` | — | `rating.getByFilm` | All ratings for a film (with user info) |
| POST | `/rating` | ✅ | `rating.create` | Submit a rating (nilai 1–10, optional ulasan) |
| PUT | `/rating/:id` | ✅ | `rating.update` | Update your rating |
| DELETE | `/rating/:id` | ✅ | `rating.remove` | Delete your rating |
| **F&B** (`/api/fnb`) |
| GET | `/fnb` | — | `fnb.getAll` | List all F&B items |
| GET | `/fnb/:id` | — | `fnb.getById` | Single F&B item |
| POST | `/fnb` | ✅ Admin | `fnb.create` | Create F&B item |
| PUT | `/fnb/:id` | ✅ Admin | `fnb.update` | Update F&B item |
| DELETE | `/fnb/:id` | ✅ Admin | `fnb.remove` | Delete F&B item |
| **Admin** (`/api/admin`) |
| GET | `/admin/stats` | ✅ Admin | `admin.getStats` | Dashboard statistics (users, films, revenue, tiket) |
| GET | `/admin/income` | ✅ Admin | `admin.getIncome` | Revenue trend (query: `period`, `days`) |
| GET | `/admin/transactions` | ✅ Admin | `admin.getTransactions` | Paginated transaksi list (query: `page`, `limit`) |
| GET | `/admin/users` | ✅ Admin | `admin.getUsers` | User list with spend totals |
| PUT | `/admin/users/:id/role` | ✅ Admin | `admin.updateUserRole` | Change user role (body: `role`) |

### Controller → Database Connections

| Controller | Models / Tables Used |
|------------|----------------------|
| `auth.controller` | User |
| `film.controller` | Film |
| `bioskop.controller` | Bioskop, Studio |
| `jadwal.controller` | Jadwal, Film, Studio, Bioskop, Kursi, KursiLock, Transaksi |
| `kursi.controller` | Kursi, Studio |
| `kursi_locks.controller` | KursiLock, Transaksi, Tiket |
| `tiket.controller` | Transaksi, Tiket, DetailFnb, Jadwal, Film, Studio, Bioskop, Kursi, Fnb, KursiLock, User |
| `rating.controller` | Rating, User, Film |
| `fnb.controller` | Fnb |
| `admin.controller` | User, Transaksi, Film, Tiket, Jadwal |

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
5. On purchase → locks are deleted, tiket records created
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
| Admin | admin@cinema.com / admin123 |
| User | john@example.com / user123 |
| 2 Bioskop | CineMax Grand (Jakarta Pusat), StarPlex Cinema (Jakarta Utara) |
| 4 Studios | Studio 1 (80 kursi), Studio 2 VIP (48 kursi), Theater A (80 kursi), Theater B IMAX (84 kursi) |
| 292 Kursi | Auto-generated per studio configuration |
| 5 Films | Avengers: Secret Wars, The Grand Illusion, Nusantara Rising, Eternal Echoes, Shadow Protocol |
| 48 Jadwal | 3 days × 4 studios × 4 showtimes each |
| F&B Items | Various food & beverage menu items |
