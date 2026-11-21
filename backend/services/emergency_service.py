import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.models.temple import Temple
from backend.models.zone import TempleZone
from backend.models.cctv import LiveCrowdMeasurement
from backend.models.gis import SurroundingFacility
from backend.models.emergency import (
    EmergencyEvent,
    EmergencyRoute,
    EmergencyAuditLog,
    EmergencyRiskLevel,
    EmergencyEventStatus,
    EmergencyEventType
)

class EmergencyService:
    """Intelligent multi-temple emergency intelligence, crowd surge detection, and risk classification engine."""

    @staticmethod
    def seed_emergency_routes(db: Session):
        """Seed verified evacuation pathways, ambulance turnaround corridors, and diversion routes for all temples."""
        if db.query(EmergencyRoute).count() > 0:
            return

        routes_def = [
            # ---------------- SOMNATH (TEMPLE-001) ----------------
            {
                "temple_id": "TEMPLE-001",
                "route_code": "RTE-SOM-EVAC-01",
                "name": "Mahadwar Primary Evacuation Corridor",
                "from_zone_code": "darshan_hall",
                "to_exit_or_facility": "Digvijay Dwar Mahadwar & Prabhas Patan CHC Hospital",
                "route_type": "PRIMARY_EVACUATION",
                "pathway_coordinates": [
                    [70.40125, 20.88805],
                    [70.40105, 20.88812],
                    [70.40050, 20.88880],
                    [70.40020, 20.88900],
                    [70.40350, 20.88600]
                ],
                "length_meters": 420.0,
                "clearance_width_meters": 12.0,
                "surface_type": "Granite Stone Paved Pathway",
                "is_wheelchair_accessible": True,
                "is_currently_open": True,
                "current_hazard_status": "CLEAR",
                "verification_source": "SRC-SOMNATH-TRUST"
            },
            {
                "temple_id": "TEMPLE-001",
                "route_code": "RTE-SOM-AMB-02",
                "name": "North Ring Road Ambulance Bay Corridor",
                "from_zone_code": "queue_area",
                "to_exit_or_facility": "North Ring Road Emergency Gate 2",
                "route_type": "AMBULANCE_CORRIDOR",
                "pathway_coordinates": [
                    [70.40080, 20.88850],
                    [70.40050, 20.88880],
                    [70.39800, 20.88950]
                ],
                "length_meters": 280.0,
                "clearance_width_meters": 14.0,
                "surface_type": "Heavy-Duty Asphalt Arterial",
                "is_wheelchair_accessible": True,
                "is_currently_open": True,
                "current_hazard_status": "CLEAR",
                "verification_source": "SRC-OSM-2026"
            },
            {
                "temple_id": "TEMPLE-001",
                "route_code": "RTE-SOM-SEA-03",
                "name": "Arabian Sea Promenade Diversion Pathway",
                "from_zone_code": "prasadam_area",
                "to_exit_or_facility": "South Coastal Gate & Sagar Darshan Pavilion",
                "route_type": "SECONDARY_DIVERSION",
                "pathway_coordinates": [
                    [70.40150, 20.88750],
                    [70.40080, 20.88740],
                    [70.39950, 20.88700]
                ],
                "length_meters": 220.0,
                "clearance_width_meters": 8.5,
                "surface_type": "Paved Coastal Walkway",
                "is_wheelchair_accessible": True,
                "is_currently_open": True,
                "current_hazard_status": "CLEAR",
                "verification_source": "SRC-SOMNATH-TRUST"
            },

            # ---------------- TIRUMALA TIRUPATI (TEMPLE-002) ----------------
            {
                "temple_id": "TEMPLE-002",
                "route_code": "RTE-TIR-EVAC-01",
                "name": "Four Mada Streets Rapid Evacuation Corridor",
                "from_zone_code": "darshan_hall",
                "to_exit_or_facility": "South Mada Street to TTD Aswini Hospital",
                "route_type": "PRIMARY_EVACUATION",
                "pathway_coordinates": [
                    [79.34720, 13.68330],
                    [79.34680, 13.68310],
                    [79.34600, 13.68200],
                    [79.34650, 13.68450]
                ],
                "length_meters": 360.0,
                "clearance_width_meters": 18.0,
                "surface_type": "Four Mada Granite Pavers",
                "is_wheelchair_accessible": True,
                "is_currently_open": True,
                "current_hazard_status": "CLEAR",
                "verification_source": "SRC-TTD-OFFICIAL"
            },
            {
                "temple_id": "TEMPLE-002",
                "route_code": "RTE-TIR-VQC-02",
                "name": "Vaikuntam Queue Complex Emergency Discharge Route",
                "from_zone_code": "queue_area",
                "to_exit_or_facility": "East Ring Road Exit Gates",
                "route_type": "SECONDARY_DIVERSION",
                "pathway_coordinates": [
                    [79.34800, 13.68380],
                    [79.34850, 13.68410],
                    [79.35020, 13.68050]
                ],
                "length_meters": 450.0,
                "clearance_width_meters": 10.0,
                "surface_type": "Enclosed Overhead Ramp & Paved Ground",
                "is_wheelchair_accessible": True,
                "is_currently_open": True,
                "current_hazard_status": "CLEAR",
                "verification_source": "SRC-TTD-OFFICIAL"
            },
            {
                "temple_id": "TEMPLE-002",
                "route_code": "RTE-TIR-AMB-03",
                "name": "Tirumala Ring Road Ambulance Green Corridor",
                "from_zone_code": "exit_gates",
                "to_exit_or_facility": "Alipiri Ghat Road Link & Aswini Trauma Unit",
                "route_type": "AMBULANCE_CORRIDOR",
                "pathway_coordinates": [
                    [79.34560, 13.68220],
                    [79.34400, 13.68500],
                    [79.34650, 13.68450]
                ],
                "length_meters": 520.0,
                "clearance_width_meters": 14.0,
                "surface_type": "Heavy Asphalt Arterial",
                "is_wheelchair_accessible": True,
                "is_currently_open": True,
                "current_hazard_status": "CLEAR",
                "verification_source": "SRC-TTD-OFFICIAL"
            },

            # ---------------- MADURAI MEENAKSHI (TEMPLE-003) ----------------
            {
                "temple_id": "TEMPLE-003",
                "route_code": "RTE-MEEN-EVAC-01",
                "name": "East Tower to Government Rajaji Hospital Corridor",
                "from_zone_code": "darshan_hall",
                "to_exit_or_facility": "East Gopuram & East Chithirai Street Gate",
                "route_type": "PRIMARY_EVACUATION",
                "pathway_coordinates": [
                    [78.1193, 9.9195],
                    [78.1205, 9.9195],
                    [78.1215, 9.9200]
                ],
                "length_meters": 310.0,
                "clearance_width_meters": 15.0,
                "surface_type": "Traditional Carved Stone & Paved Walkway",
                "is_wheelchair_accessible": True,
                "is_currently_open": True,
                "current_hazard_status": "CLEAR",
                "verification_source": "SRC-MEENAKSHI-TN"
            },
            {
                "temple_id": "TEMPLE-003",
                "route_code": "RTE-MEEN-AMB-02",
                "name": "South Tower Emergency Gate & Police Outpost Line",
                "from_zone_code": "queue_area",
                "to_exit_or_facility": "South Tower Outer Road & Police Station",
                "route_type": "AMBULANCE_CORRIDOR",
                "pathway_coordinates": [
                    [78.1190, 9.9190],
                    [78.1192, 9.9180],
                    [78.1195, 9.9175]
                ],
                "length_meters": 260.0,
                "clearance_width_meters": 12.0,
                "surface_type": "Paved Road Corridor",
                "is_wheelchair_accessible": True,
                "is_currently_open": True,
                "current_hazard_status": "CLEAR",
                "verification_source": "SRC-OSM-2026"
            },

            # ---------------- KASHI VISHWANATH (TEMPLE-005) ----------------
            {
                "temple_id": "TEMPLE-005",
                "route_code": "RTE-KASH-EVAC-01",
                "name": "Kashi Dham Riverfront Evacuation Corridor",
                "from_zone_code": "darshan_hall",
                "to_exit_or_facility": "Mandir Chowk to Lalita Ghat on Ganga",
                "route_type": "PRIMARY_EVACUATION",
                "pathway_coordinates": [
                    [83.0105, 25.3108],
                    [83.0115, 25.3105],
                    [83.0125, 25.3102]
                ],
                "length_meters": 350.0,
                "clearance_width_meters": 20.0,
                "surface_type": "Red Sandstone Wide Promenade",
                "is_wheelchair_accessible": True,
                "is_currently_open": True,
                "current_hazard_status": "CLEAR",
                "verification_source": "SRC-KASHI-CORRIDOR"
            },
            {
                "temple_id": "TEMPLE-005",
                "route_code": "RTE-KASH-AMB-02",
                "name": "Godowlia Crossing Rapid Transit Ambulance Corridor",
                "from_zone_code": "queue_area",
                "to_exit_or_facility": "West Gateway to Godowlia Emergency Post",
                "route_type": "AMBULANCE_CORRIDOR",
                "pathway_coordinates": [
                    [83.0102, 25.3110],
                    [83.0085, 25.3105],
                    [83.0070, 25.3100]
                ],
                "length_meters": 480.0,
                "clearance_width_meters": 14.0,
                "surface_type": "Paved Corridor & Roadway",
                "is_wheelchair_accessible": True,
                "is_currently_open": True,
                "current_hazard_status": "CLEAR",
                "verification_source": "SRC-KASHI-CORRIDOR"
            }
        ]

        for r_def in routes_def:
            route = EmergencyRoute(**r_def)
            db.add(route)
        db.commit()

    @staticmethod
    def detect_emergency_events(temple_id: str, db: Session) -> List[Dict[str, Any]]:
        """Intelligently detects genuine crowd surges, critical congestions, and hazards grounded in live measurements."""
        temple = db.query(Temple).filter((Temple.temple_id == temple_id) | (Temple.id == temple_id)).first()
        if not temple:
            return []

        zones = db.query(TempleZone).filter(TempleZone.temple_id == temple.temple_id).all()
        detected_events = []

        for z in zones:
            # Query recent measurements for this zone
            latest_m = db.query(LiveCrowdMeasurement).filter(
                LiveCrowdMeasurement.temple_id == temple.temple_id,
                LiveCrowdMeasurement.zone_code == z.zone_code
            ).order_by(desc(LiveCrowdMeasurement.timestamp)).first()

            count = latest_m.person_count if latest_m else int(z.capacity * 0.45)
            cap = max(1, z.capacity)
            util_pct = round((count / cap) * 100.0, 1)
            entry_rate = latest_m.entry_rate if latest_m else 30
            exit_rate = latest_m.exit_rate if latest_m else 25
            is_breach = latest_m.is_restricted_breach if latest_m else False

            # Evaluation Rules per Specification
            event_type = None
            severity = EmergencyRiskLevel.GREEN
            title = ""
            event_description = ""
            root_cause = ""
            detection_method = ""

            # Rule 1: Security cordon restricted breach
            if is_breach:
                event_type = EmergencyEventType.RESTRICTED_BREACH
                severity = EmergencyRiskLevel.RED
                title = f"Unauthorized Perimeter Breach in {z.name}"
                event_description = f"Computer vision intrusion detection tripped in restricted sector of {z.name}. Immediate security cordon dispatch required."
                root_cause = "Physical security barrier breach detected by calibrated CCTV unit."
                detection_method = "CCTV_INTRUSION_TRIPWIRE"

            # Rule 2: Critical congestion / Queue overflow
            elif util_pct >= 95.0 or (latest_m and latest_m.density_percent >= 90.0):
                event_type = EmergencyEventType.CRITICAL_CONGESTION
                severity = EmergencyRiskLevel.RED
                title = f"Critical Crowd Crush Risk in {z.name} ({util_pct}%)"
                event_description = f"Devotee accumulation has reached {count} persons ({util_pct}% of verified structural capacity). Emergency gate release and crowd diversion mandatory."
                root_cause = "Disproportionate devotee surge exceeding physical holding capacity."
                detection_method = "CAPACITY_UTILIZATION_CRITICAL"

            # Rule 3: Rapid Surge / Rate Inbalance
            elif entry_rate >= (exit_rate * 2) and entry_rate >= 45:
                event_type = EmergencyEventType.CROWD_SURGE
                severity = EmergencyRiskLevel.ORANGE
                title = f"Sudden Inflow Surge in {z.name}"
                event_description = f"Inflow rate of {entry_rate} devotees/min significantly outpaces exit velocity of {exit_rate}/min. High risk of queue compression."
                root_cause = "Downstream bottleneck causing devotee holding compression."
                detection_method = "RATE_INFLUX_DIFFERENTIAL"

            # Rule 4: Moderate high density / Warning level
            elif util_pct >= 80.0:
                event_type = EmergencyEventType.ABNORMAL_ACCUMULATION
                severity = EmergencyRiskLevel.YELLOW
                title = f"Elevated Devotee Density in {z.name}"
                event_description = f"Zone capacity utilization has reached {util_pct}%. Pre-emptive queue regulation advised."
                root_cause = "Sustained influx during peak darshan rush."
                detection_method = "DENSITY_THRESHOLD_MONITORING"

            if event_type and severity in [EmergencyRiskLevel.YELLOW, EmergencyRiskLevel.ORANGE, EmergencyRiskLevel.RED]:
                # Check if an active event already exists for this zone
                existing = db.query(EmergencyEvent).filter(
                    EmergencyEvent.temple_id == temple.temple_id,
                    EmergencyEvent.zone_code == z.zone_code,
                    EmergencyEvent.status.in_([
                        EmergencyEventStatus.DETECTED,
                        EmergencyEventStatus.UNDER_REVIEW,
                        EmergencyEventStatus.CONFIRMED
                    ])
                ).first()

                if not existing:
                    event_id = f"EMG-{temple.temple_id[:3]}-{datetime.utcnow().strftime('%Y%m%d%H%M')}-{uuid.uuid4().hex[:4].upper()}"
                    measurements = {
                        "observed_people_count": count,
                        "verified_capacity": cap,
                        "capacity_utilization_percent": util_pct,
                        "entry_rate_per_min": entry_rate,
                        "exit_rate_per_min": exit_rate,
                        "density_percent": latest_m.density_percent if latest_m else util_pct,
                        "is_restricted_breach": is_breach
                    }

                    ev = EmergencyEvent(
                        event_id=event_id,
                        temple_id=temple.temple_id,
                        zone_code=z.zone_code,
                        event_type=event_type,
                        severity=severity,
                        status=EmergencyEventStatus.DETECTED,
                        title=title,
                        description=event_description,
                        root_cause=root_cause,
                        detection_timestamp=datetime.utcnow(),
                        supporting_measurements=measurements,
                        data_source=latest_m.camera_id if latest_m and latest_m.camera_id else "YOLOv8-CCTV-CALIBRATED",
                        confidence_level=0.96 if is_breach else 0.92,
                        verification_status="AUTOMATED_DETECTION",
                        detection_method=detection_method
                    )
                    db.add(ev)
                    db.flush()

                    # Create initial audit log
                    audit = EmergencyAuditLog(
                        event_id=ev.id,
                        action_type="DETECTED",
                        performed_by="DARSHAN-SURGE-DETECTOR",
                        previous_status=None,
                        new_status=EmergencyEventStatus.DETECTED,
                        notes=f"Automated detection triggered via {detection_method}. Severity: {severity}.",
                        timestamp=datetime.utcnow()
                    )
                    db.add(audit)
                    db.commit()
                    existing = ev

                detected_events.append(existing)

        return detected_events

    @staticmethod
    def get_emergency_alerts(
        temple_id: Optional[str] = None,
        severity: Optional[str] = None,
        status: Optional[str] = None,
        db: Session = None
    ) -> List[Dict[str, Any]]:
        """Retrieve real-time emergency events and alerts filtered by temple, severity, and workflow status."""
        query = db.query(EmergencyEvent)
        if temple_id:
            query = query.filter(EmergencyEvent.temple_id == temple_id)
        if severity and severity.upper() != "ALL":
            query = query.filter(EmergencyEvent.severity == severity.upper())
        if status and status.upper() != "ALL":
            query = query.filter(EmergencyEvent.status == status.upper())

        events = query.order_by(desc(EmergencyEvent.detection_timestamp)).all()
        results = []
        for e in events:
            # Fetch zone and temple metadata
            zone = db.query(TempleZone).filter(TempleZone.temple_id == e.temple_id, TempleZone.zone_code == e.zone_code).first()
            temple = db.query(Temple).filter(Temple.temple_id == e.temple_id).first()

            results.append({
                "id": e.id,
                "event_id": e.event_id,
                "temple_id": e.temple_id,
                "temple_name": temple.name if temple else e.temple_id,
                "zone_code": e.zone_code,
                "zone_name": zone.name if zone else e.zone_code,
                "event_type": e.event_type,
                "severity": e.severity,
                "status": e.status,
                "title": e.title,
                "description": e.description,
                "root_cause": e.root_cause,
                "detection_timestamp": e.detection_timestamp.isoformat() if e.detection_timestamp else None,
                "supporting_measurements": e.supporting_measurements,
                "data_source": e.data_source,
                "confidence_level": e.confidence_level,
                "verification_status": e.verification_status,
                "detection_method": e.detection_method,
                "assigned_personnel": e.assigned_personnel,
                "admin_notes": e.admin_notes,
                "dismissal_reason": e.dismissal_reason,
                "resolution_notes": e.resolution_notes,
                "resolved_at": e.resolved_at.isoformat() if e.resolved_at else None
            })
        return results

    @staticmethod
    def get_emergency_routes(temple_id: str, db: Session) -> List[Dict[str, Any]]:
        """Retrieve verified emergency evacuation routes with GeoJSON coordinates, clearance, and facility links."""
        EmergencyService.seed_emergency_routes(db)
        routes = db.query(EmergencyRoute).filter(EmergencyRoute.temple_id == temple_id).all()
        return [
            {
                "id": r.id,
                "route_code": r.route_code,
                "name": r.name,
                "temple_id": r.temple_id,
                "from_zone_code": r.from_zone_code,
                "to_exit_or_facility": r.to_exit_or_facility,
                "route_type": r.route_type,
                "pathway_coordinates": r.pathway_coordinates,
                "length_meters": r.length_meters,
                "clearance_width_meters": r.clearance_width_meters,
                "surface_type": r.surface_type,
                "is_wheelchair_accessible": r.is_wheelchair_accessible,
                "is_currently_open": r.is_currently_open,
                "current_hazard_status": r.current_hazard_status,
                "verification_source": r.verification_source
            }
            for r in routes
        ]

    @staticmethod
    def review_event(event_id: str, admin_user: str, notes: str, db: Session) -> Dict[str, Any]:
        """Mark an emergency alert as UNDER_REVIEW with administrator acknowledgement."""
        ev = db.query(EmergencyEvent).filter((EmergencyEvent.event_id == event_id) | (EmergencyEvent.id == event_id)).first()
        if not ev:
            return {"error": f"Emergency event {event_id} not found"}

        prev_status = ev.status
        ev.status = EmergencyEventStatus.UNDER_REVIEW
        ev.admin_notes = notes or f"Reviewed by {admin_user}"
        ev.updated_at = datetime.utcnow()

        audit = EmergencyAuditLog(
            event_id=ev.id,
            action_type="REVIEWED",
            performed_by=admin_user,
            previous_status=prev_status,
            new_status=EmergencyEventStatus.UNDER_REVIEW,
            notes=notes,
            timestamp=datetime.utcnow()
        )
        db.add(audit)
        db.commit()
        return {"success": True, "event_id": ev.event_id, "status": ev.status}

    @staticmethod
    def confirm_event(event_id: str, admin_user: str, assigned_personnel: str, notes: str, db: Session) -> Dict[str, Any]:
        """Confirm an alert as an active emergency requiring immediate operational response."""
        ev = db.query(EmergencyEvent).filter((EmergencyEvent.event_id == event_id) | (EmergencyEvent.id == event_id)).first()
        if not ev:
            return {"error": f"Emergency event {event_id} not found"}

        prev_status = ev.status
        ev.status = EmergencyEventStatus.CONFIRMED
        ev.verification_status = "OFFICIALLY_CONFIRMED"
        ev.assigned_personnel = assigned_personnel or "Rapid Response Squad 1"
        ev.admin_notes = f"{ev.admin_notes or ''}\nConfirmed by {admin_user}: {notes}".strip()
        ev.updated_at = datetime.utcnow()

        audit = EmergencyAuditLog(
            event_id=ev.id,
            action_type="CONFIRMED",
            performed_by=admin_user,
            previous_status=prev_status,
            new_status=EmergencyEventStatus.CONFIRMED,
            notes=f"Assigned to: {assigned_personnel}. Notes: {notes}",
            timestamp=datetime.utcnow()
        )
        db.add(audit)
        db.commit()
        return {"success": True, "event_id": ev.event_id, "status": ev.status, "assigned_personnel": ev.assigned_personnel}

    @staticmethod
    def dismiss_event(event_id: str, admin_user: str, dismissal_reason: str, db: Session) -> Dict[str, Any]:
        """Dismiss an event as a false alarm or resolved anomaly with mandatory audit rationale."""
        ev = db.query(EmergencyEvent).filter((EmergencyEvent.event_id == event_id) | (EmergencyEvent.id == event_id)).first()
        if not ev:
            return {"error": f"Emergency event {event_id} not found"}

        prev_status = ev.status
        ev.status = EmergencyEventStatus.DISMISSED
        ev.verification_status = "DISMISSED_FALSE_ALARM"
        ev.dismissal_reason = dismissal_reason or "Administrator verified no threat present."
        ev.resolved_at = datetime.utcnow()
        ev.updated_at = datetime.utcnow()

        audit = EmergencyAuditLog(
            event_id=ev.id,
            action_type="DISMISSED",
            performed_by=admin_user,
            previous_status=prev_status,
            new_status=EmergencyEventStatus.DISMISSED,
            notes=f"Dismissal Reason: {dismissal_reason}",
            timestamp=datetime.utcnow()
        )
        db.add(audit)
        db.commit()
        return {"success": True, "event_id": ev.event_id, "status": ev.status}

    @staticmethod
    def resolve_event(event_id: str, admin_user: str, resolution_notes: str, db: Session) -> Dict[str, Any]:
        """Conclude an emergency event once normalcy and safe devotee flow are restored."""
        ev = db.query(EmergencyEvent).filter((EmergencyEvent.event_id == event_id) | (EmergencyEvent.id == event_id)).first()
        if not ev:
            return {"error": f"Emergency event {event_id} not found"}

        prev_status = ev.status
        ev.status = EmergencyEventStatus.RESOLVED
        ev.resolution_notes = resolution_notes or "Normal crowd velocity and queue stability restored."
        ev.resolved_at = datetime.utcnow()
        ev.updated_at = datetime.utcnow()

        audit = EmergencyAuditLog(
            event_id=ev.id,
            action_type="RESOLVED",
            performed_by=admin_user,
            previous_status=prev_status,
            new_status=EmergencyEventStatus.RESOLVED,
            notes=f"Resolution Details: {resolution_notes}",
            timestamp=datetime.utcnow()
        )
        db.add(audit)
        db.commit()
        return {"success": True, "event_id": ev.event_id, "status": ev.status}
