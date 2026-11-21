from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Text, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from backend.database import Base

class TempleFestival(Base):
    """Official temple festival and special event catalog with verification metadata."""
    __tablename__ = "temple_festivals"

    id = Column(Integer, primary_key=True, index=True)
    festival_id = Column(String(50), unique=True, index=True, nullable=False) # e.g. FEST-SOM-001
    temple_id = Column(String(50), ForeignKey("temples.temple_id"), index=True, nullable=False)
    name = Column(String(200), nullable=False)
    category = Column(String(50), nullable=False) # ANNUAL_FESTIVAL, RELIGIOUS_CELEBRATION, SPECIAL_DARSHAN, SEASONAL_POOJA
    
    start_date = Column(String(20), nullable=False) # YYYY-MM-DD
    end_date = Column(String(20), nullable=False)   # YYYY-MM-DD
    tithi_description = Column(String(200), nullable=True) # e.g. Magha Krishna Chaturdashi
    description = Column(Text, nullable=True)
    
    # Official Source & Verification
    official_source = Column(String(100), nullable=False) # e.g. SRC-SOMNATH-TRUST, SRC-TTD-OFFICIAL
    verification_status = Column(String(30), default="OFFICIALLY_VERIFIED") # OFFICIALLY_VERIFIED, UNVERIFIED_CALENDAR
    verified_by = Column(String(100), default="TEMPLE_ADMIN")
    verification_timestamp = Column(DateTime, default=datetime.utcnow)
    
    # Attendance & Footfall Estimates
    expected_attendance = Column(Integer, default=50000)
    historical_attendance_avg = Column(Integer, default=45000)
    peak_surge_multiplier = Column(Float, default=3.5) # e.g. 3.5x normal daily average
    
    # Operational Details (Stored as JSON / serialized text)
    associated_zone_codes = Column(Text, nullable=True) # JSON list e.g. ["ZONE-SOM-01", "ZONE-SOM-02"]
    special_arrangements = Column(Text, nullable=True) # JSON object: extra queues, buggy services, water stations, special darshan timings
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    historical_records = relationship("FestivalHistoricalRecord", back_populates="festival", cascade="all, delete-orphan")
    predictions = relationship("FestivalPrediction", back_populates="festival", cascade="all, delete-orphan")


class FestivalHistoricalRecord(Base):
    """Empirical past attendance and crowd observations during festival occurrences."""
    __tablename__ = "festival_historical_records"

    id = Column(Integer, primary_key=True, index=True)
    record_id = Column(String(50), unique=True, index=True, nullable=False)
    festival_id = Column(String(50), ForeignKey("temple_festivals.festival_id"), index=True, nullable=False)
    year = Column(Integer, nullable=False) # e.g. 2023, 2024, 2025
    
    actual_footfall = Column(Integer, nullable=False)
    peak_hour_count = Column(Integer, nullable=False)
    peak_hour_window = Column(String(50), default="06:00 - 09:00")
    max_queue_wait_minutes = Column(Integer, default=180) # in minutes
    baseline_normal_wait_minutes = Column(Integer, default=35)
    
    parking_overflow_occurred = Column(Boolean, default=False)
    temporary_holding_zones_used = Column(Boolean, default=True)
    incident_count = Column(Integer, default=0)
    data_source = Column(String(100), default="OFFICIAL_ENTRY_LOG")
    notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    festival = relationship("TempleFestival", back_populates="historical_records")


class FestivalPrediction(Base):
    """Model-generated crowd surge forecasts and queue projections for upcoming festivals."""
    __tablename__ = "festival_predictions"

    id = Column(Integer, primary_key=True, index=True)
    prediction_id = Column(String(50), unique=True, index=True, nullable=False)
    festival_id = Column(String(50), ForeignKey("temple_festivals.festival_id"), index=True, nullable=False)
    forecast_year = Column(Integer, nullable=False)
    
    predicted_attendance_min = Column(Integer, nullable=False)
    predicted_attendance_max = Column(Integer, nullable=False)
    predicted_peak_hour = Column(String(50), default="07:00 - 10:00")
    predicted_max_wait_minutes = Column(Integer, default=240)
    
    surge_risk_category = Column(String(30), default="HIGH") # MODERATE, HIGH, CRITICAL_SURGE
    model_name = Column(String(100), default="RandomForestSurgeRegressor_v2")
    confidence_score = Column(Float, default=0.91)
    feature_weights = Column(Text, nullable=True) # JSON weights: historical_avg, holiday_factor, weather_favorable
    
    generated_at = Column(DateTime, default=datetime.utcnow)

    festival = relationship("TempleFestival", back_populates="predictions")
