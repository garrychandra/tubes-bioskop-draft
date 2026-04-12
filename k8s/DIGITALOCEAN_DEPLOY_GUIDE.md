# 🎬 Cinema App — DigitalOcean Kubernetes Deployment Guide

> **For**: tubes-bioskop cinema ticketing system  
> **Target**: DigitalOcean Kubernetes (DOKS), 2-node cluster, ~1-day deployment

---

## Architecture Overview

```
Node 1                         Node 2
┌───────────────────────┐    ┌───────────────────────┐
│  cinema-frontend-0    │    │  cinema-frontend-1    │
│  cinema-backend-0     │    │  cinema-backend-1     │
│  cinema-postgres-0    │    │                       │
│   └─ PVC: 5Gi (DO)   │    │                       │
└───────────────────────┘    └───────────────────────┘
           ▲                            ▲
           └──────── Load Balancer ─────┘
                    (ingress-nginx)
```

- **Frontend & Backend**: 2 replicas each, spread across both nodes via pod anti-affinity.
- **Database**: 1 PostgreSQL pod (StatefulSet) with a 5Gi DigitalOcean Block Storage PVC. Data survives pod restarts and rescheduling.

---

## Prerequisites

Install on your local machine:

```bash
# 1. doctl — DigitalOcean CLI
#    https://docs.digitalocean.com/reference/doctl/how-to/install/

# 2. kubectl
#    https://kubernetes.io/docs/tasks/tools/

# 3. helm
#    https://helm.sh/docs/intro/install/

# 4. Docker Desktop
#    https://www.docker.com/products/docker-desktop/
```

Verify:

```bash
doctl version
kubectl version --client
helm version
docker --version
```

---

## Step 1: Create a 2-Node DOKS Cluster

### 1.1 Authenticate doctl

```bash
doctl auth init
# Paste your DigitalOcean API token when prompted.
# Get a token at: https://cloud.digitalocean.com/account/api/tokens
```

### 1.2 Create the cluster

```bash
doctl kubernetes cluster create cinema-cluster \
  --region sgp1 \
  --node-pool "name=cinema-pool;size=s-2vcpu-4gb;count=2" \
  --wait
```

> 💡 `sgp1` = Singapore. Change to `blr1` (Bangalore) or `nyc1` (New York) as needed.  
> **Cost**: `s-2vcpu-4gb` ≈ $24/month each → **~$48/month** total for 2 nodes.

### 1.3 Connect kubectl to your cluster

```bash
doctl kubernetes cluster kubeconfig save cinema-cluster
kubectl get nodes   # should show 2 Ready nodes
```

---

## Step 2: Create a DigitalOcean Container Registry (DOCR)

### 2.1 Create the registry

```bash
doctl registry create cinema-registry --subscription-tier starter
```

### 2.2 Authenticate Docker with DOCR

```bash
doctl registry login
```

### 2.3 Allow your cluster to pull from DOCR

```bash
# Creates the pull-secret in every namespace
doctl registry kubernetes-manifest | kubectl apply -f -

# Patch the default SA in the cinema namespace (run AFTER Step 3)
# — the cinema-backend-sa and cinema-frontend-sa already have
#   imagePullSecrets: registry-cinema-registry set in the manifests.
```

---

## Step 3: Build & Push Docker Images

### 3.1 Backend

```bash
cd c:\Users\vongg\Documents\sbd\tubes-bioskop\backend

docker build -t registry.digitalocean.com/cinema-registry/cinema-backend:latest .
docker push registry.digitalocean.com/cinema-registry/cinema-backend:latest
```

### 3.2 Frontend

The frontend image bakes `VITE_API_URL` at build time. Pass your real domain (or LB IP) so the React app calls the right backend URL:

```bash
cd c:\Users\vongg\Documents\sbd\tubes-bioskop

# Replace the --build-arg value with your actual domain or LB IP
docker build \
  --build-arg VITE_API_URL=https://garryserver.tech/api \
  -t registry.digitalocean.com/cinema-registry/cinema-frontend:latest .

docker push registry.digitalocean.com/cinema-registry/cinema-frontend:latest
```

> ✅ Images are already referenced correctly in `backend.yaml`, `frontend.yaml`, and `migration-job.yaml`.  
> ⚠️ **Important**: `.env` files are now excluded from Docker builds via `.dockerignore`. All secrets are injected at runtime via Kubernetes Secrets — never baked into the image.

---

## Step 4: (Optional) Set Up a Custom Domain

> Skip this step if you're just using the raw Load Balancer IP for the demo.

### 4.1 Add your domain to DigitalOcean

```bash
doctl compute domain create garryserver.tech
```

Or: **DigitalOcean Dashboard → Networking → Domains → Add Domain**

### 4.2 Point nameservers to DigitalOcean

At your registrar, set:

```
ns1.digitalocean.com
ns2.digitalocean.com
ns3.digitalocean.com
```

> ⏳ DNS propagation: 15 min – 48 hours. For a 1-day demo, set this up the previous day.

---

## Step 5: Create Real Secrets ⚠️

