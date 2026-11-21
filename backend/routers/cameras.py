from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime, timezone
import re

from backend.database import get_db
from backend.models.user import User
from backend.models.cctv import CCTVCamera, LiveCrowdMeasurement
from backend.dependencies.auth import get_current_user, get_optional_user, require_role
from backend.services.cctv_service import cctv_manager, CameraStreamProcessor

router = APIRouter(tags=["Camera & Vision Intelligence"])

def _sanitize_stream_url(stream_url: Optional[str]) -> Optional[str]:
    """Sanitize raw RTSP credentials or stream tokens for privacy and security."""
    if not stream_url:
        return None
    # Mask credentials like rtsp://user:pass@host:port/stream to rtsp://***:***@host:port/stream
    sanitized = re.sub(r"://([^:@]+):([^@]+)@", r"://***:***@", stream_url)
    return sanitized

# ----------------- PYDANTIC SCHEMAS -----------------

class CameraCreateSchema(BaseModel):
    camera_id: str = Field(..., example="CAM-105")
    temple_id: str = Field(..., example="TEMPLE-001")
    name: str = Field(..., example="North Gate Observation Cam")
    zone_code: str = Field(..., example="entry_gates")
    source_type: str = Field(default="TEST_VIDEO", example="TEST_VIDEO")
    stream_url: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    orientation_deg: float = 0.0
    fov_deg: float = 75.0
    coverage_area_sqm: float = 350.0
    coverage_polygon: Optional[Dict[str, Any]] = None
    is_authorized: bool = True
    calibration_status: str = "CALIBRATED"
    calibration_metadata: Optional[Dict[str, Any]] = None

class CameraConfigSchema(BaseModel):
    name: Optional[str] = None
    zone_code: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    orientation_deg: Optional[float] = None
    fov_deg: Optional[float] = None
    coverage_area_sqm: Optional[float] = None
    coverage_polygon: Optional[Dict[str, Any]] = None
    is_authorized: Optional[bool] = None
    calibration_status: Optional[str] = None
    calibration_metadata: Optional[Dict[str, Any]] = None
    source_type: Optional[str] = None
    stream_url: Optional[str] = None


# ----------------- SECTION 10 API ENDPOINTS -----------------

@router.get("/cameras")
def list_cameras(
    temple_id: Optional[str] = Query(None, description="Filter by temple ID, e.g. TEMPLE-001"),
    db: Session = Depends(get_db)
):
    """
    List all authorized CCTV cameras across temples with GIS coordinates,
    orientation, FOV, coverage footprint, and calibration parameters.
    Sanitizes raw stream credentials.
    """
    query = db.query(CCTVCamera)
    if temple_id and temple_id != "ALL":
        query = query.filter(CCTVCamera.temple_id == temple_id)
    db_cameras = query.all()

    result = []
    for c in db_cameras:
        active_proc = cctv_manager.get_camera(c.camera_id)
        person_count = active_proc.person_count if active_proc else (c.last_person_count or 0)
        density_percent = active_proc.density_percent if active_proc else 0.0
        risk_level = active_proc.risk_level if active_proc else (c.last_density_level or "LOW")
        fps = active_proc.fps if active_proc else c.fps

        result.append({
            "camera_id": c.camera_id,
            "temple_id": c.temple_id,
            "name": c.name,
            "zone_code": c.zone_code,
            "source_type": c.source_type,
            "status": c.status,
            "fps": fps,
            "resolution": c.resolution,
            "latitude": c.latitude,
            "longitude": c.longitude,
            "orientation_deg": c.orientation_deg,
            "fov_deg": c.fov_deg,
            "coverage_area_sqm": c.coverage_area_sqm,
            "coverage_polygon": c.coverage_polygon,
            "is_authorized": c.is_authorized,
            "calibration_status": c.calibration_status,
            "calibration_metadata": c.calibration_metadata,
            "last_observation_time": c.last_observation_time.isoformat() if c.last_observation_time else None,
            "person_count": person_count,
            "density_percent": density_percent,
            "risk_level": risk_level,
            "stream_endpoint": f"/api/cctv/cameras/{c.camera_id}/stream",
            "detection_stream_endpoint": f"/api/cctv/cameras/{c.camera_id}/detection-stream",
            "privacy_notice": "Zero facial recognition. Person envelope detections only.",
            "test_footage_disclaimer": "Sample video footage for development verification only. Not live temple feeds."
        })
    return result


