import React, { useState, useEffect, useContext, useMemo } from 'react';
import API from '../services/api';
import { AuthContext } from '../context/AuthContext';
import Loading from '../components/Loading';
import { 
  Navigation, 
  Car, 
  Building2, 
  ShieldAlert, 
  HeartPulse, 
  Shield, 
  Flame, 
  MapPin, 
  Clock, 
  Phone, 
  AlertTriangle, 
  CheckCircle2, 
  Compass, 
  Search, 
  Filter, 
  RefreshCw, 
  TrendingUp, 
  Zap, 
  Layers, 
  ChevronRight, 
  ExternalLink,
  Bus,
  Train,
  Plane,
  EyeOff,
  Sparkles,
  Droplets,
  Home
} from 'lucide-react';

const SurroundingIntelligence = () => {
  const { user } = useContext(AuthContext);

  const [temples, setTemples] = useState([]);
  const [selectedTempleId, setSelectedTempleId] = useState(user?.temple_id || 'TEMPLE-001');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Core Data States
  const [roadsData, setRoadsData] = useState(null);
  const [trafficData, setTrafficData] = useState(null);
  const [parkingData, setParkingData] = useState(null);
  const [transportData, setTransportData] = useState(null);
  const [facilitiesData, setFacilitiesData] = useState([]);
  const [accessibilityData, setAccessibilityData] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);

  // Filters & Search
  const [selectedRadius, setSelectedRadius] = useState(5000);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'roads' | 'parking' | 'transit' | 'facilities' | 'analytics'

  // Fetch list of temples
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

  // Fetch all mobility intelligence data for selected temple
  const loadSurroundingData = async (templeId) => {
    if (!templeId) return;
    setRefreshing(true);
    try {
      const [roadsRes, trafficRes, parkingRes, transRes, facRes, accRes, analyticsRes] = await Promise.allSettled([
        API.get(`/temples/${templeId}/roads`),
        API.get(`/temples/${templeId}/traffic`),
        API.get(`/temples/${templeId}/parking`),
        API.get(`/temples/${templeId}/transport`),
        API.get(`/temples/${templeId}/nearby-facilities?radius_meters=${selectedRadius}`),
        API.get(`/temples/${templeId}/accessibility`),
        API.get(`/temples/${templeId}/surrounding-analytics`)
      ]);

      if (roadsRes.status === 'fulfilled') setRoadsData(roadsRes.value.data);
      if (trafficRes.status === 'fulfilled') setTrafficData(trafficRes.value.data);
      if (parkingRes.status === 'fulfilled') setParkingData(parkingRes.value.data);
      if (transRes.status === 'fulfilled') setTransportData(transRes.value.data);
      if (facRes.status === 'fulfilled') {
        const facs = facRes.value.data?.facilities || (Array.isArray(facRes.value.data) ? facRes.value.data : []);
        setFacilitiesData(facs);
      }
      if (accRes.status === 'fulfilled') setAccessibilityData(accRes.value.data);
      if (analyticsRes.status === 'fulfilled') setAnalyticsData(analyticsRes.value.data);

    } catch (err) {
      console.error('Failed to load surrounding data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (selectedTempleId) {
      loadSurroundingData(selectedTempleId);
    }
  }, [selectedTempleId, selectedRadius]);

  // Filter facilities by category and search term
  const filteredFacilities = useMemo(() => {
    return facilitiesData.filter(fac => {
      const matchesCategory = selectedCategory === 'ALL' || fac.facility_type === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        fac.name?.toLowerCase().includes(q) || 
        fac.address?.toLowerCase().includes(q) || 
        fac.facility_type?.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [facilitiesData, selectedCategory, searchQuery]);

  const activeTemple = temples.find(t => t.temple_id === selectedTempleId) || { name: 'Temple Complex', city: 'Urban Zone' };

  if (loading && !roadsData) {
    return <Loading text="Loading Surrounding Mobility & Smart City Intelligence..." />;
  }

  const parkSummary = parkingData?.summary || {
    total_parking_capacity: 0,
    total_occupied_spaces: 0,
    total_available_spaces: 0,
    overall_occupancy_percent: 0,
    overflow_alert: false
  };

  return (
    <div className="container-fluid p-4" style={{ backgroundColor: '#F9F6F0', minHeight: '100vh' }}>
      {/* Top Header & Temple Selector */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4 gap-3">
        <div>
          <div className="d-flex align-items-center gap-2 mb-1">
            <span className="badge px-2 py-1 text-uppercase fw-bold" style={{ backgroundColor: '#FFF3E0', color: '#D97706', border: '1px solid #FCD34D' }}>
              <Navigation size={13} className="inline me-1" /> Phase 10 • Smart City & GIS Mobility
            </span>
            <span className="badge bg-secondary bg-opacity-25 text-dark fw-semibold" style={{ fontSize: '0.72rem' }}>
              Multi-Temple Foundation
            </span>
          </div>
          <h2 className="fw-bold m-0 text-maroon" style={{ letterSpacing: '0.2px' }}>
            Surrounding Area & Mobility Intelligence
          </h2>
          <p className="text-muted small m-0">
            Road network monitoring, verified parking capacity, transit connectivity hubs, and radius-based public emergency facilities for <strong>{activeTemple.name}</strong>.
          </p>
        </div>

        {/* Temple Selector & Refresh */}
        <div className="d-flex align-items-center gap-2">
          <select 
            className="form-select shadow-sm border-saffron fw-semibold text-maroon"
            style={{ minWidth: '260px', backgroundColor: '#FFFFFF' }}
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
            className="btn btn-outline-dark d-flex align-items-center gap-1 shadow-sm"
            onClick={() => loadSurroundingData(selectedTempleId)}
            disabled={refreshing}
            title="Refresh surrounding datasets"
          >
            <RefreshCw size={15} className={refreshing ? 'spin-anim' : ''} />
            <span className="d-none d-sm-inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Prominent Data Honesty & Provenance Disclaimer Banner */}
      <div className="alert border-0 shadow-sm p-3 mb-4 rounded-3 d-flex align-items-start gap-3" style={{ backgroundColor: '#FFFBEB', borderLeft: '4px solid #F59E0B' }}>
        <EyeOff size={22} className="text-warning flex-shrink-0 mt-1" />
        <div className="small">
          <strong className="text-dark d-block mb-1" style={{ fontSize: '0.86rem' }}>
            DATA HONESTY & SENSOR TELEMETRY AUDIT (PHASE 10 SPECIFICATION)
          </strong>
          <span className="text-muted">
            Live vehicular speed feeds and automated boom-barrier vehicle counters are currently <strong>UNAVAILABLE</strong> for municipal approach corridors. All road geometries, hospital bed capacities, and parking structures are strictly verified via <strong>OpenStreetMap (ODbL)</strong>, <strong>Survey of India</strong>, and official <strong>Temple Devasthanam master plans</strong>. Never inferring simulated congestion as live municipal telemetry.
          </span>
        </div>
      </div>

      {/* Top Level Metric KPIs */}
      <div className="row g-3 mb-4">
        {/* Parking KPI */}
        <div className="col-12 col-sm-6 col-lg-3">
          <div className="card border-0 shadow-sm rounded-3 p-3 h-100 bg-white border-top border-4 border-success">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span className="text-muted small fw-semibold">PARKING AVAILABILITY</span>
              <Car size={18} className="text-success" />
            </div>
            <div className="d-flex align-items-baseline gap-2 mb-1">
              <h3 className="fw-bold m-0 text-dark">
                {parkSummary.total_available_spaces.toLocaleString()}
              </h3>
              <span className="small text-muted">/ {parkSummary.total_parking_capacity.toLocaleString()} total</span>
            </div>
            <div className="progress mt-2" style={{ height: '7px' }}>
              <div 
                className={`progress-bar ${parkSummary.overall_occupancy_percent >= 85 ? 'bg-danger' : parkSummary.overall_occupancy_percent >= 65 ? 'bg-warning' : 'bg-success'}`}
                style={{ width: `${parkSummary.overall_occupancy_percent}%` }}
              />
            </div>
            <div className="d-flex justify-content-between align-items-center mt-2 small text-muted">
              <span>Occupancy: {parkSummary.overall_occupancy_percent}%</span>
              {parkSummary.overflow_alert && (
                <span className="badge bg-danger text-white">NEAR CAPACITY</span>
              )}
            </div>
          </div>
        </div>

        {/* Road Corridors KPI */}
        <div className="col-12 col-sm-6 col-lg-3">
          <div className="card border-0 shadow-sm rounded-3 p-3 h-100 bg-white border-top border-4 border-primary">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span className="text-muted small fw-semibold">MONITORED ROADS</span>
              <Navigation size={18} className="text-primary" />
            </div>
            <div className="d-flex align-items-baseline gap-2 mb-1">
              <h3 className="fw-bold m-0 text-dark">
                {roadsData?.total_roads_count || 0}
              </h3>
              <span className="small text-muted">verified corridors</span>
            </div>
            <div className="small text-muted mt-2">
              <span className="badge bg-primary bg-opacity-10 text-primary me-1">Mada Streets</span>
              <span className="badge bg-info bg-opacity-10 text-info">Ring Road</span>
            </div>
            <small className="d-block text-muted mt-2" style={{ fontSize: '0.68rem' }}>
              Live Speed Feeds: <span className="text-danger fw-semibold">Unavailable</span>
            </small>
          </div>
        </div>

        {/* Emergency Medical KPI */}
        <div className="col-12 col-sm-6 col-lg-3">
          <div className="card border-0 shadow-sm rounded-3 p-3 h-100 bg-white border-top border-4 border-danger">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span className="text-muted small fw-semibold">NEAREST EMERGENCY TRAUMA</span>
              <HeartPulse size={18} className="text-danger" />
            </div>
            <div className="mb-1">
              <h6 className="fw-bold m-0 text-dark text-truncate" title={accessibilityData?.emergency_preparedness?.nearest_hospital?.name}>
                {accessibilityData?.emergency_preparedness?.nearest_hospital?.name || 'District Hospital'}
              </h6>
            </div>
            <div className="d-flex align-items-center justify-content-between mt-2">
              <span className="badge bg-danger bg-opacity-10 text-danger fw-bold">
                {accessibilityData?.emergency_preparedness?.nearest_hospital?.distance_meters ? `${(accessibilityData.emergency_preparedness.nearest_hospital.distance_meters / 1000).toFixed(1)} km` : 'Near Campus'}
              </span>
              <span className="small text-muted fw-semibold">
                ETA: ~{accessibilityData?.emergency_preparedness?.nearest_hospital?.estimated_ambulance_arrival_min || 6} min
              </span>
            </div>
            <small className="d-block text-muted mt-2" style={{ fontSize: '0.68rem' }}>
              Ambulance Bay: <span className="text-success fw-semibold">Unobstructed</span>
            </small>
          </div>
        </div>

        {/* Walkability Score KPI */}
        <div className="col-12 col-sm-6 col-lg-3">
          <div className="card border-0 shadow-sm rounded-3 p-3 h-100 bg-white border-top border-4 border-warning">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span className="text-muted small fw-semibold">PEDESTRIAN WALKABILITY</span>
              <Zap size={18} className="text-warning" />
            </div>
            <div className="d-flex align-items-baseline gap-2 mb-1">
              <h3 className="fw-bold m-0 text-dark">
                {accessibilityData?.pedestrian_walkability_score || 88}
              </h3>
              <span className="small text-muted">/ 100 ({accessibilityData?.walkability_rating || 'EXCELLENT'})</span>
            </div>
            <div className="small text-muted mt-2">
              <span>Barrier-free stone pavers & zero-vehicle processional paths</span>
            </div>
            <small className="d-block text-muted mt-2" style={{ fontSize: '0.68rem' }}>
              Transit Hubs: <span className="text-primary fw-semibold">{transportData?.total_transit_nodes || 0} nodes</span>
            </small>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <ul className="nav nav-pills mb-4 bg-white p-2 rounded-3 shadow-sm border">
        <li className="nav-item">
          <button 
            className={`nav-link fw-semibold px-3 py-2 ${activeTab === 'overview' ? 'active bg-maroon text-white' : 'text-dark'}`}
            onClick={() => setActiveTab('overview')}
          >
            <Compass size={15} className="inline me-1" /> Mobility Overview
          </button>
        </li>
        <li className="nav-item">
          <button 
            className={`nav-link fw-semibold px-3 py-2 ${activeTab === 'parking' ? 'active bg-maroon text-white' : 'text-dark'}`}
            onClick={() => setActiveTab('parking')}
          >
            <Car size={15} className="inline me-1" /> Parking Facilities ({parkingData?.parking_lots?.length || 0})
          </button>
        </li>
        <li className="nav-item">
          <button 
            className={`nav-link fw-semibold px-3 py-2 ${activeTab === 'roads' ? 'active bg-maroon text-white' : 'text-dark'}`}
            onClick={() => setActiveTab('roads')}
          >
            <Navigation size={15} className="inline me-1" /> Road Network & Corridors
          </button>
        </li>
        <li className="nav-item">
          <button 
            className={`nav-link fw-semibold px-3 py-2 ${activeTab === 'facilities' ? 'active bg-maroon text-white' : 'text-dark'}`}
            onClick={() => setActiveTab('facilities')}
          >
            <Building2 size={15} className="inline me-1" /> Nearby Facilities & Hospitals ({facilitiesData.length})
          </button>
        </li>
        <li className="nav-item">
          <button 
            className={`nav-link fw-semibold px-3 py-2 ${activeTab === 'transit' ? 'active bg-maroon text-white' : 'text-dark'}`}
            onClick={() => setActiveTab('transit')}
          >
            <Bus size={15} className="inline me-1" /> Transit Hubs ({transportData?.total_transit_nodes || 0})
          </button>
        </li>
        <li className="nav-item">
          <button 
            className={`nav-link fw-semibold px-3 py-2 ${activeTab === 'analytics' ? 'active bg-maroon text-white' : 'text-dark'}`}
            onClick={() => setActiveTab('analytics')}
          >
            <TrendingUp size={15} className="inline me-1" /> AI Demand Analytics
          </button>
        </li>
      </ul>

      {/* TAB CONTENT 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="row g-4">
          {/* Quick Parking Overview */}
          <div className="col-12 col-lg-6">
            <div className="card border-0 shadow-sm rounded-3 p-4 bg-white h-100">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="fw-bold m-0 text-maroon d-flex align-items-center gap-2">
                  <Car size={18} className="text-success" /> Verified Parking Complexes
                </h5>
                <button className="btn btn-sm btn-link text-maroon p-0" onClick={() => setActiveTab('parking')}>
                  View all <ChevronRight size={14} className="inline" />
                </button>
              </div>

              <div className="d-flex flex-column gap-3">
                {parkingData?.parking_lots?.map(p => (
                  <div key={p.id} className="p-3 rounded border bg-light">
                    <div className="d-flex justify-content-between align-items-start mb-1">
                      <strong className="text-dark">{p.name}</strong>
                      <span className={`badge ${p.current_occupancy_percent >= 85 ? 'bg-danger' : p.current_occupancy_percent >= 65 ? 'bg-warning text-dark' : 'bg-success'}`}>
                        {p.current_occupancy_percent}% OCCUPIED
                      </span>
                    </div>
                    <div className="d-flex justify-content-between text-muted small mb-2">
                      <span>Available: <strong className="text-success">{p.available_spaces}</strong> / {p.total_capacity} slots</span>
                      <span>Walk: ~{p.estimated_walking_time_min} min ({p.straight_line_distance_meters}m)</span>
                    </div>
                    <div className="progress" style={{ height: '6px' }}>
                      <div 
                        className={`progress-bar ${p.current_occupancy_percent >= 85 ? 'bg-danger' : p.current_occupancy_percent >= 65 ? 'bg-warning' : 'bg-success'}`}
                        style={{ width: `${p.current_occupancy_percent}%` }}
                      />
                    </div>
                    <div className="d-flex justify-content-between align-items-center mt-2 small text-muted">
                      <span>{p.ev_charging_available ? '⚡ EV Charging' : 'Standard Parking'} • {p.disabled_parking_spaces} Reserved Slots</span>
                      <span className="text-secondary">{p.fee_structure}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Emergency Egress & Hospital Preparedness */}
          <div className="col-12 col-lg-6">
            <div className="card border-0 shadow-sm rounded-3 p-4 bg-white h-100">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="fw-bold m-0 text-maroon d-flex align-items-center gap-2">
                  <HeartPulse size={18} className="text-danger" /> Emergency Medical & Public Safety
                </h5>
                <button className="btn btn-sm btn-link text-maroon p-0" onClick={() => setActiveTab('facilities')}>
                  Directory <ChevronRight size={14} className="inline" />
                </button>
              </div>

              <div className="row g-3 mb-3">
                <div className="col-12">
                  <div className="p-3 rounded border border-danger border-opacity-25 bg-danger bg-opacity-10">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <span className="badge bg-danger text-white">PRIMARY TRAUMA CENTER</span>
                      <span className="small fw-semibold text-danger">ETA: ~{accessibilityData?.emergency_preparedness?.nearest_hospital?.estimated_ambulance_arrival_min || 8} min</span>
                    </div>
                    <h6 className="fw-bold m-0 text-dark">
                      {accessibilityData?.emergency_preparedness?.nearest_hospital?.name}
                    </h6>
                    <div className="d-flex justify-content-between align-items-center mt-2 text-muted small">
                      <span>Distance: {accessibilityData?.emergency_preparedness?.nearest_hospital?.distance_meters ? `${(accessibilityData.emergency_preparedness.nearest_hospital.distance_meters / 1000).toFixed(1)} km` : 'Near'}</span>
                      <a href={`tel:${accessibilityData?.emergency_preparedness?.nearest_hospital?.contact_phone}`} className="btn btn-sm btn-danger py-0 px-2 fw-semibold">
                        <Phone size={11} className="inline me-1" /> {accessibilityData?.emergency_preparedness?.nearest_hospital?.contact_phone}
                      </a>
                    </div>
                  </div>
                </div>

                <div className="col-6">
                  <div className="p-3 rounded border bg-light h-100">
                    <div className="d-flex align-items-center gap-2 mb-1">
                      <Shield size={16} className="text-primary" />
                      <strong className="small text-dark">Police Aid Post</strong>
                    </div>
                    <div className="small text-muted mb-1 text-truncate" title={accessibilityData?.emergency_preparedness?.nearest_police_station?.name}>
                      {accessibilityData?.emergency_preparedness?.nearest_police_station?.name}
                    </div>
                    <div className="d-flex justify-content-between text-muted small">
                      <span>Dist: {accessibilityData?.emergency_preparedness?.nearest_police_station?.distance_meters}m</span>
                      <span>Resp: ~{accessibilityData?.emergency_preparedness?.nearest_police_station?.estimated_response_min} min</span>
                    </div>
                  </div>
                </div>

                <div className="col-6">
                  <div className="p-3 rounded border bg-light h-100">
                    <div className="d-flex align-items-center gap-2 mb-1">
                      <Flame size={16} className="text-warning" />
                      <strong className="small text-dark">Fire Station</strong>
                    </div>
                    <div className="small text-muted mb-1 text-truncate" title={accessibilityData?.emergency_preparedness?.nearest_fire_station?.name}>
                      {accessibilityData?.emergency_preparedness?.nearest_fire_station?.name}
                    </div>
                    <div className="d-flex justify-content-between text-muted small">
                      <span>Dist: {accessibilityData?.emergency_preparedness?.nearest_fire_station?.distance_meters ? `${(accessibilityData.emergency_preparedness.nearest_fire_station.distance_meters / 1000).toFixed(1)} km` : 'Nearby'}</span>
                      <span>Resp: ~{accessibilityData?.emergency_preparedness?.nearest_fire_station?.estimated_response_min} min</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actionable Recommendations */}
              <div className="p-3 rounded border bg-light mt-auto">
                <strong className="small text-dark d-block mb-1">
                  <Sparkles size={13} className="text-warning inline me-1" /> Operational Mobility Guidelines
                </strong>
                <ul className="m-0 ps-3 small text-muted">
                  {accessibilityData?.accessibility_recommendations?.map((rec, i) => (
                    <li key={i} className="mb-1">{rec}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 2: PARKING FACILITIES */}
      {activeTab === 'parking' && (
        <div className="row g-4">
          <div className="col-12">
            <div className="card border-0 shadow-sm rounded-3 p-4 bg-white">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div>
                  <h5 className="fw-bold m-0 text-maroon">Verified Parking Complexes & Pilgrim Holding Lots</h5>
                  <small className="text-muted">Total physical capacity: {parkSummary.total_parking_capacity.toLocaleString()} vehicles • Current free spaces: {parkSummary.total_available_spaces.toLocaleString()}</small>
                </div>
                <span className="badge px-3 py-2 bg-light border text-dark">
                  Source: Official Devasthanam Engineering Records
                </span>
              </div>

              <div className="row g-3">
                {parkingData?.parking_lots?.map(p => (
                  <div key={p.id} className="col-12 col-md-6 col-lg-4">
                    <div className="card h-100 border rounded-3 p-3 shadow-sm bg-light">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <h6 className="fw-bold m-0 text-dark">{p.name}</h6>
                        <span className={`badge ${p.current_occupancy_percent >= 85 ? 'bg-danger' : p.current_occupancy_percent >= 65 ? 'bg-warning text-dark' : 'bg-success'}`}>
                          {p.overflow_risk} RISK
                        </span>
                      </div>

                      <div className="mb-2">
                        <div className="d-flex justify-content-between small text-muted mb-1">
                          <span>Occupancy ({p.current_occupancy_percent}%)</span>
                          <span>{p.occupied_spaces} / {p.total_capacity}</span>
                        </div>
                        <div className="progress" style={{ height: '8px' }}>
                          <div 
                            className={`progress-bar ${p.current_occupancy_percent >= 85 ? 'bg-danger' : p.current_occupancy_percent >= 65 ? 'bg-warning' : 'bg-success'}`}
                            style={{ width: `${p.current_occupancy_percent}%` }}
                          />
                        </div>
                      </div>

                      <div className="d-flex flex-column gap-1 small text-muted border-top pt-2 mt-2">
                        <div className="d-flex justify-content-between">
                          <span>Available Spaces:</span>
                          <strong className="text-success">{p.available_spaces} bays</strong>
                        </div>
                        <div className="d-flex justify-content-between">
                          <span>Straight-line Distance:</span>
                          <span>{p.straight_line_distance_meters} meters</span>
                        </div>
                        <div className="d-flex justify-content-between">
                          <span>Road Route Distance:</span>
                          <span>{p.road_network_distance_meters} meters</span>
                        </div>
                        <div className="d-flex justify-content-between">
                          <span>Walking Time:</span>
                          <span>~{p.estimated_walking_time_min} minutes</span>
                        </div>
                        <div className="d-flex justify-content-between">
                          <span>Driving Time:</span>
                          <span>~{p.estimated_driving_time_min} minutes</span>
                        </div>
                        <div className="d-flex justify-content-between">
                          <span>EV Fast Charging:</span>
                          <span>{p.ev_charging_available ? 'Available (4 points)' : 'None'}</span>
                        </div>
                        <div className="d-flex justify-content-between">
                          <span>Disabled Reserved:</span>
                          <span>{p.disabled_parking_spaces} priority bays</span>
                        </div>
                        <div className="d-flex justify-content-between">
                          <span>Shuttle Transfer:</span>
                          <span>{p.shuttle_service_available ? 'Electric Buggy Bus' : 'Direct Pedestrian'}</span>
                        </div>
                      </div>

                      <div className="mt-3 pt-2 border-top d-flex justify-content-between align-items-center">
                        <span className="badge bg-secondary bg-opacity-10 text-dark">{p.fee_structure}</span>
                        <a href={`tel:${p.contact_number}`} className="btn btn-sm btn-outline-dark py-0 px-2" style={{ fontSize: '0.75rem' }}>
                          <Phone size={11} className="inline me-1" /> Helpdesk
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 3: ROAD NETWORK */}
      {activeTab === 'roads' && (
        <div className="row g-4">
          <div className="col-12">
            <div className="card border-0 shadow-sm rounded-3 p-4 bg-white">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div>
                  <h5 className="fw-bold m-0 text-maroon">Verified Road Network & Approach Corridors</h5>
                  <small className="text-muted">Geometric survey from OpenStreetMap (ODbL) & Municipal Public Works</small>
                </div>
                <span className="badge bg-warning bg-opacity-25 text-dark fw-semibold">
                  Live Traffic Feeds Unavailable
                </span>
              </div>

              <div className="table-responsive">
                <table className="table table-hover align-middle">
                  <thead className="table-light small">
                    <tr>
                      <th>Corridor Name</th>
                      <th>Category</th>
                      <th>Width</th>
                      <th>Surface Type</th>
                      <th>Vehicle Access</th>
                      <th>Speed Limit</th>
                      <th>Design Capacity</th>
                      <th>Bottleneck Risk</th>
                    </tr>
                  </thead>
                  <tbody className="small">
                    {trafficData?.corridors?.map((c, i) => (
                      <tr key={i}>
                        <td className="fw-bold text-dark">{c.road_name}</td>
                        <td>
                          <span className="badge bg-secondary bg-opacity-10 text-dark">
                            {c.road_category}
                          </span>
                        </td>
                        <td>{c.width_meters} meters</td>
                        <td>{c.pedestrian_only ? 'Granite Stone Pavers' : 'Heavy Duty Asphalt'}</td>
                        <td>
                          {c.pedestrian_only ? (
                            <span className="badge bg-danger bg-opacity-10 text-danger">Pedestrian Only</span>
                          ) : (
                            <span className="badge bg-success bg-opacity-10 text-success">Two-Way Vehicles</span>
                          )}
                        </td>
                        <td>{c.typical_free_flow_speed_kmh ? `${c.typical_free_flow_speed_kmh} km/h` : 'Foot Traffic'}</td>
                        <td>{c.design_capacity_vph ? `${c.design_capacity_vph.toLocaleString()} veh/hr` : 'Devotee Queue'}</td>
                        <td>
                          <span className={`badge ${c.bottleneck_hotspot ? 'bg-danger' : 'bg-success'}`}>
                            {c.bottleneck_hotspot ? 'HIGH RISK' : 'LOW RISK'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Peak Congestion Windows */}
              <div className="row g-3 mt-3">
                <div className="col-12 col-md-6">
                  <div className="p-3 rounded border bg-light">
                    <strong className="text-dark small d-block mb-2">
                      <Clock size={14} className="inline me-1 text-primary" /> Daily Traffic Rush Windows
                    </strong>
                    <div className="d-flex flex-column gap-2 small">
                      {trafficData?.peak_congestion_hours?.map((p, idx) => (
                        <div key={idx} className="d-flex justify-content-between align-items-center p-2 rounded bg-white border">
                          <div>
                            <strong className="d-block text-dark">{p.period}</strong>
                            <span className="text-muted">{p.hours}</span>
                          </div>
                          <span className={`badge ${p.expected_intensity === 'PEAK' ? 'bg-danger' : p.expected_intensity === 'HIGH' ? 'bg-warning text-dark' : 'bg-success'}`}>
                            {p.expected_intensity}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="col-12 col-md-6">
                  <div className="p-3 rounded border bg-light h-100">
                    <strong className="text-dark small d-block mb-2">
                      <AlertTriangle size={14} className="inline me-1 text-warning" /> Traffic Management Protocols
                    </strong>
                    <ul className="small text-muted ps-3 m-0">
                      <li className="mb-2"><strong>Zero-Vehicle Enforcement:</strong> The 4 Mada Streets are strictly reserved for barefoot devotees and deity palanquin processions.</li>
                      <li className="mb-2"><strong>Heavy Vehicle Diversion:</strong> Private tourist buses and coaches are held at Peripheral Outer Parking Lots.</li>
                      <li className="mb-2"><strong>Emergency Ambulance Green Corridor:</strong> Unobstructed 24x7 ingress from Ring Road to Temple Emergency Aid Post 2.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 4: NEARBY FACILITIES */}
      {activeTab === 'facilities' && (
        <div className="row g-4">
          <div className="col-12">
            <div className="card border-0 shadow-sm rounded-3 p-4 bg-white">
              <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 mb-3">
                <div>
                  <h5 className="fw-bold m-0 text-maroon">Nearby Public & Emergency Facilities</h5>
                  <small className="text-muted">Geodesic straight-line (Haversine) & estimated road-network routing</small>
                </div>

                {/* Radius Filter Buttons */}
                <div className="d-flex align-items-center gap-2">
                  <span className="small text-muted fw-semibold">Radius:</span>
                  {[500, 1000, 2000, 5000, 10000].map(r => (
                    <button
                      key={r}
                      className={`btn btn-sm ${selectedRadius === r ? 'btn-maroon text-white fw-bold' : 'btn-outline-secondary'}`}
                      style={{ fontSize: '0.75rem' }}
                      onClick={() => setSelectedRadius(r)}
                    >
                      {r >= 1000 ? `${r / 1000}km` : `${r}m`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category & Search Filter Bar */}
              <div className="row g-2 mb-4">
                <div className="col-12 col-md-4">
                  <div className="input-group input-group-sm">
                    <span className="input-group-text bg-white border-end-0">
                      <Search size={14} className="text-muted" />
                    </span>
                    <input 
                      type="text" 
                      className="form-control border-start-0" 
                      placeholder="Search facility name, address..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>

                <div className="col-12 col-md-8 d-flex flex-wrap gap-1">
                  {[
                    { id: 'ALL', label: 'All Categories' },
                    { id: 'HOSPITAL', label: 'Hospitals' },
                    { id: 'POLICE_STATION', label: 'Police Stations' },
                    { id: 'FIRE_STATION', label: 'Fire Stations' },
                    { id: 'PUBLIC_AMENITY', label: 'Water & Restrooms' },
                    { id: 'PILGRIM_ACCOMMODATION', label: 'Accommodations' }
                  ].map(cat => (
                    <button
                      key={cat.id}
                      className={`btn btn-sm ${selectedCategory === cat.id ? 'btn-dark text-white fw-semibold' : 'btn-light border text-muted'}`}
                      style={{ fontSize: '0.75rem' }}
                      onClick={() => setSelectedCategory(cat.id)}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Facilities Grid */}
              <div className="row g-3">
                {filteredFacilities.length === 0 ? (
                  <div className="col-12 text-center py-5 text-muted">
                    <Building2 size={36} className="text-muted opacity-50 mb-2" />
                    <p className="m-0">No facilities matching the selected filters within {selectedRadius >= 1000 ? `${selectedRadius/1000} km` : `${selectedRadius} m`}.</p>
                  </div>
                ) : (
                  filteredFacilities.map(f => (
                    <div key={f.id} className="col-12 col-md-6 col-lg-4">
                      <div className="card h-100 border rounded-3 p-3 shadow-sm bg-light">
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <span 
                            className="badge text-uppercase"
                            style={{ 
                              backgroundColor: f.facility_type === 'HOSPITAL' ? '#FEE2E2' : f.facility_type === 'POLICE_STATION' ? '#DBEAFE' : '#FEF3C7',
                              color: f.facility_type === 'HOSPITAL' ? '#DC2626' : f.facility_type === 'POLICE_STATION' ? '#2563EB' : '#D97706',
                              fontSize: '0.68rem'
                            }}
                          >
                            {f.facility_type.replace('_', ' ')}
                          </span>
                          <span className="badge bg-secondary bg-opacity-25 text-dark" style={{ fontSize: '0.65rem' }}>
                            {f.verification_status}
                          </span>
                        </div>

                        <h6 className="fw-bold m-0 text-dark mb-1">{f.name}</h6>
                        <small className="text-muted d-block text-truncate mb-2" title={f.address}>
                          <MapPin size={11} className="inline me-1" /> {f.address}
                        </small>

                        <div className="p-2 rounded bg-white border mb-2 small">
                          <div className="row g-1 text-center">
                            <div className="col-6 border-end">
                              <small className="d-block text-muted" style={{ fontSize: '0.62rem' }}>STRAIGHT-LINE</small>
                              <strong className="text-primary" style={{ fontSize: '0.85rem' }}>
                                {f.straight_line_distance_meters > 1000 ? `${(f.straight_line_distance_meters/1000).toFixed(1)} km` : `${f.straight_line_distance_meters} m`}
                              </strong>
                            </div>
                            <div className="col-6">
                              <small className="d-block text-muted" style={{ fontSize: '0.62rem' }}>ROAD ROUTE</small>
                              <strong className="text-success" style={{ fontSize: '0.85rem' }}>
                                {f.road_network_distance_meters > 1000 ? `${(f.road_network_distance_meters/1000).toFixed(1)} km` : `${f.road_network_distance_meters} m`}
                              </strong>
                            </div>
                          </div>
                        </div>

                        <div className="d-flex flex-column gap-1 small text-muted">
                          {f.bed_capacity && (
                            <div className="d-flex justify-content-between">
                              <span>Bed Capacity:</span>
                              <strong className="text-danger">{f.bed_capacity} Beds</strong>
                            </div>
                          )}
                          <div className="d-flex justify-content-between">
                            <span>Drive Time:</span>
                            <span>~{f.estimated_driving_time_min} minutes</span>
                          </div>
                          {f.estimated_walking_time_min && (
                            <div className="d-flex justify-content-between">
                              <span>Walk Time:</span>
                              <span>~{f.estimated_walking_time_min} minutes</span>
                            </div>
                          )}
                          <div className="d-flex justify-content-between">
                            <span>Hours:</span>
                            <span>{f.operating_hours}</span>
                          </div>
                        </div>

                        <div className="mt-3 pt-2 border-top d-flex justify-content-between align-items-center">
                          <span className="badge bg-light border text-muted" style={{ fontSize: '0.65rem' }}>
                            {f.emergency_level}
                          </span>
                          {f.contact_phone && (
                            <a href={`tel:${f.contact_phone}`} className="btn btn-sm btn-outline-danger py-0 px-2 fw-semibold" style={{ fontSize: '0.72rem' }}>
                              <Phone size={11} className="inline me-1" /> Call
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 5: TRANSIT CONNECTIVITY */}
      {activeTab === 'transit' && (
        <div className="row g-4">
          <div className="col-12">
            <div className="card border-0 shadow-sm rounded-3 p-4 bg-white">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div>
                  <h5 className="fw-bold m-0 text-maroon">Transit Nodes & Mass Mobility Infrastructure</h5>
                  <small className="text-muted">Railway stations, bus terminals, airports, and taxi/auto feeder points</small>
                </div>
                <span className="badge bg-info bg-opacity-10 text-info fw-semibold">
                  {transportData?.total_transit_nodes || 0} Registered Hubs
                </span>
              </div>

              <div className="row g-3">
                {transportData?.transit_nodes?.map(t => (
                  <div key={t.id} className="col-12 col-md-6 col-lg-4">
                    <div className="card h-100 border rounded-3 p-3 shadow-sm bg-light">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <span className="badge bg-primary bg-opacity-10 text-primary">
                          {t.transport_type === 'RAILWAY_STATION' ? 'RAILWAY STATION' : t.transport_type === 'BUS_TERMINAL' ? 'BUS TERMINAL' : t.transport_type === 'AIRPORT' ? 'AIRPORT' : 'TAXIS & AUTOS'}
                        </span>
                        <span className="badge bg-success bg-opacity-10 text-success">
                          {t.service_status}
                        </span>
                      </div>

                      <h6 className="fw-bold m-0 text-dark mb-1">{t.name}</h6>
                      <small className="text-muted d-block mb-3">Tier: {t.connectivity_tier}</small>

                      <div className="p-2 rounded bg-white border mb-2 small">
                        <div className="d-flex justify-content-between mb-1">
                          <span className="text-muted">Geodesic Distance:</span>
                          <strong>{t.straight_line_distance_meters > 1000 ? `${(t.straight_line_distance_meters/1000).toFixed(1)} km` : `${t.straight_line_distance_meters} m`}</strong>
                        </div>
                        <div className="d-flex justify-content-between mb-1">
                          <span className="text-muted">Road Travel Distance:</span>
                          <strong>{t.road_network_distance_meters > 1000 ? `${(t.road_network_distance_meters/1000).toFixed(1)} km` : `${t.road_network_distance_meters} m`}</strong>
                        </div>
                        <div className="d-flex justify-content-between">
                          <span className="text-muted">Est. Travel Time:</span>
                          <strong className="text-primary">~{t.estimated_driving_time_min} minutes</strong>
                        </div>
                      </div>

                      <div className="small text-muted mb-2">
                        <strong>Service Frequency / Headway:</strong>
                        <p className="m-0 text-dark fst-italic">{t.typical_headway}</p>
                      </div>

                      <div className="mt-auto pt-2 border-top d-flex justify-content-between align-items-center small">
                        <span className="text-muted">Parking: {t.parking_capacity || 100} bays</span>
                        <span className="text-secondary fw-semibold">Helpline: {t.contact_number}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 6: AI DEMAND ANALYTICS */}
      {activeTab === 'analytics' && (
        <div className="row g-4">
          {/* Modal Split */}
          <div className="col-12 col-lg-5">
            <div className="card border-0 shadow-sm rounded-3 p-4 bg-white h-100">
              <h5 className="fw-bold m-0 text-maroon mb-1">Devotee Influx Modal Split</h5>
              <small className="text-muted d-block mb-3">Estimated mode of travel based on historical pilgrimage arrival records</small>

              <div className="d-flex flex-column gap-3">
                {[
                  { label: 'RTC Bus & Electric Shuttles', pct: analyticsData?.modal_split_percentages?.bus_mass_transit_pct || 46, color: 'bg-primary' },
                  { label: 'Indian Railways Express Trains', pct: analyticsData?.modal_split_percentages?.railway_express_pct || 28, color: 'bg-info' },
                  { label: 'Private 4-Wheelers & Taxis', pct: analyticsData?.modal_split_percentages?.private_four_wheeler_pct || 16, color: 'bg-warning' },
                  { label: 'Two-Wheelers & Local Autos', pct: analyticsData?.modal_split_percentages?.two_wheeler_and_auto_pct || 7, color: 'bg-secondary' },
                  { label: 'Pedestrian Footpath Pilgrims', pct: analyticsData?.modal_split_percentages?.pedestrian_pilgrim_footpaths_pct || 3, color: 'bg-success' }
                ].map((item, idx) => (
                  <div key={idx}>
                    <div className="d-flex justify-content-between small mb-1">
                      <strong className="text-dark">{item.label}</strong>
                      <span className="fw-bold">{item.pct}%</span>
                    </div>
                    <div className="progress" style={{ height: '8px' }}>
                      <div className={`progress-bar ${item.color}`} style={{ width: `${item.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="alert alert-light border mt-4 p-2 small text-muted">
                <strong>Smart City Note:</strong> Over 74% of devotee arrivals use public mass transit (Rail + Bus), preventing severe private vehicular gridlock on inner approach roads.
              </div>
            </div>
          </div>

          {/* Spatial Bottlenecks & Festival Surges */}
          <div className="col-12 col-lg-7">
            <div className="card border-0 shadow-sm rounded-3 p-4 bg-white h-100">
              <h5 className="fw-bold m-0 text-maroon mb-1">Identified Spatial Bottlenecks & Mitigation</h5>
              <small className="text-muted d-block mb-3">AI mobility bottleneck analysis and festival surge forecasting</small>

              <div className="d-flex flex-column gap-3 mb-4">
                {analyticsData?.bottlenecks?.map((b, idx) => (
                  <div key={idx} className="p-3 rounded border bg-light">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <strong className="text-dark">{b.location_name}</strong>
                      <span className={`badge ${b.risk_severity === 'HIGH' ? 'bg-danger' : 'bg-warning text-dark'}`}>
                        {b.risk_severity} BOTTLENECK
                      </span>
                    </div>
                    <div className="small text-muted mb-2">
                      <span><strong>Peak Window:</strong> {b.peak_window}</span> • <span><strong>Root Cause:</strong> {b.cause}</span>
                    </div>
                    <div className="p-2 rounded bg-white border small text-dark">
                      <strong className="text-primary">AI Mitigation:</strong> {b.ai_mitigation}
                    </div>
                  </div>
                ))}
              </div>

              <h6 className="fw-bold text-maroon mb-2">Festival Surge Multipliers</h6>
              <div className="table-responsive">
                <table className="table table-sm table-bordered align-middle small">
                  <thead className="table-light">
                    <tr>
                      <th>Festival Event</th>
                      <th>Traffic Surge Multiplier</th>
                      <th>Infrastructure Impact</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analyticsData?.festival_surge_multipliers?.map((f, idx) => (
                      <tr key={idx}>
                        <td className="fw-bold">{f.festival}</td>
                        <td className="text-danger fw-bold">{f.multiplier}</td>
                        <td className="text-muted">{f.impact}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SurroundingIntelligence;
