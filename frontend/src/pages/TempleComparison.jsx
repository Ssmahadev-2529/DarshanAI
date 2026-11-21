import React, { useState, useEffect, useContext, useMemo } from 'react';
import API from '../services/api';
import { AuthContext } from '../context/AuthContext';
import Loading from '../components/Loading';
import {
  Building2,
  TrendingUp,
  ShieldCheck,
  Activity,
  AlertTriangle,
  Scale,
  Users,
  Car,
  Clock,
  Sparkles,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Cpu
} from 'lucide-react';

const TempleComparison = () => {
  const { user } = useContext(AuthContext);

  const [comparisonData, setComparisonData] = useState(null);
  const [compatibilityMatrix, setCompatibilityMatrix] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemples, setSelectedTemples] = useState({
    'TEMPLE-001': true,
    'TEMPLE-002': true,
    'TEMPLE-003': true,
    'TEMPLE-005': true
  });
  const [activeTab, setActiveTab] = useState('ALL'); // ALL, VISITOR, SPATIAL, FESTIVAL, INFRASTRUCTURE, COMPATIBILITY

  useEffect(() => {
    const fetchComparison = async () => {
      try {
        setLoading(true);
        const [compRes, compatRes] = await Promise.allSettled([
          API.get('/analytics/temple-comparison'),
          API.get('/analytics/metric-compatibility')
        ]);

        if (compRes.status === 'fulfilled') {
          setComparisonData(compRes.value.data);
        }
        if (compatRes.status === 'fulfilled') {
          setCompatibilityMatrix(compatRes.value.data?.compatibility_rules || []);
        }
      } catch (err) {
        console.error('Failed to load multi-temple comparison:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchComparison();
  }, []);

  const toggleTemple = (tid) => {
    // Keep at least 2 temples selected
    const activeCount = Object.values(selectedTemples).filter(Boolean).length;
    if (selectedTemples[tid] && activeCount <= 2) {
      alert('At least 2 temples must be selected for benchmarking.');
      return;
    }
    setSelectedTemples(prev => ({ ...prev, [tid]: !prev[tid] }));
  };

  const visibleTemples = useMemo(() => {
    if (!comparisonData?.comparison_matrix) return [];
    return comparisonData.comparison_matrix.filter(t => selectedTemples[t.temple_id]);
  }, [comparisonData, selectedTemples]);

  if (loading) return <Loading />;

  return (
    <div className="container-fluid p-4" style={{ minHeight: 'calc(100vh - 65px)', backgroundColor: '#F9F6F0' }}>
      {/* Page Header */}
      <div className="d-flex flex-wrap align-items-center justify-content-between mb-4 gap-2">
        <div>
          <h4 className="fw-bold text-maroon m-0 d-flex align-items-center gap-2">
            <Scale size={24} className="text-maroon" /> Multi-Temple Comparative Analytics & Benchmarking
          </h4>
          <small className="text-muted">
            Cross-temple comparison engine across Somnath, Tirupati, Meenakshi, and Kashi Vishwanath with scientific normalization guardrails
          </small>
        </div>

        <div className="d-flex align-items-center gap-2">
          <span className="badge bg-success bg-opacity-15 text-success border border-success d-flex align-items-center gap-1 px-3 py-2">
            <ShieldCheck size={16} /> Strict Metric Normalization Active
          </span>
        </div>
      </div>

      {/* Temple Selection Pills */}
      <div className="bg-white p-3 rounded shadow-sm border border-beige mb-4 d-flex flex-wrap align-items-center justify-content-between gap-3">
        <div className="d-flex flex-wrap align-items-center gap-2">
          <span className="text-muted small fw-bold text-uppercase me-2">Selected Shrines:</span>
          {comparisonData?.comparison_matrix?.map(t => {
            const isChecked = !!selectedTemples[t.temple_id];
            return (
              <button
                key={t.temple_id}
                onClick={() => toggleTemple(t.temple_id)}
                className={`btn btn-sm d-flex align-items-center gap-2 px-3 py-1 rounded-pill transition-all ${
                  isChecked 
                    ? 'btn-maroon text-white shadow-sm' 
                    : 'btn-outline-secondary bg-light text-muted'
                }`}
                style={{
                  backgroundColor: isChecked ? '#800000' : '#f8f9fa',
                  borderColor: isChecked ? '#800000' : '#dee2e6'
                }}
              >
                <span className={`rounded-circle d-inline-block`} style={{ width: 8, height: 8, backgroundColor: isChecked ? '#ffc107' : '#adb5bd' }} />
                <span>{t.temple_name}</span>
                <small className={isChecked ? 'text-warning' : 'text-muted'}>({t.city})</small>
              </button>
            );
          })}
        </div>

        <div className="small text-muted">
          Comparing <strong>{visibleTemples.length}</strong> of {comparisonData?.temples_compared_count || 4} registered shrines
        </div>
      </div>

      {/* High-Level Comparison Summary Cards */}
      <div className="row g-3 mb-4">
        {visibleTemples.map(t => (
          <div key={t.temple_id} className="col-12 col-md-6 col-xl-3">
            <div className="card h-100 border-beige shadow-sm bg-white">
              <div className="card-body p-3">
                <div className="d-flex align-items-start justify-content-between mb-2">
                  <div>
                    <span className="badge bg-light text-muted border small mb-1">{t.temple_id}</span>
                    <h6 className="fw-bold text-maroon m-0 text-truncate" title={t.temple_name}>
                      {t.temple_name}
                    </h6>
                    <small className="text-muted">{t.city}, {t.state}</small>
                  </div>
                  <span className="badge bg-warning bg-opacity-25 text-dark fw-bold border border-warning">
                    {t.peak_festival_surge_multiplier}x Surge
                  </span>
                </div>

                <div className="py-2 border-top border-bottom border-light my-2">
                  <div className="d-flex justify-content-between small mb-1">
                    <span className="text-muted">Campus Area:</span>
                    <strong className="text-dark">{t.campus_area_sqm.toLocaleString()} m²</strong>
                  </div>
                  <div className="d-flex justify-content-between small mb-1">
                    <span className="text-muted">Daily Avg Footfall:</span>
                    <strong className="text-dark">{t.daily_avg_footfall.toLocaleString()}</strong>
                  </div>
                  <div className="d-flex justify-content-between small mb-1">
                    <span className="text-muted">Normalized Density:</span>
                    <strong className="text-dark">{t.crowd_density_formatted}</strong>
                  </div>
                  <div className="d-flex justify-content-between small">
                    <span className="text-muted">Verified Parking:</span>
                    <strong className="text-dark">{t.verified_parking_bays.toLocaleString()} bays</strong>
                  </div>
                </div>

                <div className="d-flex justify-content-between align-items-center text-muted" style={{ fontSize: '11px' }}>
                  <span>AI Accuracy: <strong>{t.prediction_mae_devotees} MAE</strong></span>
                  <span>{t.active_cctv_streams} CCTV streams</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Comprehensive Metric Comparison Table */}
      <div className="card border-beige shadow-sm bg-white mb-4">
        <div className="card-header bg-white border-bottom border-beige p-3 d-flex flex-wrap align-items-center justify-content-between gap-2">
          <h6 className="fw-bold text-maroon m-0 d-flex align-items-center gap-2">
            <Activity size={18} className="text-maroon" /> Side-by-Side Metric Normalization Matrix
          </h6>
          <small className="text-muted">
            All spatial density metrics normalized to devotees/m² based on verified cadastral polygon surveys
          </small>
        </div>

        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0 small">
            <thead className="table-light text-muted">
              <tr>
                <th style={{ width: '22%' }}>Indicator / Attribute</th>
                {visibleTemples.map(t => (
                  <th key={t.temple_id} className="text-center" style={{ width: `${78 / visibleTemples.length}%` }}>
                    <div className="fw-bold text-dark">{t.temple_name}</div>
                    <small className="text-muted fw-normal">{t.city}</small>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* 1. VISITOR METRICS */}
              <tr className="table-warning bg-opacity-25">
                <td colSpan={visibleTemples.length + 1} className="fw-bold text-uppercase text-dark py-1" style={{ fontSize: '11px', letterSpacing: '0.5px' }}>
                  1. Visitor Volume & Attendance Benchmarking
                </td>
              </tr>
              <tr>
                <td className="fw-semibold text-secondary">Annual Footfall (Estimated)</td>
                {visibleTemples.map(t => (
                  <td key={t.temple_id} className="text-center fw-bold text-dark">
                    {(t.annual_footfall_est / 1000000).toFixed(1)} Million devotees/yr
                  </td>
                ))}
              </tr>
              <tr>
                <td className="fw-semibold text-secondary">Daily Non-Peak Influx Average</td>
                {visibleTemples.map(t => (
                  <td key={t.temple_id} className="text-center">
                    {t.daily_avg_footfall.toLocaleString()} devotees/day
                  </td>
                ))}
              </tr>
              <tr>
                <td className="fw-semibold text-secondary">Official Holding Capacity</td>
                {visibleTemples.map(t => (
                  <td key={t.temple_id} className="text-center">
                    {t.official_capacity.toLocaleString()} devotees
                  </td>
                ))}
              </tr>
              <tr>
                <td className="fw-semibold text-secondary">Currently Observed on Campus</td>
                {visibleTemples.map(t => (
                  <td key={t.temple_id} className="text-center fw-bold text-maroon">
                    {t.currently_observed_devotees.toLocaleString()} ({t.capacity_utilization_pct}%)
                  </td>
                ))}
              </tr>

              {/* 2. SPATIAL DENSITY NORMALIZATION */}
              <tr className="table-warning bg-opacity-25">
                <td colSpan={visibleTemples.length + 1} className="fw-bold text-uppercase text-dark py-1" style={{ fontSize: '11px', letterSpacing: '0.5px' }}>
                  2. Spatial Geometry & Normalized Crowd Density (devotees / m²)
                </td>
              </tr>
              <tr>
                <td className="fw-semibold text-secondary">Verified Campus Survey Area</td>
                {visibleTemples.map(t => (
                  <td key={t.temple_id} className="text-center">
                    <span className="badge bg-light text-dark border fw-bold">
                      {t.campus_area_sqm.toLocaleString()} m²
                    </span>
                  </td>
                ))}
              </tr>
              <tr>
                <td className="fw-semibold text-secondary">Area Verification Authority</td>
                {visibleTemples.map(t => (
                  <td key={t.temple_id} className="text-center text-muted" style={{ fontSize: '11px' }}>
                    {t.area_verification_source}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="fw-semibold text-secondary">Campus Spatial Density</td>
                {visibleTemples.map(t => (
                  <td key={t.temple_id} className="text-center fw-bold text-dark">
                    <span className="badge bg-primary bg-opacity-15 text-primary border border-primary px-2 py-1">
                      {t.crowd_density_formatted}
                    </span>
                  </td>
                ))}
              </tr>

              {/* 3. FESTIVAL SURGE & QUEUE OPERATIONS */}
              <tr className="table-warning bg-opacity-25">
                <td colSpan={visibleTemples.length + 1} className="fw-bold text-uppercase text-dark py-1" style={{ fontSize: '11px', letterSpacing: '0.5px' }}>
                  3. Festival Surge Multipliers & Queue Waiting Durations
                </td>
              </tr>
              <tr>
                <td className="fw-semibold text-secondary">Peak Festival Surge Multiplier</td>
                {visibleTemples.map(t => (
                  <td key={t.temple_id} className="text-center fw-bold text-danger fs-6">
                    {t.peak_festival_surge_multiplier}x
                  </td>
                ))}
              </tr>
              <tr>
                <td className="fw-semibold text-secondary">Non-Peak Normal Queue Wait</td>
                {visibleTemples.map(t => (
                  <td key={t.temple_id} className="text-center">
                    {t.normal_wait_minutes} minutes
                  </td>
                ))}
              </tr>
              <tr>
                <td className="fw-semibold text-secondary">Peak Festival Queue Wait</td>
                {visibleTemples.map(t => (
                  <td key={t.temple_id} className="text-center fw-bold text-danger">
                    {t.peak_festival_wait_minutes} min ({Math.round(t.peak_festival_wait_minutes/60)} hrs)
                  </td>
                ))}
              </tr>
              <tr>
                <td className="fw-semibold text-secondary">Registered Festivals in Catalog</td>
                {visibleTemples.map(t => (
                  <td key={t.temple_id} className="text-center">
                    <span className="badge bg-warning bg-opacity-25 text-dark border border-warning">
                      {t.registered_festivals} verified events
                    </span>
                  </td>
                ))}
              </tr>

              {/* 4. INFRASTRUCTURE & AI EDGE */}
              <tr className="table-warning bg-opacity-25">
                <td colSpan={visibleTemples.length + 1} className="fw-bold text-uppercase text-dark py-1" style={{ fontSize: '11px', letterSpacing: '0.5px' }}>
                  4. Physical Infrastructure & AI Edge Model Validation
                </td>
              </tr>
              <tr>
                <td className="fw-semibold text-secondary">Verified Parking Bay Capacity</td>
                {visibleTemples.map(t => (
                  <td key={t.temple_id} className="text-center fw-bold text-dark">
                    <Car size={13} className="me-1 text-muted" /> {t.verified_parking_bays.toLocaleString()} bays
                  </td>
                ))}
              </tr>
              <tr>
                <td className="fw-semibold text-secondary">Active CCTV Computer Vision Streams</td>
                {visibleTemples.map(t => (
                  <td key={t.temple_id} className="text-center">
                    {t.active_cctv_streams} calibrated feeds
                  </td>
                ))}
              </tr>
              <tr>
                <td className="fw-semibold text-secondary">AI Prediction Error (MAE)</td>
                {visibleTemples.map(t => (
                  <td key={t.temple_id} className="text-center text-success fw-bold">
                    ±{t.prediction_mae_devotees} devotees
                  </td>
                ))}
              </tr>
              <tr>
                <td className="fw-semibold text-secondary">AI Root Mean Square Error (RMSE)</td>
                {visibleTemples.map(t => (
                  <td key={t.temple_id} className="text-center text-muted">
                    {t.prediction_rmse_devotees} devotees
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Metric Compatibility & Scientific Normalization Panel */}
      <div className="card border-beige shadow-sm bg-white">
        <div className="card-header bg-white border-bottom border-beige p-3 d-flex align-items-center justify-content-between">
          <div>
            <h6 className="fw-bold text-maroon m-0 d-flex align-items-center gap-2">
              <ShieldCheck size={18} className="text-success" /> Metric Compatibility & Scientific Normalization Protocol
            </h6>
            <small className="text-muted">
              DARSHANAI 2.0 strictly isolates incompatible metrics to prevent ungrounded comparisons and false operational inferences
            </small>
          </div>
        </div>

        <div className="card-body p-4">
          <div className="row g-3">
            {compatibilityMatrix.map(m => (
              <div key={m.metric_key} className="col-12 col-md-6">
                <div 
                  className={`p-3 rounded border h-100 ${
                    m.is_comparable 
                      ? 'border-success bg-success bg-opacity-10' 
                      : 'border-danger bg-danger bg-opacity-10'
                  }`}
                >
                  <div className="d-flex align-items-start justify-content-between gap-2 mb-2">
                    <div className="d-flex align-items-center gap-2">
                      {m.is_comparable ? (
                        <CheckCircle2 size={18} className="text-success flex-shrink-0" />
                      ) : (
                        <XCircle size={18} className="text-danger flex-shrink-0" />
                      )}
                      <strong className={m.is_comparable ? 'text-dark' : 'text-danger'}>
                        {m.label}
                      </strong>
                    </div>

                    <span className={`badge ${m.is_comparable ? 'bg-success' : 'bg-danger'}`}>
                      {m.is_comparable ? 'Comparable' : 'Not comparable with available data'}
                    </span>
                  </div>

                  <p className="text-muted small m-0" style={{ lineHeight: '1.5' }}>
                    {m.reason}
                  </p>

                  <div className="mt-2 pt-2 border-top border-light d-flex justify-content-between small text-muted">
                    <span>Category: <strong>{m.category}</strong></span>
                    <span>Standard Unit: <code>{m.units}</code></span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="alert alert-info mt-4 mb-0 small d-flex align-items-center gap-2">
            <HelpCircle size={18} className="text-info flex-shrink-0" />
            <div>
              <strong>Scientific Normalization Notice:</strong> Temple administrations vary in geographical topology, urban density, and spiritual architecture. Ranking temples on raw unnormalized indicators without verified spatial denominators leads to hazardous crowd management conclusions. DARSHANAI 2.0 strictly enforces spatial density in devotees/m² and suppresses non-standardized variables.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TempleComparison;