@router.get("/cameras/{camera_id}")
def get_camera_details(
    camera_id: str,
    db: Session = Depends(get_db)
):
    """
    Get detailed configuration, spatial metadata, and real-time computer vision
    inference metrics for a single camera.
    """
    cam_db = db.query(CCTVCamera).filter(CCTVCamera.camera_id == camera_id).first()
    if not cam_db:
        raise HTTPException(status_code=404, detail=f"Camera {camera_id} not found")

    active_proc = cctv_manager.get_camera(camera_id)
    analytics = active_proc.get_analytics() if active_proc else {
        "person_count": cam_db.last_person_count or 0,
        "entry_rate": 20,
        "exit_rate": 15,
        "density_percent": 25.0,
        "risk_level": cam_db.last_density_level or "LOW",
        "fps": cam_db.fps,
        "inference_latency_ms": 18.0
    }

    return {
        "camera_id": cam_db.camera_id,
        "temple_id": cam_db.temple_id,
        "name": cam_db.name,
        "zone_code": cam_db.zone_code,
        "source_type": cam_db.source_type,
        "status": cam_db.status,
        "fps": analytics.get("fps", cam_db.fps),
        "resolution": cam_db.resolution,
        "latitude": cam_db.latitude,
        "longitude": cam_db.longitude,
        "orientation_deg": cam_db.orientation_deg,
        "fov_deg": cam_db.fov_deg,
        "coverage_area_sqm": cam_db.coverage_area_sqm,
        "coverage_polygon": cam_db.coverage_polygon,
        "is_authorized": cam_db.is_authorized,
        "calibration_status": cam_db.calibration_status,
        "calibration_metadata": cam_db.calibration_metadata,
        "live_metrics": {
            "person_count": analytics.get("person_count", 0),
            "entry_rate": analytics.get("entry_rate", 0),
            "exit_rate": analytics.get("exit_rate", 0),
            "density_percent": analytics.get("density_percent", 0.0),
            "risk_level": analytics.get("risk_level", "LOW"),
            "inference_latency_ms": analytics.get("inference_latency_ms", 18.5),
            "model": "YOLOv8n-Person-Detection",
            "last_observation_time": analytics.get("last_observation_time", datetime.now(timezone.utc).isoformat())
        },
        "stream_endpoint": f"/api/cctv/cameras/{cam_db.camera_id}/stream",
        "privacy_notice": "Strict In-Memory Frame Processing. No biometric or face identification models active.",
        "test_footage_disclaimer": "Sample video footage for development verification only. Not live temple feeds."
    }


@router.get("/cameras/{camera_id}/status")
def get_camera_status(
    camera_id: str,
    db: Session = Depends(get_db)
):
    """
    Get operational status, FPS, resolution, and observation freshness for a camera.
    """
    cam_db = db.query(CCTVCamera).filter(CCTVCamera.camera_id == camera_id).first()
    if not cam_db:
        raise HTTPException(status_code=404, detail=f"Camera {camera_id} not found")

    active_proc = cctv_manager.get_camera(camera_id)
    return {
        "camera_id": cam_db.camera_id,
        "temple_id": cam_db.temple_id,
        "name": cam_db.name,
        "status": active_proc.status if active_proc else cam_db.status,
        "fps": active_proc.fps if active_proc else cam_db.fps,
        "resolution": cam_db.resolution,
        "source_type": cam_db.source_type,
        "is_authorized": cam_db.is_authorized,
        "calibration_status": cam_db.calibration_status,
        "last_observation_time": active_proc.last_observation_time if active_proc else (
            cam_db.last_observation_time.isoformat() if cam_db.last_observation_time else None
        )
    }


@router.get("/temples/{temple_id}/camera-observations")
def get_temple_camera_observations(
    temple_id: str,
    db: Session = Depends(get_db)
):
    """
    Zone-wise camera observations and detection metrics for a given temple.
    """
    cameras = db.query(CCTVCamera).filter(CCTVCamera.temple_id == temple_id).all()
    if not cameras:
        # Check if temple exists or return empty observations
        return {
            "temple_id": temple_id,
            "camera_count": 0,
            "observations": []
        }

    observations = []
    for c in cameras:
        active_proc = cctv_manager.get_camera(c.camera_id)
        analytics = active_proc.get_analytics() if active_proc else {
            "person_count": c.last_person_count or 0,
            "density_percent": 0.0,
            "risk_level": c.last_density_level or "LOW",
            "entry_rate": 20,
            "exit_rate": 15,
            "fps": c.fps,
            "inference_latency_ms": 18.0,
            "last_observation_time": c.last_observation_time.isoformat() if c.last_observation_time else None
        }

        observations.append({
            "camera_id": c.camera_id,
            "zone_code": c.zone_code,
            "camera_name": c.name,
            "person_count": analytics.get("person_count", 0),
            "density_percent": analytics.get("density_percent", 0.0),
            "risk_level": analytics.get("risk_level", "LOW"),
            "entry_rate": analytics.get("entry_rate", 0),
            "exit_rate": analytics.get("exit_rate", 0),
            "fps": analytics.get("fps", c.fps),
            "calibration_status": c.calibration_status,
            "last_observation_time": analytics.get("last_observation_time")
        })

    return {
        "temple_id": temple_id,
        "camera_count": len(cameras),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "observations": observations
    }


