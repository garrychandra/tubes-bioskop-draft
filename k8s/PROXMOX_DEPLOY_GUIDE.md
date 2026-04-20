# 🎬 Cinema App — Proxmox Self-Hosted Kubernetes Deployment Guide

> **For**: tubes-bioskop cinema ticketing system  
> **Target**: 3 VMs on Proxmox VE (1 master + 2 workers), kubeadm cluster  
> **Goal**: Mirror the DigitalOcean DOKS setup on your own hardware

---

## Architecture Overview

```
              Proxmox Host
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  k8s-master (VM 100)         192.168.1.100                  │
│  ┌───────────────────────────────────────────┐              │
│  │  Control Plane (etcd, api-server, etc.)   │              │
│  │  Private Docker Registry (:5000)          │              │
│  └───────────────────────────────────────────┘              │
│                                                             │
│  k8s-worker-1 (VM 101)       192.168.1.101                  │
│  ┌───────────────────────────────────────────┐              │
│  │  cinema-frontend-0                        │              │
│  │  cinema-backend-0                         │              │
│  │  cinema-postgres-0  ─► PVC (local-path)   │              │
│  └───────────────────────────────────────────┘              │
│                                                             │
│  k8s-worker-2 (VM 102)       192.168.1.102                  │
│  ┌───────────────────────────────────────────┐              │
│  │  cinema-frontend-1                        │              │
│  │  cinema-backend-1                         │              │
│  └───────────────────────────────────────────┘              │
│                                                             │
│            ▲                          ▲                      │
│            └────── MetalLB (L2) ──────┘                      │
│                  192.168.1.200                               │
└─────────────────────────────────────────────────────────────┘
```

- **Frontend & Backend**: 2 replicas each, spread across both workers via pod anti-affinity (identical to DOKS).
- **Database**: 1 PostgreSQL pod on a worker with local-path persistent storage.
- **Ingress**: Nginx Ingress Controller exposed via MetalLB (replaces DO Load Balancer).
- **Registry**: Private Docker registry running on the master node (replaces DOCR).

---

## VM Specifications

Create **3 VMs** in Proxmox with these specs:

| VM | Hostname | Role | vCPU | RAM | Disk | IP (example) |
|----|----------|------|------|-----|------|-------------|
| 100 | `k8s-master` | Control plane + Registry | 2 | 4 GB | 50 GB | `192.168.1.100` |
| 101 | `k8s-worker-1` | Worker node | 2 | 4 GB | 50 GB | `192.168.1.101` |
| 102 | `k8s-worker-2` | Worker node | 2 | 4 GB | 50 GB | `192.168.1.102` |

> 💡 Worker specs (2 vCPU / 4 GB) match the DOKS `s-2vcpu-4gb` droplets exactly.  
> The master has the same spec — sufficient for a small cluster.

### Proxmox VM Settings

- **OS**: Ubuntu 22.04 LTS Server (recommended) or Debian 12
- **Storage**: Use `virtio` SCSI for disk I/O performance
- **Network**: `virtio` NIC, bridged to your LAN (`vmbr0`)
- **CPU type**: `host` (for best performance)
- **QEMU Guest Agent**: Enable after installing `qemu-guest-agent`

> ⚠️ **Static IPs**: All 3 VMs must have static IPs. Configure via Netplan (Ubuntu) or `/etc/network/interfaces` (Debian). The guide assumes the IPs listed above — adjust to match your network.

---

## Prerequisites

On your **local machine** (Windows), install:

```bash
# 1. kubectl
#    https://kubernetes.io/docs/tasks/tools/

# 2. Docker Desktop (to build images)
#    https://www.docker.com/products/docker-desktop/

# 3. SSH client (OpenSSH is built into Windows 10+)
```

---

## Step 1: Prepare All 3 VMs

> Run **all commands in this step on every VM** (master + both workers) via SSH.

### 1.1 Set hostnames

```bash
# On VM 100:
sudo hostnamectl set-hostname k8s-master

# On VM 101:
sudo hostnamectl set-hostname k8s-worker-1

# On VM 102:
sudo hostnamectl set-hostname k8s-worker-2
```

### 1.2 Add host entries (all 3 VMs)

```bash
sudo tee -a /etc/hosts <<EOF
192.168.1.100 k8s-master
192.168.1.101 k8s-worker-1
192.168.1.102 k8s-worker-2
EOF
```

### 1.3 Disable swap (required by kubelet)

