# CineMax - Cinema Booking System

A full-stack cinema ticket booking system built with React + Redux + Material UI (frontend), Node.js + Express (backend), and PostgreSQL (database). Docker & Kubernetes ready.

## Features

- **Authentication** — Register/login with JWT, role-based access (user/admin)
- **Movies** — Browse now-showing and coming-soon movies with search & filter
- **Movie Schedules** — View showtimes by date and cinema
- **Seat Selection** — Interactive seat map with real-time locking (10-minute hold)
- **Ticket Purchase** — Buy tickets, generates unique QR barcode
- **Ticket Verification** — Verify tickets by barcode (public endpoint)
- **My Tickets** — View all purchased tickets with QR codes
- **Admin Panel** — Revenue charts, manage movies/schedules/orders/users

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
node src/db/migrate.js  # Create schema
node src/db/seed.js     # Seed demo data
npm run dev             # Port 5000
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
| Movies | CRUD /api/movies |
| Cinemas | GET /api/cinemas, /api/cinemas/:id/halls |
| Schedules | CRUD /api/schedules · GET /api/schedules/:id/seats |
| Seats | POST /api/seats/lock, /unlock |
| Tickets | POST /api/tickets/buy · GET /my, /verify/:barcode |
| Admin | GET /api/admin/stats, /income, /orders, /users |

## Seat Lock Flow

1. User selects seats → clicks Proceed
2. Seats atomically locked in DB for 10 min
3. Other users see locked seats immediately
4. On payment: locks released, order items recorded
5. On cancel/timeout: locks auto-expire

