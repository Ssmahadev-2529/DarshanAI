import os
import json
import logging
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, Query, HTTPException, status
from pydantic import BaseModel

from backend.services.ml_prediction_service import predictive_service
from backend.models.user import User
from backend.dependencies.auth import get_current_user

logger = logging.getLogger("darshanai.predictions_router")

router = APIRouter(
    tags=["AI/ML Predictive Intelligence & Model Governance"]
)

MODELS_DIR = "models"

# 1. GET /api/predictions/crowd
@router.get("/predictions/crowd")
def get_crowd_predictions(
    temple_id: str = Query("TEMPLE-002", description="Canonical Temple ID"),
    zone_id: Optional[str] = Query(None, description="Optional Zone ID filter")
):
    return predictive_service.predict_zone_crowd(temple_id=temple_id, zone_id=zone_id)

# 2. GET /api/predictions/visitors
@router.get("/predictions/visitors")
def get_visitor_demand_forecast(
    temple_id: str = Query("TEMPLE-002"),
    days_ahead: int = Query(7, ge=1, le=14)
):
    return predictive_service.forecast_visitor_demand(temple_id=temple_id, days_ahead=days_ahead)

# 3. GET /api/predictions/peak-hours
@router.get("/predictions/peak-hours")
def get_peak_hour_predictions(temple_id: str = Query("TEMPLE-002")):
    return predictive_service.predict_peak_hours(temple_id=temple_id)

# 4. GET /api/predictions/queue
@router.get("/predictions/queue")
def get_queue_waiting_time_predictions(temple_id: str = Query("TEMPLE-002")):
    return predictive_service.estimate_queue_waiting_time(temple_id=temple_id)

# 5. GET /api/predictions/congestion-risk
@router.get("/predictions/congestion-risk")
def get_congestion_risk_predictions(temple_id: str = Query("TEMPLE-002")):
    return predictive_service.predict_congestion_risk(temple_id=temple_id)

# 6. GET /api/predictions/parking
@router.get("/predictions/parking")
def get_parking_demand_predictions(temple_id: str = Query("TEMPLE-002")):
    return predictive_service.predict_parking_demand(temple_id=temple_id)

# 7. GET /api/models
@router.get("/models")
def get_models_catalog():
    reg_path = os.path.join(MODELS_DIR, "model_registry.json")
    if os.path.exists(reg_path):
        with open(reg_path, "r") as f:
            return json.load(f)
    return {"status": "REGISTERED", "models": predictive_service.registry.get("models", [])}

# 8. GET /api/models/performance
@router.get("/models/performance")
def get_model_performance_metrics():
    metrics_path = os.path.join(MODELS_DIR, "model_metrics.json")
    fi_path = os.path.join(MODELS_DIR, "feature_importance.json")
    
    metrics = {}
    fi = {}
    if os.path.exists(metrics_path):
        with open(metrics_path, "r") as f:
            metrics = json.load(f)
    if os.path.exists(fi_path):
        with open(fi_path, "r") as f:
            fi = json.load(f)

    return {
        "status": "VERIFIED_EVALUATION",
        "evaluation_strategy": "Chronological Time-Series Split (80% Train, 20% Test) - Zero Data Leakage",
        "metrics": metrics,
        "feature_importances": fi
    }

# 9. GET /api/models/training-status
@router.get("/models/training-status")
def get_model_training_status():
    reg_path = os.path.join(MODELS_DIR, "model_registry.json")
    training_meta = {}
    if os.path.exists(reg_path):
        with open(reg_path, "r") as f:
            reg = json.load(f)
            training_meta = reg.get("training_metadata", {})

    return {
        "status": "OPERATIONAL",
        "models_loaded": predictive_service.models_loaded,
        "version": "v2.0.0",
        "training_metadata": training_meta
    }

# 10. POST /api/models/train (Protected by Authentication & Admin Role)
@router.post("/models/train")
def trigger_model_retraining(current_user: User = Depends(get_current_user)):
    # Role check: only ADMIN or SUPERADMIN can trigger model retraining
    if current_user.role not in ["ADMIN", "SUPERADMIN"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Administrative privileges required to trigger AI/ML retraining."
        )

    try:
        from ml.train_darshanai_models import train_production_models
        result = train_production_models()
        # Reload service artifacts
        predictive_service.load_artifacts()
        return {
            "status": "RETRAINING_SUCCESS",
            "triggered_by": current_user.email,
            "manifest": result
        }
    except Exception as e:
        logger.error(f"Retraining error: {e}")
        raise HTTPException(status_code=500, detail=f"Retraining failed: {str(e)}")
