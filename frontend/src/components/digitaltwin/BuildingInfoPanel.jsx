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
  Maximize2,
  Navigation,
  HeartPulse,
  Shield,
  Flame,
  Home,
  Droplets,
  Car,
  Phone,
  Info
} from 'lucide-react';
import { ClassificationBadge } from '../../pages/DataQualityDashboard';

const BuildingInfoPanel = ({ 
  entity, 
  temple, 
  onClose,
  onFocusEntity 
}) => {
  if (!entity) return null;

  const entityType = entity.entityType || (entity.building_code ? 'BUILDING' : entity.zone_code ? 'ZONE' : entity.facility_type ? 'FACILITY' : entity.transport_type ? 'TRANSPORT' : 'FEATURE');

  // Compute straight-line Euclidean distance if missing
  const getStraightLineDistance = () => {
    if (entity.straight_line_distance_meters) return entity.straight_line_distance_meters;
    if (entity.latitude && entity.longitude && temple?.latitude && temple?.longitude) {
      const R = 6371000;
      const dLat = ((entity.latitude - temple.latitude) * Math.PI) / 180;
      const dLon = ((entity.longitude - temple.longitude) * Math.PI) / 180;
      const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((temple.latitude * Math.PI) / 180) * Math.cos((entity.latitude * Math.PI) / 180) * 
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return Math.round(R * c);
    }
    return null;
  };

  const straightLineDist = getStraightLineDistance();
  const roadDist = entity.distance_meters || null;

  const getEntityBadge = () => {
    switch (entityType) {
      case 'BUILDING':
        return { label: `TEMPLE STRUCTURE: ${entity.building_type}`, color: '#00f0ff', bg: 'rgba(0, 240, 255, 0.15)' };
      case 'ZONE':
        return { label: `OPERATIONAL ZONE: ${entity.zone_type}`, color: '#38ef7d', bg: 'rgba(56, 239, 125, 0.15)' };
      case 'FACILITY':
        if (entity.facility_type === 'HOSPITAL' || entity.facility_type === 'CLINIC') {
          return { label: `EMERGENCY MEDICAL: ${entity.facility_type}`, color: '#ff3366', bg: 'rgba(255, 51, 102, 0.2)' };
        } else if (entity.facility_type === 'POLICE_STATION' || entity.facility_type === 'FIRE_STATION') {
          return { label: `PUBLIC SAFETY: ${entity.facility_type}`, color: '#ff9900', bg: 'rgba(255, 153, 0, 0.2)' };
        } else if (entity.facility_type === 'PILGRIM_ACCOMMODATION') {
          return { label: `ACCOMMODATION: DHARAMSHALA`, color: '#ffbb00', bg: 'rgba(255, 187, 0, 0.2)' };
        }
        return { label: `PUBLIC FACILITY: ${entity.facility_type}`, color: '#00f0ff', bg: 'rgba(0, 240, 255, 0.15)' };
      case 'TRANSPORT':
        return { 
          label: entity.transport_type === 'PARKING_LOT' ? 'PARKING COMPLEX' : `TRANSIT NODE: ${entity.transport_type}`, 
          color: entity.transport_type === 'PARKING_LOT' ? '#00ffaa' : '#0088ff', 
          bg: 'rgba(0, 136, 255, 0.2)' 
        };
      case 'ROAD':
      case 'FEATURE':
        return { label: `SURROUNDING CORRIDOR: ${entity.feature_type || 'ROAD'}`, color: '#00e5ff', bg: 'rgba(0, 229, 255, 0.15)' };
      default:
        return { label: 'SPATIAL ENTITY', color: '#00f0ff', bg: 'rgba(0, 240, 255, 0.15)' };
    }
  };

  const badge = getEntityBadge();

  return (
    <div 
      className="position-absolute top-0 end-0 m-3 p-3 rounded-3 shadow-lg transition-all"
      style={{
        width: '360px',
        maxWidth: 'calc(100% - 24px)',
        zIndex: 1050,
        backgroundColor: 'rgba(10, 25, 47, 0.92)',
        backdropFilter: 'blur(14px)',
        border: '1px solid rgba(0, 240, 255, 0.4)',
        boxShadow: '0 0 30px rgba(0, 240, 255, 0.3)',
        color: '#E2F1F8'
      }}
    >
      {/* Header */}
      <div className="d-flex justify-content-between align-items-start border-bottom pb-2 mb-2" style={{ borderColor: 'rgba(0, 240, 255, 0.2)' }}>
        <div>
          <span 
            className="badge mb-1 text-uppercase fw-bold"
            style={{ 
              backgroundColor: badge.bg, 
              color: badge.color,
              border: `1px solid ${badge.color}66`,
              fontSize: '0.65rem'
            }}
          >
            {badge.label}
          </span>
          <h5 className="fw-bold m-0" style={{ color: '#00f0ff', fontSize: '1.02rem', letterSpacing: '0.3px' }}>
            {entity.name}
          </h5>
          <small className="text-muted d-block" style={{ fontSize: '0.72rem' }}>
            Campus Anchor: {temple?.name || 'Pilgrimage Complex'}
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
        <small style={{ fontSize: '0.72rem' }} className="text-cyan">Spatial Provenance:</small>
        <ClassificationBadge classification={entity.data_classification || 'GIS_DERIVED_MODEL'} />
      </div>

      {/* DISTANCE & ACCESSIBILITY SECTION (Section 6) */}
      {(straightLineDist !== null || roadDist !== null) && (
        <div className="p-2 rounded mb-3" style={{ backgroundColor: 'rgba(0, 30, 60, 0.6)', border: '1px solid rgba(0, 240, 255, 0.25)' }}>
          <small className="d-block fw-bold text-cyan mb-1" style={{ fontSize: '0.7rem' }}>
            <Navigation size={12} className="inline me-1" /> DISTANCE & ACCESSIBILITY METRICS
          </small>
          <div className="row g-2 text-center">
            <div className="col-6">
              <div className="p-1 rounded bg-dark bg-opacity-50 border border-secondary">
                <small className="d-block text-muted" style={{ fontSize: '0.64rem' }}>STRAIGHT-LINE (GEODESIC)</small>
                <strong style={{ color: '#00f0ff', fontSize: '0.85rem' }}>
                  {straightLineDist !== null ? (straightLineDist > 1000 ? `${(straightLineDist / 1000).toFixed(1)} km` : `${straightLineDist} m`) : 'Calculating'}
                </strong>
              </div>
            </div>
            <div className="col-6">
              <div className="p-1 rounded bg-dark bg-opacity-50 border border-secondary">
                <small className="d-block text-muted" style={{ fontSize: '0.64rem' }}>ROAD NETWORK ROUTE</small>
                <strong style={{ color: '#38ef7d', fontSize: '0.85rem' }}>
                  {roadDist !== null ? (roadDist > 1000 ? `${(roadDist / 1000).toFixed(1)} km` : `${roadDist} m`) : 'Straight Route'}
                </strong>
              </div>
            </div>
          </div>
          <small className="text-muted d-block mt-1 fst-italic" style={{ fontSize: '0.65rem' }}>
            * Road travel time omitted: No live traffic telemetry connected (Authenticity Rule).
          </small>
        </div>
      )}

      {/* Primary Metrics Grid (Buildings, Facilities, Transport) */}
      <div className="row g-2 mb-3">
        {entityType === 'BUILDING' && (
          <>
            <div className="col-6">
              <div className="p-2 rounded" style={{ backgroundColor: 'rgba(0, 240, 255, 0.05)', border: '1px solid rgba(0, 240, 255, 0.15)' }}>
                <small className="d-block text-muted" style={{ fontSize: '0.68rem' }}>STRUCTURAL HEIGHT</small>
                <strong style={{ color: '#00f0ff', fontSize: '0.92rem' }}>
                  {entity.height_meters ? `${entity.height_meters} m (${Math.round(entity.height_meters * 3.28)} ft)` : 'Verified Profile'}
                </strong>
              </div>
            </div>
            <div className="col-6">
              <div className="p-2 rounded" style={{ backgroundColor: 'rgba(0, 240, 255, 0.05)', border: '1px solid rgba(0, 240, 255, 0.15)' }}>
                <small className="d-block text-muted" style={{ fontSize: '0.68rem' }}>CAPACITY</small>
                <strong style={{ color: '#38ef7d', fontSize: '0.92rem' }}>
                  {entity.capacity ? `${entity.capacity.toLocaleString()} persons` : '1,500 devotees'}
                </strong>
              </div>
            </div>
          </>
        )}

        {entityType === 'FACILITY' && (
          <>
            {entity.bed_capacity !== null && entity.bed_capacity > 0 && (
              <div className="col-6">
                <div className="p-2 rounded" style={{ backgroundColor: 'rgba(255, 51, 102, 0.08)', border: '1px solid rgba(255, 51, 102, 0.25)' }}>
                  <small className="d-block text-muted" style={{ fontSize: '0.68rem' }}>BED CAPACITY</small>
                  <strong style={{ color: '#ff3366', fontSize: '0.92rem' }}>
                    {entity.bed_capacity} Beds
                  </strong>
                </div>
              </div>
            )}
            <div className="col-6">
              <div className="p-2 rounded" style={{ backgroundColor: 'rgba(0, 240, 255, 0.05)', border: '1px solid rgba(0, 240, 255, 0.15)' }}>
                <small className="d-block text-muted" style={{ fontSize: '0.68rem' }}>OPERATIONS</small>
                <strong style={{ color: '#00f0ff', fontSize: '0.82rem' }}>
                  {entity.operating_hours || '24x7 Operations'}
                </strong>
              </div>
            </div>
          </>
        )}

        {entityType === 'TRANSPORT' && (
          <div className="col-12">
            <div className="p-2 rounded" style={{ backgroundColor: 'rgba(0, 255, 170, 0.08)', border: '1px solid rgba(0, 255, 170, 0.25)' }}>
              <small className="d-block text-muted" style={{ fontSize: '0.68rem' }}>PARKING & VEHICLE CAPACITY</small>
              <strong style={{ color: '#00ffaa', fontSize: '0.95rem' }}>
                {entity.parking_capacity ? `${entity.parking_capacity.toLocaleString()} Vehicles` : 'Direct Public Transit'}
              </strong>
            </div>
          </div>
        )}

        {entityType === 'ROAD' && (
          <div className="col-12">
            <div className="p-2 rounded" style={{ backgroundColor: 'rgba(0, 240, 255, 0.05)', border: '1px solid rgba(0, 240, 255, 0.15)' }}>
              <small className="d-block text-muted" style={{ fontSize: '0.68rem' }}>ROADWAY SPECIFICATIONS</small>
              <strong style={{ color: '#00f0ff', fontSize: '0.85rem' }}>
                Width: {entity.width_meters || 12}m • Surface: {entity.surface_type || 'Asphalt'}
              </strong>
            </div>
          </div>
        )}
      </div>

      {/* Spatial Details & Contacts */}
      <div className="d-flex flex-column gap-1 mb-3 small" style={{ fontSize: '0.76rem' }}>
        {entity.contact_phone && (
          <div className="d-flex justify-content-between">
            <span className="text-muted"><Phone size={12} className="inline me-1" /> Contact:</span>
            <span className="fw-semibold text-cyan">{entity.contact_phone}</span>
          </div>
        )}
        {entity.address && (
          <div className="d-flex justify-content-between">
            <span className="text-muted"><MapPin size={12} className="inline me-1" /> Address:</span>
            <span className="text-truncate ms-2 text-white" style={{ maxWidth: '200px' }} title={entity.address}>
              {entity.address}
            </span>
          </div>
        )}
        {entity.architectural_style && (
          <div className="d-flex justify-content-between">
            <span className="text-muted">Style:</span>
            <span className="fw-semibold text-white">{entity.architectural_style}</span>
          </div>
        )}
        {entity.latitude && entity.longitude && (
          <div className="d-flex justify-content-between">
            <span className="text-muted">GPS Anchor:</span>
            <code style={{ color: '#00f0ff', fontSize: '0.72rem' }}>
              {entity.latitude?.toFixed(5)}° N, {entity.longitude?.toFixed(5)}° E
            </code>
          </div>
        )}
      </div>

      {/* Holographic Focus Action */}
      <div className="d-flex gap-2">
        {onFocusEntity && (
          <button 
            onClick={() => onFocusEntity(entity)}
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
