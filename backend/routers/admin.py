import os
from typing import Optional, List, Dict, Any
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models.user import User
from backend.models.temple import Temple
from backend.models.zone import TempleZone
from backend.models.cctv import CCTVCamera
from backend.models.gis import DataSource, Temple3DAsset, DataQualityReport, DataClassification
from backend.models.audit import SystemAuditLog
from backend.models.emergency import EmergencyEvent
from backend.models.festival import TempleFestival
from backend.dependencies.auth import get_current_user, require_role
from backend.services.auth_service import get_password_hash
from backend.services.ml_service import ml_service

router = APIRouter(prefix="/admin", tags=["Central Administration & Data Governance"])

# Helper for logging administrative audit events
def record_audit_log(
    db: Session,
    user: Optional[User],
    action: str,
    target_type: str,
    target_id: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
    ip_address: Optional[str] = None,
    status: str = "SUCCESS"
):
    try:
        user_email = user.email if user else "SYSTEM"
        user_id = user.id if user else None
        temple_id = user.temple_id if user else None

        log_entry = SystemAuditLog(
            user_id=user_id,
            user_email=user_email,
            temple_id=temple_id,
            action=action,
            target_type=target_type,
            target_id=str(target_id) if target_id is not None else None,
            details=details or {},
            ip_address=ip_address,
            status=status,
            timestamp=datetime.utcnow()
        )
        db.add(log_entry)
        db.commit()
    except Exception as e:
        print(f"[AUDIT LOGGING ERROR] {e}")
        db.rollback()

# ----------------- SCHEMAS -----------------

class UserCreateAdminSchema(BaseModel):
    email: EmailStr
    full_name: str
    password: str = Field(..., min_length=6)
    role: str = "VOLUNTEER"
    temple_id: Optional[str] = "TEMPLE-001"
    mobile: Optional[str] = None

class UserRoleUpdateSchema(BaseModel):
    role: str
    temple_id: Optional[str] = None

class DataSourceCreateSchema(BaseModel):
    source_code: str
    name: str
    source_url: Optional[str] = None
    licence: str = "Open Database License (ODbL)"
    verification_status: str = "VERIFIED"
    data_classification: str = "VERIFIED_OPEN_DATA"
    confidence_level: float = 0.95
    description: Optional[str] = None

class DataSourceUpdateSchema(BaseModel):
    name: Optional[str] = None
    source_url: Optional[str] = None
    licence: Optional[str] = None
    verification_status: Optional[str] = None
    data_classification: Optional[str] = None
    confidence_level: Optional[float] = None
    description: Optional[str] = None

class Asset3DCreateSchema(BaseModel):
    temple_id: str
    asset_name: str
    asset_type: str = "GLB_MODEL"
    file_path_or_url: Optional[str] = None
    lod_level: str = "LOD0"
    polygon_count: Optional[int] = 15000
    status: str = "AVAILABLE"
    notes: Optional[str] = None

class Asset3DUpdateSchema(BaseModel):
    asset_name: Optional[str] = None
    lod_level: Optional[str] = None
    polygon_count: Optional[int] = None
    status: Optional[str] = None
    notes: Optional[str] = None

class ZoneCreateSchema(BaseModel):
    temple_id: str
    zone_code: str
    name: str
    zone_type: str = "ENTRY"
    latitude: float
    longitude: float
    capacity: int = 2000
    staff_assigned: int = 5
    is_verified: bool = True
    icon_type: Optional[str] = "DoorOpen"

class ZoneUpdateSchema(BaseModel):
    name: Optional[str] = None
    zone_type: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    capacity: Optional[int] = None
    staff_assigned: Optional[int] = None
    is_verified: Optional[bool] = None

# ----------------- SECTION 1: ADMIN OVERVIEW -----------------

