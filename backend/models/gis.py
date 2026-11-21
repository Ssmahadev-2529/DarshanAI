from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, JSON, Index, Text
from backend.database import Base

class DataClassification:
    VERIFIED_OFFICIAL = "VERIFIED_OFFICIAL"
    VERIFIED_OPEN_DATA = "VERIFIED_OPEN_DATA"
    REAL_TIME = "REAL_TIME"
    HISTORICAL = "HISTORICAL"
    ESTIMATED = "ESTIMATED"
    SIMULATED = "SIMULATED"
    UNAVAILABLE = "UNAVAILABLE"

class DataSource(Base):
    """Registry of authoritative geographical, architectural, and operational data sources."""
    __tablename__ = "data_sources"

    id = Column(Integer, primary_key=True, index=True)
    source_code = Column(String(80), unique=True, index=True, nullable=False) # e.g. SRC-OSM-NOMINATIM, SRC-TTD-OFFICIAL
    name = Column(String(200), nullable=False)
    source_url = Column(String(400), nullable=True)
    licence = Column(String(150), default="Open Database License (ODbL)")
    collection_date = Column(DateTime, default=datetime.utcnow)
    last_updated_date = Column(DateTime, default=datetime.utcnow)
    verification_status = Column(String(50), default="VERIFIED") # VERIFIED, COMMUNITY_AUDITED, UNVERIFIED, UNAVAILABLE
    data_classification = Column(String(50), default=DataClassification.VERIFIED_OPEN_DATA)
    confidence_level = Column(Float, default=0.95) # 0.0 - 1.0 scale
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class TempleLocation(Base):
    """Verified geographic coordinates, administrative hierarchy, and elevation for temples."""
    __tablename__ = "temple_locations"

    id = Column(Integer, primary_key=True, index=True)
    temple_id = Column(String(50), ForeignKey("temples.temple_id"), unique=True, nullable=False, index=True)
    formatted_address = Column(String(350), nullable=False)
    village_town = Column(String(100), nullable=True)
    district = Column(String(100), nullable=False)
    state = Column(String(100), nullable=False)
    country = Column(String(100), default="India")
    postal_code = Column(String(20), nullable=False)
    latitude = Column(Float, nullable=False, index=True)
    longitude = Column(Float, nullable=False, index=True)
    elevation_meters = Column(Float, nullable=True)
    bounding_box = Column(JSON, nullable=True) # [min_lat, min_lon, max_lat, max_lon]
    
    source_id = Column(Integer, ForeignKey("data_sources.id"), nullable=True)
    data_classification = Column(String(50), default=DataClassification.VERIFIED_OPEN_DATA)
    confidence_level = Column(Float, default=0.95)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class TempleBoundary(Base):
    """Verified polygon boundaries of temple complexes, inner sanctums, and security cordons."""
    __tablename__ = "temple_boundaries"

    id = Column(Integer, primary_key=True, index=True)
    temple_id = Column(String(50), ForeignKey("temples.temple_id"), nullable=False, index=True)
    boundary_type = Column(String(50), default="MAIN_CAMPUS") # MAIN_CAMPUS, INNER_SANCTUM_COMPLEX, OUTER_CORDON, BUFFER_ZONE
    name = Column(String(150), nullable=False)
    coordinates_geojson = Column(JSON, nullable=False) # GeoJSON Polygon coordinates [[lng, lat], ...]
    area_sq_meters = Column(Float, nullable=True)
    perimeter_meters = Column(Float, nullable=True)
    
    source_id = Column(Integer, ForeignKey("data_sources.id"), nullable=True)
    data_classification = Column(String(50), default=DataClassification.VERIFIED_OPEN_DATA)
    is_verified = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class TempleBuilding(Base):
    """Verified individual temple buildings, sanctums, mandapams, gopurams, and halls."""
    __tablename__ = "temple_buildings"

    id = Column(Integer, primary_key=True, index=True)
    temple_id = Column(String(50), ForeignKey("temples.temple_id"), nullable=False, index=True)
    building_code = Column(String(80), nullable=False, index=True)
    name = Column(String(150), nullable=False)
    building_type = Column(String(60), nullable=False) # SANCTUM, GOPURAM, MANDAPAM, TANK_PUSHKARINI, QUEUE_COMPLEX, PRASADAM_HALL, ADMIN_BLOCK, DISPENSARY
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    footprint_geojson = Column(JSON, nullable=True)
    height_meters = Column(Float, nullable=True)
    floors = Column(Integer, default=1)
    capacity = Column(Integer, default=1000)
    architectural_style = Column(String(100), nullable=True) # Dravidian, Chalukya / Solanki, Nagara, etc.
    construction_period = Column(String(100), nullable=True)
    
    source_id = Column(Integer, ForeignKey("data_sources.id"), nullable=True)
    data_classification = Column(String(50), default=DataClassification.VERIFIED_OFFICIAL)
    is_verified = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index("idx_building_temple_code", "temple_id", "building_code"),
    )