```bash
sudo swapoff -a
sudo sed -i '/swap/d' /etc/fstab
```

### 1.4 Load kernel modules

```bash
cat <<EOF | sudo tee /etc/modules-load.d/k8s.conf
overlay
br_netfilter
EOF

sudo modprobe overlay
sudo modprobe br_netfilter
```

### 1.5 Set sysctl parameters

```bash
cat <<EOF | sudo tee /etc/sysctl.d/k8s.conf
net.bridge.bridge-nf-call-iptables  = 1
net.bridge.bridge-nf-call-ip6tables = 1
net.ipv4.ip_forward                 = 1
EOF

sudo sysctl --system
```

### 1.6 Install containerd

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg

# Add Docker's official GPG key + repo (containerd is in the Docker repo)
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y containerd.io
```

### 1.7 Configure containerd to use systemd cgroup

```bash
sudo mkdir -p /etc/containerd
containerd config default | sudo tee /etc/containerd/config.toml > /dev/null

# Set SystemdCgroup = true (required for kubeadm)
sudo sed -i 's/SystemdCgroup = false/SystemdCgroup = true/' /etc/containerd/config.toml

sudo systemctl restart containerd
sudo systemctl enable containerd
```

### 1.8 Install kubeadm, kubelet, kubectl

```bash
sudo apt-get install -y apt-transport-https

# Kubernetes APT repo (v1.30)
curl -fsSL https://pkgs.k8s.io/core:/stable:/v1.30/deb/Release.key | \
  sudo gpg --dearmor -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg

echo "deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] https://pkgs.k8s.io/core:/stable:/v1.30/deb/ /" | \
  sudo tee /etc/apt/sources.list.d/kubernetes.list

sudo apt-get update
sudo apt-get install -y kubelet kubeadm kubectl
sudo apt-mark hold kubelet kubeadm kubectl
```

> ✅ At this point, all 3 VMs should have containerd, kubelet, kubeadm, and kubectl installed.

---

## Step 2: Initialize the Master Node

> Run only on `k8s-master` (192.168.1.100).

### 2.1 Initialize the cluster

```bash
sudo kubeadm init \
  --control-plane-endpoint=192.168.1.110 \
  --pod-network-cidr=10.244.0.0/16 \
  --apiserver-advertise-address=192.168.1.110
```

> 💡 `--pod-network-cidr=10.244.0.0/16` is required by Calico (using its default CIDR).

### 2.2 Set up kubectl for the current user

```bash
mkdir -p $HOME/.kube
sudo cp /etc/kubernetes/admin.conf $HOME/.kube/config
sudo chown $(id -u):$(id -g) $HOME/.kube/config
```

### 2.3 Save the join command

`sudo kubeadm init` prints a join command at the end — **copy it**. It looks like:

Woker
```bash
  sudo kubeadm join 192.168.1.110:6443 --token 1yxutm.rr21v603agd1tf6j \
        --discovery-token-ca-cert-hash sha256:67dfe2e8ae9e1a3fbfb2cdfd826f5eae1bf62007e8b0482977c5daa567be54ba
```
control plane 
```bash
  sudo kubeadm join 192.168.1.110:6443 --token 1yxutm.rr21v603agd1tf6j \
        --discovery-token-ca-cert-hash sha256:67dfe2e8ae9e1a3fbfb2cdfd826f5eae1bf62007e8b0482977c5daa567be54ba \
        --control-plane
        ```
> If you lose it, regenerate on the master:
> ```bash
> kubeadm token create --print-join-command
> ```

---

## Step 3: Install Calico CNI (Network Plugin)

> Run on `k8s-master`. **Calico is required** because the cinema app uses Kubernetes NetworkPolicies for zero-trust isolation. Flannel does NOT support NetworkPolicies.

```bash
# Install the Calico operator and CRDs
kubectl create -f https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/tigera-operator.yaml

# Install the default Calico configuration
curl -O https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/custom-resources.yaml
sed -i 's/192.168.0.0/10.244.0.0/g' custom-resources.yaml
kubectl create -f custom-resources.yaml
```

Wait for Calico pods to become ready:

```bash
watch kubectl get pods -n calico-system
# Wait until all pods show Running / Ready
```

Verify the master node becomes Ready:

```bash
kubectl get nodes
# NAME         STATUS   ROLES           AGE   VERSION
# k8s-master   Ready    control-plane   5m    v1.30.x
```

---

## Step 4: Join Worker Nodes

> Run on **both workers** (`k8s-worker-1` and `k8s-worker-2`).

```bash
# Paste the join command from Step 2.3:
sudo kubeadm join 192.168.1.100:6443 --token abcdef.0123456789abcdef \
  --discovery-token-ca-cert-hash sha256:xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Verify on the master:

