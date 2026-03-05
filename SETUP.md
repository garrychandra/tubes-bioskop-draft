# CineMax — Setup & Running Guide

This guide walks you through getting the CineMax cinema booking system up and running, covering three methods: Docker Compose (recommended), local development, and Kubernetes.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start with Docker Compose](#quick-start-with-docker-compose)
3. [Local Development Setup](#local-development-setup)
4. [Kubernetes Deployment](#kubernetes-deployment)
5. [Environment Variables Reference](#environment-variables-reference)
6. [Demo Accounts](#demo-accounts)
7. [Useful Commands](#useful-commands)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

| Tool | Version | Required For |
|------|---------|-------------|
| **Node.js** | 20+ | Local development |
| **npm** | 9+ | Local development |
| **Docker** | 24+ | Docker Compose / K8s |
| **Docker Compose** | v2+ | Docker Compose method |
| **PostgreSQL** | 16+ | Local development (if not using Docker) |
| **kubectl** | 1.28+ | Kubernetes deployment |

---

## Quick Start with Docker Compose

This is the fastest way to get everything running — one command spins up the database, backend, and frontend.

### 1. Clone and enter the project

```bash
git clone <repo-url>
cd tubes-bioskop
```

### 2. (Optional) Set a custom JWT secret

Create a `.env` file in the project root:

```bash
JWT_SECRET=my-super-secure-secret-key
```

If you skip this, it defaults to `change-me-in-production`.

### 3. Start everything

```bash
docker compose up --build
```

This will:
- Start **PostgreSQL 16** on port `5432` (with a health check)
- Wait for the database to be ready, then start the **backend** on port `5000`
- Run database **migrations** (creates all tables) and **seed** (inserts demo data)
- Build and start the **frontend** (Nginx) on port `5173`

### 4. Open the app

| Service | URL |
|---------|-----|
| **Frontend** | [http://localhost:5173](http://localhost:5173) |
| **Backend API** | [http://localhost:5000/api](http://localhost:5000/api) |
| **Health Check** | [http://localhost:5000/health](http://localhost:5000/health) |

### 5. Stop everything

```bash
docker compose down
```

To also delete the database volume (wipes all data):

```bash
docker compose down -v
```

---

## Local Development Setup

Use this when you want hot-reload and a faster development loop.

### 1. Start PostgreSQL

**Option A — Docker (recommended):**

```bash
docker run -d \
  --name cinema_db \
  -e POSTGRES_DB=cinema_db \
  -e POSTGRES_USER=cinema_user \
  -e POSTGRES_PASSWORD=cinema_pass \
  -p 5432:5432 \
  postgres:16-alpine
```

**Option B — Local PostgreSQL:**

If you have PostgreSQL installed locally, create the database:

```sql
CREATE USER cinema_user WITH PASSWORD 'cinema_pass';
CREATE DATABASE cinema_db OWNER cinema_user;
```

### 2. Set up the backend

```bash
cd backend
```

Create the `.env` file:

```bash
cp .env.example .env
```

Verify the contents of `backend/.env`:

```dotenv
NODE_ENV=development
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=cinema_db
DB_USER=cinema_user
DB_PASSWORD=cinema_pass
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d
SEAT_LOCK_TTL=600
FRONTEND_URL=http://localhost:5173
```

Install dependencies:

```bash
npm install
```

Run migrations (creates all database tables):

```bash
npm run migrate
```

Seed demo data:

```bash
npm run seed
```

Start the backend (with auto-reload via nodemon):

```bash
npm run dev
```

The API is now running at **http://localhost:5000/api**.

### 3. Set up the frontend

Open a new terminal, go back to the project root:

```bash
cd ..
```

Create the `.env` file:

```bash
cp .env.example .env
```

The default `VITE_API_URL=http://localhost:5000/api` should work as-is.

Install dependencies:

```bash
npm install
```

Start the dev server:

```bash
npm run dev
```

The frontend is now running at **http://localhost:5173** with hot-reload.

### Summary of running terminals

| Terminal | Directory | Command | Port |
|----------|-----------|---------|------|
| 1 | `backend/` | `npm run dev` | 5000 |
| 2 | (project root) | `npm run dev` | 5173 |

---

## Kubernetes Deployment

For production-style deployment on a Kubernetes cluster.

### 1. Build and push Docker images

Replace `your-registry` with your container registry (Docker Hub, GCR, ECR, etc.):

```bash
# Build backend
docker build -t your-registry/cinema-backend:latest ./backend
docker push your-registry/cinema-backend:latest

# Build frontend (pass your production API URL)
docker build \
  --build-arg VITE_API_URL=http://cinema.example.com/api \
  -t your-registry/cinema-frontend:latest .
docker push your-registry/cinema-frontend:latest
```

### 2. Update image references in K8s manifests

Edit these files to replace `your-registry/cinema-backend:latest` and `your-registry/cinema-frontend:latest` with your actual image paths:

- `k8s/backend.yaml`
- `k8s/frontend.yaml`

### 3. Update secrets and config

Edit `k8s/configmap-secret.yaml`:

```yaml
# Update these values for production:
stringData:
  DB_PASSWORD: <your-secure-db-password>
  JWT_SECRET: <your-secure-jwt-secret>
```

Edit `k8s/frontend.yaml` ingress section:

```yaml
# Replace with your actual domain:
- host: cinema.example.com
```

### 4. Apply the manifests (in order)

```bash
# Create namespace
kubectl apply -f k8s/namespace.yaml

# Create config and secrets
kubectl apply -f k8s/configmap-secret.yaml

# Deploy PostgreSQL (waits for PVC + readiness probe)
kubectl apply -f k8s/postgres.yaml

# Wait for postgres to be ready
kubectl -n cinema wait --for=condition=ready pod -l app=cinema-postgres --timeout=120s

# Deploy backend (init container runs migrations + seed)
kubectl apply -f k8s/backend.yaml

# Deploy frontend + ingress
kubectl apply -f k8s/frontend.yaml
```

### 5. Verify deployment

```bash
# Check all pods are running
kubectl -n cinema get pods

# Check services
kubectl -n cinema get svc

# Check ingress
kubectl -n cinema get ingress

# View backend logs
kubectl -n cinema logs -l app=cinema-backend --tail=50

# View init container (migration) logs
kubectl -n cinema logs -l app=cinema-backend -c migrate
```

### K8s Architecture Overview

```
                           Ingress (cinema.example.com)
                           ┌──────────┬──────────┐
                           │  /api/*  │    /*    │
                           ▼          ▼          │
              cinema-backend-service   cinema-frontend-service
              (ClusterIP:5000)         (LoadBalancer:80)
                   │                        │
              ┌────┴────┐             ┌─────┴─────┐
              │ Backend │ x2 replicas │ Frontend  │ x2 replicas
              │ (Node)  │             │ (Nginx)   │
              └────┬────┘             └───────────┘
                   │
         cinema-postgres-service
              (ClusterIP:5432)
                   │
              ┌────┴────┐
              │PostgreSQL│  ← PVC (5Gi)
              └─────────┘
```

---

## Environment Variables Reference

### Backend (`backend/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | `development` or `production` |
| `PORT` | `5000` | Express server port |
| `DB_HOST` | `localhost` | PostgreSQL hostname (`postgres` in Docker Compose) |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_NAME` | `cinema_db` | Database name |
| `DB_USER` | `cinema_user` | Database user |
| `DB_PASSWORD` | `cinema_pass` | Database password |
| `JWT_SECRET` | — | **Required.** Secret key for signing JWT tokens |
| `JWT_EXPIRES_IN` | `7d` | Token expiration (e.g., `1h`, `7d`, `30d`) |
| `SEAT_LOCK_TTL` | `600` | Seat lock duration in seconds (default: 10 minutes) |
| `FRONTEND_URL` | `http://localhost:5173` | Allowed CORS origin |

### Frontend (`.env` at project root)

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `http://localhost:5000/api` | Backend API base URL (baked in at build time) |

> **Note:** Frontend env vars prefixed with `VITE_` are embedded during `npm run build`. Changes require a rebuild.

---

## Demo Accounts

After running the seed script, two accounts are available:

| Role | Email | Password |
|------|-------|----------|
| **Admin** | `admin@cinema.com` | `admin123` |
| **User** | `john@example.com` | `user123` |

Admin has access to the admin dashboard at [/admin](http://localhost:5173/admin).

---

## Useful Commands

### Frontend (from project root)

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server with hot-reload |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Auto-fix lint issues |
| `npm run format` | Format code with Prettier |
| `npm run type-check` | TypeScript type checking |
| `npm run test` | Run Vitest tests |

### Backend (from `backend/`)

| Command | Description |
|---------|-------------|
| `npm run dev` | Start with nodemon (auto-reload) |
| `npm start` | Start in production mode |
| `npm run migrate` | Run database migrations |
| `npm run seed` | Seed demo data |

### Docker

| Command | Description |
|---------|-------------|
| `docker compose up --build` | Build and start all services |
| `docker compose up -d` | Start in detached (background) mode |
| `docker compose down` | Stop all services |
| `docker compose down -v` | Stop and delete database volume |
| `docker compose logs -f backend` | Follow backend logs |
| `docker compose logs -f postgres` | Follow database logs |
| `docker compose exec postgres psql -U cinema_user -d cinema_db` | Open psql shell |

---

## Troubleshooting

### "Connection refused" on backend startup

The backend can't reach PostgreSQL. Check:
- Is PostgreSQL running? (`docker ps` or `pg_isready`)
- Is `DB_HOST` correct? Use `localhost` for local, `postgres` for Docker Compose
- Is port `5432` available? (`lsof -i :5432` or `netstat -an | findstr 5432`)

### "CORS error" in browser console

The frontend origin doesn't match `FRONTEND_URL` in backend config:
- Local dev: should be `http://localhost:5173`
- Docker: should match the frontend service URL
- Make sure there's no trailing slash

### "JWT must have a value" error on login/register

`JWT_SECRET` is not set. Create or update your `backend/.env` file.

### Migrations fail with "relation already exists"

The tables already exist from a previous run. This is safe to ignore — migrations use `CREATE TABLE IF NOT EXISTS`. If you want a clean slate:

```bash
# Docker Compose
docker compose down -v
docker compose up --build

# Local
# Drop and recreate the database:
psql -U cinema_user -c "DROP DATABASE cinema_db; CREATE DATABASE cinema_db;"
npm run migrate
npm run seed
```

### Seed says "ON CONFLICT DO NOTHING" — no data inserted

The seed data already exists. If you want to re-seed, drop the database first (see above).

### Port already in use

Another process is using port 5000 or 5173:

```powershell
# Windows — find what's using the port
netstat -ano | findstr :5000
taskkill /PID <pid> /F

# Or just change the port in .env
```

```bash
# Linux/Mac
lsof -i :5000
kill -9 <pid>
```

### Frontend shows blank page after build

The Vite build embeds `VITE_API_URL` at build time. If you built without setting it, API calls will go to the wrong URL. Rebuild with the correct value:

```bash
VITE_API_URL=http://your-api-host:5000/api npm run build
```
