# Antigravity Workspace Guidelines for DarshanAI

## 🔄 Automatic Team Synchronization & Collaboration Protocol
This repository is an active collaborative project between teammates developed with **Google Antigravity**.

### ⚠️ MANDATORY RULE FOR ANTIGRAVITY AGENT:
Whenever any user or collaborator begins work, prompts the agent, or starts a new task:
1. **Always Check for Remote Updates First**:
   - Before editing any code or creating new files, the agent **MUST** proactively check synchronization with `origin/main`.
   - The agent should inform the user: *"Checking for latest team changes from GitHub..."* and run `git pull --autostash origin main` (or `./pull_latest.bat` on Windows / `./pull_latest.ps1`) to ensure the local environment is 100% up to date with teammates' work.
   - If the workspace is behind `origin/main`, the agent must pull the latest changes before proceeding.
2. **Safe Conflict Handling**:
   - Always use `git pull --autostash origin main` so that any local modifications in progress are automatically stashed and cleanly reapplied without data loss.
3. **Continuous Commit & Push Protocol**:
   - Upon completing any feature, enhancement, or bug fix requested by the user, the agent must commit all changes with a clear conventional commit message and push to `origin/main` so that fellow teammates receive updates immediately.

---

## 🏛️ Project Architecture & Directory Structure

```
dharshan-ai/
├── backend/                  # FastAPI Application Tier
│   ├── config.py             # App configurations, secrets, CORS, environment variables
│   ├── database.py           # SQLAlchemy engine with 3s PostgreSQL probe & SQLite fallback
│   ├── main.py               # FastAPI entrypoint, lifecycle startup, memory trimmer, static mount
│   ├── models/               # SQLAlchemy ORM schemas (temple, zone, user, pilgrim, alert, cctv)
│   ├── routers/              # Modular API endpoints (auth, temples, dashboard, ml, pilgrims, etc.)
│   └── services/             # Core business logic (auth_service, ml_service)
├── frontend/                 # React 18 + Vite SPA Command Center
│   ├── src/
│   │   ├── components/       # UI building blocks (Sidebar, Topbar, ProtectedRoute, Loading)
│   │   ├── context/          # State providers (AuthContext, SidebarContext)
│   │   ├── pages/            # View pages (Dashboard, CrowdMonitoring, TempleMap, Simulation, etc.)
│   │   ├── App.jsx           # App routing with React.lazy() code splitting & RBAC guards
│   │   └── index.css         # Styling, animations, theme tokens
│   ├── vite.config.js        # Vite configuration & proxy
│   └── vercel.json           # Frontend Vercel SPA routing configuration
├── ml/                       # Machine Learning & Simulation Pipeline
│   ├── generate_dataset.py   # Historical dataset generator (8,760 hourly records)
│   ├── train_models.py       # Scikit-Learn training script with tree pruning and compression
│   └── simulation_engine.py  # Discrete event crowd dynamics simulation engine
├── models/                   # Pretrained compressed ML model artifacts (*.pkl)
├── data/                     # Historical dataset CSV and documentation
├── Dockerfile.backend        # Production container image with memory optimization
├── docker-compose.yml        # Multi-container orchestration (DB + API + Web)
├── SPEC.md                   # Complete Technical System Specification
└── README.md                 # Project documentation & quickstart guide
```

---

## 🛠️ Development Conventions & Engineering Standards

### 1. Python & Backend Guidelines
- **Python Compatibility:** Python 3.10–3.13 (Docker base image standard: `python:3.12-slim`).
- **Database Engine Resilience:** All DB operations must use `SessionLocal` from `backend.database.py`. In environments where external PostgreSQL is unavailable, the system automatically falls back to local SQLite (`backend/darshanai.db`).
- **Memory Management:** To avoid container OOM kills in 512 MB cloud hosting (Render free tier), maintain the single Gunicorn worker pattern (`-w 1 --threads 4`) and ensure the 30-second `libc.malloc_trim(0)` trimmer in `backend/main.py` remains enabled.
- **Fast Authentication:** User passwords utilize SHA-256 with HMAC hex verification (`sha256$...`) for sub-millisecond execution. Legacy bcrypt hashes are seamlessly upgraded upon successful authentication.

### 2. Frontend & React Guidelines
- **Sidebar & Layout Navigation:** The application uses `SidebarContext.jsx` to manage both desktop mini-rail mode (`w-20` vs `w-64`) and mobile slide-out drawer mode. Sidebar state is persisted in `localStorage`.
- **Performance & Code Splitting:** Always lazy load operational page components via `React.lazy()` and wrap them in `<Suspense fallback={<Loading />}>`. Keep auth pages (`Login`, `Register`) eagerly loaded for instant initial render.
- **Aesthetic Design:** Maintain the signature Indian temple aesthetic (`#F9F6F0` ivory background, saffron gold accents, deep charcoal borders, and translucent glassmorphism).

### 3. Machine Learning & Computer Vision
- **Model Storage:** All model pickles must be saved using `joblib.dump(model, path, compress=3)` with tree-pruned estimators (`max_depth=8`, `max_leaf_nodes=35`) to keep disk weight <1 MB.
- **Singleton Pattern:** Never load model files repeatedly in request handlers. Always reference the cached model singleton via `backend.services.ml_service.ml_service`.

---

## ⚡ Essential Commands Reference

| Action | Command |
|---|---|
| **Sync with Team (Batch)** | `.\pull_latest.bat` |
| **Sync with Team (PowerShell)** | `.\pull_latest.ps1` |
| **Sync with Team (Git)** | `git pull --autostash origin main` |
| **Backend Dev Server** | `python -m uvicorn backend.main:app --reload --port 8000` |
| **Frontend Dev Server** | `cd frontend && npm run dev` |
| **Frontend Production Build** | `cd frontend && npm run build` |
| **Generate Dataset** | `python ml/generate_dataset.py` |
| **Train ML Models** | `python -m ml.train_models` |
| **Full Docker Launch** | `docker-compose up -d --build` |

---

## 🔐 Conventional Commits Protocol
When pushing completed work to `origin/main`, format commit messages according to conventional commits:
- `feat(scope): ...` for new features or user capabilities.
- `fix(scope): ...` for bug fixes and stability improvements.
- `docs(scope): ...` for documentation and specification updates.
- `perf(scope): ...` for performance and memory optimizations.
- `refactor(scope): ...` for code structure changes without behavioral alteration.