**Never use the placeholder values in `configmap-secret.yaml`.**  
Create the real secret directly with `kubectl`:

```bash
# Create the namespace first
kubectl apply -f k8s/namespace.yaml

# PowerShell — generate strong random secrets
$DB_PASS  = -join ((65..90 + 97..122 + 48..57) | Get-Random -Count 32 | ForEach-Object { [char]$_ })
$JWT_SEC  = -join ((65..90 + 97..122 + 48..57) | Get-Random -Count 64 | ForEach-Object { [char]$_ })

# Or in Git Bash / WSL:
# DB_PASS=$(openssl rand -base64 32)
# JWT_SEC=$(openssl rand -base64 64)

kubectl create secret generic cinema-secrets \
  --namespace cinema \
  --from-literal=DB_PASSWORD="$DB_PASS" \
  --from-literal=JWT_SECRET="$JWT_SEC" \
  --from-literal=EMAIL_USER="your-gmail@gmail.com" \
  --from-literal=EMAIL_PASS="your-gmail-app-password"
```

> ⚠️ The `DB_PASSWORD` value here becomes the PostgreSQL `POSTGRES_PASSWORD`.  
> Both are read from the same `cinema-secrets` Secret, so they are automatically in sync.
>
> 📧 `EMAIL_USER` and `EMAIL_PASS` are required for the forgot-password OTP email flow.  
> Use a **Gmail App Password** (not your real Gmail password).  
> Generate one at: **Google Account → Security → 2-Step Verification → App Passwords**

---

## Step 6: Install Nginx Ingress Controller

```bash
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update

helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace \
  --set controller.service.type=LoadBalancer \
  --set controller.service.annotations."service\.beta\.kubernetes\.io/do-loadbalancer-name"=cinema-lb
```

### Get the Load Balancer IP

```bash
# Wait for EXTERNAL-IP to appear (2–3 minutes)
kubectl get svc -n ingress-nginx ingress-nginx-controller --watch
```

Copy the `EXTERNAL-IP` — you'll need it to create DNS records and to test via IP.

### 6.1 (If using a domain) Create DNS A records

```bash
doctl compute domain records create garryserver.tech \
  --record-type A --record-name @ --record-data <LB_IP> --record-ttl 300

doctl compute domain records create garryserver.tech \
  --record-type A --record-name www --record-data <LB_IP> --record-ttl 300
```

---

## Step 7: (Optional) Install cert-manager for Free HTTPS

> Skip for a same-day demo — just use the raw IP. Add TLS if you have a domain and time.

```bash
helm repo add jetstack https://charts.jetstack.io
helm repo update

helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --set crds.enabled=true
```

Create `k8s/clusterissuer.yaml`:

```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: your-email@example.com   # ← replace
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
      - http01:
          ingress:
            class: nginx
```

```bash
kubectl apply -f k8s/clusterissuer.yaml
```

Then update the Ingress in `frontend.yaml` to add:

```yaml
metadata:
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  tls:
    - hosts:
        - garryserver.tech
      secretName: cinema-tls
  rules:
    - host: garryserver.tech
      ...
```

---

## Step 8: Update Ingress Host

Edit `k8s/frontend.yaml` — update the Ingress host:

```yaml
# If using a domain:
- host: garryserver.tech

# If using raw LB IP (quick demo), remove the host: line entirely
# and keep only the http: block — nginx will match all hostnames.
```

Also update the ConfigMap in `configmap-secret.yaml`:

```yaml
FRONTEND_URL: https://garryserver.tech   # or http://<LB_IP>
```

---

## Step 9: Deploy Everything

Run in this exact order:

```bash
# 1. Namespace (idempotent — safe to re-run)
kubectl apply -f k8s/namespace.yaml

# 2. Apply DOCR pull secret to the cluster (if not done already)
doctl registry kubernetes-manifest | kubectl apply -f -

# 3. RBAC — must exist BEFORE pods start (SAs are referenced in deployments)
kubectl apply -f k8s/rbac.yaml

# 4. ConfigMap (non-secret config)
kubectl apply -f k8s/configmap-secret.yaml

# 5. Deploy PostgreSQL StatefulSet + PVC
kubectl apply -f k8s/postgres.yaml

# Wait for postgres to be ready before running migrations
kubectl -n cinema rollout status statefulset/cinema-postgres

# 6. Run database migrations (one-shot Job)
#    This now includes the OTP columns migration (014-user-otp) in addition
#    to basic schema and seed data. Wait for it to fully complete.
kubectl apply -f k8s/migration-job.yaml
kubectl -n cinema wait --for=condition=complete job/cinema-migrate --timeout=180s

# Verify migration succeeded before proceeding
kubectl -n cinema logs job/cinema-migrate

# 7. Deploy backend
kubectl apply -f k8s/backend.yaml

# 8. Deploy frontend + Ingress
kubectl apply -f k8s/frontend.yaml

# 9. Apply network policies (zero-trust isolation)
#    Includes SMTP egress on ports 465/587 for OTP password-reset emails.
kubectl apply -f k8s/network-policies.yaml

# 10. Apply pod security contexts
kubectl apply -f k8s/pod-security.yaml

# 11. (Optional) cert-manager ClusterIssuer
# kubectl apply -f k8s/clusterissuer.yaml
```

