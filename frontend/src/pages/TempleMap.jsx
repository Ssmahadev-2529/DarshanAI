import React, { useState, useEffect, useContext, useRef } from 'react';
import API from '../services/api';
import { AuthContext } from '../context/AuthContext';
import TempleMap from '../components/TempleMap';
import Loading from '../components/Loading';
import { ClassificationBadge } from './DataQualityDashboard';
import { 
  Map, 
  Layers, 
  MapPin, 
  ShieldAlert, 
  Users, 
  Clock, 
  Sparkles, 
  Settings2, 
  Building, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle,
  Sliders,
  Plus,
  Search,
  Crosshair,
  ExternalLink,
  Globe,
  Building2,
  Navigation,
  Car,
  HeartPulse,
  Shield,
  FileCheck,
  Compass,
  Database
} from 'lucide-react';

const TempleMapPage = () => {
  const { user } = useContext(AuthContext);

  const [allTemples, setAllTemples] = useState([]);
  const [selectedTempleId, setSelectedTempleId] = useState(user?.temple_id || 'TEMPLE-001');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('zones'); // 'zones' | 'buildings' | 'surroundings' | 'sources' | 'quality'

  // Map Data State
  const [mapData, setMapData] = useState({
    temple: {
      temple_id: 'TEMPLE-001',
      name: 'Sri Somnath Jyotirlinga Temple',
      latitude: 20.8880,
      longitude: 70.4012,
      zoom_level: 18,
      capacity: 18000
    },
    zones: [],
    mode: 'HISTORICAL / SIMULATED'
  });

  const [selectedZone, setSelectedZone] = useState(null);
  const [pinnedLocation, setPinnedLocation] = useState(null);

  // Phase 2 Multi-Temple Verified Data States
  const [templeLocation, setTempleLocation] = useState(null);
  const [templeBuildings, setTempleBuildings] = useState([]);
  const [templeSurroundings, setTempleSurroundings] = useState({
    facilities: [],
    transport: [],
    parking: []
  });
  const [templeDataSources, setTempleDataSources] = useState([]);
  const [templeQuality, setTempleQuality] = useState(null);

  // Real Geocoding Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef(null);

  // Modals
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showAddTempleModal, setShowAddTempleModal] = useState(false);

  // Edit Location Form State
  const [editForm, setEditForm] = useState({
    latitude: 20.8880,
    longitude: 70.4012,
    address: '',
    zoom_level: 18
  });
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState('');
  const [savingLocation, setSavingLocation] = useState(false);

  // Add New Temple Form State
  const [addForm, setAddForm] = useState({
    temple_id: '',
    name: '',
    address: '',
    city: '',
    state: '',
    country: 'India',
    capacity: 20000,
    opening_time: '04:00 AM',
    closing_time: '10:00 PM',
    latitude: 28.6139,
    longitude: 77.2090,
    zoom_level: 18
  });
  const [addError, setAddError] = useState('');
  const [addSuccess, setAddSuccess] = useState('');
  const [addingTemple, setAddingTemple] = useState(false);

  // Fetch list of all registered temples
  const fetchTemplesList = async () => {
    try {
      const res = await API.get('/temples');
      if (Array.isArray(res.data) && res.data.length > 0) {
        setAllTemples(res.data);
      }
    } catch (err) {
      console.error('Error fetching temples:', err);
    }
  };

  // Fetch all Phase 2 multi-temple verified GIS datasets dynamically
  const fetchTempleDatasets = async (templeId) => {
    try {
      const [mapRes, locRes, bldRes, surrRes, srcRes, qualRes] = await Promise.allSettled([
        API.get(`/temples/${templeId}/map-data`),
        API.get(`/temples/${templeId}/location`),
        API.get(`/temples/${templeId}/buildings`),
        API.get(`/temples/${templeId}/surroundings`),
        API.get(`/temples/${templeId}/data-sources`),
        API.get(`/temples/${templeId}/data-quality`)
      ]);

      if (mapRes.status === 'fulfilled' && mapRes.value.data) {
        setMapData(mapRes.value.data);
        if (mapRes.value.data.zones && mapRes.value.data.zones.length > 0) {
          setSelectedZone(mapRes.value.data.zones[0]);
        }
      }

      if (locRes.status === 'fulfilled' && locRes.value.data) {
        setTempleLocation(locRes.value.data);
        setEditForm({
          latitude: locRes.value.data.latitude,
          longitude: locRes.value.data.longitude,
          address: locRes.value.data.address_line1 || locRes.value.data.city || '',
          zoom_level: 18
        });
      } else {
        setTempleLocation(null);
      }

      if (bldRes.status === 'fulfilled' && Array.isArray(bldRes.value.data)) {
        setTempleBuildings(bldRes.value.data);
      } else {
        setTempleBuildings([]);
      }

      if (surrRes.status === 'fulfilled' && surrRes.value.data) {
        setTempleSurroundings(surrRes.value.data);
      } else {
        setTempleSurroundings({ facilities: [], transport: [], parking: [] });
      }

      if (srcRes.status === 'fulfilled' && Array.isArray(srcRes.value.data)) {
        setTempleDataSources(srcRes.value.data);
      } else {
        setTempleDataSources([]);
      }

      if (qualRes.status === 'fulfilled' && qualRes.value.data) {
        setTempleQuality(qualRes.value.data);
      } else {
        setTempleQuality(null);
      }
    } catch (err) {
      console.error('Failed to load full temple datasets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplesList();
  }, [user]);

  useEffect(() => {
    if (selectedTempleId) {
      fetchTempleDatasets(selectedTempleId);
    }
  }, [selectedTempleId]);

  const handleTempleChange = (newTempleId) => {
    setSelectedTempleId(newTempleId);
    setPinnedLocation(null);
  };

  // Real Geocoding Search via OpenStreetMap Nominatim API
  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!val.trim() || val.length < 3) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const query = encodeURIComponent(`${val} temple India`);
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&countrycodes=in&limit=6&addressdetails=1`);
        const data = await res.json();
        setSearchResults(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Nominatim Geocoding error:', err);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 350);
  };

  const handleSelectSearchResult = (result) => {
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);
    
    setPinnedLocation({ lat, lng: lon, name: result.display_name });
    
    const address = result.address || {};
    const cityName = address.city || address.town || address.village || address.suburb || 'Central';
    const stateName = address.state || 'India';
    const shortName = result.display_name.split(',')[0] || searchQuery;

    setAddForm(prev => ({
      ...prev,
      temple_id: `TEMPLE-${Math.floor(100 + Math.random() * 900)}`,
      name: shortName,
      address: result.display_name,
      city: cityName,
      state: stateName,
      latitude: lat,
      longitude: lon,
      zoom_level: 18
    }));

    setSearchResults([]);
    setSearchQuery(shortName);
  };

  const handleMapClick = (latlng) => {
    setPinnedLocation({ lat: latlng.lat, lng: latlng.lng });
    setEditForm(prev => ({
      ...prev,
      latitude: parseFloat(latlng.lat.toFixed(5)),
      longitude: parseFloat(latlng.lng.toFixed(5))
    }));
    setAddForm(prev => ({
      ...prev,
      latitude: parseFloat(latlng.lat.toFixed(5)),
      longitude: parseFloat(latlng.lng.toFixed(5))
    }));
  };

  const handleLocationSubmit = async (e) => {
    e.preventDefault();
    setEditError('');
    setEditSuccess('');

    const lat = parseFloat(editForm.latitude);
    const lng = parseFloat(editForm.longitude);

    if (isNaN(lat) || lat < -90 || lat > 90) {
      setEditError('Latitude must be a valid number between -90 and 90 degrees.');
      return;
    }
    if (isNaN(lng) || lng < -180 || lng > 180) {
      setEditError('Longitude must be a valid number between -180 and 180 degrees.');
      return;
    }

    setSavingLocation(true);
    try {
      await API.put(`/temples/${selectedTempleId}/location`, {
        latitude: lat,
        longitude: lng,
        address: editForm.address,
        zoom_level: parseInt(editForm.zoom_level) || 18
      });
      setEditSuccess('Temple location updated successfully!');
      fetchTempleDatasets(selectedTempleId);
      setTimeout(() => {
        setShowLocationModal(false);
        setEditSuccess('');
      }, 1500);
    } catch (err) {
      setEditError(err.response?.data?.detail || 'Failed to update location.');
    } finally {
      setSavingLocation(false);
    }
  };

  const handleCreateNewTemple = async (e) => {
    e.preventDefault();
    setAddError('');
    setAddSuccess('');
    setAddingTemple(true);

    try {
      const payload = {
        ...addForm,
        latitude: parseFloat(addForm.latitude),
        longitude: parseFloat(addForm.longitude),
        capacity: parseInt(addForm.capacity) || 15000,
        zoom_level: parseInt(addForm.zoom_level) || 18
      };

      await API.post('/temples', payload);
      setAddSuccess(`Temple "${payload.name}" successfully created with auto-seeded GIS zones!`);
      
      await fetchTemplesList();
      setSelectedTempleId(payload.temple_id);

      setTimeout(() => {
        setShowAddTempleModal(false);
        setAddSuccess('');
        setPinnedLocation(null);
      }, 1500);
    } catch (err) {
      setAddError(err.response?.data?.detail || 'Failed to add temple map.');
    } finally {
      setAddingTemple(false);
    }
  };

  const temple = mapData?.temple || {
    temple_id: selectedTempleId,
    name: 'Selected Temple',
    latitude: 20.8880,
    longitude: 70.4012,
    capacity: 15000
  };
  const zones = mapData?.zones || [];

  if (loading) return <Loading />;

  return (
    <div className="container-fluid p-4">
      {/* Header Section */}
      <div className="d-flex flex-wrap align-items-center justify-content-between mb-3 gap-2">
        <div>
          <h4 className="fw-bold text-maroon m-0 d-flex align-items-center gap-2">
            <Compass size={24} className="text-maroon" /> Multi-Temple Spatial Explorer & GIS Foundation
          </h4>
          <small className="text-muted">
            Independent, verified geographical datasets with OpenStreetMap spatial coordinates, real architecture, and transparent provenance
          </small>
        </div>

        <div className="d-flex flex-wrap align-items-center gap-2">
          {/* Temple Selector Dropdown */}
          {allTemples.length > 0 && (
            <div className="d-flex align-items-center gap-1 bg-white p-1 rounded border border-beige shadow-sm">
              <Building size={16} className="text-maroon ms-1" />
              <select 
                className="form-select form-select-sm border-0 fw-bold text-maroon"
                value={selectedTempleId}
                onChange={e => handleTempleChange(e.target.value)}
                style={{ minWidth: '240px' }}
              >
                {allTemples.map(t => (
                  <option key={t.temple_id} value={t.temple_id}>
                    {t.name} ({t.city}, {t.state})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Add New Temple Button */}
          <button 
            onClick={() => {
              setAddForm(prev => ({
                ...prev,
                temple_id: `TEMPLE-00${allTemples.length + 1}`
              }));
              setShowAddTempleModal(true);
            }} 
            className="btn btn-maroon text-gold fw-bold btn-sm d-flex align-items-center gap-1 shadow-sm"
          >
            <Plus size={15} /> Add Temple Map
          </button>

          {/* Verification Badge */}
          {templeLocation && (
            <ClassificationBadge classification={templeLocation.data_classification} />
          )}

          <button 
            onClick={() => setShowLocationModal(true)} 
            className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1"
            title="Configure GPS coordinates"
          >
            <Settings2 size={15} /> Configure GPS
          </button>

          <button 
            onClick={() => fetchTempleDatasets(selectedTempleId)} 
            className="btn btn-outline-secondary btn-sm p-2"
            title="Refresh map telemetry"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* Real Geocoding Search Bar */}
      <div className="position-relative mb-3">
        <div className="input-group shadow-sm border border-gold rounded overflow-hidden">
          <span className="input-group-text bg-white border-0 text-maroon">
            <Search size={18} />
          </span>
          <input 
            type="text" 
            className="form-control border-0 py-2"
            placeholder="Search any verified temple in India via OpenStreetMap (e.g., Somnath, Tirupati, Madurai, Varanasi, Kedarnath)..."
            value={searchQuery}
            onChange={handleSearchChange}
          />
          {isSearching && (
            <span className="input-group-text bg-white border-0 text-muted small">
              Searching real OSM coordinates...
            </span>
          )}
        </div>

        {/* Autocomplete Dropdown */}
        {searchResults.length > 0 && (
          <div 
            className="position-absolute w-100 bg-white shadow-lg rounded border border-gold mt-1 p-2 overflow-auto" 
            style={{ zIndex: 1100, maxHeight: '280px' }}
          >
            <small className="text-muted fw-bold d-block px-2 pb-1 border-bottom border-beige">
              Real OpenStreetMap GPS Results (Click to preview on map):
            </small>
            {searchResults.map((item, idx) => (
              <div 
                key={idx}
                className="p-2 rounded hover-bg-ivory cursor-pointer border-bottom border-light d-flex align-items-center justify-content-between"
                style={{ cursor: 'pointer' }}
                onClick={() => handleSelectSearchResult(item)}
              >
                <div>
                  <strong className="text-maroon d-block" style={{ fontSize: '0.85rem' }}>
                    <MapPin size={14} className="me-1 inline text-saffron" />
                    {item.display_name.split(',')[0]}
                  </strong>
                  <small className="text-muted" style={{ fontSize: '0.74rem' }}>
                    {item.display_name}
                  </small>
                </div>
                <div className="text-end">
                  <span className="badge bg-ivory text-dark-brown border border-beige" style={{ fontSize: '0.7rem' }}>
                    {parseFloat(item.lat).toFixed(4)}° N, {parseFloat(item.lon).toFixed(4)}° E
                  </span>
                  <button 
                    type="button" 
                    className="btn btn-xs btn-outline-maroon ms-2 py-0 px-1"
                    style={{ fontSize: '0.7rem' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectSearchResult(item);
                      setShowAddTempleModal(true);
                    }}
                  >
                    + Add Map
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* KPI Overview Bar */}
      <div className="row g-3 mb-3">
        <div className="col-6 col-md-3">
          <div className="temple-card p-3 gold-glow">
            <small className="text-muted d-block fw-semibold" style={{ fontSize: '0.72rem' }}>VERIFIED TEMPLE COMPLEX</small>
            <h6 className="fw-bold text-maroon m-0 text-truncate">{temple.name}</h6>
            <small className="text-dark-brown" style={{ fontSize: '0.75rem' }}>
              GPS: {temple.latitude?.toFixed(4)}° N, {temple.longitude?.toFixed(4)}° E
            </small>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="temple-card p-3">
            <small className="text-muted d-block fw-semibold" style={{ fontSize: '0.72rem' }}>CAMPUS ELEVATION & AREA</small>
            <h5 className="fw-bold text-maroon m-0">
              {templeLocation?.elevation_meters ? `${templeLocation.elevation_meters} m MSL` : 'Verified MSL'}
            </h5>
            <small className="text-muted" style={{ fontSize: '0.75rem' }}>
              {templeLocation?.campus_area_sqm ? `${templeLocation.campus_area_sqm.toLocaleString()} m² campus` : 'Cadastral Survey'}
            </small>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="temple-card p-3">
            <small className="text-muted d-block fw-semibold" style={{ fontSize: '0.72rem' }}>DATA COMPLETENESS</small>
            <h5 className="fw-bold text-success m-0">
              {templeQuality?.completeness_percentage || 100}%
            </h5>
            <small className="text-muted" style={{ fontSize: '0.75rem' }}>
              {templeQuality?.coverage_level || 'COMPREHENSIVE'} Coverage
            </small>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="temple-card p-3">
            <small className="text-muted d-block fw-semibold" style={{ fontSize: '0.72rem' }}>DATA PROVENANCE</small>
            <div className="d-flex align-items-center gap-1 mt-1">
              <ClassificationBadge classification={templeLocation?.data_classification || 'VERIFIED_OFFICIAL'} />
            </div>
            <small className="text-muted mt-1 d-block" style={{ fontSize: '0.72rem' }}>
              {templeDataSources.length} verified open/trust sources
            </small>
          </div>
        </div>
      </div>

      {/* Main Map & Zone Inspector Row */}
      <div className="row g-3 mb-4">
        {/* Left / Center: Interactive Real Map APIs */}
        <div className="col-lg-8">
          <div className="temple-card p-2" style={{ height: '520px' }}>
            <TempleMap
              templeLat={pinnedLocation ? pinnedLocation.lat : temple.latitude}
              templeLng={pinnedLocation ? pinnedLocation.lng : temple.longitude}
              zoomLevel={temple.zoom_level || 18}
              templeName={pinnedLocation ? pinnedLocation.name || 'Searched Location' : temple.name}
              zones={zones}
              boundaryCoords={mapData.boundary_coordinates}
              selectedZoneId={selectedZone?.id}
              onSelectZone={(z) => setSelectedZone(z)}
              onMapClick={handleMapClick}
              pinnedPoint={pinnedLocation}
            />
          </div>

          {/* Quick Zone Navigator Buttons */}
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-1 mt-2">
            <div className="d-flex flex-wrap gap-1">
              {zones.map(z => (
                <button
                  key={z.id}
                  onClick={() => setSelectedZone(z)}
                  className={`btn btn-xs ${selectedZone?.id === z.id ? 'btn-maroon text-gold fw-bold' : 'btn-outline-secondary'}`}
                  style={{ fontSize: '0.72rem' }}
                >
                  {z.name}
                </button>
              ))}
            </div>

            {pinnedLocation && (
              <div className="d-flex align-items-center gap-1">
                <span className="badge bg-warning text-dark small" style={{ fontSize: '0.72rem' }}>
                  Pinned: {pinnedLocation.lat.toFixed(4)}, {pinnedLocation.lng.toFixed(4)}
                </span>
                <button 
                  onClick={() => setShowAddTempleModal(true)} 
                  className="btn btn-xs btn-maroon text-gold fw-bold"
                  style={{ fontSize: '0.72rem' }}
                >
                  + Add Map Here
                </button>
                <button 
                  onClick={() => setPinnedLocation(null)} 
                  className="btn btn-xs btn-outline-secondary"
                  style={{ fontSize: '0.72rem' }}
                >
                  Clear Pin
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right: Selected Zone & Real-Time Sensor Telemetry */}
        <div className="col-lg-4">
          <div className="temple-card p-3 h-100 d-flex flex-column justify-content-between gold-glow">
            {selectedZone ? (
              <div>
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <div>
                    <h5 className="fw-bold text-maroon m-0">{selectedZone.name}</h5>
                    <span className="badge bg-ivory border border-beige text-dark-brown mt-1" style={{ fontSize: '0.7rem' }}>
                      Type: {selectedZone.zone_type}
                    </span>
                  </div>
                  <ClassificationBadge classification={selectedZone.is_verified ? 'VERIFIED_OFFICIAL' : 'SIMULATED'} />
                </div>

                {/* Sensor Feed Fallback Notice */}
                <div className="alert alert-secondary py-1 px-2 mb-2 d-flex align-items-center gap-2" style={{ fontSize: '0.72rem' }}>
                  <AlertTriangle size={14} className="text-warning flex-shrink-0" />
                  <span>
                    <strong>CCTV Telemetry:</strong> Live sensor data currently unavailable. Operating on discrete event queue model.
                  </span>
                </div>

                <div className="mb-3">
                  <div className="d-flex justify-content-between small mb-1">
                    <span className="text-muted">Calculated Occupancy</span>
                    <strong className={selectedZone.occupancy_percent > 80 ? 'text-danger' : selectedZone.occupancy_percent > 65 ? 'text-warning' : 'text-success'}>
                      {selectedZone.occupancy_percent}%
                    </strong>
                  </div>
                  <div className="progress" style={{ height: '8px' }}>
                    <div 
                      className={`progress-bar ${selectedZone.occupancy_percent > 80 ? 'bg-danger' : selectedZone.occupancy_percent > 65 ? 'bg-warning' : 'bg-success'}`} 
                      role="progressbar" 
                      style={{ width: `${selectedZone.occupancy_percent}%` }}
                    />
                  </div>
                </div>

                <div className="row g-2 mb-3">
                  <div className="col-6">
                    <div className="p-2 rounded bg-ivory border border-beige">
                      <small className="text-muted d-block" style={{ fontSize: '0.7rem' }}>DEVOTEES</small>
                      <strong className="text-dark-brown fs-6">{selectedZone.current_devotees?.toLocaleString() || 0}</strong>
                      <span className="text-muted" style={{ fontSize: '0.7rem' }}> / {selectedZone.capacity}</span>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="p-2 rounded bg-ivory border border-beige">
                      <small className="text-muted d-block" style={{ fontSize: '0.7rem' }}>WAIT TIME</small>
                      <strong className="text-saffron fs-6">{selectedZone.estimated_wait_min} min</strong>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="p-2 rounded bg-ivory border border-beige">
                      <small className="text-muted d-block" style={{ fontSize: '0.7rem' }}>QUEUE LENGTH</small>
                      <strong className="text-maroon fs-6">{selectedZone.queue_length}</strong>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="p-2 rounded bg-ivory border border-beige">
                      <small className="text-muted d-block" style={{ fontSize: '0.7rem' }}>STAFF</small>
                      <strong className="text-dark-brown fs-6">{selectedZone.staff_assigned}</strong>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded bg-ivory border border-gold mb-2">
                  <div className="d-flex align-items-center gap-1 text-maroon fw-bold small mb-1">
                    <Sparkles size={16} /> Dynamic Density Prediction
                  </div>
                  <div className="small mb-1">
                    <span className="text-muted">Predicted in 30 min: </span>
                    <strong className="text-maroon">{selectedZone.ai_predicted_devotees_30min} devotees</strong>
                  </div>
                  <div className="p-2 rounded bg-white border border-beige small text-dark-brown fst-italic">
                    "{selectedZone.ai_recommendation}"
                  </div>
                </div>

                <div className="text-muted" style={{ fontSize: '0.72rem' }}>
                  GPS: <code>{selectedZone.latitude?.toFixed(5)}, {selectedZone.longitude?.toFixed(5)}</code>
                </div>
              </div>
            ) : (
              <div className="text-center p-4 text-muted">
                <MapPin size={32} className="mb-2 text-maroon opacity-50" />
                <p>Click any zone on the map to inspect telemetry.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Multi-Temple Explorer Deep Data Tabs */}
      <div className="temple-card p-4 gold-glow mb-4">
        {/* Navigation Tabs */}
        <div className="d-flex flex-wrap gap-2 border-bottom border-beige pb-3 mb-3">
          <button
            onClick={() => setActiveTab('buildings')}
            className={`btn btn-sm d-flex align-items-center gap-1 fw-bold ${
              activeTab === 'buildings' ? 'btn-maroon text-gold' : 'btn-outline-secondary'
            }`}
          >
            <Building2 size={16} /> Campus Structures ({templeBuildings.length})
          </button>

          <button
            onClick={() => setActiveTab('surroundings')}
            className={`btn btn-sm d-flex align-items-center gap-1 fw-bold ${
              activeTab === 'surroundings' ? 'btn-maroon text-gold' : 'btn-outline-secondary'
            }`}
          >
            <HeartPulse size={16} /> Surroundings & Emergency ({templeSurroundings.facilities.length + templeSurroundings.transport.length})
          </button>

          <button
            onClick={() => setActiveTab('sources')}
            className={`btn btn-sm d-flex align-items-center gap-1 fw-bold ${
              activeTab === 'sources' ? 'btn-maroon text-gold' : 'btn-outline-secondary'
            }`}
          >
            <Database size={16} /> Data Sources & Provenance ({templeDataSources.length})
          </button>

          <button
            onClick={() => setActiveTab('quality')}
            className={`btn btn-sm d-flex align-items-center gap-1 fw-bold ${
              activeTab === 'quality' ? 'btn-maroon text-gold' : 'btn-outline-secondary'
            }`}
          >
            <FileCheck size={16} /> Verification & Data Quality
          </button>
        </div>

        {/* Tab 1: Campus Structures */}
        {activeTab === 'buildings' && (
          <div>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div>
                <h6 className="fw-bold text-maroon m-0">Verified Temple Campus Structures</h6>
                <small className="text-muted">Authentic architectural monuments, sanctums, gopurams, and sabha mandapams</small>
              </div>
              <ClassificationBadge classification="VERIFIED_OFFICIAL" />
            </div>

            {templeBuildings.length === 0 ? (
              <div className="alert alert-warning">Verified data currently unavailable for this campus.</div>
            ) : (
              <div className="row g-3">
                {templeBuildings.map(b => (
                  <div className="col-md-6 col-lg-4" key={b.id}>
                    <div className="p-3 rounded border border-beige bg-ivory h-100">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <h6 className="fw-bold text-maroon m-0">{b.name}</h6>
                        <span className="badge bg-secondary" style={{ fontSize: '0.68rem' }}>{b.building_type}</span>
                      </div>
                      <p className="text-muted small mb-2" style={{ fontSize: '0.78rem' }}>{b.description}</p>
                      <div className="d-flex flex-column gap-1 small text-dark-brown" style={{ fontSize: '0.75rem' }}>
                        <div><strong>Height:</strong> {b.height_meters ? `${b.height_meters} meters` : 'Verified footprint'}</div>
                        <div><strong>Architectural Style:</strong> {b.architectural_style || 'Traditional Temple Architecture'}</div>
                        <div><strong>Capacity:</strong> {b.capacity?.toLocaleString()} persons</div>
                        <div><strong>GPS Footprint:</strong> <code>{b.latitude?.toFixed(4)}, {b.longitude?.toFixed(4)}</code></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Surroundings & Emergency Services */}
        {activeTab === 'surroundings' && (
          <div>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div>
                <h6 className="fw-bold text-maroon m-0">Surrounding Facilities, Emergency Services & Transport</h6>
                <small className="text-muted">Government hospitals, police aid posts, transit hubs, and authorized pilgrim parking</small>
              </div>
              <ClassificationBadge classification="VERIFIED_OPEN_DATA" />
            </div>

            <div className="row g-4">
              {/* Emergency Facilities */}
              <div className="col-lg-6">
                <h6 className="fw-bold text-dark-brown d-flex align-items-center gap-2 mb-2">
                  <Shield size={16} className="text-danger" /> Hospitals & Police Aid Posts
                </h6>
                <div className="d-flex flex-column gap-2">
                  {templeSurroundings.facilities.map(f => (
                    <div key={f.id} className="p-3 rounded border border-beige bg-ivory">
                      <div className="d-flex justify-content-between align-items-start">
                        <strong className="text-maroon">{f.name}</strong>
                        <span className="badge bg-danger">{f.facility_type}</span>
                      </div>
                      <div className="small text-muted mt-1">
                        <span>Distance: <strong>{f.distance_meters} meters</strong></span>
                        {f.emergency_contact && <span className="ms-3">Emergency: <strong>{f.emergency_contact}</strong></span>}
                      </div>
                      {f.has_icu && (
                        <div className="mt-1">
                          <span className="badge bg-success me-1">ICU Ready</span>
                          <span className="badge bg-info text-dark">{f.ambulance_count} Ambulances</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Transit & Parking */}
              <div className="col-lg-6">
                <h6 className="fw-bold text-dark-brown d-flex align-items-center gap-2 mb-2">
                  <Navigation size={16} className="text-primary" /> Transport Hubs & Parking
                </h6>
                <div className="d-flex flex-column gap-2">
                  {templeSurroundings.transport.map(t => (
                    <div key={t.id} className="p-3 rounded border border-beige bg-ivory">
                      <div className="d-flex justify-content-between align-items-start">
                        <strong className="text-maroon">{t.name}</strong>
                        <span className="badge bg-primary">{t.transport_type}</span>
                      </div>
                      <div className="small text-muted mt-1">
                        Distance: <strong>{t.distance_km} km</strong> | Connectivity: <strong>{t.connectivity_type}</strong>
                      </div>
                    </div>
                  ))}

                  {templeSurroundings.parking.map(p => (
                    <div key={p.id} className="p-3 rounded border border-beige bg-ivory">
                      <div className="d-flex justify-content-between align-items-start">
                        <strong className="text-maroon">{p.name}</strong>
                        <span className="badge bg-secondary">Parking</span>
                      </div>
                      <div className="small text-muted mt-1">
                        Capacity: <strong>{p.capacity} vehicles</strong> | Distance: <strong>{p.distance_meters} m</strong>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Data Sources & Provenance */}
        {activeTab === 'sources' && (
          <div>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div>
                <h6 className="fw-bold text-maroon m-0">Verified Data Sources & Provenance Catalog</h6>
                <small className="text-muted">Official publications, OpenStreetMap relations, and government geospatial repositories</small>
              </div>
              <ClassificationBadge classification="VERIFIED_OPEN_DATA" />
            </div>

            <div className="table-responsive">
              <table className="table table-hover align-middle border border-beige" style={{ fontSize: '0.82rem' }}>
                <thead className="bg-ivory text-maroon">
                  <tr>
                    <th>Source Entity</th>
                    <th>Publisher</th>
                    <th>License</th>
                    <th>Confidence</th>
                    <th>Classification</th>
                    <th>Verification Link</th>
                  </tr>
                </thead>
                <tbody>
                  {templeDataSources.map((s, idx) => (
                    <tr key={idx}>
                      <td className="fw-bold text-dark-brown">{s.source_name}</td>
                      <td>{s.publisher || 'Government Open Data'}</td>
                      <td><span className="badge bg-light text-dark border">{s.license}</span></td>
                      <td><span className="badge bg-success">{Math.round((s.confidence_level || 0.95) * 100)}%</span></td>
                      <td><ClassificationBadge classification={s.data_classification} /></td>
                      <td>
                        {s.source_url ? (
                          <a href={s.source_url} target="_blank" rel="noopener noreferrer" className="text-maroon fw-semibold text-decoration-none d-flex align-items-center gap-1">
                            Link <ExternalLink size={12} />
                          </a>
                        ) : (
                          <span className="text-muted">Authorized Trust Gazette</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 4: Verification & Data Quality */}
        {activeTab === 'quality' && (
          <div>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div>
                <h6 className="fw-bold text-maroon m-0">Data Completeness & Quality Report</h6>
                <small className="text-muted">Mathematical verification scores for {temple.name}</small>
              </div>
              <a href="/data-quality" className="btn btn-xs btn-outline-maroon fw-bold">
                Open Full Platform Quality Dashboard →
              </a>
            </div>

            {templeQuality ? (
              <div className="row g-3">
                <div className="col-md-4">
                  <div className="p-3 rounded bg-ivory border border-beige text-center">
                    <small className="text-muted d-block fw-bold">COMPLETENESS</small>
                    <h3 className="fw-bold text-success m-0">{templeQuality.completeness_percentage}%</h3>
                    <small className="text-muted">Calculated from stored records</small>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="p-3 rounded bg-ivory border border-beige text-center">
                    <small className="text-muted d-block fw-bold">TOTAL VERIFIED FEATURES</small>
                    <h3 className="fw-bold text-maroon m-0">{templeQuality.total_features_count}</h3>
                    <small className="text-muted">Zero unverified entities</small>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="p-3 rounded bg-ivory border border-beige text-center">
                    <small className="text-muted d-block fw-bold">DATA FRESHNESS</small>
                    <h4 className="fw-bold text-saffron m-0 mt-1">{templeQuality.data_freshness}</h4>
                    <small className="text-muted">Verified current release</small>
                  </div>
                </div>
              </div>
            ) : (
              <div className="alert alert-secondary">Verified data quality summary loading...</div>
            )}
          </div>
        )}
      </div>

      {/* Modal: Add New Temple Map */}
      {showAddTempleModal && (
        <div className="modal d-block bg-dark bg-opacity-50" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content temple-card border-gold">
              <div className="modal-header border-beige">
                <h5 className="modal-title text-maroon fw-bold d-flex align-items-center gap-2">
                  <Plus size={20} /> Onboard New Temple Map
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowAddTempleModal(false)}></button>
              </div>
              <form onSubmit={handleCreateNewTemple}>
                <div className="modal-body">
                  <p className="text-muted small mb-3">
                    Register a new temple with verified GPS coordinates and auto-seeded GIS zones.
                  </p>

                  {addError && <div className="alert alert-danger py-2 small">{addError}</div>}
                  {addSuccess && <div className="alert alert-success py-2 small">{addSuccess}</div>}

                  <div className="row g-3">
                    <div className="col-md-4">
                      <label className="form-label text-dark-brown small fw-bold">Temple Identifier ID</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        required 
                        placeholder="e.g. TEMPLE-006"
                        value={addForm.temple_id}
                        onChange={e => setAddForm({ ...addForm, temple_id: e.target.value })}
                      />
                    </div>

                    <div className="col-md-8">
                      <label className="form-label text-dark-brown small fw-bold">Temple Full Name</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        required 
                        placeholder="e.g. Shri Kedarnath Jyotirlinga Temple"
                        value={addForm.name}
                        onChange={e => setAddForm({ ...addForm, name: e.target.value })}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label text-dark-brown small fw-bold">City / Town</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        required 
                        placeholder="e.g. Rudraprayag"
                        value={addForm.city}
                        onChange={e => setAddForm({ ...addForm, city: e.target.value })}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label text-dark-brown small fw-bold">State / Province</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        required 
                        placeholder="e.g. Uttarakhand"
                        value={addForm.state}
                        onChange={e => setAddForm({ ...addForm, state: e.target.value })}
                      />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label text-dark-brown small fw-bold">GPS Latitude</label>
                      <input 
                        type="number" 
                        step="any"
                        className="form-control" 
                        required 
                        value={addForm.latitude}
                        onChange={e => setAddForm({ ...addForm, latitude: e.target.value })}
                      />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label text-dark-brown small fw-bold">GPS Longitude</label>
                      <input 
                        type="number" 
                        step="any"
                        className="form-control" 
                        required 
                        value={addForm.longitude}
                        onChange={e => setAddForm({ ...addForm, longitude: e.target.value })}
                      />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label text-dark-brown small fw-bold">Max Crowd Capacity</label>
                      <input 
                        type="number" 
                        className="form-control" 
                        required 
                        value={addForm.capacity}
                        onChange={e => setAddForm({ ...addForm, capacity: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="modal-footer border-beige">
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setShowAddTempleModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-maroon text-gold fw-bold" disabled={addingTemple}>
                    {addingTemple ? 'Creating Map & Zones...' : 'Create & Plop On Real Map'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Temple Location Modal */}
      {showLocationModal && (
        <div className="modal d-block bg-dark bg-opacity-50" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content temple-card border-gold">
              <div className="modal-header border-beige">
                <h5 className="modal-title text-maroon fw-bold d-flex align-items-center gap-2">
                  <Settings2 size={20} /> Configure Temple GPS Coordinates
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowLocationModal(false)}></button>
              </div>
              <form onSubmit={handleLocationSubmit}>
                <div className="modal-body">
                  <p className="text-muted small mb-3">
                    Configure the verified geographic coordinates for <strong>{temple.name}</strong>.
                  </p>

                  {editError && <div className="alert alert-danger py-2 small">{editError}</div>}
                  {editSuccess && <div className="alert alert-success py-2 small">{editSuccess}</div>}

                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label text-dark-brown small fw-bold">Latitude (GPS)</label>
                      <input 
                        type="number" 
                        step="any"
                        className="form-control" 
                        required 
                        value={editForm.latitude}
                        onChange={e => setEditForm({ ...editForm, latitude: e.target.value })}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label text-dark-brown small fw-bold">Longitude (GPS)</label>
                      <input 
                        type="number" 
                        step="any"
                        className="form-control" 
                        required 
                        value={editForm.longitude}
                        onChange={e => setEditForm({ ...editForm, longitude: e.target.value })}
                      />
                    </div>

                    <div className="col-12">
                      <label className="form-label text-dark-brown small fw-bold">Address / Landmark</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={editForm.address}
                        onChange={e => setEditForm({ ...editForm, address: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="modal-footer border-beige">
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setShowLocationModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-maroon text-gold fw-bold" disabled={savingLocation}>
                    {savingLocation ? 'Saving...' : 'Update Temple Location'}
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

export default TempleMapPage;
