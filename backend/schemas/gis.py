from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

class DataSourceResponse(BaseModel):
    id: int
    source_code: str
    name: str
    source_url: Optional[str] = None
    licence: str
    collection_date: datetime
    last_updated_date: datetime
    verification_status: str
    data_classification: str
    confidence_level: float
    description: Optional[str] = None

    class Config:
        from_attributes = True

class TempleLocationResponse(BaseModel):
    temple_id: str
    formatted_address: str
    village_town: Optional[str] = None
    district: str
    state: str
    country: str
    postal_code: str
    latitude: float
    longitude: float
    elevation_meters: Optional[float] = None
    bounding_box: Optional[List[float]] = None
    data_classification: str
    confidence_level: float
    source: Optional[DataSourceResponse] = None

    class Config:
        from_attributes = True

class TempleBoundaryResponse(BaseModel):
    id: int
    temple_id: str
    boundary_type: str
    name: str
    coordinates_geojson: List[Any]
    area_sq_meters: Optional[float] = None
    perimeter_meters: Optional[float] = None
    data_classification: str
    is_verified: bool

    class Config:
        from_attributes = True

class TempleBuildingResponse(BaseModel):
    id: int
    temple_id: str
    building_code: str
    name: str
    building_type: str
    latitude: float
    longitude: float
    footprint_geojson: Optional[Any] = None
    height_meters: Optional[float] = None
    floors: int = 1
    capacity: int = 1000
    architectural_style: Optional[str] = None
    construction_period: Optional[str] = None
    data_classification: str
    is_verified: bool

    class Config:
        from_attributes = True

class SurroundingFacilityResponse(BaseModel):
    id: int
    temple_id: str
    facility_type: str
    name: str
    latitude: float
    longitude: float
    distance_meters: int
    straight_line_distance_meters: Optional[int] = None
    contact_phone: Optional[str] = None
    operating_hours: str
    address: Optional[str] = None
    bed_capacity: Optional[int] = None
    data_classification: str
    is_verified: bool

    class Config:
        from_attributes = True

class TransportLocationResponse(BaseModel):
    id: int
    temple_id: str
    transport_type: str
    name: str
    latitude: float
    longitude: float
    distance_meters: int
    straight_line_distance_meters: Optional[int] = None
    parking_capacity: Optional[int] = None
    contact_number: Optional[str] = None
    data_classification: str
    is_verified: bool

    class Config:
        from_attributes = True

class GeographicalFeatureResponse(BaseModel):
    id: int
    temple_id: str
    feature_type: str
    name: str
    geometry_type: str
    geometry_geojson: Any
    width_meters: Optional[float] = None
    surface_type: Optional[str] = None
    pedestrian_only: bool = False
    data_classification: str
    is_verified: bool

    class Config:
        from_attributes = True

class Temple3DAssetResponse(BaseModel):
    id: int
    temple_id: str
    asset_name: str
    asset_type: str
    file_path_or_url: Optional[str] = None
    lod_level: str
    polygon_count: Optional[int] = None
    status: str
    verification_status: str
    data_classification: str
    notes: Optional[str] = None

    class Config:
        from_attributes = True

class DataQualityReportResponse(BaseModel):
    temple_id: str
    last_sync_time: datetime
    total_features_count: int
    verified_features_count: int
    unverified_features_count: int
    unavailable_features_count: int
    completeness_score: float
    spatial_coverage_rating: str
    data_freshness_status: str
    missing_fields_summary: Optional[Dict[str, Any]] = None
    provenance_summary: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True

class TempleGeographyResponse(BaseModel):
    temple_id: str
    temple_name: str
    center_coordinates: Dict[str, float]
    boundaries: List[TempleBoundaryResponse]
    buildings: List[TempleBuildingResponse]
    features: List[GeographicalFeatureResponse]
    data_classification: str
    total_geographical_elements: int

class TempleSurroundingsResponse(BaseModel):
    temple_id: str
    temple_name: str
    emergency_facilities: List[SurroundingFacilityResponse]
    transport_nodes: List[TransportLocationResponse]
    hospitals_count: int
    police_stations_count: int
    railway_stations_count: int
    bus_terminals_count: int
    parking_lots_count: int
    total_parking_capacity: int
    data_classification: str
