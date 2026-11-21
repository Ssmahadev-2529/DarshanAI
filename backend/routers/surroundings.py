from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models.temple import Temple
from backend.services.surroundings_service import SurroundingsService

router = APIRouter(prefix="/temples", tags=["Surroundings & Mobility Intelligence"])

def _find_temple_or_404(temple_id: str, db: Session) -> Temple:
    temple = db.query(Temple).filter((Temple.temple_id == temple_id) | (Temple.id == temple_id)).first()
    if not temple:
        raise HTTPException(status_code=404, detail=f"Temple '{temple_id}' not found.")
    return temple

@router.get("/{temple_id}/roads")
def get_temple_roads(temple_id: str, db: Session = Depends(get_db)):
    """Retrieve verified road network, Mada streets, pedestrian corridors, and access routes with data honesty."""
    temple = _find_temple_or_404(temple_id, db)
    return SurroundingsService.get_temple_roads(temple, db)

@router.get("/{temple_id}/traffic")
def get_temple_traffic(temple_id: str, db: Session = Depends(get_db)):
    """Evaluate road traffic conditions, design capacities, and congestion risks grounded strictly in verified geometry and darshan schedules."""
    temple = _find_temple_or_404(temple_id, db)
    return SurroundingsService.get_temple_traffic(temple, db)

@router.get("/{temple_id}/parking")
def get_temple_parking(temple_id: str, db: Session = Depends(get_db)):
    """Retrieve verified parking facilities, capacity metrics, and estimated space availability with transparent provenance."""
    temple = _find_temple_or_404(temple_id, db)
    return SurroundingsService.get_temple_parking(temple, db)

@router.get("/{temple_id}/transport")
def get_temple_transport(temple_id: str, db: Session = Depends(get_db)):
    """Retrieve verified transit hubs, railway stations, bus stands, and airport connectivity nodes."""
    temple = _find_temple_or_404(temple_id, db)
    return SurroundingsService.get_temple_transport(temple, db)

@router.get("/{temple_id}/nearby-facilities")
def get_nearby_facilities(
    temple_id: str,
    facility_type: Optional[str] = Query(None, description="Optional filter by facility category (e.g. HOSPITAL, POLICE_STATION, FIRE_STATION)"),
    radius_meters: Optional[int] = Query(5000, description="Radius in meters to search within (e.g. 500, 1000, 2000, 5000)"),
    db: Session = Depends(get_db)
):
    """Retrieve verified public emergency facilities, hospitals, police aid posts, and amenities within a specified radius."""
    temple = _find_temple_or_404(temple_id, db)
    return SurroundingsService.get_nearby_facilities(temple, facility_type=facility_type, radius_meters=radius_meters, db=db)

@router.get("/{temple_id}/accessibility")
def get_accessibility_analysis(temple_id: str, db: Session = Depends(get_db)):
    """Perform comprehensive accessibility, walkability, barrier-free access, and emergency vehicle corridor analysis."""
    temple = _find_temple_or_404(temple_id, db)
    return SurroundingsService.get_accessibility_analysis(temple, db)

@router.get("/{temple_id}/surrounding-analytics")
def get_surrounding_analytics(temple_id: str, db: Session = Depends(get_db)):
    """Generate AI-driven mobility intelligence: hourly demand curves, mode share, bottleneck hotspots, and festival surge multipliers."""
    temple = _find_temple_or_404(temple_id, db)
    return SurroundingsService.get_surrounding_analytics(temple, db)
