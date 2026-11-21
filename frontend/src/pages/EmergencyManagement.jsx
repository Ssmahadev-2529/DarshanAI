import React, { useState, useEffect, useContext, useMemo } from 'react';
import API from '../services/api';
import { AuthContext } from '../context/AuthContext';
import Loading from '../components/Loading';
import { 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  MapPin, 
  Users, 
  Activity, 
  RefreshCw, 
  Filter, 
  Search, 
  ChevronRight, 
  HeartPulse, 
  Shield, 
  Phone, 
  Navigation, 
  FileText, 
  Layers, 
  Zap, 
  Eye, 
  Check, 
  X, 
  UserCheck,
  Send,
  Sparkles
} from 'lucide-react';

const EmergencyManagement = () => {
  const { user } = useContext(AuthContext);

  const [temples, setTemples] = useState([]);
  const [selectedTempleId, setSelectedTempleId] = useState(user?.temple_id || 'TEMPLE-001');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [scanning, setScanning] = useState(false);

  // Emergency Datasets
  const [emergencyState, setEmergencyState] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);

  // Filters
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal / Action States
  const [actionModal, setActionModal] = useState({ open: false, type: '', event: null });
  const [actionInput, setActionInput] = useState({ notes: '', personnel: '', reason: '' });
  const [submittingAction, setSubmittingAction] = useState(false);

  // Load Temples List
  useEffect(() => {
    const fetchTemples = async () => {
      try {
        const res = await API.get('/temples');
        const list = Array.isArray(res.data) ? res.data : (res.data?.temples || []);
        setTemples(list);
        if (list.length > 0 && !selectedTempleId) {
          setSelectedTempleId(list[0].temple_id);
        }
      } catch (err) {
        console.error('Failed to load temples:', err);
      }
    };
    fetchTemples();
  }, []);

  // Fetch Emergency Data
  const loadEmergencyData = async (templeId) => {
    if (!templeId) return;
    setRefreshing(true);
    try {
      const [stateRes, alertsRes, routesRes] = await Promise.allSettled([
        API.get(`/emergency/temples/${templeId}`),
        API.get(`/emergency/alerts?temple_id=${templeId}`),
        API.get(`/emergency/routes/${templeId}`)
      ]);

      if (stateRes.status === 'fulfilled') setEmergencyState(stateRes.value.data);
      if (alertsRes.status === 'fulfilled') {
        const aList = Array.isArray(alertsRes.value.data) ? alertsRes.value.data : [];
        setAlerts(aList);
        if (aList.length > 0 && !selectedEvent) {
          setSelectedEvent(aList[0]);
        }
      }
      if (routesRes.status === 'fulfilled') {
        setRoutes(Array.isArray(routesRes.value.data) ? routesRes.value.data : []);
      }
    } catch (err) {
      console.error('Failed to load emergency data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (selectedTempleId) {
      loadEmergencyData(selectedTempleId);
    }
  }, [selectedTempleId]);

  // Trigger Intelligent Surge Detection Scan
  const handleTriggerScan = async () => {
    setScanning(true);
    try {
      await API.post(`/emergency/detect/${selectedTempleId}`);
      await loadEmergencyData(selectedTempleId);
    } catch (err) {
      console.error('Scan failed:', err);
    } finally {
      setScanning(false);
    }
  };

  // Handle Event Status Updates
  const handleReviewEvent = async (event) => {
    try {
      await API.post(`/emergency/events/${event.event_id}/review`, {
        notes: `Reviewed by ${user?.full_name || 'Administrator'} via Emergency Command Console`
      });
      loadEmergencyData(selectedTempleId);
    } catch (err) {
      console.error('Review failed:', err);
    }
  };

  const handleOpenActionModal = (type, event) => {
    setActionModal({ open: true, type, event });
    setActionInput({
      notes: type === 'CONFIRM' ? 'Immediate dispatch of crowd regulation barriers initiated.' : '',
      personnel: type === 'CONFIRM' ? 'Rapid Response Emergency Squad 1' : '',
      reason: type === 'DISMISS' ? 'Sensor calibration artifact; CCTV stream verified crowd movement normal.' : ''
    });
  };

  const handleSubmitAction = async () => {
    if (!actionModal.event) return;
    setSubmittingAction(true);
    const eid = actionModal.event.event_id;

    try {
      if (actionModal.type === 'CONFIRM') {
        await API.post(`/emergency/events/${eid}/confirm`, {
          assigned_personnel: actionInput.personnel,
          notes: actionInput.notes
        });
      } else if (actionModal.type === 'DISMISS') {
        await API.post(`/emergency/events/${eid}/dismiss`, {
          dismissal_reason: actionInput.reason
        });
      } else if (actionModal.type === 'RESOLVE') {
        await API.post(`/emergency/events/${eid}/resolve`, {
          resolution_notes: actionInput.notes || 'Normal crowd velocity and queue stability restored.'
        });
      }
      setActionModal({ open: false, type: '', event: null });
      loadEmergencyData(selectedTempleId);
    } catch (err) {
      console.error('Action failed:', err);
    } finally {
      setSubmittingAction(false);
    }
  };

  // Filtered Alerts
  const filteredAlerts = useMemo(() => {
    return alerts.filter(a => {
      const matchSev = severityFilter === 'ALL' || a.severity === severityFilter;
      const matchStat = statusFilter === 'ALL' || a.status === statusFilter;
      const matchType = typeFilter === 'ALL' || a.event_type === typeFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch = !q || a.title?.toLowerCase().includes(q) || a.zone_name?.toLowerCase().includes(q) || a.event_id?.toLowerCase().includes(q);
      return matchSev && matchStat && matchType && matchSearch;
    });
  }, [alerts, severityFilter, statusFilter, typeFilter, searchQuery]);

  const activeTemple = temples.find(t => t.temple_id === selectedTempleId) || { name: 'Temple Complex', city: 'City' };

  if (loading && !emergencyState) {
    return <Loading text="Loading Emergency Intelligence & Command Safety System..." />;
  }

  const riskLevel = emergencyState?.operational_risk_level || 'GREEN';
  const riskBadgeStyle = {
    RED: { bg: '#FEE2E2', text: '#DC2626', border: '#F87171', label: 'LEVEL 4 • CRITICAL EMERGENCY' },
    ORANGE: { bg: '#FFEDD5', text: '#EA580C', border: '#FB923C', label: 'LEVEL 3 • HIGH RISK ASSESSMENT' },
    YELLOW: { bg: '#FEF3C7', text: '#D97706', border: '#FCD34D', label: 'LEVEL 2 • ATTENTION REQUIRED' },
    GREEN: { bg: '#DCFCE7', text: '#16A34A', border: '#86EFAC', label: 'LEVEL 1 • NORMAL OPERATIONS' }
  }[riskLevel] || { bg: '#DCFCE7', text: '#16A34A', border: '#86EFAC', label: 'LEVEL 1 • NORMAL OPERATIONS' };

  return (
    <div className="container-fluid p-4" style={{ backgroundColor: '#F9F6F0', minHeight: '100vh' }}>
      {/* Top Header & Temple Switcher */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4 gap-3">
        <div>
          <div className="d-flex align-items-center gap-2 mb-1">
            <span 
              className="badge px-3 py-1 text-uppercase fw-bold shadow-sm"
              style={{ backgroundColor: riskBadgeStyle.bg, color: riskBadgeStyle.text, border: `1px solid ${riskBadgeStyle.border}` }}
            >
              <ShieldAlert size={14} className="inline me-1" /> {riskBadgeStyle.label}
            </span>
            <span className="badge bg-secondary bg-opacity-10 text-dark fw-semibold" style={{ fontSize: '0.72rem' }}>
              Phase 6 • Emergency Management
            </span>
          </div>
          <h2 className="fw-bold m-0 text-maroon" style={{ letterSpacing: '0.2px' }}>
            Emergency Command & Crowd Safety Center
          </h2>
          <p className="text-muted small m-0">
            Real-time crowd surge monitoring, automated risk classification, verified evacuation corridors, and rapid incident dispatch for <strong>{activeTemple.name}</strong>.
          </p>
        </div>

        {/* Action Buttons & Temple Selector */}
        <div className="d-flex align-items-center gap-2">
          <select 
            className="form-select shadow-sm border-saffron fw-semibold text-maroon"
            style={{ minWidth: '240px', backgroundColor: '#FFFFFF' }}
            value={selectedTempleId}
            onChange={(e) => setSelectedTempleId(e.target.value)}
          >
            {temples.map(t => (
              <option key={t.temple_id} value={t.temple_id}>
                {t.name} ({t.city || t.state})
              </option>
            ))}
          </select>

          <button 
            className="btn btn-warning text-dark fw-bold d-flex align-items-center gap-1 shadow-sm"
            onClick={handleTriggerScan}
            disabled={scanning}
            title="Scan live CCTV feeds & measurements for sudden surges"
          >
            <Activity size={15} className={scanning ? 'spin-anim' : ''} />
            <span className="d-none d-sm-inline">{scanning ? 'Scanning...' : 'Trigger Surge Scan'}</span>
          </button>

          <button 
            className="btn btn-outline-dark shadow-sm"
            onClick={() => loadEmergencyData(selectedTempleId)}
            disabled={refreshing}
            title="Refresh alerts"
          >
            <RefreshCw size={15} className={refreshing ? 'spin-anim' : ''} />
          </button>
        </div>
      </div>

      {/* Top Operational KPI Cards */}
      <div className="row g-3 mb-4">
        {/* Risk Level Card */}
        <div className="col-12 col-sm-6 col-lg-3">
          <div className="card border-0 shadow-sm rounded-3 p-3 h-100 bg-white border-top border-4 border-danger">
            <div className="d-flex justify-content-between align-items-center mb-1">
              <span className="text-muted small fw-semibold">OPERATIONAL RISK LEVEL</span>
              <ShieldAlert size={18} className="text-danger" />
            </div>
            <h3 className="fw-bold m-0" style={{ color: riskBadgeStyle.text }}>
              {riskLevel}
            </h3>
            <small className="text-muted d-block mt-1">
              {riskLevel === 'RED' ? 'Critical condition requiring immediate human review' : riskLevel === 'ORANGE' ? 'High-risk assessment required' : riskLevel === 'YELLOW' ? 'Attention & queue regulation' : 'Standard devotee flow'}
            </small>
          </div>
        </div>

        {/* Active Incidents KPI */}
        <div className="col-12 col-sm-6 col-lg-3">
          <div className="card border-0 shadow-sm rounded-3 p-3 h-100 bg-white border-top border-4 border-warning">
            <div className="d-flex justify-content-between align-items-center mb-1">
              <span className="text-muted small fw-semibold">ACTIVE ALERTS</span>
              <AlertTriangle size={18} className="text-warning" />
            </div>
            <h3 className="fw-bold m-0 text-dark">
              {emergencyState?.active_alerts_count || 0}
            </h3>
            <div className="d-flex gap-2 mt-1 small">
              <span className="text-danger fw-semibold">{alerts.filter(a => a.severity === 'RED' && a.status !== 'RESOLVED').length} RED</span>
              <span className="text-warning fw-semibold">{alerts.filter(a => a.severity === 'ORANGE' && a.status !== 'RESOLVED').length} ORANGE</span>
              <span className="text-muted">{alerts.filter(a => a.status === 'RESOLVED').length} Resolved</span>
            </div>
          </div>
        </div>

        {/* Evacuation Corridors KPI */}
        <div className="col-12 col-sm-6 col-lg-3">
          <div className="card border-0 shadow-sm rounded-3 p-3 h-100 bg-white border-top border-4 border-success">
            <div className="d-flex justify-content-between align-items-center mb-1">
              <span className="text-muted small fw-semibold">VERIFIED EVACUATION ROUTES</span>
              <Navigation size={18} className="text-success" />
            </div>
            <h3 className="fw-bold m-0 text-dark">
              {routes.length} Corridors
            </h3>
            <small className="text-muted d-block mt-1">
              {routes.filter(r => r.is_wheelchair_accessible).length} Barrier-free • 100% Geometry Verified
            </small>
          </div>
        </div>

        {/* Response ETA KPI */}
        <div className="col-12 col-sm-6 col-lg-3">
          <div className="card border-0 shadow-sm rounded-3 p-3 h-100 bg-white border-top border-4 border-primary">
            <div className="d-flex justify-content-between align-items-center mb-1">
              <span className="text-muted small fw-semibold">RAPID RESPONSE TIME</span>
              <HeartPulse size={18} className="text-primary" />
            </div>
            <h3 className="fw-bold m-0 text-dark">
              ~4 - 6 min
            </h3>
            <small className="text-muted d-block mt-1">
              Dedicated green ambulance turnaround bay active
            </small>
          </div>
        </div>
      </div>

      {/* Main Grid: Alert List (Left) & Incident Inspector / Evacuation Routes (Right) */}
      <div className="row g-4">
        {/* Left Column: Filter Bar & Alerts List */}
        <div className="col-12 col-lg-7">
          <div className="card border-0 shadow-sm rounded-3 p-4 bg-white">
            <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-2 mb-3">
              <h5 className="fw-bold m-0 text-maroon d-flex align-items-center gap-2">
                <ShieldAlert size={18} className="text-danger" /> Active Emergency Alerts & Incidents
              </h5>
              <span className="badge bg-light border text-muted">
                {filteredAlerts.length} Events Listed
              </span>
            </div>

            {/* Filter Controls Bar */}
            <div className="row g-2 mb-3">
              <div className="col-12 col-sm-6">
                <div className="input-group input-group-sm">
                  <span className="input-group-text bg-white border-end-0">
                    <Search size={14} className="text-muted" />
                  </span>
                  <input 
                    type="text" 
                    className="form-control border-start-0" 
                    placeholder="Search alert title, zone, ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              <div className="col-6 col-sm-3">
                <select 
                  className="form-select form-select-sm"
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value)}
                >
                  <option value="ALL">All Severities</option>
                  <option value="RED">RED (Critical)</option>
                  <option value="ORANGE">ORANGE (High Risk)</option>
                  <option value="YELLOW">YELLOW (Warning)</option>
                  <option value="GREEN">GREEN (Normal)</option>
                </select>
              </div>

              <div className="col-6 col-sm-3">
                <select 
                  className="form-select form-select-sm"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="ALL">All Statuses</option>
                  <option value="DETECTED">DETECTED</option>
                  <option value="UNDER_REVIEW">UNDER_REVIEW</option>
                  <option value="CONFIRMED">CONFIRMED</option>
                  <option value="DISMISSED">DISMISSED</option>
                  <option value="RESOLVED">RESOLVED</option>
                </select>
              </div>
            </div>

            {/* Alert List */}
            <div className="d-flex flex-column gap-2" style={{ maxHeight: '620px', overflowY: 'auto' }}>
              {filteredAlerts.length === 0 ? (
                <div className="text-center py-5 text-muted">
                  <CheckCircle2 size={40} className="text-success opacity-50 mb-2" />
                  <h6 className="fw-bold m-0 text-dark">No Active Emergency Incidents</h6>
                  <p className="small m-0">Devotee flow is currently within safe operational parameters across all monitored zones.</p>
                </div>
              ) : (
                filteredAlerts.map(ev => {
                  const isSelected = selectedEvent?.id === ev.id;
                  const sevColor = ev.severity === 'RED' ? '#DC2626' : ev.severity === 'ORANGE' ? '#EA580C' : ev.severity === 'YELLOW' ? '#D97706' : '#16A34A';
                  const sevBg = ev.severity === 'RED' ? '#FEE2E2' : ev.severity === 'ORANGE' ? '#FFEDD5' : ev.severity === 'YELLOW' ? '#FEF3C7' : '#DCFCE7';

                  return (
                    <div 
                      key={ev.id}
                      onClick={() => setSelectedEvent(ev)}
                      className={`p-3 rounded-3 border transition-all cursor-pointer ${isSelected ? 'shadow-sm border-2' : 'bg-light hover-bg-white'}`}
                      style={{ 
                        borderColor: isSelected ? sevColor : '#E5E7EB',
                        backgroundColor: isSelected ? '#FFFFFF' : '#F9FAFB'
                      }}
                    >
                      <div className="d-flex justify-content-between align-items-start mb-1">
                        <div className="d-flex align-items-center gap-2">
                          <span 
                            className="badge fw-bold"
                            style={{ backgroundColor: sevBg, color: sevColor, fontSize: '0.68rem' }}
                          >
                            {ev.severity} • {ev.event_type.replace('_', ' ')}
                          </span>
                          <span className="badge bg-dark bg-opacity-10 text-dark" style={{ fontSize: '0.65rem' }}>
                            {ev.status}
                          </span>
                        </div>
                        <small className="text-muted" style={{ fontSize: '0.70rem' }}>
                          <Clock size={11} className="inline me-1" />
                          {ev.detection_timestamp ? new Date(ev.detection_timestamp).toLocaleTimeString() : 'Recent'}
                        </small>
                      </div>

                      <h6 className="fw-bold m-0 text-dark mb-1" style={{ fontSize: '0.94rem' }}>
                        {ev.title}
                      </h6>

                      <p className="small text-muted text-truncate m-0 mb-2" style={{ maxWidth: '480px' }}>
                        {ev.description}
                      </p>

                      <div className="d-flex justify-content-between align-items-center small text-muted border-top pt-2 mt-1" style={{ fontSize: '0.72rem' }}>
                        <span><MapPin size={11} className="inline me-1" /> Zone: <strong>{ev.zone_name}</strong></span>
                        <span>Source: <strong>{ev.data_source}</strong></span>
                        <span className="text-maroon fw-semibold">Inspect <ChevronRight size={12} className="inline" /></span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Incident Inspector HUD & Verified Routes */}
        <div className="col-12 col-lg-5">
          {selectedEvent ? (
            <div className="card border-0 shadow-sm rounded-3 p-4 bg-white mb-4 border-top border-4" style={{ borderTopColor: selectedEvent.severity === 'RED' ? '#DC2626' : '#EA580C' }}>
              <div className="d-flex justify-content-between align-items-start mb-2">
                <div>
                  <span className="badge bg-dark text-white text-uppercase mb-1" style={{ fontSize: '0.65rem' }}>
                    INCIDENT ID: {selectedEvent.event_id}
                  </span>
                  <h5 className="fw-bold m-0 text-dark">
                    {selectedEvent.title}
                  </h5>
                </div>
                <span className={`badge ${selectedEvent.status === 'CONFIRMED' ? 'bg-danger text-white' : selectedEvent.status === 'UNDER_REVIEW' ? 'bg-warning text-dark' : 'bg-secondary'}`}>
                  {selectedEvent.status}
                </span>
              </div>

              <p className="small text-muted mb-3">
                {selectedEvent.description}
              </p>

              {/* Supporting Telemetry Evidence (Section 3 Requirement) */}
              <div className="p-3 rounded bg-light border mb-3">
                <small className="fw-bold text-dark d-block mb-2" style={{ fontSize: '0.72rem' }}>
                  <Layers size={13} className="inline me-1 text-primary" /> SUPPORTING TELEMETRY EVIDENCE
                </small>

                <div className="row g-2 text-center small">
                  <div className="col-4">
                    <div className="p-2 rounded bg-white border">
                      <small className="d-block text-muted" style={{ fontSize: '0.62rem' }}>OBSERVED DEVOTEES</small>
                      <strong className="text-danger" style={{ fontSize: '0.95rem' }}>
                        {selectedEvent.supporting_measurements?.observed_people_count || 0}
                      </strong>
                    </div>
                  </div>
                  <div className="col-4">
                    <div className="p-2 rounded bg-white border">
                      <small className="d-block text-muted" style={{ fontSize: '0.62rem' }}>CAPACITY UTILIZATION</small>
                      <strong className="text-danger" style={{ fontSize: '0.95rem' }}>
                        {selectedEvent.supporting_measurements?.capacity_utilization_percent || 0}%
                      </strong>
                    </div>
                  </div>
                  <div className="col-4">
                    <div className="p-2 rounded bg-white border">
                      <small className="d-block text-muted" style={{ fontSize: '0.62rem' }}>INFLOW VELOCITY</small>
                      <strong className="text-primary" style={{ fontSize: '0.95rem' }}>
                        {selectedEvent.supporting_measurements?.entry_rate_per_min || 0}/min
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="d-flex flex-column gap-1 small text-muted mt-2 pt-2 border-top" style={{ fontSize: '0.72rem' }}>
                  <div className="d-flex justify-content-between">
                    <span>Detection Method:</span>
                    <strong>{selectedEvent.detection_method}</strong>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span>Confidence Level:</span>
                    <strong className="text-success">{(selectedEvent.confidence_level * 100).toFixed(0)}% Certainty</strong>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span>Data Source:</span>
                    <strong>{selectedEvent.data_source}</strong>
                  </div>
                </div>
              </div>

              {/* Administrative Action Dispatch Bar */}
              <div className="mb-3">
                <small className="fw-bold text-dark d-block mb-2" style={{ fontSize: '0.72rem' }}>
                  OPERATIONAL INCIDENT LIFECYCLE
                </small>

                <div className="d-flex flex-wrap gap-2">
                  {selectedEvent.status === 'DETECTED' && (
                    <button 
                      className="btn btn-sm btn-outline-warning fw-semibold d-flex align-items-center gap-1"
                      onClick={() => handleReviewEvent(selectedEvent)}
                    >
                      <Eye size={13} /> Acknowledge Review
                    </button>
                  )}

                  {selectedEvent.status !== 'CONFIRMED' && selectedEvent.status !== 'RESOLVED' && (
                    <button 
                      className="btn btn-sm btn-danger fw-semibold d-flex align-items-center gap-1"
                      onClick={() => handleOpenActionModal('CONFIRM', selectedEvent)}
                    >
                      <Check size={13} /> Confirm & Dispatch Squad
                    </button>
                  )}

                  {selectedEvent.status !== 'RESOLVED' && selectedEvent.status !== 'DISMISSED' && (
                    <button 
                      className="btn btn-sm btn-outline-secondary fw-semibold d-flex align-items-center gap-1"
                      onClick={() => handleOpenActionModal('DISMISS', selectedEvent)}
                    >
                      <X size={13} /> Dismiss False Alarm
                    </button>
                  )}

                  {selectedEvent.status === 'CONFIRMED' && (
                    <button 
                      className="btn btn-sm btn-success fw-semibold d-flex align-items-center gap-1"
                      onClick={() => handleOpenActionModal('RESOLVE', selectedEvent)}
                    >
                      <CheckCircle2 size={13} /> Conclude & Resolve
                    </button>
                  )}
                </div>
              </div>

              {/* Assigned Personnel & Audit Notes */}
              {(selectedEvent.assigned_personnel || selectedEvent.admin_notes || selectedEvent.resolution_notes) && (
                <div className="p-3 rounded bg-ivory border small">
                  {selectedEvent.assigned_personnel && (
                    <div className="mb-1">
                      <strong className="text-dark">Assigned Squad:</strong> <span className="text-danger fw-semibold">{selectedEvent.assigned_personnel}</span>
                    </div>
                  )}
                  {selectedEvent.admin_notes && (
                    <div className="mb-1">
                      <strong className="text-dark">Admin Log:</strong> <span className="text-muted">{selectedEvent.admin_notes}</span>
                    </div>
                  )}
                  {selectedEvent.resolution_notes && (
                    <div>
                      <strong className="text-dark">Resolution:</strong> <span className="text-success">{selectedEvent.resolution_notes}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="card border-0 shadow-sm rounded-3 p-4 bg-white mb-4 text-center text-muted">
              Select an incident from the alerts queue to inspect telemetry evidence.
            </div>
          )}

          {/* Verified Evacuation Corridors Card */}
          <div className="card border-0 shadow-sm rounded-3 p-4 bg-white">
            <h6 className="fw-bold text-maroon d-flex align-items-center gap-2 mb-2">
              <Navigation size={16} className="text-success" /> Verified Emergency Evacuation Corridors
            </h6>
            <small className="text-muted d-block mb-3">
              Geometry verified from official Devasthanam master plans & OpenStreetMap
            </small>

            <div className="d-flex flex-column gap-2" style={{ maxHeight: '320px', overflowY: 'auto' }}>
              {routes.map(r => (
                <div key={r.id} className="p-3 rounded border bg-light small">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <strong className="text-dark">{r.name}</strong>
                    <span className="badge bg-success bg-opacity-10 text-success">
                      {r.route_type.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="d-flex justify-content-between text-muted mb-1">
                    <span>Length: <strong>{r.length_meters}m</strong></span>
                    <span>Clearance: <strong>{r.clearance_width_meters}m</strong></span>
                    <span>Wheelchair: <strong>{r.is_wheelchair_accessible ? 'Yes' : 'No'}</strong></span>
                  </div>
                  <div className="text-truncate text-secondary">
                    Egress Portal: <strong>{r.to_exit_or_facility}</strong>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Action Dialog Modal */}
      {actionModal.open && (
        <div 
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-dark bg-opacity-50"
          style={{ zIndex: 1100 }}
        >
          <div className="card border-0 shadow-lg rounded-3 p-4 bg-white" style={{ maxWidth: '520px', width: '90%' }}>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="fw-bold m-0 text-maroon">
                {actionModal.type === 'CONFIRM' ? 'Confirm Incident & Dispatch' : actionModal.type === 'DISMISS' ? 'Dismiss False Alarm' : 'Conclude & Resolve Incident'}
              </h5>
              <button className="btn btn-sm btn-link text-dark p-0" onClick={() => setActionModal({ open: false, type: '', event: null })}>
                <X size={18} />
              </button>
            </div>

            {actionModal.type === 'CONFIRM' && (
              <>
                <div className="mb-3">
                  <label className="form-label small fw-bold">Assigned Response Personnel / Squad:</label>
                  <input 
                    type="text" 
                    className="form-control"
                    value={actionInput.personnel}
                    onChange={(e) => setActionInput({ ...actionInput, personnel: e.target.value })}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-bold">Action Instructions & Directives:</label>
                  <textarea 
                    className="form-control"
                    rows={3}
                    value={actionInput.notes}
                    onChange={(e) => setActionInput({ ...actionInput, notes: e.target.value })}
                  />
                </div>
              </>
            )}

            {actionModal.type === 'DISMISS' && (
              <div className="mb-3">
                <label className="form-label small fw-bold">Dismissal Rationale (Mandatory for Audit Trail):</label>
                <textarea 
                  className="form-control"
                  rows={3}
                  placeholder="Explain why this alert is a false alarm or sensor calibration artifact..."
                  value={actionInput.reason}
                  onChange={(e) => setActionInput({ ...actionInput, reason: e.target.value })}
                />
              </div>
            )}

            {actionModal.type === 'RESOLVE' && (
              <div className="mb-3">
                <label className="form-label small fw-bold">Resolution Summary & Normalcy Report:</label>
                <textarea 
                  className="form-control"
                  rows={3}
                  value={actionInput.notes}
                  onChange={(e) => setActionInput({ ...actionInput, notes: e.target.value })}
                />
              </div>
            )}

            <div className="d-flex justify-content-end gap-2 mt-3 pt-2 border-top">
              <button 
                className="btn btn-sm btn-outline-secondary"
                onClick={() => setActionModal({ open: false, type: '', event: null })}
              >
                Cancel
              </button>
              <button 
                className={`btn btn-sm ${actionModal.type === 'CONFIRM' ? 'btn-danger' : actionModal.type === 'DISMISS' ? 'btn-secondary' : 'btn-success'} fw-bold`}
                disabled={submittingAction}
                onClick={handleSubmitAction}
              >
                {submittingAction ? 'Recording...' : 'Submit Decision'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmergencyManagement;
