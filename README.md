# CineMax - Cinema Booking System

A full-stack cinema ticket booking system built with React + Redux + Material UI (frontend), Node.js + Express + **Sequelize ORM** (backend), and PostgreSQL (database). Docker & Kubernetes ready.

## Features

- **Authentication** — Register/login with JWT, role-based access (User/Admin)
- **Films** — Browse now-showing and coming-soon films with search & filter
- **Schedules (Jadwal)** — View showtimes by date and cinema
- **Seat Selection** — Interactive seat map with real-time locking (10-minute hold)
- **Ticket Purchase** — Buy tickets with optional F&B add-ons, generates unique QR barcode
- **Ticket Verification** — Verify tickets by barcode (public endpoint)
- **My Tickets** — View all purchased transactions with QR codes
- **Ratings** — Rate films on a 1–10 scale; film average auto-updates
- **Admin Panel** — Revenue charts, manage films/schedules/transactions/users

## Demo Accounts (after seed)

| Role  | Email | Password |
|-------|-------|----------|
| Admin | admin@cinema.com | admin123 |
| User  | john@example.com | user123  |

## Development Setup

### Backend

```sh
cd backend
cp .env.example .env   # Edit DB credentials if needed
npm install
npm run migrate        # Drop & recreate schema via Sequelize
npm run seed           # Seed demo data
npm run dev            # Port 5000
```

### Frontend

```sh
# In tubes-bioskop/ root
cp .env.example .env    # VITE_API_URL=http://localhost:5000/api
npm install
npm run dev             # Port 5173
```

## Docker Compose (batteries included)

```sh
docker-compose up -d
# Frontend: http://localhost:5173
# API:      http://localhost:5000
# Health:   http://localhost:5000/health
```

Runs migrate + seed automatically on first start.

## Kubernetes

```sh
# Build & push images first, update image refs in k8s/*.yaml
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap-secret.yaml
kubectl apply -f k8s/postgres.yaml
kubectl apply -f k8s/backend.yaml
kubectl apply -f k8s/frontend.yaml
kubectl get pods -n cinema
```

## API Summary

| Resource | Endpoints |
|---|---|
| Auth | POST /api/auth/register, /login · GET /api/auth/me |
| Films | CRUD /api/film |
| Cinemas | CRUD /api/bioskop · GET /api/bioskop/:id/studios |
| Schedules | CRUD /api/jadwal · GET /api/jadwal/:id/seats |
| Seats | POST /api/seats/lock, /unlock |
| Tickets | POST /api/tiket/buy · GET /api/tiket/my, /verify/:barcode |
| Ratings | GET /api/rating/film/:filmId · POST/PUT/DELETE /api/rating |
| F&B | CRUD /api/fnb |
| Admin | GET /api/admin/stats, /income, /transactions, /users |

## Seat Lock Flow

1. User selects seats → clicks Proceed
2. Seats atomically locked in DB for 10 min
3. Other users see locked seats immediately
4. On payment: locks released, tiket records created
5. On cancel/timeout: locks auto-expire

