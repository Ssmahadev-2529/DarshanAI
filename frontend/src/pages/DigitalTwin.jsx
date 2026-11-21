import React, { useState, useEffect, useContext, useRef, useMemo } from 'react';
import API from '../services/api';
import { AuthContext } from '../context/AuthContext';
import Loading from '../components/Loading';
import HolographicCanvas from '../components/digitaltwin/HolographicCanvas';
import BuildingInfoPanel from '../components/digitaltwin/BuildingInfoPanel';
import DigitalTwinControls from '../components/digitaltwin/DigitalTwinControls';
import NavigationLevelBar, { NAV_LEVELS } from '../components/digitaltwin/NavigationLevelBar';
import { ClassificationBadge } from './DataQualityDashboard';
import { 
  Boxes, 
  Building2, 
  Compass, 
  Sparkles, 
  Layers, 
  MapPin, 
  RefreshCw, 
  ShieldCheck, 
  Maximize2,
  Info,
  Activity,
  HeartPulse,
  Navigation,
  Car
} from 'lucide-react';

const DigitalTwinPage = () => {
  const { user } = useContext(AuthContext);

  const [allTemples, setAllTemples] = useState([]);
  const [selectedTempleId, setSelectedTempleId] = useState(user?.temple_id || 'TEMPLE-001');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Active Temple Datasets (Phase 4 Extended Spatial Foundation)
  const [temple, setTemple] = useState(null);
  const [buildings, setBuildings] = useState([]);
  const [boundary, setBoundary] = useState(null);
  const [zones, setZones] = useState([]);
  const [roads, setRoads] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [transport, setTransport] = useState([]);
  const [parking, setParking] = useState([]);

  // Phase 5 Multi-Level Navigation State
  // 1: REGIONAL VIEW, 2: TEMPLE CAMPUS, 3: BUILDING VIEW, 4: OPERATIONAL ZONE, 5: INTERIOR / FLOOR
  const [navLevel, setNavLevel] = useState(2);
  const [selectedFloor, setSelectedFloor] = useState(1);

  // Interactive 3D States
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [autoRotate, setAutoRotate] = useState(true);
  const [cameraPreset, setCameraPreset] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef(null);

  // Search State for Nearby Surroundings
  const [searchQuery, setSearchQuery] = useState('');

  // HUD Stats
  const [telemetry, setTelemetry] = useState({ fps: 60, polyCount: 16800 });

  // Layer Visibility Matrix (Phase 4 Extended)
  const [layers, setLayers] = useState({
    buildings: true,
    boundaries: true,
    roads: true,
    emergency: true,
    transport: true,
    commercial: true,
    amenities: true,
    parking: true,
    crowdZones: true
  });

  // Check if Level 5 Interior / Floor Slicing is supported by verified data
  const isInteriorAvailable = useMemo(() => {
    if (!selectedEntity) return false;
    if (selectedEntity.entityType === 'BUILDING' && (selectedEntity.floors || 0) > 1) {
      return true;
    }
    return false;
  }, [selectedEntity]);

  // Selected building reference (if any building is selected or in Level 3/5)
  const selectedBuilding = useMemo(() => {
    if (selectedEntity?.entityType === 'BUILDING') return selectedEntity;
    return buildings[0] || null;
  }, [selectedEntity, buildings]);

  // Selected zone reference (if any zone is selected or in Level 4)
  const selectedZone = useMemo(() => {
    if (selectedEntity?.entityType === 'ZONE') return selectedEntity;
    return zones[0] || null;
  }, [selectedEntity, zones]);

  // Fetch list of registered temples
  const fetchTemplesList = async () => {
    try {
      const res = await API.get('/temples');
      if (Array.isArray(res.data) && res.data.length > 0) {
        setAllTemples(res.data);
      }
    } catch (err) {
      console.error('Error fetching temples:', err);
    }
  };

  // Fetch all GIS, Surroundings, Roads, Facilities, and 3D datasets for selected temple
  const loadTempleDigitalTwin = async (templeId) => {
    try {
      setRefreshing(true);
      // Clean previously loaded structures immediately to prevent cross-temple leakage
      setBuildings([]);
      setBoundary(null);
      setZones([]);
      setRoads([]);
      setFacilities([]);
      setTransport([]);
      setParking([]);
      setSelectedEntity(null);
      setSearchQuery('');
      setNavLevel(2); // Reset to Campus View
      setSelectedFloor(1);

      const [templeRes, bldRes, geoRes, zonesRes, roadsRes, facRes, transRes, parkRes] = await Promise.allSettled([
        API.get(`/temples/${templeId}`),
        API.get(`/temples/${templeId}/buildings`),
        API.get(`/temples/${templeId}/geography`),
        API.get(`/temples/${templeId}/zones`),
        API.get(`/temples/${templeId}/roads`),
        API.get(`/temples/${templeId}/facilities`),
        API.get(`/temples/${templeId}/transport`),
        API.get(`/temples/${templeId}/parking`)
      ]);

      if (templeRes.status === 'fulfilled') setTemple(templeRes.value.data);
      if (bldRes.status === 'fulfilled') setBuildings(bldRes.value.data || []);
      if (geoRes.status === 'fulfilled' && geoRes.value.data?.boundaries?.length > 0) {
        setBoundary(geoRes.value.data.boundaries[0]);
      }
      if (zonesRes.status === 'fulfilled') setZones(zonesRes.value.data || []);
      if (roadsRes.status === 'fulfilled') setRoads(roadsRes.value.data || []);
      if (facRes.status === 'fulfilled') setFacilities(facRes.value.data || []);
      if (transRes.status === 'fulfilled') setTransport(transRes.value.data || []);
      if (parkRes.status === 'fulfilled') setParking(parkRes.value.data || []);
    } catch (err) {
      console.error(`Failed to load digital twin for ${templeId}:`, err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTemplesList();
  }, [user]);

  useEffect(() => {
    if (selectedTempleId) {
      loadTempleDigitalTwin(selectedTempleId);
    }
  }, [selectedTempleId]);

  const handleTempleChange = (newTempleId) => {
    setSelectedTempleId(newTempleId);
  };

  const handleToggleLayer = (layerName) => {
    setLayers(prev => ({
      ...prev,
      [layerName]: !prev[layerName]
    }));
  };

  const handleToggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen?.().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const handleSetCameraView = (viewType) => {
    setCameraPreset(viewType);
    setTimeout(() => setCameraPreset(null), 800);
  };

  // Nearby facility search filter
  const searchResults = useMemo(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) return [];
    const q = searchQuery.toLowerCase();
    const all = [
      ...facilities.map(f => ({ ...f, entityType: 'FACILITY' })),
      ...transport.map(t => ({ ...t, entityType: 'TRANSPORT' })),
      ...parking.map(p => ({ ...p, entityType: 'TRANSPORT' })),
      ...roads.map(r => ({ ...r, entityType: 'ROAD' })),
      ...buildings.map(b => ({ ...b, entityType: 'BUILDING' })),
      ...zones.map(z => ({ ...z, entityType: 'ZONE' }))
    ];
    return all.filter(item => 
      item.name?.toLowerCase().includes(q) ||
      item.facility_type?.toLowerCase().includes(q) ||
      item.transport_type?.toLowerCase().includes(q) ||
      item.building_type?.toLowerCase().includes(q) ||
      item.zone_type?.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [searchQuery, facilities, transport, parking, roads, buildings, zones]);

  // Layer element counts
  const availableCounts = useMemo(() => {
    const emergencyCount = facilities.filter(f => ['HOSPITAL', 'CLINIC', 'POLICE_STATION', 'FIRE_STATION'].includes(f.facility_type)).length;
    const commercialCount = facilities.filter(f => f.facility_type === 'PILGRIM_ACCOMMODATION').length;
    const amenityCount = facilities.filter(f => f.facility_type === 'PUBLIC_AMENITY').length;

    return {
      buildings: buildings.length,
      boundaries: boundary ? 1 : 0,
      roads: roads.length,
      emergency: emergencyCount,
      transport: transport.length,
      accommodations: commercialCount,
      amenities: amenityCount,
      parking: parking.length,
      zones: zones.length
    };
  }, [buildings, boundary, roads, facilities, transport, parking, zones]);

  if (loading) return <Loading />;

  return (
    <div className="container-fluid p-4 d-flex flex-column" style={{ minHeight: 'calc(100vh - 65px)' }}>
      {/* Page Header */}
      <div className="d-flex flex-wrap align-items-center justify-content-between mb-3 gap-2">
        <div>
          <h4 className="fw-bold text-maroon m-0 d-flex align-items-center gap-2">
            <Boxes size={26} className="text-maroon" /> Multi-Level 3D Holographic Navigation System
          </h4>
          <small className="text-muted">
            Phase 5: 5-Tier Spatial Navigation (Regional → Campus → Building → Zone → Interior Floor Slices) with interactive breadcrumbs & verified CAD floor heights
          </small>
        </div>

        {/* Temple Selector & Classification Badge */}
        <div className="d-flex flex-wrap align-items-center gap-2">
          {allTemples.length > 0 && (
            <div className="d-flex align-items-center gap-1 bg-white p-1 rounded border border-beige shadow-sm">
              <Building2 size={16} className="text-maroon ms-1" />
              <select 
                className="form-select form-select-sm border-0 fw-bold text-maroon"
                value={selectedTempleId}
                onChange={e => handleTempleChange(e.target.value)}
                style={{ minWidth: '240px' }}
              >
                {allTemples.map(t => (
                  <option key={t.temple_id} value={t.temple_id}>
                    {t.name} ({t.city})
                  </option>
                ))}
              </select>
            </div>
          )}

          <ClassificationBadge classification="GIS_DERIVED_MODEL" />

          <button 
            onClick={() => loadTempleDigitalTwin(selectedTempleId)} 
            className="btn btn-outline-secondary btn-sm p-2 shadow-sm"
            title="Refresh 3D telemetry"
            disabled={refreshing}
          >
            <RefreshCw size={15} className={refreshing ? 'spin' : ''} />
          </button>
        </div>
      </div>

      {/* Quick Temple Selector Pills */}
      <div className="d-flex flex-wrap gap-2 mb-3">
        {allTemples.map(t => {
          const isActive = t.temple_id === selectedTempleId;
          return (
            <button
              key={t.temple_id}
              onClick={() => handleTempleChange(t.temple_id)}
              className={`btn btn-xs py-1 px-3 rounded-pill fw-semibold shadow-sm transition-all ${
                isActive 
                  ? 'btn-maroon text-gold' 
                  : 'btn-outline-secondary bg-white'
              }`}
              style={{ fontSize: '0.75rem' }}
            >
              {t.name.split(' ')[1] || t.name} ({t.city})
            </button>
          );
        })}
      </div>

      {/* Main 3D Holographic Canvas Container */}
      <div 
        ref={containerRef}
        className="position-relative flex-grow-1 rounded-3 overflow-hidden shadow-lg border"
        style={{ 
          height: isFullscreen ? '100vh' : '640px', 
          minHeight: '520px',
          borderColor: '#00f0ff',
          backgroundColor: '#040914',
          boxShadow: '0 0 35px rgba(0, 240, 255, 0.22)'
        }}
      >
        {/* Core Three.js WebGL Holographic Engine with Multi-Level Navigation Support */}
        <HolographicCanvas
          temple={temple}
          buildings={buildings}
          zones={zones}
          boundary={boundary}
          roads={roads}
          facilities={facilities}
          transport={transport}
          parking={parking}
          layers={layers}
          autoRotate={autoRotate}
          cameraPreset={cameraPreset}
          navLevel={navLevel}
          selectedEntity={selectedEntity}
          selectedFloor={selectedFloor}
          onSelectEntity={(ent) => setSelectedEntity(ent)}
          onSelectLevel={(lvl) => setNavLevel(lvl)}
          onUpdateStats={setTelemetry}
        />

        {/* Phase 5 Navigation Level Bar (Breadcrumb & 5-Level Switcher) */}
        <NavigationLevelBar
          currentLevel={navLevel}
          onChangeLevel={(lvl) => {
            setNavLevel(lvl);
            if (lvl === 2) setSelectedEntity(null);
          }}
          temple={temple}
          selectedBuilding={selectedBuilding}
          selectedZone={selectedZone}
          selectedFloor={selectedFloor}
          onChangeFloor={(fl) => setSelectedFloor(fl)}
          isInteriorAvailable={isInteriorAvailable}
        />

        {/* Floating Digital Twin Overlay Controls */}
        <DigitalTwinControls
          autoRotate={autoRotate}
          onToggleAutoRotate={() => setAutoRotate(!autoRotate)}
          onSetCameraView={handleSetCameraView}
          onResetCamera={() => {
            setNavLevel(2);
            setSelectedEntity(null);
            handleSetCameraView('reset');
          }}
          isFullscreen={isFullscreen}
          onToggleFullscreen={handleToggleFullscreen}
          layers={layers}
          onToggleLayer={handleToggleLayer}
          availableCounts={availableCounts}
          fps={telemetry.fps}
          polyCount={telemetry.polyCount}
          temple={temple}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchResults={searchResults}
          onSelectSearchResult={(item) => {
            setSelectedEntity(item);
            setSearchQuery('');
            if (item.entityType === 'BUILDING') setNavLevel(3);
            else if (item.entityType === 'ZONE') setNavLevel(4);
          }}
        />

        {/* Selected Entity Inspector HUD Panel */}
        {selectedEntity && (
          <BuildingInfoPanel
            entity={selectedEntity}
            temple={temple}
            onClose={() => setSelectedEntity(null)}
            onFocusEntity={(ent) => {
              setSelectedEntity(ent);
              if (ent.entityType === 'BUILDING') setNavLevel(3);
              else if (ent.entityType === 'ZONE') setNavLevel(4);
            }}
          />
        )}
      </div>

      {/* Technical Provenance & Classification Notice */}
      <div className="mt-3 p-3 rounded bg-ivory border border-gold small text-dark-brown d-flex flex-wrap align-items-center justify-content-between gap-2">
        <div className="d-flex align-items-center gap-2">
          <Info size={18} className="text-maroon flex-shrink-0" />
          <span>
            <strong>Phase 5 Multi-Level Navigation Architecture:</strong> 5-tier spatial hierarchy from Regional context down to individual verified building floor slices. Level 5 Interior Slicing is active strictly for structures confirmed with multi-floor architectural records by state trust gazettes (e.g. Sanctum Shikhara 3 tiers, Vaikunta Queue Complex 4 tiers).
          </span>
        </div>
        <div className="d-flex align-items-center gap-1">
          <span className="badge bg-dark text-cyan border border-info" style={{ fontSize: '0.7rem' }}>
            Active Classification: GIS_DERIVED_MODEL
          </span>
        </div>
      </div>
    </div>
  );
};

export default DigitalTwinPage;