### Verify

```bash
kubectl -n cinema get pods
# Expected:
#   cinema-postgres-0         1/1   Running
#   cinema-backend-xxxx       1/1   Running   (×2)
#   cinema-frontend-xxxx      1/1   Running   (×2)

kubectl -n cinema get svc
kubectl -n cinema get ingress
kubectl -n cinema get pvc
# postgres-data-cinema-postgres-0   Bound   5Gi   do-block-storage
```

### Smoke Test the Auth Rate Limiter

```bash
# Hit the login endpoint 6 times quickly — the 6th should return HTTP 429
for i in 1 2 3 4 5 6; do
  curl -s -o /dev/null -w "%{http_code}\n" \
    -X POST https://garryserver.tech/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}'
done
# Expected output: 401 401 401 401 401 429
```

---

## Troubleshooting

### Pods not starting

```bash
kubectl -n cinema describe pod <pod-name>
kubectl -n cinema logs <pod-name>
```

### PostgreSQL not ready

```bash
kubectl -n cinema logs statefulset/cinema-postgres

# Test connection from a debug pod
kubectl -n cinema run psql-debug --image=postgres:15 --rm -it --restart=Never -- \
  psql -h cinema-postgres-service -U cinema_user -d cinema_db
```

### Migration job failing

```bash
kubectl -n cinema logs job/cinema-migrate

# Re-run after fixing:
kubectl -n cinema delete job cinema-migrate
kubectl apply -f k8s/migration-job.yaml
```

### ImagePullBackOff

```bash
# Re-run the DOCR pull-secret step:
doctl registry kubernetes-manifest | kubectl apply -f -
```

### Ingress returning 404

```bash
kubectl -n ingress-nginx logs deployment/ingress-nginx-controller

# Verify the Ingress host matches what you're browsing to
kubectl -n cinema describe ingress cinema-ingress
```

### Network policies blocking traffic

```bash
# Test backend can reach postgres
kubectl -n cinema run test-allowed \
  --image=busybox --rm -it --restart=Never \
  --labels="app=cinema-backend" -- \
  nc -zv cinema-postgres-service 5432
# Should succeed (nc: connected)

# Test frontend CANNOT reach postgres directly
kubectl -n cinema run test-blocked \
  --image=busybox --rm -it --restart=Never \
  --labels="app=cinema-frontend" -- \
  nc -zv cinema-postgres-service 5432
# Should time out — that's correct behaviour
```

---

## Security Checklist

| Item | Status |
|------|--------|
| Secrets created with `kubectl create secret` (not in Git) | ✅ Do this in Step 5 |
| `EMAIL_USER` / `EMAIL_PASS` stored in K8s Secret, not ConfigMap | ✅ Step 5 |
| `.env` files excluded from Docker image layers (`.dockerignore`) | ✅ Root `.dockerignore` |
| OTP stored in PostgreSQL, not in-memory (works across 2 replicas) | ✅ `014-user-otp` migration |
| Auth endpoints rate-limited (5 req / 15 min per IP) | ✅ `auth.routes.js` |
| Production error handler — no internal details leaked to clients | ✅ `app.js` |
| Ticket redemption restricted to Admin role only | ✅ `tiket.routes.js` |
| SMTP egress allowed on ports 465 + 587 for OTP emails | ✅ `network-policies.yaml` |
| Pod anti-affinity: frontend/backend spread across nodes | ✅ In manifests |
| Network policies: deny-all + explicit allow-list | ✅ `network-policies.yaml` |
| Non-root containers + read-only rootfs (frontend/backend) | ✅ In manifests |
| Capabilities dropped (frontend/backend) | ✅ In manifests |
| `automountServiceAccountToken: false` | ✅ `rbac.yaml` |
| PVC for database persistence | ✅ `postgres.yaml` |
| DOCR private registry (not public Docker Hub) | ✅ Step 2 |
| All SQL queries use parameterized bind (`$1`, `$2`...) — no injection | ✅ All controllers |
| CORS locked to `FRONTEND_URL` env var | ✅ `app.js` |
| Helmet security headers (CSP, HSTS, X-Frame-Options) | ✅ `app.js` |

---

## Estimated Costs (1-day demo ≈ negligible)

DigitalOcean bills hourly. Running for 24 hours:

| Resource                 | Monthly price | 24-hour cost |
|--------------------------|---------------|--------------|
| 2× Nodes (s-2vcpu-4gb)  | ~$48          | ~$1.60       |
| Load Balancer            | ~$12          | ~$0.40       |
| Block Storage PVC (5Gi)  | ~$0.50        | ~$0.02       |
| Container Registry       | Free (starter)| $0           |
| **Total**                | **~$61/mo**   | **~$2.00**   |

> 💡 **Clean up after the demo** to stop billing:  
> `doctl kubernetes cluster delete cinema-cluster`