```bash
kubectl get nodes
# NAME            STATUS   ROLES           AGE   VERSION
# k8s-master      Ready    control-plane   10m   v1.30.x
# k8s-worker-1    Ready    <none>          2m    v1.30.x
# k8s-worker-2    Ready    <none>          2m    v1.30.x
```

Label the worker nodes (optional, for clarity):

```bash
kubectl label node k8s-worker-1 node-role.kubernetes.io/worker=
kubectl label node k8s-worker-2 node-role.kubernetes.io/worker=
```

---

## Step 5: Set Up a Private Docker Registry

> Run on `k8s-master`. This replaces DigitalOcean Container Registry (DOCR).

### 5.1 Install Docker on the master

```bash
sudo apt-get install -y docker-ce docker-ce-cli
sudo usermod -aG docker $USER
# Log out and back in for the group change to take effect
```

### 5.2 Start a private registry container

```bash
docker run -d \
  --restart=always \
  --name registry \
  -p 5000:5000 \
  -v /opt/registry-data:/var/lib/registry \
  registry:2
```

### 5.3 Configure all nodes to trust the insecure registry

> Run on **all 3 VMs** (master + both workers):

```bash
# Tell containerd to trust the private registry (HTTP, no TLS)
sudo mkdir -p /etc/containerd/certs.d/192.168.1.100:5000

cat <<EOF | sudo tee /etc/containerd/certs.d/192.168.1.100:5000/hosts.toml
[host."http://192.168.1.100:5000"]
  capabilities = ["pull", "resolve"]
  skip_verify = true
EOF
```

Also add the insecure registry to containerd's config:

```bash
# Add the registry mirror to containerd config
sudo tee /etc/containerd/config_patch.toml <<'EOF'
[plugins."io.containerd.grpc.v1.cri".registry.mirrors."192.168.1.100:5000"]
  endpoint = ["http://192.168.1.100:5000"]
[plugins."io.containerd.grpc.v1.cri".registry.configs."192.168.1.100:5000".tls]
  insecure_skip_verify = true
EOF

# Merge into main config — or simply append:
cat /etc/containerd/config_patch.toml | sudo tee -a /etc/containerd/config.toml > /dev/null

sudo systemctl restart containerd
```

> 💡 In a production environment you would use TLS certificates. For a lab/demo, HTTP is acceptable on a trusted LAN.

### 5.4 Verify the registry

```bash
# On the master:
curl http://192.168.1.100:5000/v2/_catalog
# Expected: {"repositories":[]}
```

---

## Step 6: Build & Push Docker Images

> Run on your **local machine** (Windows with Docker Desktop).

### 6.1 Backend

```powershell
cd c:\Users\vongg\Documents\sbd\tubes-bioskop\backend

docker build -t 192.168.1.100:5000/cinema-backend:latest .
docker push 192.168.1.100:5000/cinema-backend:latest
```

### 6.2 Frontend

```powershell
cd c:\Users\vongg\Documents\sbd\tubes-bioskop

# Replace the VITE_API_URL with your actual domain/IP
docker build `
  --build-arg VITE_API_URL=http://192.168.1.200/api `
  -t 192.168.1.100:5000/cinema-frontend:latest .

docker push 192.168.1.100:5000/cinema-frontend:latest
```

> ⚠️ **Docker Desktop insecure registry**: If push fails with "http: server gave HTTP response to HTTPS client", add `192.168.1.100:5000` to Docker Desktop → Settings → Docker Engine:
> ```json
> {
>   "insecure-registries": ["192.168.1.100:5000"]
> }
> ```

### 6.3 Verify images are in the registry

```bash
curl http://192.168.1.100:5000/v2/_catalog
# Expected: {"repositories":["cinema-backend","cinema-frontend"]}
```

---

## Step 7: Install MetalLB (Bare-Metal Load Balancer)

> DOKS provides a managed cloud load balancer automatically. On bare metal, **MetalLB** gives your Ingress controller an external IP from your LAN.

Run on `k8s-master`:

```bash
kubectl apply -f https://raw.githubusercontent.com/metallb/metallb/v0.14.5/config/manifests/metallb-native.yaml