@router.get("/overview")
def get_admin_overview(
    current_user: User = Depends(require_role(["SUPER_ADMIN", "TEMPLE_ADMIN"])),
    db: Session = Depends(get_db)
):
    """Provides high-level platform health, inventory metrics, and governance status."""
    is_super = current_user.role == "SUPER_ADMIN"
    temple_filter = None if is_super else current_user.temple_id

    temples_q = db.query(Temple)
    zones_q = db.query(TempleZone)
    cams_q = db.query(CCTVCamera)
    assets_q = db.query(Temple3DAsset)
    events_q = db.query(EmergencyEvent)
    users_q = db.query(User)

    if temple_filter:
        temples_q = temples_q.filter(Temple.temple_id == temple_filter)
        zones_q = zones_q.filter(TempleZone.temple_id == temple_filter)
        cams_q = cams_q.filter(CCTVCamera.temple_id == temple_filter)
        assets_q = assets_q.filter(Temple3DAsset.temple_id == temple_filter)
        events_q = events_q.filter(EmergencyEvent.temple_id == temple_filter)
        users_q = users_q.filter(User.temple_id == temple_filter)

    data_sources_count = db.query(DataSource).count()
    verified_sources_count = db.query(DataSource).filter(DataSource.verification_status == "VERIFIED").count()
    audit_logs_count = db.query(SystemAuditLog).count()

    return {
        "status": "OPERATIONAL",
        "user_role": current_user.role,
        "temple_scope": "GLOBAL" if is_super else current_user.temple_id,
        "counts": {
            "temples": temples_q.count(),
            "zones": zones_q.count(),
            "cameras": cams_q.count(),
            "assets_3d": assets_q.count(),
            "active_emergencies": events_q.filter(EmergencyEvent.status.in_(["DETECTED", "UNDER_REVIEW", "CONFIRMED"])).count(),
            "users": users_q.count(),
            "data_sources": data_sources_count,
            "verified_data_sources": verified_sources_count,
            "audit_logs": audit_logs_count
        },
        "ml_models": {
            "models_loaded": ml_service.models_loaded,
            "pipeline_status": "ONLINE" if ml_service.models_loaded else "STANDBY"
        },
        "timestamp": datetime.utcnow().isoformat()
    }

# ----------------- SECTION 2: AUDIT LOGS -----------------

@router.get("/audit-logs")
def get_audit_logs(
    temple_id: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    user_email: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(require_role(["SUPER_ADMIN", "TEMPLE_ADMIN", "DATA_ANALYST"])),
    db: Session = Depends(get_db)
):
    """Retrieves immutable audit logs for administrative modifications and security tracking."""
    q = db.query(SystemAuditLog)

    if current_user.role != "SUPER_ADMIN" and current_user.temple_id:
        q = q.filter(SystemAuditLog.temple_id == current_user.temple_id)
    elif temple_id:
        q = q.filter(SystemAuditLog.temple_id == temple_id)

    if action:
        q = q.filter(SystemAuditLog.action == action)
    if user_email:
        q = q.filter(SystemAuditLog.user_email == user_email)

    logs = q.order_by(SystemAuditLog.timestamp.desc()).limit(limit).all()
    return [
        {
            "id": log.id,
            "user_id": log.user_id,
            "user_email": log.user_email,
            "temple_id": log.temple_id,
            "action": log.action,
            "target_type": log.target_type,
            "target_id": log.target_id,
            "details": log.details,
            "ip_address": log.ip_address,
            "status": log.status,
            "timestamp": log.timestamp.isoformat() if log.timestamp else None
        }
        for log in logs
    ]

# ----------------- SECTION 3: USER MANAGEMENT & RBAC -----------------

@router.get("/users")
def list_admin_users(
    temple_id: Optional[str] = Query(None),
    current_user: User = Depends(require_role(["SUPER_ADMIN", "TEMPLE_ADMIN"])),
    db: Session = Depends(get_db)
):
    """Lists registered administrative staff users and their access roles."""
    q = db.query(User)
    if current_user.role != "SUPER_ADMIN" and current_user.temple_id:
        q = q.filter(User.temple_id == current_user.temple_id)
    elif temple_id:
        q = q.filter(User.temple_id == temple_id)

    users = q.order_by(User.id.asc()).all()
    return [
        {
            "id": u.id,
            "email": u.email,
            "full_name": u.full_name,
            "role": u.role,
            "temple_id": u.temple_id,
            "mobile": u.mobile,
            "is_active": u.is_active,
            "status": u.status,
            "created_at": u.created_at.isoformat() if u.created_at else None
        }
        for u in users
    ]

