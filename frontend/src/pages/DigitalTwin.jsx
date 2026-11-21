import React, { useState, useEffect, useContext, useRef, useMemo } from 'react';
import API from '../services/api';
import { AuthContext } from '../context/AuthContext';
import Loading from '../components/Loading';
import HolographicCanvas from '../components/digitaltwin/HolographicCanvas';
import BuildingInfoPanel from '../components/digitaltwin/BuildingInfoPanel';
import DigitalTwinControls from '../components/digitaltwin/DigitalTwinControls';
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

  // Phase 4 Extended Layer Visibility Matrix
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
      ...buildings.map(b => ({ ...b, entityType: 'BUILDING' }))
    ];
    return all.filter(item => 
      item.name?.toLowerCase().includes(q) ||
      item.facility_type?.toLowerCase().includes(q) ||
      item.transport_type?.toLowerCase().includes(q) ||
      item.building_type?.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [searchQuery, facilities, transport, parking, roads, buildings]);

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
            <Boxes size={26} className="text-maroon" /> Holographic 3D Digital Twin — Campus & Surroundings
          </h4>
          <small className="text-muted">
            Phase 4: Full-campus architectural models, verified road networks, hospitals, police stations, transit hubs, and straight-line vs. road distance calculations
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
          height: isFullscreen ? '100vh' : '630px', 
          minHeight: '520px',
          borderColor: '#00f0ff',
          backgroundColor: '#040914',
          boxShadow: '0 0 35px rgba(0, 240, 255, 0.22)'
        }}
      >
        {/* Core Three.js WebGL Holographic Engine */}
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
          selectedEntity={selectedEntity}
          onSelectEntity={(ent) => setSelectedEntity(ent)}
          onUpdateStats={setTelemetry}
        />

        {/* Floating Digital Twin Overlay Controls */}
        <DigitalTwinControls
          autoRotate={autoRotate}
          onToggleAutoRotate={() => setAutoRotate(!autoRotate)}
          onSetCameraView={handleSetCameraView}
          onResetCamera={() => handleSetCameraView('reset')}
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
          }}
        />

        {/* Selected Entity (Building, Facility, Road, Transport) Inspector HUD Panel */}
        {selectedEntity && (
          <BuildingInfoPanel
            entity={selectedEntity}
            temple={temple}
            onClose={() => setSelectedEntity(null)}
            onFocusEntity={(ent) => setSelectedEntity(ent)}
          />
        )}
      </div>

      {/* Technical Provenance & Distance Notice */}
      <div className="mt-3 p-3 rounded bg-ivory border border-gold small text-dark-brown d-flex flex-wrap align-items-center justify-content-between gap-2">
        <div className="d-flex align-items-center gap-2">
          <Info size={18} className="text-maroon flex-shrink-0" />
          <span>
            <strong>Phase 4 Spatial Provenance Guarantee:</strong> Surrounding road networks and public facilities are rendered strictly from verified OpenStreetMap alignments and state gazette coordinates. Straight-line geodesic distance is calculated via the Haversine formula; road network distance reflects surveyed physical routes.
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
