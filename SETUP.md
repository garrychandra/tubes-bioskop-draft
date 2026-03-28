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
pnpm install
```

Make sure PostgreSQL is running **before** migration commands.

Run migrations (creates all database tables):

```bash
pnpm migrate
```

Optional: check migration status

```bash
pnpm migrate:status
```

Seed demo data:

```bash
pnpm seed
```

Start the backend (with auto-reload via nodemon):

```bash
pnpm dev
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

Production-style deployment on a **3-node Kubernetes cluster** using Proxmox VMs, with **kubeadm** for cluster bootstrap and **Helm** for PostgreSQL HA.

### Cluster Overview

| VM Name | Role | RAM | K8s Role |
|---------|------|-----|----------|
| **mdw** | Master / Control Plane | 4 GB | Runs etcd, API server, scheduler, controller-manager |
| **sdw1** | Worker Node 1 | 4 GB | Runs application pods (FE, BE, PG) |
| **sdw2** | Worker Node 2 | 4 GB | Runs application pods (FE, BE, PG) |

### Architecture

```
                     mdw (Control Plane)
                 ┌──────────────────────────┐
                 │  kubeadm, etcd, API      │
                 │  server, scheduler       │
                 │  controller-manager      │
                 └────────────┬─────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
     sdw1 (Worker Node 1)           sdw2 (Worker Node 2)
  ┌──────────────────────┐      ┌──────────────────────┐
  │  frontend pod        │      │  frontend pod        │
  │  backend pod         │      │  backend pod         │
  │  PG primary (5Gi)    │      │  PG replica (5Gi)    │
  │  pgpool              │      │                      │
  └──────────────────────┘      └──────────────────────┘

  Ingress Controller (NGINX) exposed via NodePort on both workers
```

### Step 0 — Prerequisites

Ensure all 3 VMs have:
- Ubuntu 22.04 (or similar) installed
- A static IP address on the same Proxmox bridge/VLAN
- SSH access from your workstation
- At least 2 vCPU and 4 GB RAM each

### Step 1 — Prepare all 3 VMs

Run these commands on **all 3 VMs** (mdw, sdw1, sdw2):

```bash
# Disable swap (required by kubelet)
sudo swapoff -a
sudo sed -i '/ swap / s/^/#/' /etc/fstab

# Load required kernel modules
cat <<EOF | sudo tee /etc/modules-load.d/k8s.conf
overlay
br_netfilter
EOF
sudo modprobe overlay
sudo modprobe br_netfilter

# Set sysctl params
cat <<EOF | sudo tee /etc/sysctl.d/k8s.conf
net.bridge.bridge-nf-call-iptables  = 1
net.bridge.bridge-nf-call-ip6tables = 1
net.ipv4.ip_forward                 = 1
EOF
sudo sysctl --system

# Install containerd
sudo apt-get update
sudo apt-get install -y containerd
sudo mkdir -p /etc/containerd
containerd config default | sudo tee /etc/containerd/config.toml
sudo sed -i 's/SystemdCgroup = false/SystemdCgroup = true/' /etc/containerd/config.toml
sudo systemctl restart containerd
sudo systemctl enable containerd

# Install kubeadm, kubelet, kubectl
sudo apt-get install -y apt-transport-https ca-certificates curl gpg
curl -fsSL https://pkgs.k8s.io/core:/stable:/v1.30/deb/Release.key | sudo gpg --dearmor -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg
echo 'deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] https://pkgs.k8s.io/core:/stable:/v1.30/deb/ /' | sudo tee /etc/apt/sources.list.d/kubernetes.list
sudo apt-get update
sudo apt-get install -y kubelet kubeadm kubectl
sudo apt-mark hold kubelet kubeadm kubectl
sudo systemctl enable kubelet
```

### Step 2 — Initialize the master node (mdw)

On **mdw** only:

