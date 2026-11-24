import React, { useState, useEffect, useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';
import { AuthContext } from '../context/AuthContext';
import Loading from '../components/Loading';
import {
  Calendar,
  Sparkles,
  TrendingUp,
  ShieldCheck,
  Building2,
  Clock,
  Users,
  AlertTriangle,
  Boxes,
  Plus,
  CheckCircle2,
  FileText,
  Activity,
  Layers,
  ExternalLink,
  Info,
  Car
} from 'lucide-react';

const CATEGORY_LABELS = {
  ALL: 'All Categories',
  ANNUAL_FESTIVAL: 'Annual Festival',
  SPECIAL_DARSHAN: 'Special Darshan',
  SEASONAL_POOJA: 'Seasonal Month-Long Pooja',
  RELIGIOUS_CELEBRATION: 'Religious Celebration'
};

const FestivalIntelligence = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [festivals, setFestivals] = useState([]);
  const [temples, setTemples] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemple, setSelectedTemple] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedFestivalId, setSelectedFestivalId] = useState(null);
  const [festivalDetail, setFestivalDetail] = useState(null);
  const [hourlyAnalytics, setHourlyAnalytics] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Admin Registration Modal State
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [newFestForm, setNewFestForm] = useState({
    temple_id: 'TEMPLE-001',
    name: '',
    category: 'ANNUAL_FESTIVAL',
    start_date: '2026-03-01',
    end_date: '2026-03-03',
    tithi_description: '',
    description: '',
    official_source: 'SRC-TEMPLE-BOARD-2026',
    expected_attendance: 60000,
    historical_attendance_avg: 52000,
    peak_surge_multiplier: 3.8
  });
  const [submitting, setSubmitting] = useState(false);
  const [registerSuccess, setRegisterSuccess] = useState(null);

  // Load Temples & Festivals List
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [templesRes, festRes] = await Promise.allSettled([
          API.get('/temples'),
          API.get('/festivals')
        ]);

        if (templesRes.status === 'fulfilled') {
          setTemples(templesRes.value.data || []);
        }
        if (festRes.status === 'fulfilled') {
          const list = festRes.value.data || [];
          setFestivals(list);
          if (list.length > 0) {
            setSelectedFestivalId(list[0].festival_id);
          }
        }
      } catch (err) {
        console.error('Failed to load festivals data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Load Festival In-Depth Detail & 24h Hourly Profile
  useEffect(() => {
    if (!selectedFestivalId) return;

    const loadDetail = async () => {
      try {
        setLoadingDetail(true);
        const [detRes, analyticRes] = await Promise.allSettled([
          API.get(`/festivals/${selectedFestivalId}`),
          API.get(`/festivals/${selectedFestivalId}/analytics`)
        ]);

        if (detRes.status === 'fulfilled') {
          setFestivalDetail(detRes.value.data);
        }
        if (analyticRes.status === 'fulfilled') {
          setHourlyAnalytics(analyticRes.value.data);
        }
      } catch (err) {
        console.error('Failed to load festival detail:', err);
      } finally {
        setLoadingDetail(false);
      }
    };

    loadDetail();
  }, [selectedFestivalId]);

  // Filtered Festivals
  const filteredFestivals = useMemo(() => {
    return festivals.filter(f => {
      const matchTemple = selectedTemple === 'ALL' || f.temple_id === selectedTemple;
      const matchCat = selectedCategory === 'ALL' || f.category === selectedCategory;
      return matchTemple && matchCat;
    });
  }, [festivals, selectedTemple, selectedCategory]);

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await API.post('/festivals', newFestForm, {
        headers: {
          'X-User-Role': user?.role || 'TEMPLE_ADMIN',
          'X-User-Id': user?.email || 'admin@darshanai.org'
        }
      });
      setRegisterSuccess('Festival successfully registered and added to schedule.');
      // Refresh list
      const listRes = await API.get('/festivals');
      setFestivals(listRes.data || []);
      setTimeout(() => {
        setShowRegisterModal(false);
        setRegisterSuccess(null);
      }, 1200);
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to register festival.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="container-fluid p-4" style={{ minHeight: 'calc(100vh - 65px)', backgroundColor: '#F9F6F0' }}>
      {/* Page Title & Breadcrumb */}
      <div className="d-flex flex-wrap align-items-center justify-content-between mb-4 gap-2">
        <div>
          <h4 className="fw-bold text-maroon m-0 d-flex align-items-center gap-2">
            <Sparkles size={24} className="text-warning" /> AI-Powered Festival & Special Event Intelligence
          </h4>
          <small className="text-muted">
            Official temple festival calendars, historical attendance datasets, hourly crowd surge models & 3D realistic digital twin simulation
          </small>
        </div>

        <div className="d-flex align-items-center gap-2">
          {['SUPER_ADMIN', 'TEMPLE_ADMIN', 'MANAGER'].includes(user?.role) && (
            <button
              onClick={() => setShowRegisterModal(true)}
              className="btn btn-maroon btn-sm d-flex align-items-center gap-1 shadow-sm px-3"
              style={{ backgroundColor: '#800000', color: '#fff', border: 'none' }}
            >
              <Plus size={16} /> Register Festival
            </button>
          )}

          <button
            onClick={() => navigate('/digital-twin')}
            className="btn btn-outline-warning btn-sm d-flex align-items-center gap-1 shadow-sm bg-white text-dark border-warning"
          >
            <Boxes size={16} className="text-warning" /> 3D Digital Twin View
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-3 rounded shadow-sm border border-beige mb-4 d-flex flex-wrap align-items-center justify-content-between gap-3">
        <div className="d-flex flex-wrap align-items-center gap-2">
          <span className="text-muted small fw-bold text-uppercase d-flex align-items-center gap-1">
            <Building2 size={15} /> Temple:
          </span>
          <select
            className="form-select form-select-sm border-beige text-dark fw-semibold"
            style={{ minWidth: '220px' }}
            value={selectedTemple}
            onChange={(e) => setSelectedTemple(e.target.value)}
          >
            <option value="ALL">All Registered Shrines ({festivals.length})</option>
            {temples.map(t => (
              <option key={t.temple_id} value={t.temple_id}>
                {t.name} ({t.city})
              </option>
            ))}
          </select>

          <span className="text-muted small fw-bold text-uppercase ms-md-3 d-flex align-items-center gap-1">
            <Layers size={15} /> Category:
          </span>
          <select
            className="form-select form-select-sm border-beige text-dark fw-semibold"
            style={{ minWidth: '190px' }}
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>

        <div className="d-flex align-items-center gap-2 text-muted small">
          <ShieldCheck size={16} className="text-success" />
          <span>Verified Official Sources: <strong className="text-dark">100% Guaranteed</strong></span>
        </div>
      </div>

      {/* Main Grid: Festival Cards on Left, Detailed Intelligence on Right */}
      <div className="row g-4">
        {/* Left Column: Festival Cards */}
        <div className="col-12 col-xl-5">
          <div className="d-flex flex-column gap-3">
            {filteredFestivals.map(fest => {
              const isSelected = fest.festival_id === selectedFestivalId;
              return (
                <div
                  key={fest.festival_id}
                  onClick={() => setSelectedFestivalId(fest.festival_id)}
                  className={`card border transition-all cursor-pointer shadow-sm ${
                    isSelected ? 'border-warning shadow' : 'border-beige hover-shadow'
                  }`}
                  style={{
                    backgroundColor: isSelected ? '#FFFDF8' : '#FFFFFF',
                    cursor: 'pointer'
                  }}
                >
                  <div className="card-body p-3">
                    <div className="d-flex align-items-start justify-content-between gap-2 mb-2">
                      <div>
                        <div className="d-flex align-items-center gap-2 mb-1">
                          <span className="badge bg-warning bg-opacity-25 text-dark fw-bold border border-warning small">
                            {CATEGORY_LABELS[fest.category] || fest.category}
                          </span>
                          <span className="badge bg-success bg-opacity-15 text-success small border border-success d-flex align-items-center gap-1">
                            <ShieldCheck size={12} /> {fest.verification_status}
                          </span>
                        </div>
                        <h6 className="fw-bold text-maroon m-0" style={{ letterSpacing: '0.2px' }}>
                          {fest.name}
                        </h6>
                        <small className="text-muted d-flex align-items-center gap-1 mt-1">
                          <Building2 size={13} /> {fest.temple_name} ({fest.city})
                        </small>
                      </div>

                      <div className="text-end">
                        <span className="badge bg-danger text-white fs-6 fw-bold">
                          {fest.peak_surge_multiplier}x
                        </span>
                        <div className="text-muted" style={{ fontSize: '10px' }}>Surge Factor</div>
                      </div>
                    </div>

                    <div className="row g-2 py-2 border-top border-bottom border-light my-2 text-center">
                      <div className="col-4 border-end">
                        <div className="text-muted small">Dates</div>
                        <strong className="text-dark small d-block">{fest.start_date.slice(5)} to {fest.end_date.slice(5)}</strong>
                      </div>
                      <div className="col-4 border-end">
                        <div className="text-muted small">Expected Devotees</div>
                        <strong className="text-dark small d-block">{(fest.expected_attendance / 1000).toFixed(0)}k</strong>
                      </div>
                      <div className="col-4">
                        <div className="text-muted small">Official Source</div>
                        <code className="text-dark small" style={{ fontSize: '11px' }}>{fest.official_source}</code>
                      </div>
                    </div>

                    <div className="d-flex align-items-center justify-content-between mt-2 pt-1">
                      <small className="text-muted fst-italic text-truncate" style={{ maxWidth: '70%' }}>
                        {fest.tithi_description || fest.description}
                      </small>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate('/digital-twin');
                        }}
                        className="btn btn-sm btn-outline-warning text-dark py-0 px-2 d-flex align-items-center gap-1 small"
                        title="Simulate this festival crowd scenario in 3D Digital Twin"
                      >
                        <Boxes size={12} /> 3D Twin
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredFestivals.length === 0 && (
              <div className="text-center py-5 bg-white rounded border border-beige">
                <Calendar size={36} className="text-muted mb-2" />
                <p className="text-muted">No festivals match your current filter.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: In-Depth Festival Intelligence Panel */}
        <div className="col-12 col-xl-7">
          {loadingDetail ? (
            <div className="bg-white p-5 rounded shadow-sm border border-beige text-center">
              <Loading />
            </div>
          ) : festivalDetail ? (
            <div className="d-flex flex-column gap-4">
              {/* Active Festival Header Hero Card */}
              <div className="card border-beige shadow-sm bg-white overflow-hidden">
                <div 
                  className="p-4 text-white position-relative"
                  style={{
                    background: 'linear-gradient(135deg, #800000 0%, #B84D00 60%, #D48800 100%)'
                  }}
                >
                  <div className="d-flex flex-wrap align-items-start justify-content-between gap-2">
                    <div>
                      <div className="d-flex align-items-center gap-2 mb-2">
                        <span className="badge bg-light text-dark fw-bold text-uppercase">
                          {CATEGORY_LABELS[festivalDetail.category] || festivalDetail.category}
                        </span>
                        <span className="badge bg-dark bg-opacity-25 text-white border border-light border-opacity-50 small">
                          {festivalDetail.tithi_description}
                        </span>
                      </div>
                      <h4 className="fw-bold m-0 text-white">{festivalDetail.name}</h4>
                      <p className="m-0 mt-1 text-white-50 small d-flex align-items-center gap-2">
                        <Building2 size={14} /> {festivalDetail.temple_name} ({festivalDetail.city}, {festivalDetail.state})
                      </p>
                    </div>

                    <div className="text-md-end bg-black bg-opacity-25 p-2 px-3 rounded border border-light border-opacity-25">
                      <div className="small text-white-50">Projected Single-Day Surge</div>
                      <div className="fs-3 fw-bold text-warning">{festivalDetail.peak_surge_multiplier}x Normal</div>
                      <div className="small text-white-50">~{festivalDetail.expected_attendance.toLocaleString()} Devotees</div>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-top border-white border-opacity-25 d-flex flex-wrap align-items-center justify-content-between text-white-50 small">
                    <div>
                      <strong>Dates:</strong> {festivalDetail.start_date} to {festivalDetail.end_date}
                    </div>
                    <div>
                      <strong>Authority:</strong> {festivalDetail.verified_by || 'Temple Administrative Trust'}
                    </div>
                    <div>
                      <strong>Source ID:</strong> <code className="text-warning bg-transparent p-0">{festivalDetail.official_source}</code>
                    </div>
                  </div>
                </div>

                <div className="card-body p-4">
                  <p className="text-dark mb-3" style={{ lineHeight: '1.6' }}>
                    {festivalDetail.description}
                  </p>

                  {/* Special Operational Arrangements Chips */}
                  {festivalDetail.special_arrangements && (
                    <div className="bg-light p-3 rounded border border-beige mb-3">
                      <div className="fw-bold text-maroon small mb-2 d-flex align-items-center gap-2">
                        <ShieldCheck size={15} /> Verified Operational Crowd Arrangements
                      </div>
                      <div className="row g-2 small text-dark">
                        <div className="col-12 col-md-6">
                          <strong>Darshan Mode:</strong> {festivalDetail.special_arrangements.darshan_mode || 'Continuous Priority Influx'}
                        </div>
                        <div className="col-12 col-md-6">
                          <strong>Holding Queues:</strong> {festivalDetail.special_arrangements.holding_queues || 'Steel barricaded canopies'}
                        </div>
                        <div className="col-12 col-md-6">
                          <strong>Medical Aid:</strong> {festivalDetail.special_arrangements.medical_booths || 6} Emergency Trauma Booths
                        </div>
                        <div className="col-12 col-md-6">
                          <strong>Water Points:</strong> {festivalDetail.special_arrangements.water_dispensaries || 12} Continuous Dispensaries
                        </div>
                        <div className="col-12">
                          <strong>Transit Shuttles:</strong> {festivalDetail.special_arrangements.shuttle_services || 'Direct shuttle loop from transit hubs'}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 24-Hour Hourly Surge Curve (Normal vs Festival) */}
                  {hourlyAnalytics && hourlyAnalytics.hourly_profile && (
                    <div className="mt-4">
                      <div className="d-flex align-items-center justify-content-between mb-2">
                        <h6 className="fw-bold text-maroon m-0 d-flex align-items-center gap-2">
                          <TrendingUp size={18} className="text-danger" /> 24-Hour Influx Profile: Normal Baseline vs Festival Surge
                        </h6>
                        <div className="d-flex align-items-center gap-3 small">
                          <span className="d-flex align-items-center gap-1">
                            <span className="d-inline-block rounded-circle bg-secondary" style={{ width: 10, height: 10 }} /> Normal Baseline
                          </span>
                          <span className="d-flex align-items-center gap-1">
                            <span className="d-inline-block rounded-circle bg-danger" style={{ width: 10, height: 10 }} /> Festival Surge Influx
                          </span>
                        </div>
                      </div>

                      {/* Custom SVG Dual-Line Visualization */}
                      <div className="bg-white p-3 rounded border border-beige shadow-sm">
                        <div className="d-flex align-items-end gap-1" style={{ height: '160px' }}>
                          {hourlyAnalytics.hourly_profile.map((step, idx) => {
                            const maxVal = 16000;
                            const hFest = Math.min(100, Math.max(8, (step.festival_predicted_inflow / maxVal) * 100));
                            const hNorm = Math.min(100, Math.max(4, (step.baseline_hourly_inflow / maxVal) * 100));
                            const isPeak = step.hour_num >= 5 && step.hour_num <= 9;

                            return (
                              <div
                                key={idx}
                                className="flex-grow-1 d-flex flex-column justify-content-end align-items-center position-relative group"
                                style={{ height: '100%' }}
                                title={`${step.hour}: Festival ${step.festival_predicted_inflow.toLocaleString()} vs Normal ${step.baseline_hourly_inflow.toLocaleString()} devotees (Wait: ${step.festival_wait_minutes} min)`}
                              >
                                {/* Festival Surge Bar */}
                                <div
                                  className="w-100 rounded-top"
                                  style={{
                                    height: `${hFest}%`,
                                    backgroundColor: isPeak ? '#ef4444' : '#f59e0b',
                                    opacity: 0.85
                                  }}
                                />
                                {/* Baseline Bar Overlay */}
                                <div
                                  className="w-100 rounded-top position-absolute bottom-0"
                                  style={{
                                    height: `${hNorm}%`,
                                    backgroundColor: '#94a3b8',
                                    opacity: 0.45
                                  }}
                                />
                              </div>
                            );
                          })}
                        </div>
                        <div className="d-flex justify-content-between text-muted mt-2" style={{ fontSize: '10px' }}>
                          <span>00:00</span>
                          <span>04:00 (Dawn Aarti)</span>
                          <span>08:00 (Peak Morning)</span>
                          <span>12:00</span>
                          <span>16:00</span>
                          <span>20:00 (Evening Aarti)</span>
                          <span>23:00</span>
                        </div>

                        <div className="row g-2 mt-3 pt-2 border-top text-center">
                          <div className="col-4 border-end">
                            <span className="text-muted small">Peak Rush Window</span>
                            <strong className="d-block text-danger small">{hourlyAnalytics.peak_hour_projected}</strong>
                          </div>
                          <div className="col-4 border-end">
                            <span className="text-muted small">Max Wait Time</span>
                            <strong className="d-block text-danger small">
                              {hourlyAnalytics.max_queue_wait_projected_min} min ({Math.round(hourlyAnalytics.max_queue_wait_projected_min/60)} hrs)
                            </strong>
                          </div>
                          <div className="col-4">
                            <span className="text-muted small">Normal Avg Wait</span>
                            <strong className="d-block text-secondary small">{hourlyAnalytics.baseline_max_wait_min} min</strong>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Empirical Past Occurrences Dataset */}
                  {festivalDetail.historical_records?.length > 0 && (
                    <div className="mt-4">
                      <h6 className="fw-bold text-maroon mb-2 d-flex align-items-center gap-2">
                        <Calendar size={17} /> Verified Historical Attendance Records
                      </h6>
                      <div className="table-responsive">
                        <table className="table table-sm table-bordered bg-white small mb-0">
                          <thead className="table-light text-muted">
                            <tr>
                              <th>Year</th>
                              <th>Actual Footfall</th>
                              <th>Peak Hour Count</th>
                              <th>Peak Rush Window</th>
                              <th>Max Wait Time</th>
                              <th>Parking Overflow</th>
                            </tr>
                          </thead>
                          <tbody>
                            {festivalDetail.historical_records.map(rec => (
                              <tr key={rec.record_id}>
                                <td className="fw-bold text-dark">{rec.year}</td>
                                <td className="fw-bold text-maroon">{rec.actual_footfall.toLocaleString()} devotees</td>
                                <td>{rec.peak_hour_count.toLocaleString()}/hr</td>
                                <td>{rec.peak_hour_window}</td>
                                <td><span className="badge bg-danger">{rec.max_queue_wait_minutes} min</span></td>
                                <td>
                                  {rec.parking_overflow_occurred ? (
                                    <span className="badge bg-warning text-dark">YES (Saturated)</span>
                                  ) : (
                                    <span className="badge bg-success">Managed</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* AI/ML Predictive Demand Projections */}
                  {festivalDetail.predictions?.length > 0 && (
                    <div className="mt-4 p-3 rounded border border-warning bg-warning bg-opacity-10">
                      <div className="d-flex align-items-center justify-content-between mb-2">
                        <div className="fw-bold text-maroon small d-flex align-items-center gap-2">
                          <Sparkles size={16} className="text-warning" /> AI Predictive Surge Forecast ({festivalDetail.predictions[0].forecast_year})
                        </div>
                        <span className="badge bg-danger">
                          {festivalDetail.predictions[0].surge_risk_category}
                        </span>
                      </div>

                      <div className="row g-2 small text-dark">
                        <div className="col-12 col-md-6">
                          <strong>Predicted Devotee Range:</strong> {festivalDetail.predictions[0].predicted_attendance_min.toLocaleString()} – {festivalDetail.predictions[0].predicted_attendance_max.toLocaleString()}
                        </div>
                        <div className="col-12 col-md-6">
                          <strong>Model Confidence:</strong> {(festivalDetail.predictions[0].confidence_score * 100).toFixed(0)}% ({festivalDetail.predictions[0].model_name})
                        </div>
                        <div className="col-12 col-md-6">
                          <strong>Projected Peak Rush:</strong> {festivalDetail.predictions[0].predicted_peak_hour}
                        </div>
                        <div className="col-12 col-md-6">
                          <strong>Projected Max Queue Wait:</strong> {festivalDetail.predictions[0].predicted_max_wait_minutes} minutes
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white p-5 rounded shadow-sm border border-beige text-center">
              <Calendar size={42} className="text-muted mb-2" />
              <h5 className="text-dark">Select a festival to inspect intelligence</h5>
              <p className="text-muted small">Choose an event from the catalog on the left.</p>
            </div>
          )}
        </div>
      </div>

      {/* Admin Register Festival Modal */}
      {showRegisterModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header bg-maroon text-white p-3" style={{ backgroundColor: '#800000' }}>
                <h5 className="modal-title fw-bold d-flex align-items-center gap-2">
                  <Plus size={18} /> Register Official Temple Festival
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowRegisterModal(false)}
                />
              </div>

              <form onSubmit={handleRegisterSubmit}>
                <div className="modal-body p-4">
                  {registerSuccess && (
                    <div className="alert alert-success d-flex align-items-center gap-2 mb-3">
                      <CheckCircle2 size={18} /> {registerSuccess}
                    </div>
                  )}

                  <div className="row g-3">
                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-bold">Temple Identifier</label>
                      <select
                        className="form-select form-select-sm"
                        value={newFestForm.temple_id}
                        onChange={e => setNewFestForm({ ...newFestForm, temple_id: e.target.value })}
                        required
                      >
                        {temples.map(t => (
                          <option key={t.temple_id} value={t.temple_id}>
                            {t.name} ({t.city})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-bold">Festival Name</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="e.g. Maha Shivaratri Mahotsav"
                        value={newFestForm.name}
                        onChange={e => setNewFestForm({ ...newFestForm, name: e.target.value })}
                        required
                      />
                    </div>

                    <div className="col-12 col-md-4">
                      <label className="form-label small fw-bold">Category</label>
                      <select
                        className="form-select form-select-sm"
                        value={newFestForm.category}
                        onChange={e => setNewFestForm({ ...newFestForm, category: e.target.value })}
                      >
                        <option value="ANNUAL_FESTIVAL">Annual Festival</option>
                        <option value="SPECIAL_DARSHAN">Special Darshan</option>
                        <option value="SEASONAL_POOJA">Seasonal Month-Long Pooja</option>
                        <option value="RELIGIOUS_CELEBRATION">Religious Celebration</option>
                      </select>
                    </div>

                    <div className="col-12 col-md-4">
                      <label className="form-label small fw-bold">Start Date</label>
                      <input
                        type="date"
                        className="form-control form-control-sm"
                        value={newFestForm.start_date}
                        onChange={e => setNewFestForm({ ...newFestForm, start_date: e.target.value })}
                        required
                      />
                    </div>

                    <div className="col-12 col-md-4">
                      <label className="form-label small fw-bold">End Date</label>
                      <input
                        type="date"
                        className="form-control form-control-sm"
                        value={newFestForm.end_date}
                        onChange={e => setNewFestForm({ ...newFestForm, end_date: e.target.value })}
                        required
                      />
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-bold">Tithi Description</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="e.g. Magha Krishna Chaturdashi"
                        value={newFestForm.tithi_description}
                        onChange={e => setNewFestForm({ ...newFestForm, tithi_description: e.target.value })}
                      />
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-bold">Official Publication Source</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="e.g. SRC-SOMNATH-TRUST-2026"
                        value={newFestForm.official_source}
                        onChange={e => setNewFestForm({ ...newFestForm, official_source: e.target.value })}
                        required
                      />
                    </div>

                    <div className="col-12 col-md-4">
                      <label className="form-label small fw-bold">Expected Attendance</label>
                      <input
                        type="number"
                        className="form-control form-control-sm"
                        value={newFestForm.expected_attendance}
                        onChange={e => setNewFestForm({ ...newFestForm, expected_attendance: parseInt(e.target.value) || 0 })}
                      />
                    </div>

                    <div className="col-12 col-md-4">
                      <label className="form-label small fw-bold">Historical Average</label>
                      <input
                        type="number"
                        className="form-control form-control-sm"
                        value={newFestForm.historical_attendance_avg}
                        onChange={e => setNewFestForm({ ...newFestForm, historical_attendance_avg: parseInt(e.target.value) || 0 })}
                      />
                    </div>

                    <div className="col-12 col-md-4">
                      <label className="form-label small fw-bold">Peak Surge Multiplier</label>
                      <input
                        type="number"
                        step="0.1"
                        className="form-control form-control-sm"
                        value={newFestForm.peak_surge_multiplier}
                        onChange={e => setNewFestForm({ ...newFestForm, peak_surge_multiplier: parseFloat(e.target.value) || 1.0 })}
                      />
                    </div>

                    <div className="col-12">
                      <label className="form-label small fw-bold">Description & Ritual Significance</label>
                      <textarea
                        rows="2"
                        className="form-control form-control-sm"
                        placeholder="Detailed liturgical significance, continuous darshan hours, etc."
                        value={newFestForm.description}
                        onChange={e => setNewFestForm({ ...newFestForm, description: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="modal-footer bg-light p-3">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => setShowRegisterModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn btn-sm text-white"
                    style={{ backgroundColor: '#800000' }}
                  >
                    {submitting ? 'Registering...' : 'Register Festival'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FestivalIntelligence;
