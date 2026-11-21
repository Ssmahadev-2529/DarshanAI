import uuid
from typing import Optional, List
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.database import get_db
from backend.services.ai_analytics_service import AIAnalyticsService
from backend.models.ai_assistant import AIConversation, AIMessage

router = APIRouter(prefix="/ai", tags=["GenAI-Powered Natural Language Analytics Assistant"])

class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None
    temple_id: Optional[str] = "TEMPLE-001"

class CreateConversationRequest(BaseModel):
    temple_id: Optional[str] = "TEMPLE-001"
    title: Optional[str] = "Temple Analytics Consultation"

@router.post("/chat")
def chat_turn(req: ChatRequest, db: Session = Depends(get_db)):
    """Conversational question-answering grounded strictly in verified temple analytics and ML predictions."""
    if not req.message or not req.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    conv_id = req.conversation_id or f"conv_{uuid.uuid4().hex[:12]}"
    result = AIAnalyticsService.process_chat_message(
        conversation_id=conv_id,
        user_message=req.message.strip(),
        temple_id=req.temple_id or "TEMPLE-001",
        user_id=None,
        db=db
    )
    return result

@router.get("/conversations")
def list_conversations(
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Retrieve recent AI consultation sessions."""
    convs = db.query(AIConversation).order_by(desc(AIConversation.updated_at)).limit(limit).all()
    return [
        {
            "id": c.id,
            "conversation_id": c.conversation_id,
            "temple_id": c.temple_id,
            "title": c.title,
            "created_at": c.created_at.isoformat() if c.created_at else None,
            "updated_at": c.updated_at.isoformat() if c.updated_at else None
        }
        for c in convs
    ]

@router.get("/conversations/{conversation_id}")
def get_conversation_history(conversation_id: str, db: Session = Depends(get_db)):
    """Retrieve complete message history with cited sources and grounding metadata for a conversation."""
    conv = db.query(AIConversation).filter(AIConversation.conversation_id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation session not found.")

    messages = db.query(AIMessage).filter(
        AIMessage.conversation_id == conversation_id
    ).order_by(AIMessage.timestamp).all()

    return {
        "conversation_id": conv.conversation_id,
        "temple_id": conv.temple_id,
        "title": conv.title,
        "created_at": conv.created_at.isoformat() if conv.created_at else None,
        "messages": [
            {
                "id": m.id,
                "role": m.role,
                "content": m.content,
                "intent_detected": m.intent_detected,
                "sources_cited": m.sources_cited,
                "supporting_data": m.supporting_data,
                "timestamp": m.timestamp.isoformat() if m.timestamp else None
            }
            for m in messages
        ]
    }

@router.post("/conversations")
def create_conversation(req: CreateConversationRequest, db: Session = Depends(get_db)):
    """Initialize a new conversation session for a temple."""
    conv_id = f"conv_{uuid.uuid4().hex[:12]}"
    conv = AIConversation(
        conversation_id=conv_id,
        temple_id=req.temple_id,
        title=req.title or "Temple Analytics Consultation"
    )
    db.add(conv)
    db.commit()
    db.refresh(conv)
    return {
        "conversation_id": conv.conversation_id,
        "temple_id": conv.temple_id,
        "title": conv.title,
        "created_at": conv.created_at.isoformat()
    }
