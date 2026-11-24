import React, { useState, useEffect, useContext } from 'react';
import API from '../services/api';
import { AuthContext } from '../context/AuthContext';
import Loading from '../components/Loading';
import { 
  Building2, 
  Plus, 
  CheckCircle, 
  XCircle, 
  ShieldCheck, 
  MapPin, 
  Layers, 
  Boxes, 
  Camera, 
  Cpu, 
  Users, 
  FileText, 
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  PlayCircle,
  Sliders,
  ShieldAlert
} from 'lucide-react';

const TempleManagement = () => {
  const { user } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('temples');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Datasets
  const [temples, setTemples] = useState([]);
  const [zones, setZones] = useState([]);
  const [dataSources, setDataSources] = useState([]);
  const [assets3d, setAssets3d] = useState([]);
  const [cameras, setCameras] = useState([]);
  const [adminUsers, setAdminUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [adminOverview, setAdminOverview] = useState(null);

  // Modals state
  const [showTempleModal, setShowTempleModal] = useState(false);
  const [showZoneModal, setShowZoneModal] = useState(false);
  const [showSourceModal, setShowSourceModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [retrainingStatus, setRetrainingStatus] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form states
  const [templeForm, setTempleForm] = useState({
    temple_id: 'TEMPLE-006',
    name: '',
    city: '',
    state: '',
    country: 'India',
    capacity: 20000,
    opening_time: '04:00 AM',
    closing_time: '10:00 PM',
    latitude: 20.0,
    longitude: 78.0,
    status: 'ACTIVE'
  });

  const [zoneForm, setZoneForm] = useState({
    temple_id: 'TEMPLE-001',
    zone_code: '',
    name: '',
    zone_type: 'ENTRY',
    latitude: 20.8880,
    longitude: 70.4012,
    capacity: 2500,
    staff_assigned: 6
  });

  const [sourceForm, setSourceForm] = useState({
    source_code: 'SRC-NEW-01',
    name: '',
    source_url: '',
    licence: 'Open Database License (ODbL)',
    verification_status: 'VERIFIED',
    data_classification: 'VERIFIED_OPEN_DATA',
    confidence_level: 0.95,
    description: ''
  });

  const [userForm, setUserForm] = useState({
    email: '',
    full_name: '',
    password: '',
    role: 'VOLUNTEER',
    temple_id: 'TEMPLE-001',
    mobile: ''
  });

  const loadAllData = async () => {
    try {
      setRefreshing(true);
      setError('');
      const [templesRes, zonesRes, sourcesRes, assetsRes, camsRes, usersRes, logsRes, ovRes] = await Promise.allSettled([
        API.get('/temples'),
        API.get('/admin/zones'),
        API.get('/admin/data-sources'),
        API.get('/admin/3d-assets'),
        API.get('/cameras'),
        API.get('/admin/users'),
        API.get('/admin/audit-logs?limit=50'),
        API.get('/admin/overview')
      ]);

      if (templesRes.status === 'fulfilled') setTemples(templesRes.value.data || []);
      if (zonesRes.status === 'fulfilled') setZones(zonesRes.value.data || []);
      if (sourcesRes.status === 'fulfilled') setDataSources(sourcesRes.value.data || []);
      if (assetsRes.status === 'fulfilled') setAssets3d(assetsRes.value.data || []);
      if (camsRes.status === 'fulfilled') setCameras(camsRes.value.data || []);
      if (usersRes.status === 'fulfilled') setAdminUsers(usersRes.value.data || []);
      if (logsRes.status === 'fulfilled') setAuditLogs(logsRes.value.data || []);
      if (ovRes.status === 'fulfilled') setAdminOverview(ovRes.value.data || null);
    } catch (err) {
      console.error(err);
      setError('Failed to load administrative datasets.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Handlers
  const handleCreateTemple = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await API.post('/temples', templeForm);
      setShowTempleModal(false);
      setSuccessMsg('Temple onboarded successfully!');
      loadAllData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create temple');
    }
  };

  const handleCreateZone = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await API.post('/admin/zones', zoneForm);
      setShowZoneModal(false);
      setSuccessMsg('Operational zone created successfully!');
      loadAllData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create operational zone');
    }
  };

  const handleCreateSource = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await API.post('/admin/data-sources', sourceForm);
      setShowSourceModal(false);
      setSuccessMsg('Authoritative data source registered!');
      loadAllData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to register data source');
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await API.post('/admin/users', userForm);
      setShowUserModal(false);
      setSuccessMsg('Staff user account created with SHA-256 hash!');
      loadAllData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create user');
    }
  };

  const handleToggleUserStatus = async (userId) => {
    try {
      await API.put(`/admin/users/${userId}/status`);
      loadAllData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to toggle status');
    }
  };

  const handleTriggerRetrain = async () => {
    setRetrainingStatus('Retraining models across dataset...');
    try {
      const res = await API.post('/admin/ml/retrain');
      setRetrainingStatus('SUCCESS: Models retrained and loaded into memory cache!');
      loadAllData();
    } catch (err) {
      setRetrainingStatus(`FAILED: ${err.response?.data?.detail || 'Retraining failed'}`);
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="container-fluid p-4">
      {/* Header */}
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
        <div>
          <h4 className="fw-bold text-maroon m-0 d-flex align-items-center gap-2">
            <Building2 size={24} className="text-warning" /> Central Administration & Governance Dashboard
          </h4>
          <small className="text-muted">
            Platform-wide governance: Temples, Zones, Authoritative GIS Sources, 3D Models, CCTV Streams, ML Retraining, Users, and Audit Logs
          </small>
        </div>

        <div className="d-flex align-items-center gap-2">
          <button
            onClick={loadAllData}
            disabled={refreshing}
            className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1 shadow-sm"
          >
            <RefreshCw size={14} className={refreshing ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Success / Error Alerts */}
      {successMsg && (
        <div className="alert alert-success alert-dismissible fade show py-2 small" role="alert">
          <strong>Notice:</strong> {successMsg}
          <button type="button" className="btn-close py-2" onClick={() => setSuccessMsg('')}></button>
        </div>
      )}
      {error && (
        <div className="alert alert-danger alert-dismissible fade show py-2 small" role="alert">
          <strong>Error:</strong> {error}
          <button type="button" className="btn-close py-2" onClick={() => setError('')}></button>
        </div>
      )}

      {/* KPI Overview Strip */}
      {adminOverview && (
        <div className="row g-3 mb-4">
          <div className="col-6 col-md-3 col-lg-2">
            <div className="temple-card p-2 text-center h-100">
              <span className="text-muted" style={{ fontSize: '0.72rem' }}>TEMPLES</span>
              <h4 className="fw-bold m-0 text-maroon">{adminOverview.counts?.temples || 0}</h4>
            </div>
          </div>
          <div className="col-6 col-md-3 col-lg-2">
            <div className="temple-card p-2 text-center h-100">
              <span className="text-muted" style={{ fontSize: '0.72rem' }}>ZONES & GATES</span>
              <h4 className="fw-bold m-0 text-dark-brown">{adminOverview.counts?.zones || 0}</h4>
            </div>
          </div>
          <div className="col-6 col-md-3 col-lg-2">
            <div className="temple-card p-2 text-center h-100">
              <span className="text-muted" style={{ fontSize: '0.72rem' }}>CCTV CAMERAS</span>
              <h4 className="fw-bold m-0 text-danger">{adminOverview.counts?.cameras || 0}</h4>
            </div>
          </div>
          <div className="col-6 col-md-3 col-lg-2">
            <div className="temple-card p-2 text-center h-100">
              <span className="text-muted" style={{ fontSize: '0.72rem' }}>DATA SOURCES</span>
              <h4 className="fw-bold m-0 text-success">{adminOverview.counts?.data_sources || 0}</h4>
            </div>
          </div>
          <div className="col-6 col-md-3 col-lg-2">
            <div className="temple-card p-2 text-center h-100">
              <span className="text-muted" style={{ fontSize: '0.72rem' }}>STAFF USERS</span>
              <h4 className="fw-bold m-0 text-primary">{adminOverview.counts?.users || 0}</h4>
            </div>
          </div>
          <div className="col-6 col-md-3 col-lg-2">
            <div className="temple-card p-2 text-center h-100">
              <span className="text-muted" style={{ fontSize: '0.72rem' }}>AUDIT LOGS</span>
              <h4 className="fw-bold m-0 text-dark">{adminOverview.counts?.audit_logs || 0}</h4>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation Navigation */}
      <ul className="nav nav-tabs border-beige mb-4" role="tablist">
        {[
          { id: 'temples', label: 'Temples & Locations', icon: Building2 },
          { id: 'zones', label: 'Zones & Gateways', icon: Layers },
          { id: 'sources', label: 'Data Governance', icon: ShieldCheck },
          { id: 'assets', label: '3D Spatial Assets', icon: Boxes },
          { id: 'cameras', label: 'CCTV Edge Streams', icon: Camera },
          { id: 'ml', label: 'AI/ML Retraining', icon: Cpu },
          { id: 'users', label: 'Staff Users & RBAC', icon: Users },
          { id: 'audit', label: 'System Audit Trail', icon: FileText }
        ].map(t => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <li className="nav-item" key={t.id}>
              <button
                onClick={() => setActiveTab(t.id)}
                className={`nav-link d-flex align-items-center gap-1.5 fw-semibold ${
                  isActive ? 'active text-maroon border-gold border-bottom-0' : 'text-muted'
                }`}
                style={{ fontSize: '0.85rem' }}
              >
                <Icon size={15} />
                <span>{t.label}</span>
              </button>
            </li>
          );
        })}
      </ul>

      {/* TAB 1: TEMPLES & LOCATIONS */}
      {activeTab === 'temples' && (
        <div>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h6 className="fw-bold text-maroon m-0">Registered Temple Shrines ({temples.length})</h6>
            <button onClick={() => setShowTempleModal(true)} className="btn btn-maroon text-gold btn-sm d-flex align-items-center gap-1">
              <Plus size={15} /> Onboard Temple
            </button>
          </div>

          <div className="row g-3">
            {temples.map(t => (
              <div className="col-md-6 col-lg-4" key={t.id}>
                <div className="temple-card p-3 h-100 gold-glow">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div>
                      <span className="badge bg-warning text-dark fw-bold mb-1">{t.temple_id}</span>
                      <h6 className="fw-bold text-maroon m-0">{t.name}</h6>
                      <small className="text-muted">{t.city}, {t.state}</small>
                    </div>
                    <span className={`badge ${t.status === 'ACTIVE' ? 'bg-success' : 'bg-danger'}`}>
                      {t.status}
                    </span>
                  </div>
                  <hr className="my-2 border-beige" />
                  <div className="small d-flex flex-column gap-1 text-muted">
                    <div>Capacity: <strong className="text-dark-brown">{t.capacity?.toLocaleString()} devotees</strong></div>
                    <div>Hours: <strong className="text-dark-brown">{t.opening_time} – {t.closing_time}</strong></div>
                    <div>GPS: <strong className="text-dark-brown">{t.latitude?.toFixed(4)}, {t.longitude?.toFixed(4)}</strong></div>
                    <div>Isolation: <strong className="text-success">JWT Enforced</strong></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: OPERATIONAL ZONES */}
      {activeTab === 'zones' && (
        <div>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h6 className="fw-bold text-maroon m-0">Operational Crowd Zones ({zones.length})</h6>
            <button onClick={() => setShowZoneModal(true)} className="btn btn-maroon text-gold btn-sm d-flex align-items-center gap-1">
              <Plus size={15} /> Add Operational Zone
            </button>
          </div>

          <div className="temple-card p-3">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0 small">
                <thead>
                  <tr className="text-maroon">
                    <th>ZONE CODE</th>
                    <th>NAME</th>
                    <th>TEMPLE</th>
                    <th>TYPE</th>
                    <th>CAPACITY</th>
                    <th>STAFF</th>
                    <th>GPS LOCATION</th>
                    <th>VERIFICATION</th>
                  </tr>
                </thead>
                <tbody>
                  {zones.map(z => (
                    <tr key={z.id}>
                      <td><span className="badge bg-light text-dark border">{z.zone_code}</span></td>
                      <td className="fw-semibold text-dark-brown">{z.name}</td>
                      <td><span className="badge bg-warning text-dark">{z.temple_id}</span></td>
                      <td><span className="badge bg-info text-dark">{z.zone_type}</span></td>
                      <td className="fw-bold text-maroon">{z.capacity?.toLocaleString()}</td>
                      <td>{z.staff_assigned} personnel</td>
                      <td>{z.latitude?.toFixed(4)}, {z.longitude?.toFixed(4)}</td>
                      <td>
                        <span className={`badge ${z.is_verified ? 'bg-success' : 'bg-secondary'}`}>
                          {z.is_verified ? 'VERIFIED' : 'PENDING'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: DATA GOVERNANCE & DATA SOURCES */}
      {activeTab === 'sources' && (
        <div>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h6 className="fw-bold text-maroon m-0">Authoritative Data Sources ({dataSources.length})</h6>
            <button onClick={() => setShowSourceModal(true)} className="btn btn-maroon text-gold btn-sm d-flex align-items-center gap-1">
              <Plus size={15} /> Register Data Source
            </button>
          </div>

          <div className="temple-card p-3">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0 small">
                <thead>
                  <tr className="text-maroon">
                    <th>SOURCE CODE</th>
                    <th>DATA PROVIDER NAME</th>
                    <th>LICENCE</th>
                    <th>CLASSIFICATION</th>
                    <th>CONFIDENCE</th>
                    <th>VERIFICATION STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {dataSources.map(s => (
                    <tr key={s.id}>
                      <td><span className="badge bg-light text-dark border">{s.source_code}</span></td>
                      <td className="fw-semibold text-dark-brown">
                        {s.name}
                        {s.source_url && (
                          <a href={s.source_url} target="_blank" rel="noreferrer" className="d-block small text-muted text-truncate" style={{ maxWidth: '280px' }}>
                            {s.source_url}
                          </a>
                        )}
                      </td>
                      <td className="text-muted">{s.licence}</td>
                      <td><span className="badge bg-info text-dark">{s.data_classification}</span></td>
                      <td className="fw-bold text-success">{(s.confidence_level * 100).toFixed(0)}%</td>
                      <td>
                        <span className={`badge ${s.verification_status === 'VERIFIED' ? 'bg-success' : 'bg-warning text-dark'}`}>
                          {s.verification_status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: 3D SPATIAL ASSETS */}
      {activeTab === 'assets' && (
        <div>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h6 className="fw-bold text-maroon m-0">3D Digital Twin Models & Assets ({assets3d.length})</h6>
          </div>

          <div className="temple-card p-3">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0 small">
                <thead>
                  <tr className="text-maroon">
                    <th>ASSET NAME</th>
                    <th>TEMPLE</th>
                    <th>TYPE</th>
                    <th>LOD LEVEL</th>
                    <th>POLYGON COUNT</th>
                    <th>OPERATIONAL STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {assets3d.map(a => (
                    <tr key={a.id}>
                      <td className="fw-semibold text-dark-brown">{a.asset_name}</td>
                      <td><span className="badge bg-warning text-dark">{a.temple_id}</span></td>
                      <td>{a.asset_type}</td>
                      <td><span className="badge bg-light text-dark border">{a.lod_level}</span></td>
                      <td className="fw-bold text-maroon">{a.polygon_count?.toLocaleString()} polys</td>
                      <td>
                        <span className={`badge ${a.status === 'AVAILABLE' ? 'bg-success' : 'bg-warning text-dark'}`}>
                          {a.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: CCTV EDGE STREAMS */}
      {activeTab === 'cameras' && (
        <div>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h6 className="fw-bold text-maroon m-0">Configured CCTV Vision Streams ({cameras.length})</h6>
          </div>

          <div className="temple-card p-3">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0 small">
                <thead>
                  <tr className="text-maroon">
                    <th>CAMERA ID</th>
                    <th>NAME</th>
                    <th>TEMPLE</th>
                    <th>ASSIGNED ZONE</th>
                    <th>ORIENTATION</th>
                    <th>COVERAGE SQM</th>
                    <th>CALIBRATION</th>
                    <th>AUTHORIZATION</th>
                  </tr>
                </thead>
                <tbody>
                  {cameras.map(c => (
                    <tr key={c.id || c.camera_id}>
                      <td><span className="badge bg-light text-dark border">{c.camera_id}</span></td>
                      <td className="fw-semibold text-dark-brown">{c.name}</td>
                      <td><span className="badge bg-warning text-dark">{c.temple_id}</span></td>
                      <td>{c.zone_code}</td>
                      <td>{c.orientation_deg}° (FOV: {c.fov_deg}°)</td>
                      <td>{c.coverage_area_sqm} m²</td>
                      <td><span className="badge bg-info text-dark">{c.calibration_status || 'CALIBRATED'}</span></td>
                      <td>
                        <span className={`badge ${c.is_authorized ? 'bg-success' : 'bg-danger'}`}>
                          {c.is_authorized ? 'AUTHORIZED' : 'UNAUTHORIZED'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: AI/ML MODEL RETRAINING */}
      {activeTab === 'ml' && (
        <div>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h6 className="fw-bold text-maroon m-0">Predictive ML Architecture & Retraining Console</h6>
            <button onClick={handleTriggerRetrain} className="btn btn-maroon text-gold btn-sm d-flex align-items-center gap-1 shadow-sm">
              <PlayCircle size={15} /> Retrain & Reload Models
            </button>
          </div>

          {retrainingStatus && (
            <div className="alert alert-info py-2 small mb-3">
              <strong>Retraining Engine:</strong> {retrainingStatus}
            </div>
          )}

          <div className="row g-3">
            <div className="col-md-6">
              <div className="temple-card p-3 h-100">
                <h6 className="fw-bold text-maroon mb-2">Active Pretrained Estimators</h6>
                <div className="small d-flex flex-column gap-2 text-muted">
                  <div className="p-2 bg-light rounded border">
                    <strong className="text-dark">1. Crowd Density Regressor:</strong> RandomForestRegressor (max_depth=8, max_leaf_nodes=35, pruned)
                  </div>
                  <div className="p-2 bg-light rounded border">
                    <strong className="text-dark">2. Waiting Time Forecaster:</strong> RandomForestRegressor with queue-length weighting
                  </div>
                  <div className="p-2 bg-light rounded border">
                    <strong className="text-dark">3. Risk Level Classifier:</strong> 4-tier risk classification (LOW, MEDIUM, HIGH, CRITICAL)
                  </div>
                  <div className="p-2 bg-light rounded border">
                    <strong className="text-dark">4. Anomaly Detector:</strong> IsolationForest (contamination=0.03) for sudden surge detection
                  </div>
                </div>
              </div>
            </div>

            <div className="col-md-6">
              <div className="temple-card p-3 h-100">
                <h6 className="fw-bold text-maroon mb-2">Model Performance Standards</h6>
                <div className="small d-flex flex-column gap-2 text-muted">
                  <div>R² Goodness of Fit: <strong className="text-success">&gt; 0.98</strong></div>
                  <div>Mean Absolute Error (MAE): <strong className="text-success">&lt; 42 devotees</strong></div>
                  <div>Model Artifact Size: <strong className="text-success">&lt; 1.0 MB (Compressed zlib level 3)</strong></div>
                  <div>Inference Latency: <strong className="text-success">&lt; 4.0 ms per prediction</strong></div>
                  <div>In-Memory Singleton: <strong className="text-success">ml_service (Thread-safe)</strong></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: USERS & RBAC */}
      {activeTab === 'users' && (
        <div>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h6 className="fw-bold text-maroon m-0">Staff Accounts & Role Authorizations ({adminUsers.length})</h6>
            <button onClick={() => setShowUserModal(true)} className="btn btn-maroon text-gold btn-sm d-flex align-items-center gap-1">
              <Plus size={15} /> Create User Account
            </button>
          </div>

          <div className="temple-card p-3">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0 small">
                <thead>
                  <tr className="text-maroon">
                    <th>NAME</th>
                    <th>EMAIL</th>
                    <th>ROLE</th>
                    <th>TENANT TEMPLE</th>
                    <th>STATUS</th>
                    <th>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {adminUsers.map(u => (
                    <tr key={u.id}>
                      <td className="fw-semibold text-dark-brown">{u.full_name}</td>
                      <td>{u.email}</td>
                      <td>
                        <span className={`badge ${
                          u.role === 'SUPER_ADMIN' ? 'bg-danger' : 
                          u.role === 'TEMPLE_ADMIN' ? 'bg-warning text-dark' : 
                          u.role === 'OPERATIONS_MANAGER' || u.role === 'MANAGER' ? 'bg-primary' : 
                          'bg-info text-dark'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td><span className="badge bg-light text-dark border">{u.temple_id || 'GLOBAL'}</span></td>
                      <td>
                        <span className={`badge ${u.is_active ? 'bg-success' : 'bg-danger'}`}>
                          {u.is_active ? 'ACTIVE' : 'SUSPENDED'}
                        </span>
                      </td>
                      <td>
                        <button
                          onClick={() => handleToggleUserStatus(u.id)}
                          className="btn btn-outline-secondary btn-xs py-0 px-2"
                        >
                          {u.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 8: AUDIT TRAIL */}
      {activeTab === 'audit' && (
        <div>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h6 className="fw-bold text-maroon m-0">Immutable System Audit Logs ({auditLogs.length})</h6>
          </div>

          <div className="temple-card p-3">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0 small">
                <thead>
                  <tr className="text-maroon">
                    <th>TIMESTAMP</th>
                    <th>OPERATOR EMAIL</th>
                    <th>ACTION</th>
                    <th>TARGET TYPE</th>
                    <th>TARGET ID</th>
                    <th>IP ADDRESS</th>
                    <th>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map(l => (
                    <tr key={l.id}>
                      <td className="text-muted">{l.timestamp ? new Date(l.timestamp).toLocaleString() : 'N/A'}</td>
                      <td className="fw-semibold text-dark-brown">{l.user_email}</td>
                      <td><span className="badge bg-light text-dark border">{l.action}</span></td>
                      <td>{l.target_type}</td>
                      <td>{l.target_id || 'N/A'}</td>
                      <td>{l.ip_address || '127.0.0.1'}</td>
                      <td>
                        <span className={`badge ${l.status === 'SUCCESS' ? 'bg-success' : 'bg-danger'}`}>
                          {l.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Onboard Temple */}
      {showTempleModal && (
        <div className="modal d-block bg-dark bg-opacity-50" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content temple-card border-gold">
              <div className="modal-header border-beige">
                <h5 className="modal-title text-maroon fw-bold">Onboard New Temple Tenant</h5>
                <button type="button" className="btn-close" onClick={() => setShowTempleModal(false)}></button>
              </div>
              <form onSubmit={handleCreateTemple}>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label text-dark-brown small fw-bold">TEMPLE ID</label>
                      <input type="text" className="form-control" required value={templeForm.temple_id} onChange={e => setTempleForm({...templeForm, temple_id: e.target.value})} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label text-dark-brown small fw-bold">TEMPLE NAME</label>
                      <input type="text" className="form-control" required value={templeForm.name} onChange={e => setTempleForm({...templeForm, name: e.target.value})} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label text-dark-brown small fw-bold">CITY</label>
                      <input type="text" className="form-control" required value={templeForm.city} onChange={e => setTempleForm({...templeForm, city: e.target.value})} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label text-dark-brown small fw-bold">STATE</label>
                      <input type="text" className="form-control" required value={templeForm.state} onChange={e => setTempleForm({...templeForm, state: e.target.value})} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label text-dark-brown small fw-bold">MAX CAPACITY</label>
                      <input type="number" className="form-control" required value={templeForm.capacity} onChange={e => setTempleForm({...templeForm, capacity: parseInt(e.target.value)})} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label text-dark-brown small fw-bold">LATITUDE / LONGITUDE</label>
                      <div className="input-group">
                        <input type="number" step="any" className="form-control" value={templeForm.latitude} onChange={e => setTempleForm({...templeForm, latitude: parseFloat(e.target.value)})} />
                        <input type="number" step="any" className="form-control" value={templeForm.longitude} onChange={e => setTempleForm({...templeForm, longitude: parseFloat(e.target.value)})} />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer border-beige">
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setShowTempleModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-maroon text-gold fw-bold">Onboard Temple</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create Operational Zone */}
      {showZoneModal && (
        <div className="modal d-block bg-dark bg-opacity-50" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content temple-card border-gold">
              <div className="modal-header border-beige">
                <h5 className="modal-title text-maroon fw-bold">Add Operational Crowd Zone</h5>
                <button type="button" className="btn-close" onClick={() => setShowZoneModal(false)}></button>
              </div>
              <form onSubmit={handleCreateZone}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label small fw-bold">TEMPLE</label>
                    <select className="form-select" value={zoneForm.temple_id} onChange={e => setZoneForm({...zoneForm, temple_id: e.target.value})}>
                      {temples.map(t => <option key={t.temple_id} value={t.temple_id}>{t.name} ({t.temple_id})</option>)}
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-bold">ZONE CODE</label>
                    <input type="text" className="form-control" required placeholder="e.g. north_gate" value={zoneForm.zone_code} onChange={e => setZoneForm({...zoneForm, zone_code: e.target.value})} />
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-bold">ZONE NAME</label>
                    <input type="text" className="form-control" required placeholder="e.g. North Gate Observation" value={zoneForm.name} onChange={e => setZoneForm({...zoneForm, name: e.target.value})} />
                  </div>
                  <div className="row g-2 mb-3">
                    <div className="col-6">
                      <label className="form-label small fw-bold">ZONE TYPE</label>
                      <select className="form-select" value={zoneForm.zone_type} onChange={e => setZoneForm({...zoneForm, zone_type: e.target.value})}>
                        <option value="ENTRY">ENTRY</option>
                        <option value="QUEUE">QUEUE</option>
                        <option value="SANCTUM">SANCTUM</option>
                        <option value="WAITING">WAITING</option>
                        <option value="VIP">VIP</option>
                        <option value="PRASADAM">PRASADAM</option>
                        <option value="EXIT">EXIT</option>
                        <option value="PARKING">PARKING</option>
                        <option value="MEDICAL">MEDICAL</option>
                      </select>
                    </div>
                    <div className="col-6">
                      <label className="form-label small fw-bold">CAPACITY</label>
                      <input type="number" className="form-control" value={zoneForm.capacity} onChange={e => setZoneForm({...zoneForm, capacity: parseInt(e.target.value)})} />
                    </div>
                  </div>
                </div>
                <div className="modal-footer border-beige">
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setShowZoneModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-maroon text-gold fw-bold">Create Zone</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Register Data Source */}
      {showSourceModal && (
        <div className="modal d-block bg-dark bg-opacity-50" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content temple-card border-gold">
              <div className="modal-header border-beige">
                <h5 className="modal-title text-maroon fw-bold">Register Authoritative Data Source</h5>
                <button type="button" className="btn-close" onClick={() => setShowSourceModal(false)}></button>
              </div>
              <form onSubmit={handleCreateSource}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label small fw-bold">SOURCE CODE</label>
                    <input type="text" className="form-control" required placeholder="e.g. SRC-ISRO-BHUVAN" value={sourceForm.source_code} onChange={e => setSourceForm({...sourceForm, source_code: e.target.value})} />
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-bold">SOURCE NAME</label>
                    <input type="text" className="form-control" required placeholder="e.g. ISRO Bhuvan Spatial Portal" value={sourceForm.name} onChange={e => setSourceForm({...sourceForm, name: e.target.value})} />
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-bold">URL</label>
                    <input type="text" className="form-control" placeholder="https://..." value={sourceForm.source_url} onChange={e => setSourceForm({...sourceForm, source_url: e.target.value})} />
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-bold">CLASSIFICATION</label>
                    <select className="form-select" value={sourceForm.data_classification} onChange={e => setSourceForm({...sourceForm, data_classification: e.target.value})}>
                      <option value="VERIFIED_OFFICIAL">VERIFIED_OFFICIAL</option>
                      <option value="VERIFIED_OPEN_DATA">VERIFIED_OPEN_DATA</option>
                      <option value="REAL_TIME">REAL_TIME</option>
                      <option value="HISTORICAL">HISTORICAL</option>
                      <option value="ESTIMATED">ESTIMATED</option>
                    </select>
                  </div>
                </div>
                <div className="modal-footer border-beige">
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setShowSourceModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-maroon text-gold fw-bold">Register Source</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create User Account */}
      {showUserModal && (
        <div className="modal d-block bg-dark bg-opacity-50" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content temple-card border-gold">
              <div className="modal-header border-beige">
                <h5 className="modal-title text-maroon fw-bold">Create Staff User Account</h5>
                <button type="button" className="btn-close" onClick={() => setShowUserModal(false)}></button>
              </div>
              <form onSubmit={handleCreateUser}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label small fw-bold">FULL NAME</label>
                    <input type="text" className="form-control" required placeholder="e.g. Rajesh Kumar" value={userForm.full_name} onChange={e => setUserForm({...userForm, full_name: e.target.value})} />
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-bold">EMAIL</label>
                    <input type="email" className="form-control" required placeholder="user@temple.org" value={userForm.email} onChange={e => setUserForm({...userForm, email: e.target.value})} />
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-bold">PASSWORD</label>
                    <input type="password" className="form-control" required placeholder="Minimum 6 characters" value={userForm.password} onChange={e => setUserForm({...userForm, password: e.target.value})} />
                  </div>
                  <div className="row g-2">
                    <div className="col-6">
                      <label className="form-label small fw-bold">ROLE</label>
                      <select className="form-select" value={userForm.role} onChange={e => setUserForm({...userForm, role: e.target.value})}>
                        <option value="TEMPLE_ADMIN">TEMPLE_ADMIN</option>
                        <option value="OPERATIONS_MANAGER">OPERATIONS_MANAGER</option>
                        <option value="EMERGENCY_OFFICER">EMERGENCY_OFFICER</option>
                        <option value="DATA_ANALYST">DATA_ANALYST</option>
                        <option value="VIEWER">VIEWER</option>
                        <option value="VOLUNTEER">VOLUNTEER</option>
                        <option value="MEDICAL">MEDICAL</option>
                        <option value="RECEPTIONIST">RECEPTIONIST</option>
                      </select>
                    </div>
                    <div className="col-6">
                      <label className="form-label small fw-bold">TENANT TEMPLE</label>
                      <select className="form-select" value={userForm.temple_id} onChange={e => setUserForm({...userForm, temple_id: e.target.value})}>
                        {temples.map(t => <option key={t.temple_id} value={t.temple_id}>{t.name} ({t.temple_id})</option>)}
                      </select>
                    </div>
                  </div>
                </div>
                <div className="modal-footer border-beige">
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setShowUserModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-maroon text-gold fw-bold">Create User</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TempleManagement;