```bash
# Initialize the control plane (replace with mdw's actual IP)
sudo kubeadm init --pod-network-cidr=192.168.0.0/16 --apiserver-advertise-address=<MDW_IP>

# Set up kubectl for your user
mkdir -p $HOME/.kube
sudo cp /etc/kubernetes/admin.conf $HOME/.kube/config
sudo chown $(id -u):$(id -g) $HOME/.kube/config

# Install Calico CNI for pod networking
kubectl apply -f https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/calico.yaml

# Verify master is Ready
kubectl get nodes
```

> **Save the `kubeadm join` command** that appears in the output — you'll need it for the workers.

### Step 3 — Join worker nodes (sdw1, sdw2)

On **sdw1** and **sdw2**, run the join command from Step 2:

```bash
# Paste the kubeadm join command from the master output, e.g.:
sudo kubeadm join <MDW_IP>:6443 --token <token> --discovery-token-ca-cert-hash sha256:<hash>
```

Verify on **mdw**:

```bash
kubectl get nodes
# NAME   STATUS   ROLES           AGE   VERSION
# mdw    Ready    control-plane   5m    v1.30.x
# sdw1   Ready    <none>          2m    v1.30.x
# sdw2   Ready    <none>          2m    v1.30.x
```

### Step 4 — Install Helm 3 (on mdw)

```bash
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
helm version
```

### Step 5 — Install a storage provisioner

kubeadm doesn't include a dynamic storage provisioner. Install **local-path-provisioner** so PVCs are automatically fulfilled:

```bash
kubectl apply -f https://raw.githubusercontent.com/rancher/local-path-provisioner/v0.0.26/deploy/local-path-storage.yaml

# Set it as the default StorageClass
kubectl patch storageclass local-path -p '{"metadata": {"annotations":{"storageclass.kubernetes.io/is-default-class":"true"}}}'
```

### Step 6 — Install NGINX Ingress Controller

```bash
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update

# Install with NodePort (since Proxmox has no cloud load balancer)
helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx --create-namespace \
  --set controller.service.type=NodePort \
  --set controller.service.nodePorts.http=30080 \
  --set controller.service.nodePorts.https=30443
```

The ingress will be accessible at `http://<any-worker-ip>:30080`.

> **Optional: Install MetalLB** for proper LoadBalancer IPs on your LAN:
>
> ```bash
> helm repo add metallb https://metallb.github.io/metallb
> helm install metallb metallb/metallb --namespace metallb-system --create-namespace
> ```
>
> Then create an `IPAddressPool` and `L2Advertisement` resource with a range of free IPs on your Proxmox VLAN.

### Step 7 — Build and push Docker images

Replace `your-registry` with your container registry (Docker Hub, private registry, etc.):

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

Update image references in `k8s/backend.yaml`, `k8s/frontend.yaml`, and `k8s/migration-job.yaml`.

### Step 8 — Update secrets for production

Edit `k8s/configmap-secret.yaml`:

```yaml
# In cinema-secrets — change these for production:
stringData:
  DB_PASSWORD: <your-secure-db-password>
  JWT_SECRET: <your-secure-jwt-secret>

# In cinema-pg-passwords — change these for production:
stringData:
  password: <your-secure-db-password>        # must match DB_PASSWORD above
  repmgr-password: <secure-repmgr-password>
  admin-password: <secure-admin-password>
```

Edit `k8s/frontend.yaml` ingress section:

```yaml
# Replace with your actual domain (or use /etc/hosts to map a worker IP):
- host: cinema.example.com
```

### Step 9 — Deploy everything (in order)

