# Kubernetes Scaling Demo Guide

This guide is specifically designed for your demo presentation. It shows how to manually add (scale) **Pods** and **Nodes** in your DigitalOcean Kubernetes cluster.

---

## 1. How to Add More Pods (Scale the Application)

In Kubernetes, you don't typically create raw individual Pods. Instead, you tell the **Deployment** that you want more replicas (copies) of your application. Kubernetes will then automatically create the Pods and load balance traffic to them.

### Step 1: Check your current Pods
Open your terminal and run:
```bash
kubectl get pods -n cinema
```
*You should see `cinema-backend` and `cinema-frontend` pods running.*

### Step 2: Scale the Backend to 4 Pods
Let's simulate a traffic spike by scaling the backend from 2 pods up to 4 pods:
```bash
kubectl scale deployment cinema-backend -n cinema --replicas=4
```

### Step 3: Watch the new Pods spin up
Run this command to watch them start in real-time:
```bash
kubectl get pods -n cinema -w
```
*(Press `Ctrl+C` to stop watching once they all say `Running`)*

### Optional: Scale back down
To save resources after the demo, you can scale it back down:
```bash
kubectl scale deployment cinema-backend -n cinema --replicas=2
```

---

## 2. How to Add More Nodes (Scale the Infrastructure)

If your application gets so large that your physical servers (Nodes) run out of RAM or CPU, you need to add more Nodes. In DigitalOcean, you do this by scaling your **Node Pool**.

### Method A: Using the DigitalOcean Dashboard (Easiest for Presentations)
This is usually the best way to show it during a demo because it's highly visual.
1. Log into your **DigitalOcean Dashboard**.
2. On the left sidebar, click **Kubernetes**.
3. Click on your cluster name (`cinema-cluster`).
4. Click on the **Nodes** tab at the top.
5. Next to your node pool, click the **Edit** button (or the three dots `...` -> Resize).
6. Change the node count (e.g., from `2` to `3`) and click **Save**.
7. *Wait a few minutes. You will literally see a new Droplet (Server) spinning up to join your cluster!*

### Method B: Using the Terminal (`doctl`)
If you want to look like a hacker during the demo, use the terminal!

**1. Find your Node Pool ID:**
```bash
doctl kubernetes cluster node-pool list cinema-cluster
```
*Look for the `ID` column in the output and copy it (e.g., `a1b2c3d4-....`).*

**2. Tell DigitalOcean to add a Node:**
Replace `<node-pool-id>` with the ID you copied, and set `--count` to the new total number of nodes you want (e.g., 3).
```bash
doctl kubernetes cluster node-pool update cinema-cluster <node-pool-id> --count 3
```

**3. Watch the new Node join the cluster:**
Run this `kubectl` command to see the servers currently in your cluster:
```bash
kubectl get nodes -w
```
*(You will see a new node appear with the status `NotReady`, and after a minute or two, it will change to `Ready`!)*
