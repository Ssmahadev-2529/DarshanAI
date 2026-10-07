# DarshanAI — Production Publishing & Deployment Manual

This guide provides step-by-step instructions to publish **DarshanAI** (React 18 Frontend, FastAPI Backend, PostgreSQL / SQLite Fallback, and ML Engine) to cloud and on-premise infrastructure.

---

## 🚀 Option 1: One-Click Cloud Deployment (Render / Vercel)

### Step 1: Push Code to GitHub
Ensure your local branch is synchronized with the repository before initiating cloud builds:
```bash
# Pull latest changes from team repository
git pull --autostash origin main

# Confirm working tree clean
git status
```

---

### Step 2: Deploy Backend & Database on Render

1. **Create Managed PostgreSQL Database (Optional but Recommended)**:
   - Navigate to [dashboard.render.com](https://dashboard.render.com) and create a **PostgreSQL Database**:
     - Name: `darshanai-db`
     - Database: `darshanai`
     - User: `darshanai_user`
   - Copy the **Internal Database URL** (`postgresql://...`).

2. **Create Web Service on Render**:
   - Create a new **Web Service** connected to your repository.
   - **Environment:** `Python 3`
   - **Branch:** `main`
   - **Build Command:**
     ```bash
     pip install -r requirements.txt
     ```
   - **Start Command:**
     ```bash
     gunicorn backend.main:app -w 1 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:$PORT --threads 4 --max-requests 500 --max-requests-jitter 50 --timeout 120
     ```

3. **Configure Environment Variables**:
   | Variable | Value | Purpose |
   |---|---|---|
   | `DATABASE_URL` | `postgresql://...` (or omit for automatic SQLite fallback) | Primary database connection |
   | `SECRET_KEY` | *(Generate a 64-char random string)* | JWT signature encryption |
   | `PYTHONMALLOC` | `malloc` | Mitigates Python memory fragmentation |
   | `MALLOC_TRIM_THRESHOLD_` | `100000` | Instructs glibc to return freed heap pages to OS |
   | `CORS_ORIGINS` | `*` (or `https://<your-app>.vercel.app`) | Permits frontend API requests |

4. **Self-Healing Database Resilience**:
   - At startup, the backend performs a **3-second connectivity probe** to `DATABASE_URL`.
   - If PostgreSQL is unreachable, restarting, or has invalid credentials, the backend **automatically falls back to an embedded SQLite database** (`backend/darshanai.db`), preventing container crash loops.
   - Initial demo accounts (Super Admin, Temple Admins) and verified temple records seed automatically on first boot.

5. **Verify Backend Health**:
   - Health Probe: `https://<your-backend-app>.onrender.com/health`
   - DB Status Probe: `https://<your-backend-app>.onrender.com/api/v1/system/db-status`
   - Memory Telemetry: `https://<your-backend-app>.onrender.com/api/v1/system/memory`

---

### Step 3: Deploy Frontend on Vercel

DarshanAI includes pre-configured `vercel.json` files supporting both repository root and subfolder deployments.

#### Deployment Method:
1. Log in to [vercel.com](https://vercel.com) and select **Add New Project**.
2. Select the `DarshanAI` repository.
3. Configure Project Settings:
   - **Framework Preset:** `Vite`
   - **Root Directory:** `frontend` (or `./` if using root workspace)
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. Add Environment Variable:
   - `VITE_API_BASE_URL`: `https://<your-backend-app>.onrender.com/api/v1`
5. Click **Deploy**. Vercel will build the SPA bundle with automatic client-side routing rewrites.

---

## 🐳 Option 2: 1-Command Docker Deployment (Local / VPS / AWS EC2)

Deploy the complete multi-tier platform (PostgreSQL 16 + FastAPI + React Static Build via Nginx) with a single command:

```bash
docker-compose up -d --build
```

### Container Endpoints:
- **React Web App:** `http://<server-ip>/` (Port 80)
- **FastAPI Backend & Swagger:** `http://<server-ip>:8000/docs` (Port 8000)
- **PostgreSQL Database:** `localhost:5432`

### Inspect Docker Health:
```bash
# View active container status
docker-compose ps

# Stream logs
docker-compose logs -f backend
```

---

## 💻 Option 3: Local Self-Hosted Production Run

### 1. Build React Production Static Bundle
```bash
cd frontend
npm install
npm run build
cd ..
```

### 2. Run Backend Production Server
```bash
pip install -r requirements.txt
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
```
> When `frontend/dist` is present, FastAPI automatically mounts and serves the production React SPA directly at `http://localhost:8000/` with client-side routing fallback.

---

## 🔑 Default Initial Demonstration Accounts

| Role | Tenant Scope | Email | Password |
|---|---|---|---|
| **Platform Super Admin** | Global Platform | `superadmin@darshanai.com` | `SuperAdmin123!` |
| **Temple Admin (Somnath)** | Sri Somnath (`TEMPLE-001`) | `admin@temple001.com` | `TempleAdmin123!` |
| **Temple Admin (Tirupati)** | Sri Venkateswara (`TEMPLE-002`) | `admin@temple002.com` | `TempleAdmin123!` |
| **Operations Manager** | Sri Somnath (`TEMPLE-001`) | `manager@temple001.com` | `Manager123!` |
| **Security Officer** | Sri Somnath (`TEMPLE-001`) | `security@temple001.com` | `Security123!` |
| **First Aid / Medical Lead** | Sri Somnath (`TEMPLE-001`) | `medical@temple001.com` | `Medical123!` |

---

## 🛠️ Diagnostics & Troubleshooting

| Symptom | Probable Cause | Recommended Resolution |
|---|---|---|
| **Render Exit Status 137 (OOM)** | Memory exceeded 512 MB limit | Confirm `-w 1` worker count and verify `MALLOC_TRIM_THRESHOLD_=100000` is present. |
| **Render Exit Status 3 on Startup** | Gunicorn command syntax error | Ensure worker class is specified as `-k uvicorn.workers.UvicornWorker`. |
| **CORS Network Error on Vercel** | Backend origin filter mismatch | Ensure `allow_origin_regex=r"^https?:\/\/.*"` is present in `backend/main.py`. |
| **Login says "Invalid credentials"** | Uninitialized demo database | Access `/api/v1/system/db-status` to trigger automated self-healing account seeding. |