class SurroundingFacility(Base):
    """Verified emergency, medical, police, and security facilities within the temple impact zone."""
    __tablename__ = "surrounding_facilities"

    id = Column(Integer, primary_key=True, index=True)
    temple_id = Column(String(50), ForeignKey("temples.temple_id"), nullable=False, index=True)
    facility_type = Column(String(60), nullable=False, index=True) # HOSPITAL, POLICE_STATION, FIRE_STATION, FIRST_AID_POST, PHARMACY, EMERGENCY_SHELTER
    name = Column(String(150), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    distance_meters = Column(Integer, nullable=False) # Direct geodesic distance to temple
    contact_phone = Column(String(40), nullable=True)
    operating_hours = Column(String(80), default="24x7 Emergency")
    address = Column(String(250), nullable=True)
    bed_capacity = Column(Integer, nullable=True)
    
    source_id = Column(Integer, ForeignKey("data_sources.id"), nullable=True)
    data_classification = Column(String(50), default=DataClassification.VERIFIED_OPEN_DATA)
    is_verified = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index("idx_facility_temple_type", "temple_id", "facility_type"),
    )

class TransportLocation(Base):
    """Verified transport connectivity nodes, railway stations, bus stands, and parking complexes."""
    __tablename__ = "transport_locations"

    id = Column(Integer, primary_key=True, index=True)
    temple_id = Column(String(50), ForeignKey("temples.temple_id"), nullable=False, index=True)
    transport_type = Column(String(60), nullable=False, index=True) # RAILWAY_STATION, BUS_TERMINAL, AIRPORT, PARKING_LOT, TAXI_STAND, GHAT_ROAD_ENTRY
    name = Column(String(150), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    distance_meters = Column(Integer, nullable=False)
    parking_capacity = Column(Integer, nullable=True)
    contact_number = Column(String(40), nullable=True)
    
    source_id = Column(Integer, ForeignKey("data_sources.id"), nullable=True)
    data_classification = Column(String(50), default=DataClassification.VERIFIED_OPEN_DATA)
    is_verified = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index("idx_transport_temple_type", "temple_id", "transport_type"),
    )

class GeographicalFeature(Base):
    """Verified natural and man-made geographical surroundings (Mada streets, rivers, hills, car streets)."""
    __tablename__ = "geographical_features"

    id = Column(Integer, primary_key=True, index=True)
    temple_id = Column(String(50), ForeignKey("temples.temple_id"), nullable=False, index=True)
    feature_type = Column(String(60), nullable=False, index=True) # MADA_STREET, SURROUNDING_ROAD, PEDESTRIAN_PATHWAY, RIVER, WATER_TANK, HILL
    name = Column(String(150), nullable=False)
    geometry_type = Column(String(40), default="LineString") # LineString, Polygon, Point
    geometry_geojson = Column(JSON, nullable=False)
    width_meters = Column(Float, nullable=True)
    surface_type = Column(String(60), nullable=True) # Asphalt, Granite Paver, Natural Stone, River Water
    pedestrian_only = Column(Boolean, default=False)
    
    source_id = Column(Integer, ForeignKey("data_sources.id"), nullable=True)
    data_classification = Column(String(50), default=DataClassification.VERIFIED_OPEN_DATA)
    is_verified = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Temple3DAsset(Base):
    """Catalogue and metadata of 3D digital twin assets, spatial models, and photogrammetry packages."""
    __tablename__ = "temple_3d_assets"

    id = Column(Integer, primary_key=True, index=True)
    temple_id = Column(String(50), ForeignKey("temples.temple_id"), nullable=False, index=True)
    asset_name = Column(String(150), nullable=False)
    asset_type = Column(String(60), default="GLB_MODEL") # GLB_MODEL, GLTF_SCENE, POINT_CLOUD, TERRAIN_HEIGHTMAP, CAD_DWG
    file_path_or_url = Column(String(300), nullable=True)
    lod_level = Column(String(20), default="LOD0") # LOD0 (Full), LOD1 (Mid), LOD2 (Low)
    polygon_count = Column(Integer, nullable=True)
    status = Column(String(50), default="AVAILABLE") # AVAILABLE, UNDER_CONSTRUCTION, PENDING_PHOTOGRAMMETRY, UNAVAILABLE
    verification_status = Column(String(50), default="VERIFIED_OFFICIAL")
    data_classification = Column(String(50), default=DataClassification.ESTIMATED)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class DataQualityReport(Base):
    """Audit metrics and data coverage analysis for each temple record."""
    __tablename__ = "data_quality_reports"

    id = Column(Integer, primary_key=True, index=True)
    temple_id = Column(String(50), ForeignKey("temples.temple_id"), unique=True, nullable=False, index=True)
    last_sync_time = Column(DateTime, default=datetime.utcnow)
    total_features_count = Column(Integer, default=0)
    verified_features_count = Column(Integer, default=0)
    unverified_features_count = Column(Integer, default=0)
    unavailable_features_count = Column(Integer, default=0)
    completeness_score = Column(Float, default=100.0) # Calculated % (verified / total * 100)
    spatial_coverage_rating = Column(String(40), default="COMPREHENSIVE") # COMPREHENSIVE, HIGH, PARTIAL, MINIMAL
    data_freshness_status = Column(String(40), default="CURRENT_2026") # CURRENT_2026, RECENT, OUTDATED
    missing_fields_summary = Column(JSON, nullable=True)
    provenance_summary = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
