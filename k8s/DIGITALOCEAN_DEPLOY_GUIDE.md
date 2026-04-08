# 🎬 Cinema App — DigitalOcean Kubernetes Deployment Guide

> **For**: tubes-bioskop cinema ticketing system  
> **Target**: DigitalOcean Kubernetes (DOKS) with a custom domain

---

## ⚠️ First: Why Does Every Node Have a DB? Is It Unsafe?

**Short answer: No, it's NOT one DB per node in the dangerous sense — but here's what's actually happening and why you should understand it.**

Your `postgres-values.yaml` deploys the **Bitnami PostgreSQL HA** (High Availability) Helm chart with:

- `postgresql.replicaCount: 3` — 1 primary + 2 read replicas
- `pgpool.replicaCount: 3` — 3 load-balancer/proxy pods

### What the setup actually looks like:

```
Node 1                Node 2                Node 3
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ PostgreSQL   │    │ PostgreSQL   │    │ PostgreSQL   │
│ PRIMARY ✍️   │◄──►│ REPLICA 1 📖│◄──►│ REPLICA 2 📖│
│              │    │              │    │              │
│ PgPool 🔀   │    │ PgPool 🔀   │    │ PgPool 🔀   │
└──────────────┘    └──────────────┘    └──────────────┘
        ▲                   ▲                   ▲
        └───────── Your Backend Pods ───────────┘
                   (connect via PgPool)
```

### The 3 "DB instances" are actually:

| Pod          | Role        | Writes? | Reads? |
| ------------ | ----------- | ------- | ------ |
| PostgreSQL-0 | **Primary** | ✅ Yes  | ✅ Yes |
| PostgreSQL-1 | **Replica** | ❌ No   | ✅ Yes |
| PostgreSQL-2 | **Replica** | ❌ No   | ✅ Yes |

**They share the SAME data** — replicas sync from the primary. This is a **HA cluster**, not 3 independent databases.

### Is it unsafe?

The setup itself is architecturally sound. However, your current `configmap-secret.yaml` has hardcoded **plain-text weak passwords**:

```yaml
DB_PASSWORD: cinema_pass # ← CHANGE THIS
repmgr-password: cinema_repmgr_pass # ← CHANGE THIS
admin-password: cinema_admin_pass # ← CHANGE THIS
JWT_SECRET: your-super-secret-jwt-key-change-in-production # ← CHANGE THIS
```

**You MUST change all of these before deploying to production.** See Step 5 below.

---

## Prerequisites

Install these tools on your local machine:

```bash
# 1. doctl - DigitalOcean CLI
# Download from: https://docs.digitalocean.com/reference/doctl/how-to/install/

# 2. kubectl
# Download from: https://kubernetes.io/docs/tasks/tools/

# 3. helm
# Download from: https://helm.sh/docs/intro/install/

# 4. Docker Desktop (to build & push images)
# Download from: https://www.docker.com/products/docker-desktop/
```

Verify installations:

```bash
doctl version
kubectl version --client
helm version
docker --version
```

---

## Step 1: Create a DigitalOcean Kubernetes Cluster

### 1.1 Authenticate doctl

```bash
doctl auth init
# Paste your DigitalOcean API token when prompted
# Get your token at: https://cloud.digitalocean.com/account/api/tokens
```

### 1.2 Create the cluster

```bash
doctl kubernetes cluster create cinema-cluster \
  --region sgp1 \
  --node-pool "name=cinema-pool;size=s-2vcpu-4gb;count=3" \
  --wait
```

> 💡 **Region options**: `sgp1` (Singapore), `blr1` (Bangalore), `nyc1` (New York).  
> Pick the closest to your users.  
> **Cost**: `s-2vcpu-4gb` nodes cost ~$24/month each → **~$72/month total** for 3 nodes.

### 1.3 Connect kubectl to your cluster

```bash
doctl kubernetes cluster kubeconfig save cinema-cluster
kubectl get nodes  # should show 3 nodes
```

---

## Step 2: Create a DigitalOcean Container Registry (DOCR)

You need a private registry to push your Docker images.

### 2.1 Create the registry

```bash
doctl registry create cinema-registry --subscription-tier starter
```

### 2.2 Authenticate Docker with DOCR

```bash
doctl registry login
```

### 2.3 Allow your Kubernetes cluster to pull from DOCR

```bash
doctl registry kubernetes-manifest | kubectl apply -f -
kubectl patch serviceaccount default -n cinema \
  -p '{"imagePullSecrets": [{"name": "registry-cinema-registry"}]}'
```

---

## Step 3: Build & Push Your Docker Images

### 3.1 Build the backend image

```bash
# From the repo root
cd c:\Users\vongg\Documents\sbd\tubes-bioskop\backend

docker build -t registry.digitalocean.com/cinema-registry/cinema-backend:latest .
docker push registry.digitalocean.com/cinema-registry/cinema-backend:latest
```