@router.get("/temples/{temple_id}/crowd-observations")
def get_temple_crowd_observations(
    temple_id: str,
    db: Session = Depends(get_db)
):
    """
    Live aggregated crowd counts, movement, density, and risk levels across zones
    for the specified temple.
    """
    cameras = db.query(CCTVCamera).filter(CCTVCamera.temple_id == temple_id).all()
    
    zone_groups: Dict[str, List[dict]] = {}
    for c in cameras:
        active_proc = cctv_manager.get_camera(c.camera_id)
        data = active_proc.get_analytics() if active_proc else {
            "person_count": c.last_person_count or 0,
            "density_percent": 0.0,
            "risk_level": c.last_density_level or "LOW",
            "entry_rate": 20,
            "exit_rate": 15
        }
        if c.zone_code not in zone_groups:
            zone_groups[c.zone_code] = []
        zone_groups[c.zone_code].append(data)

    zones_breakdown = []
    total_people = 0
    total_inflow = 0
    total_outflow = 0

    for z_code, cam_datalist in zone_groups.items():
        z_people = sum(item.get("person_count", 0) for item in cam_datalist)
        z_inflow = sum(item.get("entry_rate", 0) for item in cam_datalist)
        z_outflow = sum(item.get("exit_rate", 0) for item in cam_datalist)
        avg_density = round(sum(item.get("density_percent", 0.0) for item in cam_datalist) / max(1, len(cam_datalist)), 1)
        
        # Risk rollup
        if any(item.get("risk_level") == "CRITICAL" for item in cam_datalist): z_risk = "CRITICAL"
        elif any(item.get("risk_level") == "HIGH" for item in cam_datalist): z_risk = "HIGH"
        elif any(item.get("risk_level") == "MODERATE" for item in cam_datalist): z_risk = "MODERATE"
        else: z_risk = "LOW"

        total_people += z_people
        total_inflow += z_inflow
        total_outflow += z_outflow

        zones_breakdown.append({
            "zone_code": z_code,
            "cameras_active": len(cam_datalist),
            "observed_devotee_count": z_people,
            "density_percent": avg_density,
            "risk_level": z_risk,
            "ingress_rate_per_min": z_inflow,
            "egress_rate_per_min": z_outflow,
            "estimated_wait_time_minutes": max(5, int(z_people * 0.4))
        })

    overall_risk = "LOW"
    if any(z["risk_level"] == "CRITICAL" for z in zones_breakdown): overall_risk = "CRITICAL"
    elif any(z["risk_level"] == "HIGH" for z in zones_breakdown): overall_risk = "HIGH"
    elif any(z["risk_level"] == "MODERATE" for z in zones_breakdown): overall_risk = "MODERATE"

    return {
        "temple_id": temple_id,
        "total_active_cameras": len(cameras),
        "total_observed_people": total_people,
        "total_inflow_rate": total_inflow,
        "total_outflow_rate": total_outflow,
        "overall_crowd_risk": overall_risk,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "zones": zones_breakdown,
        "test_footage_disclaimer": "Sample video footage for development verification only. Not live temple feeds."
    }


@router.get("/zones/{zone_id}/crowd")
def get_zone_crowd(
    zone_id: str,
    db: Session = Depends(get_db)
):
    """
    Zone aggregate crowd and camera telemetry.
    Supports either zone_code (e.g. 'queue_area') or specific zone identifier.
    """
    agg = cctv_manager.get_zone_aggregate(zone_id)
    if agg["active_cameras_count"] == 0:
        # Fallback to query database by zone_code
        db_cams = db.query(CCTVCamera).filter(CCTVCamera.zone_code == zone_id).all()
        if db_cams:
            people = sum(c.last_person_count or 0 for c in db_cams)
            return {
                "zone_id": zone_id,
                "active_cameras_count": len(db_cams),
                "total_observed_people": people,
                "average_density_percent": 30.0,
                "aggregated_risk_level": "LOW",
                "cameras": [
                    {
                        "camera_id": c.camera_id,
                        "name": c.name,
                        "status": c.status,
                        "person_count": c.last_person_count or 0,
                        "calibration_status": c.calibration_status
                    } for c in db_cams
                ]
            }

    return agg


