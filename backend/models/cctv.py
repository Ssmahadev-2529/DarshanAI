from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Index, JSON
from backend.database import Base

class CCTVCamera(Base):
    __tablename__ = "cctv_cameras"

    id = Column(Integer, primary_key=True, index=True)
    camera_id = Column(String(50), unique=True, index=True, nullable=False) # e.g. CAM-001
    temple_id = Column(String(50), index=True, nullable=False)
    name = Column(String(150), nullable=False)
    zone_code = Column(String(50), nullable=False) # e.g. main_entrance, queue_area, darshan_hall, prasadam_area, exit_gates
    source_type = Column(String(50), default="TEST_VIDEO") # RTSP, IP_CAMERA, TEST_VIDEO, RECORDED_FOOTAGE
    stream_url = Column(String(300), nullable=True) # Protected/Sanitized
    status = Column(String(30), default="ONLINE") # ONLINE, OFFLINE, CONNECTING
    fps = Column(Float, default=15.0)
    resolution = Column(String(50), default="1280x720")
    
    # Advanced Spatial & Calibration Attributes (Phase 8 Architecture)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    orientation_deg = Column(Float, default=0.0) # Angle relative to True North (0-360)
    fov_deg = Column(Float, default=75.0) # Field of View in degrees
    coverage_area_sqm = Column(Float, default=350.0) # Estimated ground footprint
    coverage_polygon = Column(JSON, nullable=True) # GeoJSON or local ground footprint coordinates
    is_authorized = Column(Boolean, default=True)
    calibration_status = Column(String(30), default="CALIBRATED") # CALIBRATED, APPROXIMATE, UNAVAILABLE
    calibration_metadata = Column(JSON, nullable=True) # Homography / pixel-to-meter scaling factors
    
    # Real-Time Telemetry Snapshot
    last_observation_time = Column(DateTime, default=datetime.utcnow)
    last_person_count = Column(Integer, default=0)
    last_density_level = Column(String(30), default="LOW")
    
    created_at = Column(DateTime, default=datetime.utcnow)

class LiveCrowdMeasurement(Base):
    __tablename__ = "live_crowd_measurements"

    id = Column(Integer, primary_key=True, index=True)
    temple_id = Column(String(50), index=True, nullable=False)
    zone_code = Column(String(50), index=True, nullable=False)
    camera_id = Column(String(50), index=True, nullable=True)
    person_count = Column(Integer, default=0, nullable=False)
    entry_rate = Column(Integer, default=0) # people/min
    exit_rate = Column(Integer, default=0)  # people/min
    density_percent = Column(Float, default=0.0)
    risk_level = Column(String(20), default="LOW") # LOW, MODERATE, HIGH, CRITICAL
    movement_direction = Column(String(50), default="NORMAL_INFLOW")
    is_restricted_breach = Column(Boolean, default=False)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)

    __table_args__ = (
        Index("idx_crowd_temple_zone_time", "temple_id", "zone_code", "timestamp"),
    )

class SimulationRun(Base):
    __tablename__ = "simulation_runs"

    id = Column(Integer, primary_key=True, index=True)
    temple_id = Column(String(50), index=True, nullable=False)
    scenario_name = Column(String(100), nullable=False)
    base_crowd = Column(Integer, nullable=False)
    arrival_rate = Column(Integer, nullable=False)
    counters = Column(Integer, nullable=False)
    duration_min = Column(Integer, default=30)
    result_crowd = Column(Integer, nullable=False)
    result_queue = Column(Integer, nullable=False)
    result_wait_min = Column(Float, nullable=False)
    result_risk = Column(String(20), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