### 3.2 Build the frontend image

```bash
# From the repo root
cd c:\Users\vongg\Documents\sbd\tubes-bioskop

docker build -t registry.digitalocean.com/cinema-registry/cinema-frontend:latest .
docker push registry.digitalocean.com/cinema-registry/cinema-frontend:latest
```

### 3.3 Update image references in your manifests

Edit `k8s/backend.yaml` and `k8s/migration-job.yaml` — replace:

```yaml
image: your-registry/cinema-backend:latest
```

with:

```yaml
image: registry.digitalocean.com/cinema-registry/cinema-backend:latest
```

Edit `k8s/frontend.yaml` — replace:

```yaml
image: your-registry/cinema-frontend:latest
```

with:

```yaml
image: registry.digitalocean.com/cinema-registry/cinema-frontend:latest
```

---

## Step 4: Set Up Your Domain (DNS)

> 📌 You need a DigitalOcean Load Balancer IP — we'll get this in Step 6 after deploying the Nginx Ingress.  
> For now, add your domain to DigitalOcean's DNS panel.

### 4.1 Add your domain to DigitalOcean

```bash
doctl compute domain create yourdomain.com
```

Or go to: **DigitalOcean Dashboard → Networking → Domains → Add Domain**

### 4.2 Point your domain's nameservers to DigitalOcean

At your domain registrar (e.g., Namecheap, GoDaddy), set nameservers to:

```
ns1.digitalocean.com
ns2.digitalocean.com
ns3.digitalocean.com
```

> ⏳ DNS propagation takes 15 min – 48 hours depending on your registrar.

---

## Step 5: Create Secrets with Strong Passwords

**Do NOT use the placeholder passwords from `configmap-secret.yaml`**.  
Create the secrets directly with `kubectl` (never commit real passwords to Git):

```bash
# First create the namespace
kubectl apply -f k8s/namespace.yaml

# Generate strong random passwords
$DB_PASS = [System.Web.Security.Membership]::GeneratePassword(32, 8)
$REPMGR_PASS = [System.Web.Security.Membership]::GeneratePassword(32, 8)
$ADMIN_PASS = [System.Web.Security.Membership]::GeneratePassword(32, 8)
$JWT_SECRET = [System.Web.Security.Membership]::GeneratePassword(64, 16)

# Or just use openssl if you have Git Bash / WSL:
# openssl rand -base64 32

# Create the app secrets
kubectl create secret generic cinema-secrets \
  --namespace cinema \
  --from-literal=DB_PASSWORD="YourStrongPasswordHere" \
  --from-literal=JWT_SECRET="YourStrongJWTSecretHere" \
  --from-literal=GMAIL_USER="your-gmail@gmail.com" \
  --from-literal=GMAIL_PASS="your-gmail-app-password"

# Create the PostgreSQL HA secrets
kubectl create secret generic cinema-pg-passwords \
  --namespace cinema \
  --from-literal=password="YourStrongDBPasswordHere" \
  --from-literal=repmgr-password="YourStrongRepmgrPasswordHere" \
  --from-literal=admin-password="YourStrongAdminPasswordHere"
```

> ⚠️ **Important**: The `DB_PASSWORD` in `cinema-secrets` and `password` in `cinema-pg-passwords` **must be the same value**.

---

## Step 6: Install Nginx Ingress Controller

The Ingress controller creates a DigitalOcean Load Balancer automatically.

```bash
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update

helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace \
  --set controller.service.type=LoadBalancer \
  --set controller.service.annotations."service\.beta\.kubernetes\.io/do-loadbalancer-name"=cinema-lb
```

### Get your Load Balancer IP

```bash
# Wait for EXTERNAL-IP to be assigned (may take 2-3 minutes)
kubectl get svc -n ingress-nginx ingress-nginx-controller --watch
```

Copy the `EXTERNAL-IP` value (e.g., `164.90.xxx.xxx`).

### 6.1 Create DNS A records

```bash
# Point your root domain and www to the Load Balancer IP
doctl compute domain records create yourdomain.com \
  --record-type A \
  --record-name @ \
  --record-data 164.90.xxx.xxx \
  --record-ttl 300

doctl compute domain records create yourdomain.com \
  --record-type A \
  --record-name www \
  --record-data 164.90.xxx.xxx \
  --record-ttl 300
```

---

## Step 7: Install cert-manager (Free SSL/TLS via Let's Encrypt)

```bash
helm repo add jetstack https://charts.jetstack.io
helm repo update

helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --set crds.enabled=true
```

### Create a ClusterIssuer for Let's Encrypt

Create a file `k8s/clusterissuer.yaml`:

```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: your-email@example.com # ← replace with your email
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
      - http01:
          ingress:
            class: nginx
```

Apply it:

```bash
kubectl apply -f k8s/clusterissuer.yaml
```

---

