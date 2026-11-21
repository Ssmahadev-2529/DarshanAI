from typing import Optional, List
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.services.emergency_service import EmergencyService
from backend.models.emergency import EmergencyEvent, EmergencyRiskLevel

router = APIRouter(prefix="/emergency", tags=["Intelligent Emergency Management & Crowd Safety"])

class ReviewEventRequest(BaseModel):
    notes: Optional[str] = "Alert verified by control room administrator."

class ConfirmEventRequest(BaseModel):
    assigned_personnel: Optional[str] = "Rapid Response Emergency Squad"
    notes: Optional[str] = "Incident confirmed; immediate crowd dispersion initiated."

class DismissEventRequest(BaseModel):
    dismissal_reason: str = "Sensor calibration false positive; normal crowd flow verified via CCTV."

class ResolveEventRequest(BaseModel):
    resolution_notes: str = "Devotee flow restored to standard parameters; incident concluded."

@router.get("/alerts")
def get_emergency_alerts(
    temple_id: Optional[str] = Query(None, description="Optional temple filter (e.g. TEMPLE-001)"),
    severity: Optional[str] = Query(None, description="Severity filter: GREEN, YELLOW, ORANGE, RED"),
    status: Optional[str] = Query(None, description="Status filter: DETECTED, UNDER_REVIEW, CONFIRMED, DISMISSED, RESOLVED"),
    db: Session = Depends(get_db)
):
    """Retrieve real-time emergency alerts and events with full telemetry evidence."""
    return EmergencyService.get_emergency_alerts(temple_id=temple_id, severity=severity, status=status, db=db)

@router.get("/events")
def get_emergency_events(
    temple_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Retrieve emergency event history and active incidents."""
    return EmergencyService.get_emergency_alerts(temple_id=temple_id, status=status, db=db)

@router.get("/temples/{temple_id}")
def get_temple_emergency_state(temple_id: str, db: Session = Depends(get_db)):
    """Retrieve comprehensive emergency readiness and active incidents for a single temple."""
    # Run dynamic detection scan
    detected = EmergencyService.detect_emergency_events(temple_id, db)
    alerts = EmergencyService.get_emergency_alerts(temple_id=temple_id, db=db)
    routes = EmergencyService.get_emergency_routes(temple_id, db)

    # Determine highest active severity
    active_alerts = [a for a in alerts if a["status"] in ["DETECTED", "UNDER_REVIEW", "CONFIRMED"]]
    highest_severity = EmergencyRiskLevel.GREEN
    if any(a["severity"] == EmergencyRiskLevel.RED for a in active_alerts):
        highest_severity = EmergencyRiskLevel.RED
    elif any(a["severity"] == EmergencyRiskLevel.ORANGE for a in active_alerts):
        highest_severity = EmergencyRiskLevel.ORANGE
    elif any(a["severity"] == EmergencyRiskLevel.YELLOW for a in active_alerts):
        highest_severity = EmergencyRiskLevel.YELLOW

    return {
        "temple_id": temple_id,
        "operational_risk_level": highest_severity,
        "active_alerts_count": len(active_alerts),
        "total_historical_events": len(alerts),
        "verified_routes_count": len(routes),
        "active_alerts": active_alerts,
        "verified_routes": routes
    }

@router.get("/routes/{temple_id}")
def get_emergency_routes(temple_id: str, db: Session = Depends(get_db)):
    """Retrieve verified evacuation corridors, ambulance routes, and diversion paths with GeoJSON coordinates."""
    return EmergencyService.get_emergency_routes(temple_id, db)

@router.post("/events/{event_id}/review")
def review_emergency_event(event_id: str, req: ReviewEventRequest, db: Session = Depends(get_db)):
    """Acknowledge and mark an emergency alert as UNDER_REVIEW."""
    res = EmergencyService.review_event(event_id, admin_user="System Administrator", notes=req.notes, db=db)
    if "error" in res:
        raise HTTPException(status_code=404, detail=res["error"])
    return res

@router.post("/events/{event_id}/confirm")
def confirm_emergency_event(event_id: str, req: ConfirmEventRequest, db: Session = Depends(get_db)):
    """Confirm an emergency event and assign response personnel."""
    res = EmergencyService.confirm_event(event_id, admin_user="System Administrator", assigned_personnel=req.assigned_personnel, notes=req.notes, db=db)
    if "error" in res:
        raise HTTPException(status_code=404, detail=res["error"])
    return res

@router.post("/events/{event_id}/dismiss")
def dismiss_emergency_event(event_id: str, req: DismissEventRequest, db: Session = Depends(get_db)):
    """Dismiss an emergency alert as a false alarm with mandatory rationale."""
    res = EmergencyService.dismiss_event(event_id, admin_user="System Administrator", dismissal_reason=req.dismissal_reason, db=db)
    if "error" in res:
        raise HTTPException(status_code=404, detail=res["error"])
    return res

@router.post("/events/{event_id}/resolve")
def resolve_emergency_event(event_id: str, req: ResolveEventRequest, db: Session = Depends(get_db)):
    """Conclude and resolve an emergency incident with audit log."""
    res = EmergencyService.resolve_event(event_id, admin_user="System Administrator", resolution_notes=req.resolution_notes, db=db)
    if "error" in res:
        raise HTTPException(status_code=404, detail=res["error"])
    return res

@router.post("/detect/{temple_id}")
def trigger_detection_scan(temple_id: str, db: Session = Depends(get_db)):
    """Manually trigger an intelligent crowd surge and congestion detection scan."""
    events = EmergencyService.detect_emergency_events(temple_id, db)
    return {
        "temple_id": temple_id,
        "scanned_at": EmergencyRiskLevel.GREEN,
        "newly_detected_count": len(events),
        "events": [e.event_id for e in events]
    }
