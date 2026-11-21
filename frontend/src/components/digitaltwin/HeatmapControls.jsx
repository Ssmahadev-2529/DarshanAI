import React, { useState } from 'react';
import { 
  Flame, 
  Clock, 
  Sparkles, 
  Eye, 
  History, 
  TrendingUp, 
  ShieldAlert, 
  Info,
  Calendar,
  Layers,
  ChevronRight
} from 'lucide-react';

export const HEATMAP_MODES = {
  CURRENT: 'CURRENT',
  HISTORICAL: 'HISTORICAL',
  PRED_15: 'PRED_15',
  PRED_30: 'PRED_30',
  PRED_60: 'PRED_60'
};

const HeatmapControls = ({
  showHeatmap = true,
  onToggleHeatmap = () => {},
  currentMode = HEATMAP_MODES.CURRENT,
  onChangeMode = () => {},
  replayHour = 12,
  onChangeReplayHour = () => {},
  predictionMeta = null,
  activeTempleName = 'Temple'
}) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div 
      className="position-absolute bottom-0 end-0 m-3 p-3 rounded-3 shadow-lg"
      style={{
        zIndex: 1045,
        backgroundColor: 'rgba(10, 25, 47, 0.94)',
        backdropFilter: 'blur(14px)',
        border: '1px solid rgba(255, 140, 0, 0.4)',
        boxShadow: '0 0 25px rgba(255, 140, 0, 0.25)',
        color: '#E2F1F8',
        maxWidth: '430px',
        width: 'calc(100% - 24px)'
      }}
    >
      {/* Header Bar */}
      <div className="d-flex align-items-center justify-content-between pb-2 mb-2 border-bottom" style={{ borderColor: 'rgba(255, 140, 0, 0.25)' }}>
        <div className="d-flex align-items-center gap-2">
          <span 
            className="d-inline-block rounded-circle"
            style={{ 
              width: '9px', 
              height: '9px', 
              backgroundColor: showHeatmap ? '#f59e0b' : '#64748b',
              boxShadow: showHeatmap ? '0 0 10px #f59e0b' : 'none' 
            }}
          />
          <strong style={{ color: '#f59e0b', fontSize: '0.82rem', letterSpacing: '0.4px' }}>
            3D SPATIAL CROWD HEATMAP
          </strong>
          <span className="badge" style={{ backgroundColor: 'rgba(255, 140, 0, 0.15)', color: '#f59e0b', fontSize: '0.62rem' }}>
            Phase 9
          </span>
        </div>

        <div className="d-flex align-items-center gap-1">
          <button
            onClick={() => onToggleHeatmap(!showHeatmap)}
            className={`btn btn-xs py-0 px-2 rounded fw-bold ${showHeatmap ? 'btn-warning text-dark' : 'btn-outline-secondary text-muted'}`}
            style={{ fontSize: '0.68rem' }}
          >
            {showHeatmap ? 'Heatmap ON' : 'Heatmap OFF'}
          </button>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="btn btn-xs btn-link text-muted p-0 ms-1"
            style={{ textDecoration: 'none' }}
          >
            {collapsed ? 'Expand' : 'Collapse'}
          </button>
        </div>
      </div>

      {!collapsed && showHeatmap && (
        <>
          {/* Time-Based Dimension Selector Pills (Section 5) */}
          <div className="mb-2">
            <small className="d-block text-muted mb-1 fw-bold" style={{ fontSize: '0.66rem' }}>
              HEATMAP TEMPORAL DIMENSION:
            </small>
            <div className="btn-group btn-group-sm w-100" role="group">
              {/* 1. Live Observations */}
              <button
                type="button"
                onClick={() => onChangeMode(HEATMAP_MODES.CURRENT)}
                className={`btn btn-xs py-1 px-2 fw-bold d-flex align-items-center justify-content-center gap-1 ${
                  currentMode === HEATMAP_MODES.CURRENT 
                    ? 'btn-success text-dark' 
                    : 'btn-dark bg-dark text-white border-secondary'
                }`}
                style={{ fontSize: '0.67rem' }}
                title="Real-time CCTV and sensor observations"
              >
                <Eye size={11} /> LIVE STATE
              </button>

              {/* 2. Historical Replay */}
              <button
                type="button"
                onClick={() => onChangeMode(HEATMAP_MODES.HISTORICAL)}
                className={`btn btn-xs py-1 px-2 fw-bold d-flex align-items-center justify-content-center gap-1 ${
                  currentMode === HEATMAP_MODES.HISTORICAL 
                    ? 'btn-primary text-white' 
                    : 'btn-dark bg-dark text-white border-secondary'
                }`}
                style={{ fontSize: '0.67rem' }}
                title="Historical replay from footfall logs"
              >
                <History size={11} /> HISTORICAL
              </button>

              {/* 3. +15m Prediction */}
              <button
                type="button"
                onClick={() => onChangeMode(HEATMAP_MODES.PRED_15)}
                className={`btn btn-xs py-1 px-1 fw-bold d-flex align-items-center justify-content-center gap-1 ${
                  currentMode === HEATMAP_MODES.PRED_15 
                    ? 'btn-warning text-dark' 
                    : 'btn-dark bg-dark text-white border-secondary'
                }`}
                style={{ fontSize: '0.67rem' }}
                title="AI Forecast: +15 minutes"
              >
                <Sparkles size={11} /> +15m
              </button>

              {/* 4. +30m Prediction */}
              <button
                type="button"
                onClick={() => onChangeMode(HEATMAP_MODES.PRED_30)}
                className={`btn btn-xs py-1 px-1 fw-bold d-flex align-items-center justify-content-center gap-1 ${
                  currentMode === HEATMAP_MODES.PRED_30 
                    ? 'btn-warning text-dark' 
                    : 'btn-dark bg-dark text-white border-secondary'
                }`}
                style={{ fontSize: '0.67rem' }}
                title="AI Forecast: +30 minutes"
              >
                <Sparkles size={11} /> +30m
              </button>

              {/* 5. +60m Prediction */}
              <button
                type="button"
                onClick={() => onChangeMode(HEATMAP_MODES.PRED_60)}
                className={`btn btn-xs py-1 px-1 fw-bold d-flex align-items-center justify-content-center gap-1 ${
                  currentMode === HEATMAP_MODES.PRED_60 
                    ? 'btn-warning text-dark' 
                    : 'btn-dark bg-dark text-white border-secondary'
                }`}
                style={{ fontSize: '0.67rem' }}
                title="AI Forecast: +60 minutes"
              >
                <Sparkles size={11} /> +60m
              </button>
            </div>
          </div>

          {/* Contextual Mode Metadata & Replay Slider */}
          {currentMode === HEATMAP_MODES.HISTORICAL && (
            <div className="p-2 rounded mb-2" style={{ backgroundColor: 'rgba(0, 40, 80, 0.5)', border: '1px solid rgba(0, 150, 255, 0.3)' }}>
              <div className="d-flex justify-content-between align-items-center mb-1">
                <small className="text-cyan fw-bold" style={{ fontSize: '0.68rem' }}>
                  <Clock size={11} className="inline me-1" /> REPLAY HOUR: {String(replayHour).padStart(2, '0')}:00 IST
                </small>
                <span className="badge bg-primary text-white" style={{ fontSize: '0.58rem' }}>
                  HISTORICAL_FOOTFALL_LOG
                </span>
              </div>
              <input 
                type="range" 
                className="form-range" 
                min="4" 
                max="22" 
                step="1"
                value={replayHour}
                onChange={(e) => onChangeReplayHour(parseInt(e.target.value))}
              />
              <div className="d-flex justify-content-between text-muted" style={{ fontSize: '0.6rem' }}>
                <span>04:00 (Suprabhatam)</span>
                <span>12:00 (Noon)</span>
                <span>22:00 (Shayan)</span>
              </div>
            </div>
          )}

          {(currentMode === HEATMAP_MODES.PRED_15 || currentMode === HEATMAP_MODES.PRED_30 || currentMode === HEATMAP_MODES.PRED_60) && (
            <div className="p-2 rounded mb-2" style={{ backgroundColor: 'rgba(50, 30, 0, 0.5)', border: '1px solid rgba(255, 170, 0, 0.35)' }}>
              <div className="d-flex justify-content-between align-items-center mb-1">
                <small className="text-warning fw-bold" style={{ fontSize: '0.68rem' }}>
                  <Sparkles size={11} className="inline me-1" />
                  AI MULTI-HORIZON CONGESTION FORECAST ({currentMode.replace('PRED_', '+')}m)
                </small>
                <span className="badge bg-warning text-dark" style={{ fontSize: '0.58rem' }}>
                  MODEL_PREDICTION
                </span>
              </div>
              <div className="d-flex justify-content-between text-muted" style={{ fontSize: '0.64rem' }}>
                <span>Forecast Generated: <strong className="text-white">Just now (UTC)</strong></span>
                <span>Target Horizon: <strong className="text-warning">{currentMode.replace('PRED_', '+')} Minutes</strong></span>
              </div>
              <div className="d-flex justify-content-between text-muted mt-1" style={{ fontSize: '0.6rem' }}>
                <span>Model Confidence: <strong className="text-success">{currentMode === HEATMAP_MODES.PRED_15 ? '94%' : currentMode === HEATMAP_MODES.PRED_30 ? '91%' : '87%'}</strong></span>
                <span className="fst-italic text-warning">* Not a live observation</span>
              </div>
            </div>
          )}

          {/* Color Mapping Legend Bar (Section 3) */}
          <div className="p-2 rounded mb-2" style={{ backgroundColor: 'rgba(0, 20, 40, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <small className="d-block text-muted mb-1 fw-bold" style={{ fontSize: '0.64rem' }}>
              CONGESTION RISK INTENSITY & DENSITY THRESHOLDS:
            </small>
            <div className="d-flex align-items-center justify-content-between gap-1 text-center" style={{ fontSize: '0.6rem' }}>
              <div className="flex-fill p-1 rounded" style={{ backgroundColor: 'rgba(56, 239, 125, 0.2)', border: '1px solid #38ef7d', color: '#38ef7d' }}>
                <strong>NORMAL</strong>
                <div style={{ fontSize: '0.52rem' }}>&lt; 50% (&lt; 1.0 p/m²)</div>
              </div>
              <div className="flex-fill p-1 rounded" style={{ backgroundColor: 'rgba(245, 158, 11, 0.2)', border: '1px solid #f59e0b', color: '#f59e0b' }}>
                <strong>MODERATE</strong>
                <div style={{ fontSize: '0.52rem' }}>50-70% (1-2 p/m²)</div>
              </div>
              <div className="flex-fill p-1 rounded" style={{ backgroundColor: 'rgba(249, 115, 22, 0.2)', border: '1px solid #f97316', color: '#f97316' }}>
                <strong>HIGH</strong>
                <div style={{ fontSize: '0.52rem' }}>70-85% (2-3.5 p/m²)</div>
              </div>
              <div className="flex-fill p-1 rounded" style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', color: '#ef4444' }}>
                <strong>CRITICAL</strong>
                <div style={{ fontSize: '0.52rem' }}>&gt; 85% (&gt; 3.5 p/m²)</div>
              </div>
              <div className="flex-fill p-1 rounded" style={{ backgroundColor: 'rgba(148, 163, 184, 0.2)', border: '1px solid #94a3b8', color: '#94a3b8' }}>
                <strong>UNKNOWN</strong>
                <div style={{ fontSize: '0.52rem' }}>Unmeasured</div>
              </div>
            </div>
          </div>

          {/* Estimation Methodology Disclosure (Section 7) */}
          <div className="d-flex align-items-start gap-1 text-muted" style={{ fontSize: '0.61rem', lineHeight: '1.2' }}>
            <Info size={11} className="text-warning flex-shrink-0 mt-0.5" />
            <span>
              <strong>Methodology:</strong> Spatial Density = Count / Usable Area. Capacity Utilization is computed only against verified physical capacity. Unmeasured zones display as Unknown (Grey).
            </span>
          </div>
        </>
      )}
    </div>
  );
};

export default HeatmapControls;