# Wait for MetalLB pods
kubectl -n metallb-system wait --for=condition=ready pod --all --timeout=90s
```

### 7.1 Configure an IP address pool

Choose an IP on your LAN that is **not assigned to any VM or device** (e.g. `192.168.1.200`):

```bash
cat <<EOF | kubectl apply -f -
apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata:
  name: cinema-pool
  namespace: metallb-system
spec:
  addresses:
    - 192.168.1.200-192.168.1.200   # single IP is fine for a demo
---
apiVersion: metallb.io/v1beta1
kind: L2Advertisement
metadata:
  name: cinema-l2
  namespace: metallb-system
spec:
  ipAddressPools:
    - cinema-pool
EOF
```

> 💡 MetalLB will respond to ARP requests for `192.168.1.200`, making it reachable from your LAN.

---

## Step 8: Install Local-Path Storage Provisioner

> Replaces DigitalOcean Block Storage (`do-block-storage`). Provides automatic PVC provisioning using local node disk.

```bash
kubectl apply -f https://raw.githubusercontent.com/rancher/local-path-provisioner/v0.0.26/deploy/local-path-storage.yaml

# Verify
kubectl get storageclass
# NAME                   PROVISIONER             AGE
# local-path (default)   rancher.io/local-path   10s
```

---

## Step 9: Install Nginx Ingress Controller

```bash
# Add the helm repo (run from master or your local machine with kubectl configured)
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update

helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace \
  --set controller.service.type=LoadBalancer
```

Wait for MetalLB to assign the external IP:

```bash
kubectl get svc -n ingress-nginx ingress-nginx-controller --watch
# NAME                       TYPE           EXTERNAL-IP     PORT(S)
# ingress-nginx-controller   LoadBalancer   192.168.1.200   80:3xxxx/TCP,443:3xxxx/TCP
```

> ✅ You can now reach the cluster at `http://192.168.1.200`.

---

## Step 10: Create the Proxmox-Specific Manifest Overrides

The K8s manifests in `k8s/` were written for DOKS. On Proxmox, **3 things differ**:

1. **Container image paths** — `registry.digitalocean.com/cinema-registry/…` → `192.168.1.100:5000/…`
2. **Image pull secrets** — not needed (registry is insecure/unauthenticated on LAN)
3. **Storage class** — `do-block-storage` → `local-path`

Create a Kustomize overlay to patch these without editing the original files:

```bash
# On the master, in the project directory:
cat <<'EOF' > k8s/proxmox-kustomization.yaml
# Usage: kubectl apply -k k8s/ (after renaming this to kustomization.yaml)
# OR:   apply manually with the sed commands below.
#
# Quick sed approach (run in the k8s/ directory):
#
#   sed -i 's|registry.digitalocean.com/cinema-registry/cinema-backend:latest|192.168.1.100:5000/cinema-backend:latest|g' backend.yaml migration-job.yaml
#   sed -i 's|registry.digitalocean.com/cinema-registry/cinema-frontend:latest|192.168.1.100:5000/cinema-frontend:latest|g' frontend.yaml
#   sed -i 's|do-block-storage|local-path|g' postgres.yaml
#   sed -i '/imagePullSecrets:/,/- name: registry-cinema-registry/d' backend.yaml frontend.yaml migration-job.yaml
#
# These changes are safe to apply on a branch.
EOF
```

### Apply the substitutions manually

SSH into the master (or run from your local machine with the repo cloned):

```bash
cd ~/tubes-bioskop/k8s  # or wherever you cloned the repo

# 1. Update image registry paths
sed -i 's|registry.digitalocean.com/cinema-registry/cinema-backend:latest|192.168.1.100:5000/cinema-backend:latest|g' backend.yaml migration-job.yaml
sed -i 's|registry.digitalocean.com/cinema-registry/cinema-frontend:latest|192.168.1.100:5000/cinema-frontend:latest|g' frontend.yaml

# 2. Update storage class
sed -i 's|do-block-storage|local-path|g' postgres.yaml

# 3. Remove imagePullSecrets blocks (not needed for insecure LAN registry)
sed -i '/imagePullSecrets:/,/- name: registry-cinema-registry/d' backend.yaml frontend.yaml

# 4. Verify changes
grep -n "image:" backend.yaml frontend.yaml migration-job.yaml
grep -n "storageClassName" postgres.yaml
```

---

## Step 11: Create Secrets

