from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, JSON, Index, Text
from backend.database import Base

class AIConversation(Base):
    """Conversational session for the GenAI Temple Analytics Assistant."""
    __tablename__ = "ai_conversations"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(String(60), unique=True, index=True, nullable=False)
    temple_id = Column(String(50), nullable=True, index=True)
    title = Column(String(200), default="Temple Analytics Consultation")
    user_id = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class AIMessage(Base):
    """Individual user or assistant turns with grounding metadata and citations."""
    __tablename__ = "ai_messages"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(String(60), ForeignKey("ai_conversations.conversation_id"), nullable=False, index=True)
    role = Column(String(20), nullable=False) # 'user', 'assistant', 'system'
    content = Column(Text, nullable=False)
    
    # Grounding & provenance metadata
    intent_detected = Column(String(60), nullable=True)
    entities_extracted = Column(JSON, nullable=True)
    sources_cited = Column(JSON, nullable=True) # list of authoritative sources referenced
    supporting_data = Column(JSON, nullable=True) # key statistics, timestamps, zone codes
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)

class AIQueryLog(Base):
    """Audit log of natural language analytical queries, latencies, and execution success."""
    __tablename__ = "ai_query_logs"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(String(60), nullable=True, index=True)
    user_id = Column(Integer, nullable=True)
    query_text = Column(Text, nullable=False)
    intent = Column(String(60), nullable=False)
    temple_id = Column(String(50), nullable=True)
    zone_code = Column(String(60), nullable=True)
    execution_time_ms = Column(Float, nullable=False)
    success = Column(Boolean, default=True)
    model_used = Column(String(60), default="DARSHAN-GROUNDED-ENGINE")
    created_at = Column(DateTime, default=datetime.utcnow)