@router.post("/users")
def create_admin_user(
    payload: UserCreateAdminSchema,
    request: Request,
    current_user: User = Depends(require_role(["SUPER_ADMIN", "TEMPLE_ADMIN"])),
    db: Session = Depends(get_db)
):
    """Creates a new administrative or operations user account with SHA-256 secure hash."""
    if current_user.role != "SUPER_ADMIN":
        payload.temple_id = current_user.temple_id

    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="User with this email already exists.")

    new_user = User(
        email=payload.email,
        full_name=payload.full_name,
        hashed_password=get_password_hash(payload.password),
        role=payload.role.strip().upper(),
        temple_id=payload.temple_id,
        mobile=payload.mobile,
        is_active=True,
        status="Active",
        created_at=datetime.utcnow()
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    record_audit_log(
        db=db,
        user=current_user,
        action="CREATE_USER",
        target_type="USER",
        target_id=str(new_user.id),
        details={"email": new_user.email, "role": new_user.role, "temple_id": new_user.temple_id},
        ip_address=request.client.host if request.client else None
    )

    return {"message": "User created successfully", "user_id": new_user.id, "email": new_user.email}

@router.put("/users/{user_id}/role")
def update_user_role(
    user_id: int,
    payload: UserRoleUpdateSchema,
    request: Request,
    current_user: User = Depends(require_role(["SUPER_ADMIN", "TEMPLE_ADMIN"])),
    db: Session = Depends(get_db)
):
    """Updates an existing user's RBAC role and assigned temple."""
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    if current_user.role != "SUPER_ADMIN" and target.temple_id != current_user.temple_id:
        raise HTTPException(status_code=403, detail="Unauthorized to modify users outside assigned temple")

    prev_role = target.role
    target.role = payload.role.strip().upper()
    if payload.temple_id is not None and current_user.role == "SUPER_ADMIN":
        target.temple_id = payload.temple_id

    db.commit()

    record_audit_log(
        db=db,
        user=current_user,
        action="UPDATE_USER_ROLE",
        target_type="USER",
        target_id=str(target.id),
        details={"email": target.email, "previous_role": prev_role, "new_role": target.role},
        ip_address=request.client.host if request.client else None
    )

    return {"message": "User role updated successfully", "user_id": target.id, "role": target.role}

@router.put("/users/{user_id}/status")
def toggle_user_status(
    user_id: int,
    request: Request,
    current_user: User = Depends(require_role(["SUPER_ADMIN", "TEMPLE_ADMIN"])),
    db: Session = Depends(get_db)
):
    """Toggles active/deactivated state for a user account."""
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    if target.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot deactivate own account.")

    target.is_active = not target.is_active
    target.status = "Active" if target.is_active else "Suspended"
    db.commit()

    record_audit_log(
        db=db,
        user=current_user,
        action="TOGGLE_USER_STATUS",
        target_type="USER",
        target_id=str(target.id),
        details={"email": target.email, "is_active": target.is_active, "status": target.status},
        ip_address=request.client.host if request.client else None
    )

    return {"message": f"User status changed to {target.status}", "user_id": target.id, "is_active": target.is_active}

# ----------------- SECTION 4: DATA GOVERNANCE & DATA SOURCES -----------------

@router.get("/data-sources")
def list_data_sources(db: Session = Depends(get_db)):
    """Lists all authoritative geographical, architectural, and operational data sources."""
    sources = db.query(DataSource).order_by(DataSource.id.asc()).all()
    return [
        {
            "id": s.id,
            "source_code": s.source_code,
            "name": s.name,
            "source_url": s.source_url,
            "licence": s.licence,
            "verification_status": s.verification_status,
            "data_classification": s.data_classification,
            "confidence_level": s.confidence_level,
            "description": s.description,
            "last_updated_date": s.last_updated_date.isoformat() if s.last_updated_date else None
        }
        for s in sources
    ]

@router.post("/data-sources")
def register_data_source(
    payload: DataSourceCreateSchema,
    request: Request,
    current_user: User = Depends(require_role(["SUPER_ADMIN", "TEMPLE_ADMIN", "DATA_ANALYST"])),
    db: Session = Depends(get_db)
):
    """Registers a new authoritative geospatial or operational data source with metadata."""
    existing = db.query(DataSource).filter(DataSource.source_code == payload.source_code).first()
    if existing:
        raise HTTPException(status_code=400, detail="A data source with this code already exists.")

    new_src = DataSource(
        source_code=payload.source_code,
        name=payload.name,
        source_url=payload.source_url,
        licence=payload.licence,
        verification_status=payload.verification_status,
        data_classification=payload.data_classification,
        confidence_level=payload.confidence_level,
        description=payload.description,
        collection_date=datetime.utcnow(),
        last_updated_date=datetime.utcnow()
    )
    db.add(new_src)
    db.commit()
    db.refresh(new_src)

    record_audit_log(
        db=db,
        user=current_user,
        action="REGISTER_DATA_SOURCE",
        target_type="DATA_SOURCE",
        target_id=new_src.source_code,
        details={"name": new_src.name, "licence": new_src.licence, "classification": new_src.data_classification},
        ip_address=request.client.host if request.client else None
    )

    return {"message": "Data source registered successfully", "id": new_src.id, "source_code": new_src.source_code}

@router.put("/data-sources/{source_id}")
def update_data_source(
    source_id: int,
    payload: DataSourceUpdateSchema,
    request: Request,
    current_user: User = Depends(require_role(["SUPER_ADMIN", "DATA_ANALYST"])),
    db: Session = Depends(get_db)
):
    """Updates verification status, classification, or metadata for a registered data source."""
    src = db.query(DataSource).filter(DataSource.id == source_id).first()
    if not src:
        raise HTTPException(status_code=404, detail="Data source not found")

    if payload.name: src.name = payload.name
    if payload.source_url: src.source_url = payload.source_url
    if payload.licence: src.licence = payload.licence
    if payload.verification_status: src.verification_status = payload.verification_status
    if payload.data_classification: src.data_classification = payload.data_classification
    if payload.confidence_level is not None: src.confidence_level = payload.confidence_level
    if payload.description: src.description = payload.description
    src.last_updated_date = datetime.utcnow()

    db.commit()

    record_audit_log(
        db=db,
        user=current_user,
        action="UPDATE_DATA_SOURCE",
        target_type="DATA_SOURCE",
        target_id=src.source_code,
        details={"verification_status": src.verification_status, "confidence_level": src.confidence_level},
        ip_address=request.client.host if request.client else None
    )

    return {"message": "Data source updated successfully", "id": src.id}

# ----------------- SECTION 5: 3D DIGITAL TWIN ASSETS -----------------

@router.get("/3d-assets")
def list_3d_assets(
    temple_id: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Lists registered 3D spatial models and terrain packages."""
    q = db.query(Temple3DAsset)
    if temple_id:
        q = q.filter(Temple3DAsset.temple_id == temple_id)
    assets = q.all()
    return [
        {
            "id": a.id,
            "temple_id": a.temple_id,
            "asset_name": a.asset_name,
            "asset_type": a.asset_type,
            "lod_level": a.lod_level,
            "polygon_count": a.polygon_count,
            "status": a.status,
            "file_path_or_url": a.file_path_or_url,
            "notes": a.notes
        }
        for a in assets
    ]

@router.post("/3d-assets")
def register_3d_asset(
    payload: Asset3DCreateSchema,
    request: Request,
    current_user: User = Depends(require_role(["SUPER_ADMIN", "TEMPLE_ADMIN"])),
    db: Session = Depends(get_db)
):
    """Registers a new 3D spatial model or photogrammetry asset."""
    new_asset = Temple3DAsset(
        temple_id=payload.temple_id,
        asset_name=payload.asset_name,
        asset_type=payload.asset_type,
        file_path_or_url=payload.file_path_or_url,
        lod_level=payload.lod_level,
        polygon_count=payload.polygon_count,
        status=payload.status,
        notes=payload.notes,
        created_at=datetime.utcnow()
    )
    db.add(new_asset)
    db.commit()
    db.refresh(new_asset)

    record_audit_log(
        db=db,
        user=current_user,
        action="REGISTER_3D_ASSET",
        target_type="3D_ASSET",
        target_id=str(new_asset.id),
        details={"name": new_asset.asset_name, "temple_id": new_asset.temple_id, "lod": new_asset.lod_level},
        ip_address=request.client.host if request.client else None
    )

    return {"message": "3D asset registered successfully", "id": new_asset.id}

@router.put("/3d-assets/{asset_id}")
def update_3d_asset(
    asset_id: int,
    payload: Asset3DUpdateSchema,
    request: Request,
    current_user: User = Depends(require_role(["SUPER_ADMIN", "TEMPLE_ADMIN"])),
    db: Session = Depends(get_db)
):
    """Updates 3D asset metadata, polygon count, or operational status."""
    asset = db.query(Temple3DAsset).filter(Temple3DAsset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="3D Asset not found")

    if payload.asset_name: asset.asset_name = payload.asset_name
    if payload.lod_level: asset.lod_level = payload.lod_level
    if payload.polygon_count is not None: asset.polygon_count = payload.polygon_count
    if payload.status: asset.status = payload.status
    if payload.notes: asset.notes = payload.notes

    db.commit()

    record_audit_log(
        db=db,
        user=current_user,
        action="UPDATE_3D_ASSET",
        target_type="3D_ASSET",
        target_id=str(asset.id),
        details={"status": asset.status, "polygon_count": asset.polygon_count},
        ip_address=request.client.host if request.client else None
    )

    return {"message": "3D asset updated successfully", "id": asset.id}

# ----------------- SECTION 6: ZONE & ENTRANCE MANAGEMENT -----------------

@router.get("/zones")
def list_admin_zones(
    temple_id: Optional[str] = Query(None),
    zone_type: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Lists operational crowd zones and entrance gateways with spatial coordinates."""
    q = db.query(TempleZone)
    if temple_id:
        q = q.filter(TempleZone.temple_id == temple_id)
    if zone_type:
        q = q.filter(TempleZone.zone_type == zone_type)

    zones = q.order_by(TempleZone.temple_id.asc(), TempleZone.id.asc()).all()
    return [
        {
            "id": z.id,
            "temple_id": z.temple_id,
            "zone_code": z.zone_code,
            "name": z.name,
            "zone_type": z.zone_type,
            "latitude": z.latitude,
            "longitude": z.longitude,
            "capacity": z.capacity,
            "staff_assigned": z.staff_assigned,
            "is_verified": z.is_verified,
            "icon_type": z.icon_type
        }
        for z in zones
    ]

@router.post("/zones")
def create_admin_zone(
    payload: ZoneCreateSchema,
    request: Request,
    current_user: User = Depends(require_role(["SUPER_ADMIN", "TEMPLE_ADMIN"])),
    db: Session = Depends(get_db)
):
    """Creates a new verified operational zone or gateway for a temple."""
    existing = db.query(TempleZone).filter(
        TempleZone.temple_id == payload.temple_id,
        TempleZone.zone_code == payload.zone_code
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Zone code already exists for this temple.")

    new_z = TempleZone(
        temple_id=payload.temple_id,
        zone_code=payload.zone_code,
        name=payload.name,
        zone_type=payload.zone_type,
        latitude=payload.latitude,
        longitude=payload.longitude,
        capacity=payload.capacity,
        staff_assigned=payload.staff_assigned,
        is_verified=payload.is_verified,
        icon_type=payload.icon_type
    )
    db.add(new_z)
    db.commit()
    db.refresh(new_z)

    record_audit_log(
        db=db,
        user=current_user,
        action="CREATE_ZONE",
        target_type="ZONE",
        target_id=str(new_z.id),
        details={"temple_id": new_z.temple_id, "zone_code": new_z.zone_code, "capacity": new_z.capacity},
        ip_address=request.client.host if request.client else None
    )

    return {"message": "Operational zone created successfully", "id": new_z.id, "zone_code": new_z.zone_code}

@router.put("/zones/{zone_id}")
def update_admin_zone(
    zone_id: int,
    payload: ZoneUpdateSchema,
    request: Request,
    current_user: User = Depends(require_role(["SUPER_ADMIN", "TEMPLE_ADMIN"])),
    db: Session = Depends(get_db)
):
    """Updates zone capacity, coordinates, staff assignment, and verification status."""
    z = db.query(TempleZone).filter(TempleZone.id == zone_id).first()
    if not z:
        raise HTTPException(status_code=404, detail="Zone not found")

    if current_user.role != "SUPER_ADMIN" and z.temple_id != current_user.temple_id:
        raise HTTPException(status_code=403, detail="Unauthorized to modify zones in other temples")

    if payload.name: z.name = payload.name
    if payload.zone_type: z.zone_type = payload.zone_type
    if payload.latitude is not None: z.latitude = payload.latitude
    if payload.longitude is not None: z.longitude = payload.longitude
    if payload.capacity is not None: z.capacity = payload.capacity
    if payload.staff_assigned is not None: z.staff_assigned = payload.staff_assigned
    if payload.is_verified is not None: z.is_verified = payload.is_verified

    db.commit()

    record_audit_log(
        db=db,
        user=current_user,
        action="UPDATE_ZONE",
        target_type="ZONE",
        target_id=str(z.id),
        details={"name": z.name, "capacity": z.capacity, "staff_assigned": z.staff_assigned},
        ip_address=request.client.host if request.client else None
    )

    return {"message": "Zone updated successfully", "id": z.id}

@router.delete("/zones/{zone_id}")
def delete_admin_zone(
    zone_id: int,
    request: Request,
    current_user: User = Depends(require_role(["SUPER_ADMIN"])),
    db: Session = Depends(get_db)
):
    """Deletes an operational zone (Super Admin only)."""
    z = db.query(TempleZone).filter(TempleZone.id == zone_id).first()
    if not z:
        raise HTTPException(status_code=404, detail="Zone not found")

    code = z.zone_code
    temple_id = z.temple_id
    db.delete(z)
    db.commit()

    record_audit_log(
        db=db,
        user=current_user,
        action="DELETE_ZONE",
        target_type="ZONE",
        target_id=str(zone_id),
        details={"zone_code": code, "temple_id": temple_id},
        ip_address=request.client.host if request.client else None
    )

    return {"message": "Zone deleted successfully", "zone_id": zone_id}

# ----------------- SECTION 7: AI/ML MODEL RETRAINING TRIGGER -----------------

@router.post("/ml/retrain")
def trigger_ml_retraining(
    request: Request,
    current_user: User = Depends(require_role(["SUPER_ADMIN", "TEMPLE_ADMIN", "DATA_ANALYST"])),
    db: Session = Depends(get_db)
):
    """Triggers model synchronization and reloads compressed estimators into memory."""
    try:
        from ml.train_models import train_all_models
        train_all_models()
        # Force reload in memory
        ml_service._load_models()

        record_audit_log(
            db=db,
            user=current_user,
            action="RETRAIN_ML_MODELS",
            target_type="ML_MODEL",
            target_id="ALL_MODELS",
            details={"status": "RETRAINED", "timestamp": datetime.utcnow().isoformat()},
            ip_address=request.client.host if request.client else None
        )

        return {
            "status": "SUCCESS",
            "message": "AI/ML models successfully retrained and reloaded into memory cache.",
            "metrics": ml_service.model_metrics
        }
    except Exception as e:
        record_audit_log(
            db=db,
            user=current_user,
            action="RETRAIN_ML_MODELS",
            target_type="ML_MODEL",
            target_id="ALL_MODELS",
            details={"error": str(e)},
            ip_address=request.client.host if request.client else None,
            status="FAILED"
        )
        raise HTTPException(status_code=500, detail=f"Model retraining failed: {e}")
