from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, JSON, Index, Text
from backend.database import Base

class EmergencyRiskLevel:
    GREEN = "GREEN"       # Normal operational conditions
    YELLOW = "YELLOW"     # Attention required, monitor queue / flow
    ORANGE = "ORANGE"     # High-risk condition requiring administrator assessment
    RED = "RED"           # Critical condition requiring immediate human review & rapid response

class EmergencyEventStatus:
    DETECTED = "DETECTED"
    UNDER_REVIEW = "UNDER_REVIEW"
    CONFIRMED = "CONFIRMED"
    DISMISSED = "DISMISSED"
    RESOLVED = "RESOLVED"

class EmergencyEventType:
    CROWD_SURGE = "CROWD_SURGE"
    ABNORMAL_ACCUMULATION = "ABNORMAL_ACCUMULATION"
    CRITICAL_CONGESTION = "CRITICAL_CONGESTION"
    QUEUE_OVERFLOW = "QUEUE_OVERFLOW"
    RESTRICTED_BREACH = "RESTRICTED_BREACH"
    PATHWAY_OBSTRUCTION = "PATHWAY_OBSTRUCTION"
    EMERGENCY_ACCESS_BLOCKED = "EMERGENCY_ACCESS_BLOCKED"
    MOVEMENT_HAZARD = "MOVEMENT_HAZARD"
    MEDICAL_EMERGENCY = "MEDICAL_EMERGENCY"

class EmergencyEvent(Base):
    """Authoritative emergency incidents and crowd safety events grounded in live observations & calibrated metrics."""
    __tablename__ = "emergency_events"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(String(60), unique=True, index=True, nullable=False)
    temple_id = Column(String(50), ForeignKey("temples.temple_id"), nullable=False, index=True)
    zone_code = Column(String(60), nullable=False, index=True)
    event_type = Column(String(60), nullable=False, index=True)
    severity = Column(String(20), nullable=False, index=True) # GREEN, YELLOW, ORANGE, RED
    status = Column(String(30), default=EmergencyEventStatus.DETECTED, index=True)
    
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    root_cause = Column(String(250), nullable=True)
    detection_timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    
    # Evidence & telemetry grounding (counts, density, surge velocities)
    supporting_measurements = Column(JSON, nullable=False)
    data_source = Column(String(80), default="YOLOv8-CCTV-CALIBRATED")
    confidence_level = Column(Float, default=0.95)
    verification_status = Column(String(40), default="AUTOMATED_DETECTION") # AUTOMATED_DETECTION, CONFIRMED_BY_ADMIN, DISMISSED_FALSE_ALARM, MANUAL_REPORT
    detection_method = Column(String(60), default="DENSITY_THRESHOLD_BREACH")
    
    # Response management & audit
    assigned_personnel = Column(String(150), nullable=True)
    admin_notes = Column(Text, nullable=True)
    dismissal_reason = Column(Text, nullable=True)
    resolution_notes = Column(Text, nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        Index("idx_emergency_temple_severity", "temple_id", "severity", "status"),
    )

class EmergencyRoute(Base):
    """Verified evacuation corridors, ambulance turnaround bays, and diversion pathways."""
    __tablename__ = "emergency_routes"

    id = Column(Integer, primary_key=True, index=True)
    temple_id = Column(String(50), ForeignKey("temples.temple_id"), nullable=False, index=True)
    route_code = Column(String(60), nullable=False, index=True)
    name = Column(String(150), nullable=False)
    from_zone_code = Column(String(60), nullable=False)
    to_exit_or_facility = Column(String(150), nullable=False)
    route_type = Column(String(50), default="PRIMARY_EVACUATION") # PRIMARY_EVACUATION, AMBULANCE_CORRIDOR, SECONDARY_DIVERSION, RESTRICTED_ACCESS
    pathway_coordinates = Column(JSON, nullable=False) # [[lng, lat], ...]
    length_meters = Column(Float, nullable=False)
    clearance_width_meters = Column(Float, default=6.0)
    surface_type = Column(String(60), default="Granite Paver Corridor")
    is_wheelchair_accessible = Column(Boolean, default=True)
    is_currently_open = Column(Boolean, default=True)
    current_hazard_status = Column(String(50), default="CLEAR") # CLEAR, CONGESTED, BLOCKED, RESTRICTED
    connected_hospital_id = Column(Integer, nullable=True)
    verification_source = Column(String(100), default="SRC-OSM-2026")
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index("idx_route_temple_type", "temple_id", "route_type"),
    )

class EmergencyAuditLog(Base):
    """Immutable audit trail of administrator actions, reviews, and event status transitions."""
    __tablename__ = "emergency_audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("emergency_events.id"), nullable=False, index=True)
    action_type = Column(String(50), nullable=False) # DETECTED, REVIEWED, CONFIRMED, DISMISSED, ASSIGNED, RESOLVED, NOTE_ADDED
    performed_by = Column(String(100), nullable=False)
    previous_status = Column(String(30), nullable=True)
    new_status = Column(String(30), nullable=False)
    notes = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
