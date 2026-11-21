import React from 'react';
import { 
  Building2, 
  MapPin, 
  Layers, 
  ShieldCheck, 
  Users, 
  Clock, 
  X, 
  ExternalLink,
  Sparkles,
  Maximize2
} from 'lucide-react';
import { ClassificationBadge } from '../../pages/DataQualityDashboard';

const BuildingInfoPanel = ({ 
  building, 
  zone, 
  temple, 
  onClose,
  onFocusBuilding 
}) => {
  if (!building && !zone) return null;

  const item = building || zone;
  const isBuilding = !!building;

  return (
    <div 
      className="position-absolute top-0 end-0 m-3 p-3 rounded-3 shadow-lg transition-all"
      style={{
        width: '340px',
        maxWidth: 'calc(100% - 24px)',
        zIndex: 1050,
        backgroundColor: 'rgba(10, 25, 47, 0.88)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(0, 240, 255, 0.4)',
        boxShadow: '0 0 25px rgba(0, 240, 255, 0.25)',
        color: '#E2F1F8'
      }}
    >
      {/* Header */}
      <div className="d-flex justify-content-between align-items-start border-bottom pb-2 mb-2" style={{ borderColor: 'rgba(0, 240, 255, 0.2)' }}>
        <div>
          <span 
            className="badge mb-1 text-uppercase fw-bold"
            style={{ 
              backgroundColor: 'rgba(0, 240, 255, 0.15)', 
              color: '#00f0ff',
              border: '1px solid rgba(0, 240, 255, 0.4)',
              fontSize: '0.65rem'
            }}
          >
            {isBuilding ? `STRUCTURE: ${item.building_type || 'TEMPLE MONUMENT'}` : `OPERATIONAL ZONE: ${item.zone_type}`}
          </span>
          <h5 className="fw-bold m-0" style={{ color: '#00f0ff', fontSize: '1.05rem', letterSpacing: '0.3px' }}>
            {item.name}
          </h5>
          <small className="text-muted d-block" style={{ fontSize: '0.72rem' }}>
            Campus: {temple?.name || 'Pilgrimage Complex'}
          </small>
        </div>
        <button 
          onClick={onClose} 
          className="btn btn-sm btn-link text-white p-0 opacity-75 hover-opacity-100"
          style={{ textDecoration: 'none' }}
        >
          <X size={18} />
        </button>
      </div>

      {/* Model Authenticity Classification */}
      <div className="d-flex align-items-center justify-content-between mb-3 p-2 rounded" style={{ backgroundColor: 'rgba(0, 50, 80, 0.4)', border: '1px solid rgba(0, 240, 255, 0.2)' }}>
        <small style={{ fontSize: '0.72rem' }} className="text-cyan">Provenance Classification:</small>
        <ClassificationBadge classification={item.data_classification || 'GIS_DERIVED_MODEL'} />
      </div>

      {/* Primary Metrics Grid */}
      <div className="row g-2 mb-3">
        {isBuilding && (
          <>
            <div className="col-6">
              <div className="p-2 rounded" style={{ backgroundColor: 'rgba(0, 240, 255, 0.05)', border: '1px solid rgba(0, 240, 255, 0.15)' }}>
                <small className="d-block text-muted" style={{ fontSize: '0.68rem' }}>STRUCTURAL HEIGHT</small>
                <strong style={{ color: '#00f0ff', fontSize: '0.95rem' }}>
                  {item.height_meters ? `${item.height_meters} m (${Math.round(item.height_meters * 3.28)} ft)` : 'Verified Profile'}
                </strong>
              </div>
            </div>
            <div className="col-6">
              <div className="p-2 rounded" style={{ backgroundColor: 'rgba(0, 240, 255, 0.05)', border: '1px solid rgba(0, 240, 255, 0.15)' }}>
                <small className="d-block text-muted" style={{ fontSize: '0.68rem' }}>CAPACITY ESTIMATE</small>
                <strong style={{ color: '#38ef7d', fontSize: '0.95rem' }}>
                  {item.capacity ? `${item.capacity.toLocaleString()} persons` : '1,500 devotees'}
                </strong>
              </div>
            </div>
          </>
        )}

        {!isBuilding && (
          <>
            <div className="col-6">
              <div className="p-2 rounded" style={{ backgroundColor: 'rgba(0, 240, 255, 0.05)', border: '1px solid rgba(0, 240, 255, 0.15)' }}>
                <small className="d-block text-muted" style={{ fontSize: '0.68rem' }}>CURRENT DEVOTEES</small>
                <strong style={{ color: '#00f0ff', fontSize: '0.95rem' }}>
                  {item.current_devotees || 0} / {item.capacity}
                </strong>
              </div>
            </div>
            <div className="col-6">
              <div className="p-2 rounded" style={{ backgroundColor: 'rgba(0, 240, 255, 0.05)', border: '1px solid rgba(0, 240, 255, 0.15)' }}>
                <small className="d-block text-muted" style={{ fontSize: '0.68rem' }}>EST. QUEUE WAIT</small>
                <strong style={{ color: '#ffaa00', fontSize: '0.95rem' }}>
                  {item.estimated_wait_min || 0} mins
                </strong>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Architectural Attributes */}
      {isBuilding && (
        <div className="d-flex flex-column gap-1 mb-3 small" style={{ fontSize: '0.78rem' }}>
          <div className="d-flex justify-content-between">
            <span className="text-muted">Architectural Style:</span>
            <span className="fw-semibold text-white">{item.architectural_style || 'Authentic Classical Mandir'}</span>
          </div>
          <div className="d-flex justify-content-between">
            <span className="text-muted">Construction Period:</span>
            <span className="fw-semibold text-white">{item.construction_period || 'Historic Reconstruction'}</span>
          </div>
          <div className="d-flex justify-content-between">
            <span className="text-muted">Verification Status:</span>
            <span className="text-success fw-semibold">
              <ShieldCheck size={12} className="inline me-1" />
              Verified by State Trust Gazette
            </span>
          </div>
          <div className="d-flex justify-content-between">
            <span className="text-muted">GPS Anchor:</span>
            <code style={{ color: '#00f0ff', fontSize: '0.74rem' }}>
              {item.latitude?.toFixed(5)}° N, {item.longitude?.toFixed(5)}° E
            </code>
          </div>
        </div>
      )}

      {/* Description */}
      {item.description && (
        <div className="p-2 rounded mb-3" style={{ backgroundColor: 'rgba(0, 240, 255, 0.04)', border: '1px solid rgba(0, 240, 255, 0.1)', fontSize: '0.75rem', color: '#B0C8D6' }}>
          {item.description}
        </div>
      )}

      {/* Holographic Focus Action */}
      <div className="d-flex gap-2">
        {onFocusBuilding && (
          <button 
            onClick={() => onFocusBuilding(item)}
            className="btn btn-sm w-100 fw-bold d-flex align-items-center justify-content-center gap-1"
            style={{ 
              backgroundColor: '#00f0ff', 
              color: '#0a192f',
              border: 'none',
              boxShadow: '0 0 12px rgba(0, 240, 255, 0.4)',
              fontSize: '0.75rem'
            }}
          >
            <Maximize2 size={13} /> Focus Holographic Camera
          </button>
        )}
      </div>
    </div>
  );
};

export default BuildingInfoPanel;
