import React from 'react';
import { 
  Globe, 
  MapPin, 
  Building2, 
  ShieldAlert, 
  Layers, 
  ChevronRight, 
  ChevronLeft,
  AlertCircle,
  Eye,
  Sliders
} from 'lucide-react';

export const NAV_LEVELS = [
  { id: 1, key: 'REGIONAL', label: 'L1: Regional View', icon: Globe, desc: 'Wider regional environment, arterial highways, transit terminals' },
  { id: 2, key: 'CAMPUS', label: 'L2: Temple Campus', icon: MapPin, desc: 'Complete temple campus, perimeter boundaries, queue complexes' },
  { id: 3, key: 'BUILDING', label: 'L3: Building View', icon: Building2, desc: 'Focused architectural structure, height, style, capacity' },
  { id: 4, key: 'ZONE', label: 'L4: Operational Zone', icon: ShieldAlert, desc: 'Crowd management zone, queue corridor, telemetry rings' },
  { id: 5, key: 'FLOOR', label: 'L5: Interior / Floor', icon: Layers, desc: 'Architectural multi-tier floor slices & vertical circulation' },
];

const NavigationLevelBar = ({
  currentLevel = 2,
  onChangeLevel = () => {},
  temple = null,
  selectedBuilding = null,
  selectedZone = null,
  selectedFloor = 1,
  onChangeFloor = () => {},
  isInteriorAvailable = false
}) => {
  // Breadcrumb path construction
  const getBreadcrumbs = () => {
    const crumbs = [
      { level: 1, label: temple?.city ? `${temple.city} Region` : 'Regional View' },
      { level: 2, label: temple?.name ? temple.name.split(' ')[0] + ' Campus' : 'Temple Campus' }
    ];

    if (selectedBuilding) {
      crumbs.push({ 
        level: 3, 
        label: selectedBuilding.name.length > 20 ? selectedBuilding.name.substring(0, 18) + '...' : selectedBuilding.name 
      });
    }

    if (selectedZone) {
      crumbs.push({ 
        level: 4, 
        label: selectedZone.name.length > 20 ? selectedZone.name.substring(0, 18) + '...' : selectedZone.name 
      });
    }

    if (currentLevel === 5 && selectedBuilding && isInteriorAvailable) {
      crumbs.push({ 
        level: 5, 
        label: `Floor L${selectedFloor}` 
      });
    }

    return crumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  const handlePrevLevel = () => {
    if (currentLevel > 1) {
      onChangeLevel(currentLevel - 1);
    }
  };

  const handleNextLevel = () => {
    if (currentLevel < 5) {
      if (currentLevel === 4 && !isInteriorAvailable) return;
      onChangeLevel(currentLevel + 1);
    }
  };

  return (
    <div 
      className="position-absolute start-50 translate-middle-x m-3 p-2 rounded-3 shadow-lg"
      style={{
        top: 0,
        zIndex: 1045,
        backgroundColor: 'rgba(10, 25, 47, 0.94)',
        backdropFilter: 'blur(14px)',
        border: '1px solid rgba(0, 240, 255, 0.4)',
        boxShadow: '0 0 25px rgba(0, 240, 255, 0.25)',
        maxWidth: 'calc(100% - 32px)',
        minWidth: '560px'
      }}
    >
      {/* Top Row: Interactive Breadcrumb Trail & Nav Prev/Next Buttons */}
      <div className="d-flex align-items-center justify-content-between border-bottom pb-2 mb-2" style={{ borderColor: 'rgba(0, 240, 255, 0.2)' }}>
        <div className="d-flex align-items-center flex-wrap gap-1" style={{ fontSize: '0.74rem' }}>
          <span className="text-muted fw-bold me-1">NAV PATH:</span>
          {breadcrumbs.map((crumb, idx) => {
            const isLast = idx === breadcrumbs.length - 1;
            return (
              <React.Fragment key={idx}>
                <button
                  onClick={() => onChangeLevel(crumb.level)}
                  className={`btn btn-xs p-0 px-1 border-0 fw-bold ${
                    isLast ? 'text-cyan' : 'text-muted hover-text-white'
                  }`}
                  style={{ 
                    fontSize: '0.74rem',
                    textDecoration: isLast ? 'underline' : 'none'
                  }}
                >
                  {crumb.label}
                </button>
                {!isLast && <ChevronRight size={12} className="text-secondary" />}
              </React.Fragment>
            );
          })}
        </div>

        {/* Step Forward / Backward Buttons */}
        <div className="d-flex align-items-center gap-1">
          <button
            onClick={handlePrevLevel}
            disabled={currentLevel <= 1}
            className="btn btn-xs py-0 px-2 rounded d-flex align-items-center gap-1"
            style={{
              backgroundColor: currentLevel > 1 ? 'rgba(0, 240, 255, 0.15)' : 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(0, 240, 255, 0.3)',
              color: currentLevel > 1 ? '#00f0ff' : '#667788',
              fontSize: '0.68rem'
            }}
            title="Move to higher geographical view"
          >
            <ChevronLeft size={12} /> Up Level
          </button>

          <button
            onClick={handleNextLevel}
            disabled={currentLevel >= 5 || (currentLevel === 4 && !isInteriorAvailable)}
            className="btn btn-xs py-0 px-2 rounded d-flex align-items-center gap-1"
            style={{
              backgroundColor: currentLevel < 5 && !(currentLevel === 4 && !isInteriorAvailable) ? 'rgba(0, 240, 255, 0.15)' : 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(0, 240, 255, 0.3)',
              color: currentLevel < 5 && !(currentLevel === 4 && !isInteriorAvailable) ? '#00f0ff' : '#667788',
              fontSize: '0.68rem'
            }}
            title="Drill down to focused view"
          >
            Drill Down <ChevronRight size={12} />
          </button>
        </div>
      </div>

      {/* Bottom Row: 5-Level Mode Buttons */}
      <div className="d-flex align-items-center justify-content-between gap-1">
        <div className="d-flex flex-wrap gap-1">
          {NAV_LEVELS.map(lvl => {
            const isActive = currentLevel === lvl.id;
            const isFloorLevel = lvl.id === 5;
            const isDisabled = isFloorLevel && !isInteriorAvailable;
            const Icon = lvl.icon;

            return (
              <button
                key={lvl.id}
                onClick={() => {
                  if (!isDisabled) onChangeLevel(lvl.id);
                }}
                disabled={isDisabled}
                className={`btn btn-xs py-1 px-2 rounded d-flex align-items-center gap-1 transition-all ${
                  isActive ? 'shadow-sm' : ''
                }`}
                style={{
                  backgroundColor: isActive 
                    ? 'rgba(0, 240, 255, 0.3)' 
                    : isDisabled 
                      ? 'rgba(255, 255, 255, 0.03)' 
                      : 'rgba(255, 255, 255, 0.08)',
                  border: `1px solid ${
                    isActive 
                      ? '#00f0ff' 
                      : isDisabled 
                        ? 'rgba(255, 255, 255, 0.1)' 
                        : 'rgba(0, 240, 255, 0.25)'
                  }`,
                  color: isActive 
                    ? '#00f0ff' 
                    : isDisabled 
                      ? '#667788' 
                      : '#D0E4F5',
                  fontSize: '0.7rem',
                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                  fontWeight: isActive ? '700' : '500'
                }}
                title={lvl.desc}
              >
                <Icon size={12} style={{ color: isActive ? '#00f0ff' : isDisabled ? '#667788' : '#38ef7d' }} />
                <span>{lvl.label}</span>
                {isDisabled && (
                  <span className="badge bg-secondary p-0 px-1 ms-1" style={{ fontSize: '0.55rem' }}>
                    N/A
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Level 5 Interior Floor Slicer Controls */}
        {currentLevel === 5 && isInteriorAvailable && selectedBuilding && (
          <div className="d-flex align-items-center gap-1 ps-2 border-start border-secondary">
            <small className="text-muted fw-bold" style={{ fontSize: '0.65rem' }}>FLOOR SLICE:</small>
            {Array.from({ length: selectedBuilding.floors || 1 }, (_, i) => i + 1).map(fl => (
              <button
                key={fl}
                onClick={() => onChangeFloor(fl)}
                className={`btn btn-xs py-0 px-2 rounded fw-bold ${
                  selectedFloor === fl ? 'btn-cyan text-dark' : 'btn-outline-secondary text-white'
                }`}
                style={{ 
                  fontSize: '0.68rem',
                  backgroundColor: selectedFloor === fl ? '#00f0ff' : 'transparent',
                  color: selectedFloor === fl ? '#0a192f' : '#D0E4F5',
                  border: '1px solid rgba(0, 240, 255, 0.4)'
                }}
              >
                L{fl}
              </button>
            ))}
          </div>
        )}

        {/* Level 5 Disabled Warning Notice */}
        {currentLevel === 5 && !isInteriorAvailable && (
          <div className="d-flex align-items-center gap-1 ps-2 text-warning" style={{ fontSize: '0.68rem' }}>
            <AlertCircle size={12} />
            <span>Interior 3D data unavailable.</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default NavigationLevelBar;
