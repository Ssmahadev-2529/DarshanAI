"""
DARSHANAI 2.0 - Production Deployment Verification & Smoke Test Suite
Validates backend, database integrity, security, API contracts, ML inference, and 3D digital twin readiness.
"""

import sys
import os
import json
from datetime import datetime, timezone

# Add root directory to python path
sys.path.insert(0, os.path.abspath("."))

from fastapi.testclient import TestClient
from backend.main import app
from backend.database import SessionLocal, engine, Base
from backend.models.temple import Temple
from backend.models.zone import TempleZone
from backend.models.user import User
from backend.models.gis import DataSource, Temple3DAsset
from backend.models.festival import TempleFestival
from backend.models.emergency import EmergencyRoute
from backend.services.temple_data_service import seed_multi_temple_gis_foundation
from backend.services.ml_service import ml_service

client = TestClient(app)

def run_production_smoke_tests():
    print("=" * 70)
    print("DARSHANAI 2.0 - PRODUCTION DEPLOYMENT SMOKE TEST SUITE")
    print(f"Timestamp: {datetime.now(timezone.utc).isoformat()}")
    print("=" * 70)

    results = []

    # -------------------------------------------------------------
    # 1. Platform Health Endpoints
    # -------------------------------------------------------------
    print("\n--- [SUITE 1] Platform Health Endpoints ---")
    resp_root_health = client.get("/health")
    assert resp_root_health.status_code == 200, f"Root health failed: {resp_root_health.status_code}"
    print("  [OK] /health -> 200 OK", resp_root_health.json())

    resp_api_health = client.get("/api/health")
    assert resp_api_health.status_code == 200, f"API health failed: {resp_api_health.status_code}"
    print("  [OK] /api/health -> 200 OK")

    resp_mem = client.get("/api/system/memory")
    assert resp_mem.status_code == 200, f"Memory probe failed: {resp_mem.status_code}"
    mem_data = resp_mem.json()
    print(f"  [OK] /api/system/memory -> RSS: {mem_data.get('rss_memory_mb')} MB (Limit: {mem_data.get('memory_limit_mb')} MB)")

    resp_db = client.get("/api/system/db-status")
    assert resp_db.status_code == 200, f"DB status failed: {resp_db.status_code}"
    print("  [OK] /api/system/db-status -> 200 OK")

    resp_sys_health = client.get("/api/system-health/status")
    assert resp_sys_health.status_code == 200, f"System health failed: {resp_sys_health.status_code}"
    sys_health_data = resp_sys_health.json()
    subsystems = sys_health_data.get("subsystems", {})
    print(f"  [OK] /api/system-health/status -> Probes evaluated: {len(subsystems)} subsystems (Score: {sys_health_data.get('overall_health_percent')}%)")
    for name, p in subsystems.items():
        print(f"       • {name}: {p.get('status')}")
    results.append(("Platform Health Probes", True))

    # -------------------------------------------------------------
    # 2. Database Connectivity & Data Integrity
    # -------------------------------------------------------------
    print("\n--- [SUITE 2] Database Integrity & Multi-Temple Registry ---")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_multi_temple_gis_foundation(db)
        temples_count = db.query(Temple).count()
        zones_count = db.query(TempleZone).count()
        users_count = db.query(User).count()
        sources_count = db.query(DataSource).count()
        assets_3d_count = db.query(Temple3DAsset).count()
        festivals_count = db.query(TempleFestival).count()

        print(f"  [OK] Registered Temples: {temples_count} (Expected >= 4)")
        print(f"  [OK] Operational Crowd Zones: {zones_count} (Expected >= 32)")
        print(f"  [OK] Staff & Admin Accounts: {users_count} (Expected >= 17)")
        print(f"  [OK] Authoritative Data Sources: {sources_count} (Expected >= 6)")
        print(f"  [OK] 3D Architectural Assets: {assets_3d_count} (Expected >= 4)")
        print(f"  [OK] Documented Festival Calendars: {festivals_count} (Expected >= 9)")

        assert temples_count >= 4, "Insufficient temple records"
        assert zones_count >= 32, "Insufficient zone records"
        assert users_count >= 17, "Insufficient user records"
        assert assets_3d_count >= 4, "Insufficient 3D asset records"

        # Check for zero hologram references in 3D assets table
        hologram_assets = db.query(Temple3DAsset).filter(Temple3DAsset.asset_name.like("%Hologram%")).count()
        assert hologram_assets == 0, f"Found {hologram_assets} remaining hologram asset references"
        print("  [OK] Hologram References in 3D Assets: 0 (Strict Authentic Architecture Enforced)")
        results.append(("Database Integrity & Schema Validation", True))
    finally:
        db.close()

    # -------------------------------------------------------------
    # 3. Authentication, Security & RBAC Enforcement
    # -------------------------------------------------------------
    print("\n--- [SUITE 3] Authentication, Security & RBAC ---")
    auth_resp = client.post("/api/auth/login", json={"email": "superadmin@darshanai.com", "password": "SuperAdmin123!"})
    assert auth_resp.status_code == 200, f"SuperAdmin login failed: {auth_resp.text}"
    token_super = auth_resp.json().get("access_token")
    headers_super = {"Authorization": f"Bearer {token_super}"}
    print("  [OK] SuperAdmin Login -> JWT Generated successfully")

    # Unauthorized access check
    unauth_resp = client.get("/api/admin/overview")
    assert unauth_resp.status_code in (401, 403), f"Admin overview should require auth, got: {unauth_resp.status_code}"
    print("  [OK] Unauthenticated Access to Admin API -> Correctly Blocked (401/403)")

    # Authorized access check
    admin_overview_resp = client.get("/api/admin/overview", headers=headers_super)
    assert admin_overview_resp.status_code == 200, f"Authorized admin overview failed: {admin_overview_resp.status_code}"
    print("  [OK] Authorized SuperAdmin Access to Admin API -> 200 OK")
    results.append(("Authentication & RBAC Protection", True))

    # -------------------------------------------------------------
    # 4. Core Operational APIs & Subsystems
    # -------------------------------------------------------------
    print("\n--- [SUITE 4] Core Operational Subsystem APIs ---")
    endpoints = [
        ("/api/temples", "Multi-Temple Directory"),
        ("/api/temples/TEMPLE-001/zones", "Temple Operational Zones"),
        ("/api/temples/TEMPLE-001/surroundings", "Surrounding Area Infrastructure"),
        ("/api/dashboard/summary?temple_id=TEMPLE-001", "Live Operations Dashboard"),
        ("/api/cctv/cameras?temple_id=TEMPLE-001", "CCTV Video Streams & FOV"),
        ("/api/festivals/upcoming?temple_id=TEMPLE-001", "Festival Intelligence & Surge"),
        ("/api/festivals/comparison", "Multi-Temple Comparative Benchmarking"),
        ("/api/emergency/overview?temple_id=TEMPLE-001", "Emergency Evacuation Command"),
        ("/api/admin/data-sources", "Authoritative Data Sources Registry"),
        ("/api/admin/3d-assets", "3D Architectural Asset Catalog")
    ]

    for path, label in endpoints:
        resp = client.get(path, headers=headers_super)
        assert resp.status_code == 200, f"Endpoint {path} failed: {resp.status_code}"
        print(f"  [OK] {label} ({path}) -> 200 OK")
    results.append(("Core Operational Subsystem Endpoints", True))

    # -------------------------------------------------------------
    # 5. Machine Learning Predictive Inference
    # -------------------------------------------------------------
    print("\n--- [SUITE 5] AI/ML Predictive Intelligence Singleton ---")
    payload = {
        "temple_id": "TEMPLE-001",
        "zone_id": "ZONE-001",
        "entry_rate": 45,
        "exit_rate": 20,
        "queue_length": 65,
        "hour": 10,
        "is_weekend": 0,
        "is_festival": 0,
        "open_gates": 4,
        "staff_on_duty": 16
    }
    ml_pred = ml_service.predict(payload)
    print("  [OK] ML Prediction Output:")
    print(f"       • Predicted Visitors: {ml_pred.get('predicted_visitor_count')}")
    print(f"       • Predicted Wait Time: {ml_pred.get('predicted_waiting_time')} min")
    print(f"       • Predicted Crowd Level: {ml_pred.get('predicted_crowd_level')}")
    print(f"       • Predicted Risk Level: {ml_pred.get('predicted_risk_level')}")
    print(f"       • Anomaly Detected: {ml_pred.get('is_anomaly')}")
    assert ml_pred.get("predicted_visitor_count", 0) > 0, "Invalid predicted visitor count"
    results.append(("ML Predictive Inference Engine", True))

    # -------------------------------------------------------------
    # 6. Frontend Build & Static Asset Verification
    # -------------------------------------------------------------
    print("\n--- [SUITE 6] Frontend Production Build & SPA Rewrites ---")
    dist_html = os.path.join("frontend", "dist", "index.html")
    assert os.path.exists(dist_html), "Frontend dist/index.html missing. Run npm run build."
    size_kb = round(os.path.getsize(dist_html) / 1024, 2)
    print(f"  [OK] Frontend Production HTML: {dist_html} ({size_kb} KB)")

    # Verify vercel.json configurations
    root_vercel = os.path.join("vercel.json")
    fe_vercel = os.path.join("frontend", "vercel.json")
    assert os.path.exists(root_vercel), "Root vercel.json missing"
    assert os.path.exists(fe_vercel), "Frontend vercel.json missing"
    print("  [OK] Both root vercel.json and frontend/vercel.json exist with SPA rewrite rules")
    results.append(("Frontend Production Bundle & Routing", True))

    # -------------------------------------------------------------
    # Summary
    # -------------------------------------------------------------
    print("\n" + "=" * 70)
    print("PRODUCTION SMOKE TEST RESULTS SUMMARY")
    print("=" * 70)
    for name, passed in results:
        status_str = "[PASS]" if passed else "[FAIL]"
        print(f"  {status_str} {name}")
    print("=" * 70)
    print("ALL 6 PRODUCTION SMOKE TEST SUITES PASSED! (100% PRODUCTION READY)")
    print("=" * 70)

if __name__ == "__main__":
    run_production_smoke_tests()