```bash
# 1. Create the namespace
kubectl apply -f k8s/namespace.yaml

# 2. Generate strong passwords
DB_PASS=$(openssl rand -base64 32)
JWT_SEC=$(openssl rand -base64 64)

# 3. Create the Kubernetes secret
kubectl create secret generic cinema-secrets \
  --namespace cinema \
  --from-literal=DB_PASSWORD="$DB_PASS" \
  --from-literal=JWT_SECRET="$JWT_SEC" \
  --from-literal=EMAIL_USER="your-gmail@gmail.com" \
  --from-literal=EMAIL_PASS="your-gmail-app-password"
```

> 📧 `EMAIL_USER` and `EMAIL_PASS` are for the forgot-password OTP email flow.  
> Use a **Gmail App Password**: **Google Account → Security → 2-Step Verification → App Passwords**

---

## Step 12: Update Ingress Host

Edit `k8s/frontend.yaml` — update the Ingress for your Proxmox setup:

**Option A: Use raw MetalLB IP (quick demo, no domain)**

```yaml
# Remove or comment out the TLS block and host:
metadata:
  annotations:
    # Remove cert-manager.io/cluster-issuer
    # Remove nginx.ingress.kubernetes.io/ssl-redirect
    nginx.ingress.kubernetes.io/rewrite-target: /$2
    nginx.ingress.kubernetes.io/use-regex: "true"
spec:
  ingressClassName: nginx
  # Remove the tls: block entirely
  rules:
    - http:   # No host: line → matches all hostnames / IPs
        paths:
          - path: /api(/|$)(.*)
            ...
```

**Option B: Use a domain (add to your local `/etc/hosts` or real DNS)**

```yaml
# Keep the existing host: garryserver.tech
# On your local machine, add to C:\Windows\System32\drivers\etc\hosts:
#   192.168.1.200 garryserver.tech
```

Also update `FRONTEND_URL` in `configmap-secret.yaml`:

```yaml
FRONTEND_URL: http://192.168.1.200   # or http://garryserver.tech
```

---

## Step 13: Deploy Everything

Run in this exact order from the master node:

```bash
# 1. Namespace
kubectl apply -f k8s/namespace.yaml

# 2. RBAC — service accounts must exist before pods reference them
kubectl apply -f k8s/rbac.yaml

# 3. ConfigMap
kubectl apply -f k8s/configmap-secret.yaml

# 4. PostgreSQL StatefulSet + PVC (uses local-path provisioner)
kubectl apply -f k8s/postgres.yaml
kubectl -n cinema rollout status statefulset/cinema-postgres

# 5. Run database migrations (includes OTP columns migration)
kubectl apply -f k8s/migration-job.yaml
kubectl -n cinema wait --for=condition=complete job/cinema-migrate --timeout=180s

# Verify migration succeeded
kubectl -n cinema logs job/cinema-migrate

# 6. Deploy backend
kubectl apply -f k8s/backend.yaml

# 7. Deploy frontend + Ingress
kubectl apply -f k8s/frontend.yaml

# 8. Apply network policies (zero-trust isolation)
#    Includes SMTP egress on ports 465/587 for OTP emails.
kubectl apply -f k8s/network-policies.yaml

# 9. Apply pod security contexts
kubectl apply -f k8s/pod-security.yaml
```

### Verify

```bash
kubectl -n cinema get pods -o wide
# Expected:
#   cinema-postgres-0         1/1   Running   k8s-worker-1 (or 2)
#   cinema-backend-xxxx       1/1   Running   k8s-worker-1
#   cinema-backend-xxxx       1/1   Running   k8s-worker-2
#   cinema-frontend-xxxx      1/1   Running   k8s-worker-1
#   cinema-frontend-xxxx      1/1   Running   k8s-worker-2

kubectl -n cinema get svc
kubectl -n cinema get ingress
kubectl -n cinema get pvc
# postgres-data-cinema-postgres-0   Bound   5Gi   local-path
```

### Test from your local machine

```bash
# If using raw IP:
curl http://192.168.1.200/health
# → {"status":"ok","timestamp":"..."}

curl http://192.168.1.200/api/auth/login -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"wrong"}'
# → {"error":"Invalid credentials"}

# Open in browser:
# http://192.168.1.200
```

---

## Troubleshooting

### Pods stuck in `ContainerCreating`

```bash
kubectl -n cinema describe pod <pod-name>
# Common causes:
# - PVC not bound → check `kubectl get pvc -n cinema`
# - Image pull error → verify registry is reachable from workers:
#   curl http://192.168.1.100:5000/v2/_catalog
```

