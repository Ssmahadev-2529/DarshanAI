from typing import Optional, List
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, Query, Header
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.services.festival_service import FestivalAnalyticsService
from backend.models.festival import TempleFestival

router = APIRouter(prefix="/festivals", tags=["Festival & Special Event Intelligence"])

class FestivalRegisterRequest(BaseModel):
    temple_id: str
    name: str
    category: str
    start_date: str
    end_date: str
    tithi_description: Optional[str] = None
    description: Optional[str] = None
    official_source: Optional[str] = "TEMPLE_ADMIN_LOG"
    expected_attendance: Optional[int] = 50000
    historical_attendance_avg: Optional[int] = 45000
    peak_surge_multiplier: Optional[float] = 3.5
    associated_zone_codes: Optional[List[str]] = []
    special_arrangements: Optional[dict] = {}

class FestivalVerifyRequest(BaseModel):
    official_source: str
    verified_by: Optional[str] = "TEMPLE_ADMIN"

@router.get("")
def list_festivals(
    temple_id: Optional[str] = Query(None, description="Filter by temple identifier, e.g. TEMPLE-001"),
    category: Optional[str] = Query(None, description="Filter by category e.g. ANNUAL_FESTIVAL, SPECIAL_DARSHAN"),
    verification_status: Optional[str] = Query(None, description="Filter by verification e.g. OFFICIALLY_VERIFIED"),
    db: Session = Depends(get_db)
):
    """Lists verified temple festivals and special events with operational metadata."""
    return FestivalAnalyticsService.get_festivals(
        temple_id=temple_id,
        category=category,
        verification_status=verification_status,
        db=db
    )

@router.get("/upcoming")
def get_upcoming_festivals(
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db)
):
    """Retrieves chronological upcoming festivals across all registered shrines."""
    all_f = FestivalAnalyticsService.get_festivals(db=db)
    return all_f[:limit]

@router.get("/temple/{temple_id}")
def get_temple_festivals(temple_id: str, db: Session = Depends(get_db)):
    """Retrieves all registered festivals for a specific temple."""
    return FestivalAnalyticsService.get_festivals(temple_id=temple_id, db=db)

@router.get("/{festival_id}")
def get_festival(festival_id: str, db: Session = Depends(get_db)):
    """Retrieves full festival specification including empirical historical records and AI surge predictions."""
    res = FestivalAnalyticsService.get_festival_detail(festival_id, db)
    if not res:
        raise HTTPException(status_code=404, detail="Festival record not found")
    return res

@router.get("/{festival_id}/analytics")
def get_festival_analytics(festival_id: str, db: Session = Depends(get_db)):
    """Returns 24-hour hourly influx, queue duration, and parking projection comparing normal day to festival surge."""
    res = FestivalAnalyticsService.get_festival_hourly_analytics(festival_id, db)
    if "error" in res:
        raise HTTPException(status_code=404, detail=res["error"])
    return res

@router.post("")
def register_festival(
    req: FestivalRegisterRequest,
    x_user_role: Optional[str] = Header("TEMPLE_ADMIN", alias="X-User-Role"),
    x_user_id: Optional[str] = Header("admin@darshanai.org", alias="X-User-Id"),
    db: Session = Depends(get_db)
):
    """Registers a new temple festival calendar entry with associated zones and crowd holding provisions."""
    res = FestivalAnalyticsService.register_festival(
        data=req.dict(),
        user_role=x_user_role,
        user_id=x_user_id,
        db=db
    )
    if "error" in res:
        raise HTTPException(status_code=400, detail=res["error"])
    return res

@router.put("/{festival_id}/verify")
def verify_festival(
    festival_id: str,
    req: FestivalVerifyRequest,
    x_user_role: Optional[str] = Header("SUPER_ADMIN", alias="X-User-Role"),
    x_user_id: Optional[str] = Header("superadmin@darshanai.org", alias="X-User-Id"),
    db: Session = Depends(get_db)
):
    """Officially validates festival record against authoritative temple trust publication."""
    res = FestivalAnalyticsService.verify_festival_source(
        festival_id=festival_id,
        official_source=req.official_source,
        user_id=x_user_id,
        user_role=x_user_role,
        db=db
    )
    if "error" in res:
        raise HTTPException(status_code=403, detail=res["error"])
    return res
