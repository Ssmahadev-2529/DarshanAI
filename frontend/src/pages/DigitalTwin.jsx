import React, { useState, useEffect, useContext, useRef } from 'react';
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
  Activity
} from 'lucide-react';

const DigitalTwinPage = () => {
  const { user } = useContext(AuthContext);

  const [allTemples, setAllTemples] = useState([]);
  const [selectedTempleId, setSelectedTempleId] = useState(user?.temple_id || 'TEMPLE-001');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Active Temple Datasets
  const [temple, setTemple] = useState(null);
  const [buildings, setBuildings] = useState([]);
  const [boundary, setBoundary] = useState(null);
  const [zones, setZones] = useState([]);
  const [surroundings, setSurroundings] = useState({ facilities: [], transport: [] });
  const [assets3D, setAssets3D] = useState([]);

  // Interactive 3D States
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [selectedZone, setSelectedZone] = useState(null);
  const [autoRotate, setAutoRotate] = useState(true);
  const [cameraPreset, setCameraPreset] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef(null);

  // HUD Stats
  const [telemetry, setTelemetry] = useState({ fps: 60, polyCount: 14800 });

  // Layer Visibility State (Phase 3 Requirement #7)
  const [layers, setLayers] = useState({
    buildings: true,
    boundaries: true,
    entrances: true,
    pathways: true,
    queueComplexes: true,
    crowdZones: true,
    surroundings: true
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

  // Fetch all GIS and 3D datasets for selected temple
  const loadTempleDigitalTwin = async (templeId) => {
    try {
      setRefreshing(true);
      // Clean previously loaded structures immediately to prevent model leakage
      setBuildings([]);
      setBoundary(null);
      setZones([]);
      setAssets3D([]);
      setSelectedBuilding(null);
      setSelectedZone(null);

      const [templeRes, bldRes, geoRes, zonesRes, surrRes, assetsRes] = await Promise.allSettled([
        API.get(`/temples/${templeId}`),
        API.get(`/temples/${templeId}/buildings`),
        API.get(`/temples/${templeId}/geography`),
        API.get(`/temples/${templeId}/zones`),
        API.get(`/temples/${templeId}/surroundings`),
        API.get(`/temples/${templeId}/3d-assets`)
      ]);

      if (templeRes.status === 'fulfilled') setTemple(templeRes.value.data);
      if (bldRes.status === 'fulfilled') setBuildings(bldRes.value.data || []);
      if (geoRes.status === 'fulfilled' && geoRes.value.data?.boundaries?.length > 0) {
        setBoundary(geoRes.value.data.boundaries[0]);
      }
      if (zonesRes.status === 'fulfilled') setZones(zonesRes.value.data || []);
      if (surrRes.status === 'fulfilled') setSurroundings(surrRes.value.data || {});
      if (assetsRes.status === 'fulfilled') setAssets3D(assetsRes.value.data || []);
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
    // Reset preset trigger after short interval
    setTimeout(() => setCameraPreset(null), 800);
  };

  if (loading) return <Loading />;

  return (
    <div className="container-fluid p-4 d-flex flex-column" style={{ minHeight: 'calc(100vh - 65px)' }}>
      {/* Page Header */}
      <div className="d-flex flex-wrap align-items-center justify-content-between mb-3 gap-2">
        <div>
          <h4 className="fw-bold text-maroon m-0 d-flex align-items-center gap-2">
            <Boxes size={26} className="text-maroon" /> Holographic 3D Digital Twin Command Center
          </h4>
          <small className="text-muted">
            Interactive WebGL 3D spatial twin with verified building heights, Dravidian & Nagara architecture, laser scanning, and zone telemetry
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
          height: isFullscreen ? '100vh' : '620px', 
          minHeight: '520px',
          borderColor: '#00f0ff',
          backgroundColor: '#040914',
          boxShadow: '0 0 35px rgba(0, 240, 255, 0.2)'
        }}
      >
        {/* Core Three.js WebGL Holographic Engine */}
        <HolographicCanvas
          temple={temple}
          buildings={buildings}
          zones={zones}
          boundary={boundary}
          facilities={surroundings.facilities || []}
          layers={layers}
          autoRotate={autoRotate}
          cameraPreset={cameraPreset}
          selectedBuilding={selectedBuilding}
          onSelectBuilding={(bld) => {
            setSelectedBuilding(bld);
            setSelectedZone(null);
          }}
          onSelectZone={(z) => {
            setSelectedZone(z);
            setSelectedBuilding(null);
          }}
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
          availableCounts={{
            buildings: buildings.length,
            zones: zones.length,
            facilities: (surroundings.facilities?.length || 0) + (surroundings.transport?.length || 0)
          }}
          fps={telemetry.fps}
          polyCount={telemetry.polyCount}
          temple={temple}
        />

        {/* Selected Building / Zone Inspector HUD Panel */}
        {(selectedBuilding || selectedZone) && (
          <BuildingInfoPanel
            building={selectedBuilding}
            zone={selectedZone}
            temple={temple}
            onClose={() => {
              setSelectedBuilding(null);
              setSelectedZone(null);
            }}
            onFocusBuilding={(bld) => setSelectedBuilding(bld)}
          />
        )}
      </div>

      {/* Bottom Technical Provenance & Classification Notice */}
      <div className="mt-3 p-3 rounded bg-ivory border border-gold small text-dark-brown d-flex flex-wrap align-items-center justify-content-between gap-2">
        <div className="d-flex align-items-center gap-2">
          <Info size={18} className="text-maroon flex-shrink-0" />
          <span>
            <strong>Architectural Provenance Guarantee:</strong> Procedural 3D holographic structures are derived directly from verified cadastral surveys, official state temple trust gazettes, and OpenStreetMap GPS coordinates. No generic or fabricated models are displayed.
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