### Pods stuck in `ImagePullBackOff`

```bash
# The worker can't reach the registry. Verify:
# 1. Registry container is running on master:
ssh k8s-master "docker ps | grep registry"

# 2. Worker can reach it:
ssh k8s-worker-1 "curl http://192.168.1.100:5000/v2/_catalog"

# 3. containerd is configured to use it:
ssh k8s-worker-1 "cat /etc/containerd/certs.d/192.168.1.100:5000/hosts.toml"
```

### MetalLB not assigning EXTERNAL-IP

```bash
kubectl -n metallb-system get pods
kubectl -n metallb-system logs deployment/controller

# Verify IPAddressPool exists:
kubectl get ipaddresspool -n metallb-system
```

### Network policies blocking traffic

```bash
# Same tests as the DOKS guide:
kubectl -n cinema run test-allowed \
  --image=busybox --rm -it --restart=Never \
  --labels="app=cinema-backend" -- \
  nc -zv cinema-postgres-service 5432
# Should succeed

kubectl -n cinema run test-blocked \
  --image=busybox --rm -it --restart=Never \
  --labels="app=cinema-frontend" -- \
  nc -zv cinema-postgres-service 5432
# Should time out (correct — frontend should not reach DB)
```

### PostgreSQL not starting

```bash
kubectl -n cinema logs statefulset/cinema-postgres

# Connect directly:
kubectl -n cinema run psql-debug --image=postgres:15 --rm -it --restart=Never -- \
  psql -h cinema-postgres-service -U cinema_user -d cinema_db
```

### kubeadm reset (start over)

If you need to completely reset a node:

```bash
sudo kubeadm reset -f
sudo rm -rf /etc/cni/net.d /var/lib/etcd $HOME/.kube
sudo iptables -F && sudo iptables -X
sudo systemctl restart containerd
```

---

## DOKS vs Proxmox — Differences Summary

| Aspect | DOKS (DigitalOcean) | Proxmox (Self-Hosted) |
|--------|--------------------|-----------------------|
| **Cluster setup** | `doctl kubernetes cluster create` | `kubeadm init` + `kubeadm join` |
| **CNI** | Managed (Cilium) | Calico (for NetworkPolicy support) |
| **Load Balancer** | DO managed LB | MetalLB (L2 mode) |
| **Storage** | `do-block-storage` (CSI) | `local-path` (Rancher provisioner) |
| **Container Registry** | DOCR (`registry.digitalocean.com`) | Private registry on master (`192.168.1.100:5000`) |
| **Image pull secrets** | `registry-cinema-registry` | Not needed (LAN, no auth) |
| **TLS certificates** | cert-manager + Let's Encrypt | Self-signed or skip for LAN |
| **Cost** | ~$48/mo for nodes + $12 LB | $0 (own hardware) |
| **K8s manifests** | Unchanged | 3 `sed` substitutions |

All other configuration — RBAC, network policies, pod security, secrets, migrations — is **identical** between DOKS and Proxmox.

---

## Security Checklist

| Item | Status |
|------|--------|
| Secrets created with `kubectl create secret` (not in Git) | ✅ Step 11 |
| `EMAIL_USER` / `EMAIL_PASS` stored in K8s Secret | ✅ Step 11 |
| OTP stored in PostgreSQL, not in-memory (works across 2 replicas) | ✅ Migration 014 |
| Auth endpoints rate-limited (5 req / 15 min per IP) | ✅ `auth.routes.js` |
| Production error handler — no internal details leaked | ✅ `app.js` |
| Ticket redemption restricted to Admin role only | ✅ `tiket.routes.js` |
| SMTP egress allowed on ports 465 + 587 for OTP emails | ✅ `network-policies.yaml` |
| Pod anti-affinity: frontend/backend spread across workers | ✅ In manifests |
| Network policies: deny-all + explicit allow-list | ✅ `network-policies.yaml` |
| Non-root containers + read-only rootfs | ✅ In manifests |
| Capabilities dropped | ✅ In manifests |
| `automountServiceAccountToken: false` | ✅ `rbac.yaml` |
| PVC for database persistence | ✅ `postgres.yaml` (local-path) |
| All SQL queries use parameterized bind | ✅ All controllers |
| CORS locked to `FRONTEND_URL` env var | ✅ `app.js` |
| Helmet security headers | ✅ `app.js` |
