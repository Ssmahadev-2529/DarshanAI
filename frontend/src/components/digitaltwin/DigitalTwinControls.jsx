import React, { useState } from 'react';
import { 
  RotateCw, 
  Eye, 
  Compass, 
  Maximize, 
  Minimize, 
  Layers, 
  Building, 
  MapPin, 
  Footprints, 
  ShieldAlert, 
  Car, 
  HeartPulse, 
  RefreshCw,
  Camera,
  Activity,
  Search,
  Shield,
  Home,
  Droplets,
  Navigation,
  Flame,
  X
} from 'lucide-react';

const DigitalTwinControls = ({
  autoRotate,
  onToggleAutoRotate,
  onSetCameraView,
  onResetCamera,
  isFullscreen,
  onToggleFullscreen,
  layers,
  onToggleLayer,
  availableCounts = {},
  fps = 60,
  polyCount = 14500,
  temple,
  searchQuery = '',
  onSearchChange = () => {},
  searchResults = [],
  onSelectSearchResult = () => {}
}) => {
  const [showSearch, setShowSearch] = useState(false);

  return (
    <>
      {/* Top Left: Digital Twin Status Badge & Search Trigger */}
      <div 
        className="position-absolute top-0 start-0 m-3 p-2 rounded-3"
        style={{
          zIndex: 1040,
          backgroundColor: 'rgba(24, 10, 4, 0.90)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(212, 175, 55, 0.4)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
          color: '#E2F1F8',
          fontSize: '0.75rem',
          maxWidth: '380px'
        }}
      >
        <div className="d-flex align-items-center justify-content-between gap-2 mb-1">
          <div className="d-flex align-items-center gap-2">
            <span 
              className="d-inline-block rounded-circle"
              style={{ 
                width: '8px', 
                height: '8px', 
                backgroundColor: '#D4AF37',
                boxShadow: '0 0 8px #D4AF37' 
              }}
            />
            <strong style={{ color: '#D4AF37', letterSpacing: '0.5px' }}>TEMPLE DIGITAL TWIN 3D</strong>
          </div>
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="btn btn-xs py-0 px-2 rounded d-flex align-items-center gap-1"
            style={{
              backgroundColor: showSearch ? 'rgba(212, 175, 55, 0.25)' : 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(212, 175, 55, 0.4)',
              color: '#D4AF37',
              fontSize: '0.68rem'
            }}
          >
            <Search size={11} /> {showSearch ? 'Hide Search' : 'Search Surroundings'}
          </button>
        </div>

        <div className="d-flex flex-wrap gap-2 text-muted mb-1" style={{ fontSize: '0.7rem' }}>
          <span>FPS: <strong className="text-white">{fps}</strong></span>
          <span>•</span>
          <span>Mesh Polygons: <strong className="text-white">{polyCount.toLocaleString()}</strong></span>
          <span>•</span>
          <span>Anchor: <strong className="text-cyan">{temple?.latitude?.toFixed(4)}° N, {temple?.longitude?.toFixed(4)}° E</strong></span>
        </div>

        {/* Nearby Facilities Search Box */}
        {showSearch && (
          <div className="mt-2 pt-2 border-top border-secondary">
            <div className="input-group input-group-sm">
              <span className="input-group-text bg-dark border-secondary text-cyan p-1">
                <Search size={13} />
              </span>
              <input
                type="text"
                className="form-control form-control-sm bg-dark border-secondary text-white py-1"
                placeholder="Filter hospitals, police, parking, transit, roads..."
                value={searchQuery}
                onChange={e => onSearchChange(e.target.value)}
                style={{ fontSize: '0.72rem' }}
              />
              {searchQuery && (
                <button 
                  onClick={() => onSearchChange('')} 
                  className="btn btn-dark border-secondary text-muted p-1"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Search Results Dropdown */}
            {searchResults.length > 0 && (
              <div 
                className="rounded mt-1 p-1 overflow-auto" 
                style={{ maxHeight: '160px', backgroundColor: 'rgba(5, 15, 30, 0.95)', border: '1px solid rgba(0, 240, 255, 0.3)' }}
              >
                {searchResults.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => onSelectSearchResult(item)}
                    className="p-1 px-2 rounded hover-bg-ivory cursor-pointer d-flex align-items-center justify-content-between mb-1"
                    style={{ cursor: 'pointer', fontSize: '0.72rem' }}
                  >
                    <div>
                      <strong className="text-cyan d-block">{item.name}</strong>
                      <small className="text-muted">{item.facility_type || item.transport_type || item.building_type || 'Feature'}</small>
                    </div>
                    {item.distance_meters && (
                      <span className="badge bg-secondary" style={{ fontSize: '0.62rem' }}>
                        {item.distance_meters > 1000 ? `${(item.distance_meters / 1000).toFixed(1)} km` : `${item.distance_meters} m`}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Top Right: Camera Presets & View Controls */}
      <div 
        className="position-absolute top-0 end-0 m-3 d-flex flex-wrap gap-1"
        style={{ zIndex: 1040 }}
      >
        <button
          onClick={() => onSetCameraView('aerial')}
          className="btn btn-sm d-flex align-items-center gap-1 shadow-sm"
          style={{
            backgroundColor: 'rgba(10, 25, 47, 0.88)',
            border: '1px solid rgba(0, 240, 255, 0.4)',
            color: '#E2F1F8',
            fontSize: '0.72rem',
            backdropFilter: 'blur(8px)'
          }}
          title="Top-down aerial orthographic view"
        >
          <Camera size={13} style={{ color: '#00f0ff' }} /> Aerial
        </button>

        <button
          onClick={() => onSetCameraView('ground')}
          className="btn btn-sm d-flex align-items-center gap-1 shadow-sm"
          style={{
            backgroundColor: 'rgba(10, 25, 47, 0.88)',
            border: '1px solid rgba(0, 240, 255, 0.4)',
            color: '#E2F1F8',
            fontSize: '0.72rem',
            backdropFilter: 'blur(8px)'
          }}
          title="Isometric ground eye-level perspective"
        >
          <Eye size={13} style={{ color: '#00f0ff' }} /> Ground Level
        </button>

        <button
          onClick={onResetCamera}
          className="btn btn-sm d-flex align-items-center gap-1 shadow-sm"
          style={{
            backgroundColor: 'rgba(10, 25, 47, 0.88)',
            border: '1px solid rgba(0, 240, 255, 0.4)',
            color: '#E2F1F8',
            fontSize: '0.72rem',
            backdropFilter: 'blur(8px)'
          }}
          title="Reset camera orientation"
        >
          <Compass size={13} style={{ color: '#00f0ff' }} /> Reset
        </button>

        <button
          onClick={onToggleAutoRotate}
          className={`btn btn-sm d-flex align-items-center gap-1 shadow-sm ${autoRotate ? 'active' : ''}`}
          style={{
            backgroundColor: autoRotate ? 'rgba(0, 240, 255, 0.25)' : 'rgba(10, 25, 47, 0.88)',
            border: `1px solid ${autoRotate ? '#00f0ff' : 'rgba(0, 240, 255, 0.4)'}`,
            color: autoRotate ? '#00f0ff' : '#E2F1F8',
            fontSize: '0.72rem',
            backdropFilter: 'blur(8px)'
          }}
          title="360 degree turntable auto-rotation"
        >
          <RotateCw size={13} className={autoRotate ? 'spin' : ''} /> 360° Rotate
        </button>

        <button
          onClick={onToggleFullscreen}
          className="btn btn-sm d-flex align-items-center gap-1 shadow-sm"
          style={{
            backgroundColor: 'rgba(10, 25, 47, 0.88)',
            border: '1px solid rgba(0, 240, 255, 0.4)',
            color: '#E2F1F8',
            fontSize: '0.72rem',
            backdropFilter: 'blur(8px)'
          }}
          title="Toggle Fullscreen Canvas"
        >
          {isFullscreen ? <Minimize size={13} /> : <Maximize size={13} />}
        </button>
      </div>

      {/* Bottom Left: Extended Geographical Layer Filter Matrix (Phase 4) */}
      <div 
        className="position-absolute bottom-0 start-0 m-3 p-2 rounded-3"
        style={{
          zIndex: 1040,
          backgroundColor: 'rgba(10, 25, 47, 0.90)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(0, 240, 255, 0.35)',
          boxShadow: '0 0 20px rgba(0, 240, 255, 0.2)',
          maxWidth: '680px'
        }}
      >
        <div className="d-flex align-items-center justify-content-between mb-2">
          <small className="fw-bold d-flex align-items-center gap-1" style={{ color: '#00f0ff', fontSize: '0.72rem' }}>
            <Layers size={14} /> SPATIAL DIGITAL TWIN LAYERS (CAMPUS & SURROUNDINGS)
          </small>
          <span className="badge" style={{ backgroundColor: 'rgba(0, 240, 255, 0.15)', color: '#00f0ff', fontSize: '0.62rem' }}>
            Phase 4 Spatial Filtering
          </span>
        </div>

        <div className="d-flex flex-wrap gap-1">
          {/* Layer 1: Campus Structures */}
          <button
            onClick={() => onToggleLayer('buildings')}
            className="btn btn-xs py-1 px-2 rounded d-flex align-items-center gap-1"
            style={{
              backgroundColor: layers.buildings ? 'rgba(0, 240, 255, 0.25)' : 'rgba(255, 255, 255, 0.05)',
              border: `1px solid ${layers.buildings ? '#00f0ff' : 'rgba(255, 255, 255, 0.2)'}`,
              color: layers.buildings ? '#00f0ff' : '#99AAB5',
              fontSize: '0.68rem'
            }}
          >
            <Building size={12} /> Structures ({availableCounts.buildings || 0})
          </button>

          {/* Layer 2: Boundaries */}
          <button
            onClick={() => onToggleLayer('boundaries')}
            className="btn btn-xs py-1 px-2 rounded d-flex align-items-center gap-1"
            style={{
              backgroundColor: layers.boundaries ? 'rgba(0, 240, 255, 0.25)' : 'rgba(255, 255, 255, 0.05)',
              border: `1px solid ${layers.boundaries ? '#00f0ff' : 'rgba(255, 255, 255, 0.2)'}`,
              color: layers.boundaries ? '#00f0ff' : '#99AAB5',
              fontSize: '0.68rem'
            }}
          >
            <MapPin size={12} /> Boundaries
          </button>

          {/* Layer 3: Roads Network (Phase 4 Transport) */}
          <button
            onClick={() => onToggleLayer('roads')}
            className="btn btn-xs py-1 px-2 rounded d-flex align-items-center gap-1"
            style={{
              backgroundColor: layers.roads ? 'rgba(0, 229, 255, 0.3)' : 'rgba(255, 255, 255, 0.05)',
              border: `1px solid ${layers.roads ? '#00e5ff' : 'rgba(255, 255, 255, 0.2)'}`,
              color: layers.roads ? '#00e5ff' : '#99AAB5',
              fontSize: '0.68rem'
            }}
          >
            <Navigation size={12} /> Road Network ({availableCounts.roads || 0})
          </button>

          {/* Layer 4: Emergency Facilities (Hospitals, Police, Fire) */}
          <button
            onClick={() => onToggleLayer('emergency')}
            className="btn btn-xs py-1 px-2 rounded d-flex align-items-center gap-1"
            style={{
              backgroundColor: layers.emergency ? 'rgba(255, 51, 102, 0.3)' : 'rgba(255, 255, 255, 0.05)',
              border: `1px solid ${layers.emergency ? '#ff3366' : 'rgba(255, 255, 255, 0.2)'}`,
              color: layers.emergency ? '#ff3366' : '#99AAB5',
              fontSize: '0.68rem'
            }}
          >
            <HeartPulse size={12} /> Emergency Hubs ({availableCounts.emergency || 0})
          </button>

          {/* Layer 5: Transit & Access (Rail, Bus, Air) */}
          <button
            onClick={() => onToggleLayer('transport')}
            className="btn btn-xs py-1 px-2 rounded d-flex align-items-center gap-1"
            style={{
              backgroundColor: layers.transport ? 'rgba(0, 136, 255, 0.3)' : 'rgba(255, 255, 255, 0.05)',
              border: `1px solid ${layers.transport ? '#0088ff' : 'rgba(255, 255, 255, 0.2)'}`,
              color: layers.transport ? '#0088ff' : '#99AAB5',
              fontSize: '0.68rem'
            }}
          >
            <Footprints size={12} /> Transit Nodes ({availableCounts.transport || 0})
          </button>

          {/* Layer 6: Pilgrim Accommodations / Dharamshalas */}
          <button
            onClick={() => onToggleLayer('commercial')}
            className="btn btn-xs py-1 px-2 rounded d-flex align-items-center gap-1"
            style={{
              backgroundColor: layers.commercial ? 'rgba(255, 187, 0, 0.3)' : 'rgba(255, 255, 255, 0.05)',
              border: `1px solid ${layers.commercial ? '#ffbb00' : 'rgba(255, 255, 255, 0.2)'}`,
              color: layers.commercial ? '#ffbb00' : '#99AAB5',
              fontSize: '0.68rem'
            }}
          >
            <Home size={12} /> Accommodations ({availableCounts.accommodations || 0})
          </button>

          {/* Layer 7: Public Amenities (RO Water, Sanitations) */}
          <button
            onClick={() => onToggleLayer('amenities')}
            className="btn btn-xs py-1 px-2 rounded d-flex align-items-center gap-1"
            style={{
              backgroundColor: layers.amenities ? 'rgba(0, 240, 255, 0.25)' : 'rgba(255, 255, 255, 0.05)',
              border: `1px solid ${layers.amenities ? '#00f0ff' : 'rgba(255, 255, 255, 0.2)'}`,
              color: layers.amenities ? '#00f0ff' : '#99AAB5',
              fontSize: '0.68rem'
            }}
          >
            <Droplets size={12} /> Public Amenities ({availableCounts.amenities || 0})
          </button>

          {/* Layer 8: Parking Facilities */}
          <button
            onClick={() => onToggleLayer('parking')}
            className="btn btn-xs py-1 px-2 rounded d-flex align-items-center gap-1"
            style={{
              backgroundColor: layers.parking ? 'rgba(0, 255, 170, 0.3)' : 'rgba(255, 255, 255, 0.05)',
              border: `1px solid ${layers.parking ? '#00ffaa' : 'rgba(255, 255, 255, 0.2)'}`,
              color: layers.parking ? '#00ffaa' : '#99AAB5',
              fontSize: '0.68rem'
            }}
          >
            <Car size={12} /> Parking Lots ({availableCounts.parking || 0})
          </button>

          {/* Layer 9: Crowd Monitoring Zones */}
          <button
            onClick={() => onToggleLayer('crowdZones')}
            className="btn btn-xs py-1 px-2 rounded d-flex align-items-center gap-1"
            style={{
              backgroundColor: layers.crowdZones ? 'rgba(56, 239, 125, 0.25)' : 'rgba(255, 255, 255, 0.05)',
              border: `1px solid ${layers.crowdZones ? '#38ef7d' : 'rgba(255, 255, 255, 0.2)'}`,
              color: layers.crowdZones ? '#38ef7d' : '#99AAB5',
              fontSize: '0.68rem'
            }}
          >
            <ShieldAlert size={12} /> Crowd Zones ({availableCounts.zones || 0})
          </button>

          {/* Layer 10: CCTV Vision Nodes (Phase 8 CV Calibration) */}
          <button
            onClick={() => onToggleLayer('cameras')}
            className="btn btn-xs py-1 px-2 rounded d-flex align-items-center gap-1"
            style={{
              backgroundColor: layers.cameras ? 'rgba(0, 240, 255, 0.3)' : 'rgba(255, 255, 255, 0.05)',
              border: `1px solid ${layers.cameras ? '#00f0ff' : 'rgba(255, 255, 255, 0.2)'}`,
              color: layers.cameras ? '#00f0ff' : '#99AAB5',
              fontSize: '0.68rem'
            }}
          >
            <Camera size={12} /> CCTV Nodes ({availableCounts.cameras || 0})
          </button>

          {/* Layer 11: 3D Spatial Crowd Heatmap (Phase 9) */}
          <button
            onClick={() => onToggleLayer('heatmap')}
            className="btn btn-xs py-1 px-2 rounded d-flex align-items-center gap-1"
            style={{
              backgroundColor: layers.heatmap ? 'rgba(245, 158, 11, 0.35)' : 'rgba(255, 255, 255, 0.05)',
              border: `1px solid ${layers.heatmap ? '#f59e0b' : 'rgba(255, 255, 255, 0.2)'}`,
              color: layers.heatmap ? '#f59e0b' : '#99AAB5',
              fontSize: '0.68rem'
            }}
          >
            <Flame size={12} /> Crowd Heatmap ({availableCounts.heatmap || availableCounts.zones || 0})
          </button>
        </div>
      </div>
    </>
  );
};

export default DigitalTwinControls;
