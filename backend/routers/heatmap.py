from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional, Dict, Any, List
from backend.services.heatmap_service import heatmap_service

router = APIRouter(tags=["Spatial Crowd Heatmap Engine"])

@router.get("/temples/{temple_id}/heatmap")
def get_temple_heatmap(
    temple_id: str
):
    """
    Get current observed spatial crowd heatmap state for all zones and surroundings of a temple.
    Includes density (count / usable area), verified capacity utilization, queue status, and risk level.
    """
    return heatmap_service.get_current_heatmap(temple_id)

@router.get("/temples/{temple_id}/heatmap/history")
def get_temple_heatmap_history(
    temple_id: str,
    timestamp: Optional[str] = Query(None, description="ISO timestamp for historical replay"),
    hour: Optional[int] = Query(None, ge=0, le=23, description="Hour of the day (0-23) for replay")
):
    """
    Get historical crowd heatmap distribution for a specific timestamp or hour.
    Clearly categorized as HISTORICAL_OBSERVATION.
    """
    return heatmap_service.get_historical_heatmap(temple_id, timestamp_str=timestamp, hour=hour)

@router.get("/temples/{temple_id}/heatmap/predictions")
def get_temple_heatmap_predictions(
    temple_id: str
):
    """
    Get multi-horizon (+15m, +30m, +60m) predicted crowd heatmap states with confidence scores.
    Clearly categorized as MODEL_PREDICTION with generation and target timestamps.
    """
    return heatmap_service.get_heatmap_predictions(temple_id)

@router.get("/zones/{zone_id}/crowd-details")
def get_zone_crowd_details(
    zone_id: str
):
    """
    Get comprehensive spatial telemetry, verified usable area, capacity utilization,
    connected CCTV cameras, and methodology for a specific zone.
    """
    res = heatmap_service.get_zone_crowd_details(zone_id)
    if "error" in res:
        raise HTTPException(status_code=404, detail=res["error"])
    return res

@router.get("/zones/{zone_id}/crowd-history")
def get_zone_crowd_history(
    zone_id: str,
    days: int = Query(1, ge=1, le=7)
):
    """
    Get hourly historical visitor and density trend for an individual zone.
    """
    return heatmap_service.get_zone_crowd_history(zone_id, days=days)

@router.get("/zones/{zone_id}/crowd-forecast")
def get_zone_crowd_forecast(
    zone_id: str
):
    """
    Get multi-horizon future crowd forecast (+15m, +30m, +60m) specifically for this zone.
    """
    details = heatmap_service.get_zone_crowd_details(zone_id)
    if "error" in details:
        raise HTTPException(status_code=404, detail=details["error"])
    return {
        "zone_id": zone_id,
        "name": details.get("name"),
        "current_count": details.get("current_observation", {}).get("observed_people_count", 0),
        "predictions": details.get("predictions", {}),
        "data_category": "MODEL_PREDICTION"
    }