## Step 8: Update Ingress for Your Domain + HTTPS

Edit `k8s/frontend.yaml` — update the Ingress section to:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: cinema-ingress
  namespace: cinema
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /$2
    nginx.ingress.kubernetes.io/use-regex: "true"
    cert-manager.io/cluster-issuer: letsencrypt-prod # ← add this
    nginx.ingress.kubernetes.io/ssl-redirect: "true" # ← add this
spec:
  ingressClassName: nginx
  tls: # ← add this block
    - hosts:
        - yourdomain.com
        - www.yourdomain.com
      secretName: cinema-tls
  rules:
    - host: yourdomain.com # ← your real domain
      http:
        paths:
          - path: /api(/|$)(.*)
            pathType: ImplementationSpecific
            backend:
              service:
                name: cinema-backend-service
                port:
                  number: 5000
          - path: /(.*)
            pathType: ImplementationSpecific
            backend:
              service:
                name: cinema-frontend-service
                port:
                  number: 80
    - host: www.yourdomain.com # ← www redirect
      http:
        paths:
          - path: /(.*)
            pathType: ImplementationSpecific
            backend:
              service:
                name: cinema-frontend-service
                port:
                  number: 80
```

Also update `configmap-secret.yaml` ConfigMap to set the correct frontend URL:

```yaml
FRONTEND_URL: https://yourdomain.com
```

---

## Step 9: Deploy PostgreSQL HA

```bash
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update

helm install cinema-postgresql-ha oci://registry-1.docker.io/bitnamicharts/postgresql-ha \
  --namespace cinema \
  --values k8s/postgres-values.yaml

# Wait for all pods to be ready
kubectl -n cinema rollout status statefulset cinema-postgresql-ha-postgresql
```

---

## Step 10: Deploy the Full Application

```bash
# 1. Apply ConfigMap (non-secret config)
kubectl apply -f k8s/configmap-secret.yaml
# Note: The secrets were already created in Step 5, the configmap parts will apply

# 2. Run database migrations
kubectl apply -f k8s/migration-job.yaml
kubectl -n cinema wait --for=condition=complete job/cinema-migrate --timeout=120s

# 3. Deploy backend
kubectl apply -f k8s/backend.yaml

# 4. Deploy frontend + ingress
kubectl apply -f k8s/frontend.yaml

# 5. Apply cert-manager issuer (if not done)
kubectl apply -f k8s/clusterissuer.yaml
```

### Verify everything is running

```bash
kubectl -n cinema get pods
kubectl -n cinema get ingress
kubectl -n cinema get svc
```

---

## Step 11: Verify SSL Certificate

```bash
# Check certificate status
kubectl -n cinema describe certificate cinema-tls

# It should eventually show: "Certificate is up to date and has not expired"
```

Visit `https://yourdomain.com` — you should see your cinema app with a valid SSL padlock! 🎉

---

## Troubleshooting

### Pods not starting

```bash
kubectl -n cinema describe pod <pod-name>
kubectl -n cinema logs <pod-name>
```

### Certificate not issuing

```bash
kubectl -n cinema describe certificaterequest
kubectl -n cert-manager logs deployment/cert-manager
```

### DB connection issues

```bash
# Verify pgpool is running
kubectl -n cinema get pods | grep pgpool

# Test connection from a debug pod
kubectl -n cinema run psql-debug --image=postgres:15 --rm -it --restart=Never -- \
  psql -h cinema-postgresql-ha-pgpool -U cinema_user -d cinema_db
```

### Check ingress controller logs

```bash
kubectl -n ingress-nginx logs deployment/ingress-nginx-controller
```

---

## Summary: Full Deployment Order

```
1. doctl auth init
2. Create DOKS cluster (Step 1)
3. Create container registry (Step 2)
4. Build & push images (Step 3)
5. Add domain to DO (Step 4)
6. kubectl apply -f k8s/namespace.yaml
7. Create secrets with kubectl create secret (Step 5)
8. Install ingress-nginx (Step 6)
9. Get LB IP → create DNS A records (Step 6.1)
10. Install cert-manager (Step 7)
11. Update Ingress manifest with real domain (Step 8)
12. helm install postgresql-ha (Step 9)
13. kubectl apply all manifests (Step 10)
14. Verify SSL (Step 11)
```

---

## Estimated Monthly Costs

| Resource                    | Size            | Cost/month        |
| --------------------------- | --------------- | ----------------- |
| 3× Worker Nodes             | s-2vcpu-4gb     | ~$72              |
| Load Balancer               | Standard        | ~$12              |
| Container Registry          | Starter (500MB) | Free              |
| Block Storage (3× 5Gi PVCs) | —               | ~$1.50            |
| **Total**                   |                 | **~$85–90/month** |

> 💡 To reduce cost: use 2 nodes + `s-2vcpu-2gb` (~$24/node) for a ~$60/month total.
