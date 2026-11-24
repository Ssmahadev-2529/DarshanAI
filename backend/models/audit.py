from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text, JSON, Index
from backend.database import Base

class SystemAuditLog(Base):
    """Immutable audit trail of administrator actions, governance changes, and system operations."""
    __tablename__ = "system_audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True, index=True)
    user_email = Column(String(120), nullable=False, index=True)
    temple_id = Column(String(50), nullable=True, index=True)
    action = Column(String(80), nullable=False, index=True) # e.g. CREATE_TEMPLE, UPDATE_ZONE, RETRAIN_MODEL, CREATE_USER, ROLE_UPDATE, DATA_SOURCE_UPDATE
    target_type = Column(String(60), nullable=False) # TEMPLE, ZONE, USER, CAMERA, ML_MODEL, DATA_SOURCE, FESTIVAL, EMERGENCY
    target_id = Column(String(100), nullable=True)
    details = Column(JSON, nullable=True)
    ip_address = Column(String(60), nullable=True)
    status = Column(String(30), default="SUCCESS")
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)

    __table_args__ = (
        Index("idx_audit_temple_action", "temple_id", "action"),
        Index("idx_audit_user_time", "user_email", "timestamp"),
    )