```bash
# 1. Create namespace
kubectl apply -f k8s/namespace.yaml

# 2. Create config and secrets
kubectl apply -f k8s/configmap-secret.yaml

# 3. Deploy PostgreSQL HA via Helm (2 replicas + pgpool)
helm install cinema-postgresql-ha oci://registry-1.docker.io/bitnamicharts/postgresql-ha \
  -n cinema -f k8s/postgres-values.yaml

# 4. Wait for PostgreSQL to be ready
kubectl -n cinema rollout status statefulset/cinema-postgresql-ha-postgresql --timeout=180s

# 5. Run database migrations (one-shot Job)
kubectl apply -f k8s/migration-job.yaml
kubectl -n cinema wait --for=condition=complete job/cinema-migrate --timeout=120s

# 6. Deploy backend (2 replicas, spread across workers)
kubectl apply -f k8s/backend.yaml

# 7. Deploy frontend + ingress (2 replicas, spread across workers)
kubectl apply -f k8s/frontend.yaml
```

### Step 10 — Verify deployment

```bash
# All pods running and distributed across workers
kubectl -n cinema get pods -o wide

# Services
kubectl -n cinema get svc

# Ingress
kubectl -n cinema get ingress

# Helm release status
helm status cinema-postgresql-ha -n cinema

# Check PostgreSQL replication
kubectl -n cinema exec -it cinema-postgresql-ha-postgresql-0 -- \
  psql -U postgres -c "SELECT client_addr, state FROM pg_stat_replication;"

# Backend logs
kubectl -n cinema logs -l app=cinema-backend --tail=50

# Migration job logs
kubectl -n cinema logs job/cinema-migrate

# Test health endpoint
kubectl -n cinema port-forward svc/cinema-backend-service 5000:5000 &
curl http://localhost:5000/health
```

Access the app at `http://<sdw1-or-sdw2-ip>:30080` (or via your domain if using MetalLB + DNS).

### Tear down

```bash
# Delete app resources
kubectl delete -f k8s/frontend.yaml
kubectl delete -f k8s/backend.yaml
kubectl -n cinema delete job cinema-migrate

# Delete PostgreSQL HA
helm uninstall cinema-postgresql-ha -n cinema

# Delete config and namespace
kubectl delete -f k8s/configmap-secret.yaml
kubectl delete -f k8s/namespace.yaml
```

### Re-running migrations

```bash
# Delete the old job, then re-apply
kubectl -n cinema delete job cinema-migrate
kubectl apply -f k8s/migration-job.yaml
kubectl -n cinema wait --for=condition=complete job/cinema-migrate --timeout=120s
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
| `pnpm dev` | Start with nodemon (auto-reload) |
| `pnpm start` | Start in production mode |
| `pnpm migrate` | Run pending Sequelize migrations |
| `pnpm migrate:status` | Show migration status |
| `pnpm migrate:undo` | Undo last migration |
| `pnpm seed` | Run Sequelize seeders |
| `pnpm seed:undo` | Undo all seeders |

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

If you run `pnpm migrate` or `pnpm migrate:status` while PostgreSQL is down, Sequelize CLI will fail with connection/authentication errors.

### "CORS error" in browser console

The frontend origin doesn't match `FRONTEND_URL` in backend config:
- Local dev: should be `http://localhost:5173`
- Docker: should match the frontend service URL
- Make sure there's no trailing slash

### "JWT must have a value" error on login/register

`JWT_SECRET` is not set. Create or update your `backend/.env` file.

### Migrations fail or schema is out of sync

This project now uses **Sequelize CLI migrations** (`db:migrate`) and **does not** use `sequelize.sync({ force: true })`.

If schema migration fails:
- Ensure PostgreSQL is running and credentials in `backend/.env` match your DB.
- Check migration state with `pnpm migrate:status`.
- Retry with `pnpm migrate`.

If you want a full clean slate:

```bash
# Docker Compose
docker compose down -v
docker compose up --build

# Local
# Drop and recreate the database:
psql -U cinema_user -c "DROP DATABASE cinema_db; CREATE DATABASE cinema_db;"
pnpm migrate
pnpm seed
```

### Seeder does not run again

Sequelize CLI records executed seeders in `sequelize_data`, so `pnpm seed` only runs new seed files.

To rerun all seeders:

```bash
pnpm seed:undo
pnpm seed
```

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
