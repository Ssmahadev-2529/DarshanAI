import React, { useState, useEffect } from 'react';
import API from '../services/api';
import Loading from '../components/Loading';
import { Users, Shield, RefreshCw, UserCheck, UserX, Search } from 'lucide-react';

const UsersPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const fetchUsers = async () => {
    try {
      setRefreshing(true);
      const res = await API.get('/admin/users');
      setUsers(res.data);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleStatus = async (userId) => {
    try {
      await API.put(`/admin/users/${userId}/status`);
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to toggle status');
    }
  };

  if (loading) return <Loading />;

  const filteredUsers = users.filter(u => 
    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.role?.toLowerCase().includes(search.toLowerCase()) ||
    u.temple_id?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="container-fluid p-4">
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
        <div>
          <h4 className="fw-bold text-maroon m-0 d-flex align-items-center gap-2">
            <Users size={24} /> Staff User Directory & Access Roles
          </h4>
          <small className="text-muted">
            Multi-tenant role authorizations (SUPER_ADMIN, TEMPLE_ADMIN, OPERATIONS_MANAGER, EMERGENCY_OFFICER, DATA_ANALYST, VIEWER, VOLUNTEER)
          </small>
        </div>

        <div className="d-flex align-items-center gap-2">
          <div className="input-group input-group-sm" style={{ width: '240px' }}>
            <span className="input-group-text bg-white"><Search size={14} /></span>
            <input 
              type="text" 
              className="form-control" 
              placeholder="Search staff..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
            />
          </div>
          <button 
            onClick={fetchUsers} 
            disabled={refreshing} 
            className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1 shadow-sm"
          >
            <RefreshCw size={14} className={refreshing ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <div className="temple-card p-3">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0" style={{ backgroundColor: 'transparent' }}>
            <thead>
              <tr className="text-maroon small">
                <th>USER NAME</th>
                <th>EMAIL ADDRESS</th>
                <th>ASSIGNED ROLE</th>
                <th>TENANT SCOPE</th>
                <th>ACCOUNT STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(u => (
                <tr key={u.id}>
                  <td className="fw-semibold text-dark-brown">{u.full_name}</td>
                  <td className="text-muted">{u.email}</td>
                  <td>
                    <span className={`badge ${
                      u.role === 'SUPER_ADMIN' ? 'bg-danger' : 
                      u.role === 'TEMPLE_ADMIN' ? 'bg-warning text-dark' : 
                      u.role === 'OPERATIONS_MANAGER' || u.role === 'MANAGER' ? 'bg-primary' : 
                      u.role === 'EMERGENCY_OFFICER' || u.role === 'SECURITY' ? 'bg-danger' :
                      'bg-info text-dark'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="text-maroon fw-semibold">{u.temple_id || 'Platform Global'}</td>
                  <td>
                    <span className={`badge ${u.is_active ? 'bg-success' : 'bg-danger'}`}>
                      {u.is_active ? 'ACTIVE' : 'SUSPENDED'}
                    </span>
                  </td>
                  <td>
                    <button
                      onClick={() => handleToggleStatus(u.id)}
                      className="btn btn-outline-secondary btn-xs py-1 px-2"
                    >
                      {u.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan="6" className="text-center text-muted py-4">No staff members found matching query.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UsersPage;
