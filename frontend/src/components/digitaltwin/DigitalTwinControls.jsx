import React from 'react';
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
  Activity
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
  polyCount = 12500,
  temple
}) => {
  return (
    <>
      {/* Top Left: Holographic HUD Status Badge */}
      <div 
        className="position-absolute top-0 start-0 m-3 p-2 rounded-3"
        style={{
          zIndex: 1040,
          backgroundColor: 'rgba(10, 25, 47, 0.85)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(0, 240, 255, 0.3)',
          boxShadow: '0 0 15px rgba(0, 240, 255, 0.15)',
          color: '#E2F1F8',
          fontSize: '0.75rem'
        }}
      >
        <div className="d-flex align-items-center gap-2 mb-1">
          <span 
            className="d-inline-block rounded-circle"
            style={{ 
              width: '8px', 
              height: '8px', 
              backgroundColor: '#00f0ff',
              boxShadow: '0 0 8px #00f0ff' 
            }}
          />
          <strong style={{ color: '#00f0ff', letterSpacing: '0.5px' }}>HOLOGRAPHIC DIGITAL TWIN ENGINE</strong>
        </div>
        <div className="d-flex flex-wrap gap-2 text-muted" style={{ fontSize: '0.7rem' }}>
          <span>FPS: <strong className="text-white">{fps}</strong></span>
          <span>•</span>
          <span>Polygons: <strong className="text-white">{polyCount.toLocaleString()}</strong></span>
          <span>•</span>
          <span>GPS: <strong className="text-cyan">{temple?.latitude?.toFixed(4)}° N, {temple?.longitude?.toFixed(4)}° E</strong></span>
        </div>
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
            backgroundColor: 'rgba(10, 25, 47, 0.85)',
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
            backgroundColor: 'rgba(10, 25, 47, 0.85)',
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
            backgroundColor: 'rgba(10, 25, 47, 0.85)',
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
            backgroundColor: autoRotate ? 'rgba(0, 240, 255, 0.25)' : 'rgba(10, 25, 47, 0.85)',
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
            backgroundColor: 'rgba(10, 25, 47, 0.85)',
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

      {/* Bottom Left: Digital Twin Layer Filter Matrix */}
      <div 
        className="position-absolute bottom-0 start-0 m-3 p-2 rounded-3"
        style={{
          zIndex: 1040,
          backgroundColor: 'rgba(10, 25, 47, 0.88)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(0, 240, 255, 0.3)',
          boxShadow: '0 0 15px rgba(0, 240, 255, 0.15)',
          maxWidth: '520px'
        }}
      >
        <div className="d-flex align-items-center justify-content-between mb-2">
          <small className="fw-bold d-flex align-items-center gap-1" style={{ color: '#00f0ff', fontSize: '0.72rem' }}>
            <Layers size={14} /> HOLOGRAPHIC DIGITAL TWIN LAYERS
          </small>
          <span className="badge" style={{ backgroundColor: 'rgba(0, 240, 255, 0.15)', color: '#00f0ff', fontSize: '0.62rem' }}>
            Interactive Filters
          </span>
        </div>

        <div className="d-flex flex-wrap gap-1">
          {/* Layer 1: Buildings */}
          <button
            onClick={() => onToggleLayer('buildings')}
            className="btn btn-xs py-1 px-2 rounded d-flex align-items-center gap-1"
            style={{
              backgroundColor: layers.buildings ? 'rgba(0, 240, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)',
              border: `1px solid ${layers.buildings ? '#00f0ff' : 'rgba(255, 255, 255, 0.2)'}`,
              color: layers.buildings ? '#00f0ff' : '#99AAB5',
              fontSize: '0.68rem'
            }}
          >
            <Building size={12} /> Structures ({availableCounts.buildings || 0})
          </button>

          {/* Layer 2: Campus Boundaries */}
          <button
            onClick={() => onToggleLayer('boundaries')}
            className="btn btn-xs py-1 px-2 rounded d-flex align-items-center gap-1"
            style={{
              backgroundColor: layers.boundaries ? 'rgba(0, 240, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)',
              border: `1px solid ${layers.boundaries ? '#00f0ff' : 'rgba(255, 255, 255, 0.2)'}`,
              color: layers.boundaries ? '#00f0ff' : '#99AAB5',
              fontSize: '0.68rem'
            }}
          >
            <MapPin size={12} /> Boundaries
          </button>

          {/* Layer 3: Entrances and Exits */}
          <button
            onClick={() => onToggleLayer('entrances')}
            className="btn btn-xs py-1 px-2 rounded d-flex align-items-center gap-1"
            style={{
              backgroundColor: layers.entrances ? 'rgba(0, 240, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)',
              border: `1px solid ${layers.entrances ? '#00f0ff' : 'rgba(255, 255, 255, 0.2)'}`,
              color: layers.entrances ? '#00f0ff' : '#99AAB5',
              fontSize: '0.68rem'
            }}
          >
            <Footprints size={12} /> Portals & Exits
          </button>

          {/* Layer 4: Internal Pathways */}
          <button
            onClick={() => onToggleLayer('pathways')}
            className="btn btn-xs py-1 px-2 rounded d-flex align-items-center gap-1"
            style={{
              backgroundColor: layers.pathways ? 'rgba(0, 240, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)',
              border: `1px solid ${layers.pathways ? '#00f0ff' : 'rgba(255, 255, 255, 0.2)'}`,
              color: layers.pathways ? '#00f0ff' : '#99AAB5',
              fontSize: '0.68rem'
            }}
          >
            <Compass size={12} /> Processional Corridors
          </button>

          {/* Layer 5: Queue Complexes */}
          <button
            onClick={() => onToggleLayer('queueComplexes')}
            className="btn btn-xs py-1 px-2 rounded d-flex align-items-center gap-1"
            style={{
              backgroundColor: layers.queueComplexes ? 'rgba(0, 240, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)',
              border: `1px solid ${layers.queueComplexes ? '#00f0ff' : 'rgba(255, 255, 255, 0.2)'}`,
              color: layers.queueComplexes ? '#00f0ff' : '#99AAB5',
              fontSize: '0.68rem'
            }}
          >
            <Activity size={12} /> Queue Complexes
          </button>

          {/* Layer 6: Crowd Monitoring Zones */}
          <button
            onClick={() => onToggleLayer('crowdZones')}
            className="btn btn-xs py-1 px-2 rounded d-flex align-items-center gap-1"
            style={{
              backgroundColor: layers.crowdZones ? 'rgba(0, 240, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)',
              border: `1px solid ${layers.crowdZones ? '#00f0ff' : 'rgba(255, 255, 255, 0.2)'}`,
              color: layers.crowdZones ? '#00f0ff' : '#99AAB5',
              fontSize: '0.68rem'
            }}
          >
            <ShieldAlert size={12} /> Crowd Zones ({availableCounts.zones || 0})
          </button>

          {/* Layer 7: Surrounding Facilities & Roads */}
          <button
            onClick={() => onToggleLayer('surroundings')}
            className="btn btn-xs py-1 px-2 rounded d-flex align-items-center gap-1"
            style={{
              backgroundColor: layers.surroundings ? 'rgba(0, 240, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)',
              border: `1px solid ${layers.surroundings ? '#00f0ff' : 'rgba(255, 255, 255, 0.2)'}`,
              color: layers.surroundings ? '#00f0ff' : '#99AAB5',
              fontSize: '0.68rem'
            }}
          >
            <HeartPulse size={12} /> Surroundings ({availableCounts.facilities || 0})
          </button>
        </div>
      </div>
    </>
  );
};

export default DigitalTwinControls;