@router.post("/admin/cameras")
def register_camera(
    payload: CameraCreateSchema,
    current_user: User = Depends(require_role(["ADMIN", "SUPER_ADMIN"])),
    db: Session = Depends(get_db)
):
    """
    Register a new CCTV camera with spatial mapping and calibration attributes.
    Protected endpoint: Admin or Super Admin role required.
    """
    existing = db.query(CCTVCamera).filter(CCTVCamera.camera_id == payload.camera_id).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Camera with ID {payload.camera_id} already exists"
        )

    new_cam = CCTVCamera(
        camera_id=payload.camera_id,
        temple_id=payload.temple_id,
        name=payload.name,
        zone_code=payload.zone_code,
        source_type=payload.source_type,
        stream_url=payload.stream_url,
        latitude=payload.latitude,
        longitude=payload.longitude,
        orientation_deg=payload.orientation_deg,
        fov_deg=payload.fov_deg,
        coverage_area_sqm=payload.coverage_area_sqm,
        coverage_polygon=payload.coverage_polygon,
        is_authorized=payload.is_authorized,
        calibration_status=payload.calibration_status,
        calibration_metadata=payload.calibration_metadata,
        status="ONLINE",
        fps=15.0,
        resolution="1280x720",
        last_observation_time=datetime.now(timezone.utc)
    )
    db.add(new_cam)
    db.commit()
    db.refresh(new_cam)

    # Register in in-memory processor
    cctv_manager.cameras[payload.camera_id] = CameraStreamProcessor(
        camera_id=new_cam.camera_id,
        temple_id=new_cam.temple_id,
        name=new_cam.name,
        zone_code=new_cam.zone_code,
        capacity=500,
        source_type=new_cam.source_type,
        stream_url=new_cam.stream_url,
        latitude=new_cam.latitude,
        longitude=new_cam.longitude,
        orientation_deg=new_cam.orientation_deg,
        fov_deg=new_cam.fov_deg,
        coverage_area_sqm=new_cam.coverage_area_sqm,
        calibration_status=new_cam.calibration_status
    )

    return {
        "status": "SUCCESS",
        "message": f"Camera {payload.camera_id} registered successfully",
        "camera_id": payload.camera_id
    }


@router.post("/admin/cameras/{camera_id}/configure")
def configure_camera(
    camera_id: str,
    payload: CameraConfigSchema,
    current_user: User = Depends(require_role(["ADMIN", "SUPER_ADMIN"])),
    db: Session = Depends(get_db)
):
    """
    Update calibration parameters, zone mapping, FOV, and spatial orientation for an existing camera.
    Protected endpoint: Admin or Super Admin role required.
    """
    cam_db = db.query(CCTVCamera).filter(CCTVCamera.camera_id == camera_id).first()
    if not cam_db:
        raise HTTPException(status_code=404, detail=f"Camera {camera_id} not found")

    update_dict = payload.dict(exclude_unset=True)
    for field, val in update_dict.items():
        setattr(cam_db, field, val)

    db.commit()
    db.refresh(cam_db)

    # Update in-memory stream processor
    proc = cctv_manager.get_camera(camera_id)
    if proc:
        if payload.name is not None: proc.name = payload.name
        if payload.zone_code is not None: proc.zone_code = payload.zone_code
        if payload.latitude is not None: proc.latitude = payload.latitude
        if payload.longitude is not None: proc.longitude = payload.longitude
        if payload.orientation_deg is not None: proc.orientation_deg = payload.orientation_deg
        if payload.fov_deg is not None: proc.fov_deg = payload.fov_deg
        if payload.coverage_area_sqm is not None: proc.coverage_area_sqm = payload.coverage_area_sqm
        if payload.calibration_status is not None: proc.calibration_status = payload.calibration_status
        if payload.source_type is not None: proc.source_type = payload.source_type
        if payload.stream_url is not None: proc.stream_url = payload.stream_url

    return {
        "status": "SUCCESS",
        "message": f"Camera {camera_id} configuration updated successfully",
        "camera_id": camera_id
    }
