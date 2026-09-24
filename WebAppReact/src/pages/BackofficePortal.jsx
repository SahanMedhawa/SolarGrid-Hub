// ============================================================
// File: BackofficePortal.jsx
// Project: Smart Solar Microgrid Trading System - React Web App
// Description: Dedicated Backoffice Admin Portal with full RBAC
//              management: Grid Nodes, Prosumers, System Users,
//              and All Energy Reservations with approvals.
// ============================================================

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getNodes,
  createNode,
  deactivateNode,
  getProsumers,
  activateProsumer,
  reactivateProsumer,
  getUsers,
  createUser,
  deleteUser,
  getReservations,
  approveReservation
} from '../services/api';
import StatusBadge from '../components/StatusBadge';
import { toast } from 'react-toastify';

export default function BackofficePortal() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);

  // Data states
  const [nodes, setNodes] = useState([]);
  const [prosumers, setProsumers] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [reservations, setReservations] = useState([]);

  // Modals state
  const [showNodeModal, setShowNodeModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);

  // Forms state
  const [newNode, setNewNode] = useState({
    nodeName: '',
    location: '',
    latitude: 6.9271,
    longitude: 79.8612,
    capacityKWh: 100,
    batterySlots: 10,
    availableBatterySlots: 10,
    schedule: '06:00-18:00'
  });

  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    role: 'GridOperator'
  });

  // Filter states
  const [prosumerFilter, setProsumerFilter] = useState('All');
  const [reservationFilter, setReservationFilter] = useState('All');

  useEffect(() => {
    loadAllData();
  }, []);

  async function loadAllData() {
    try {
      setLoading(true);
      const [nodesData, prosumersData, usersData, resData] = await Promise.all([
        getNodes().catch(() => []),
        getProsumers().catch(() => []),
        getUsers().catch(() => []),
        getReservations().catch(() => [])
      ]);
      setNodes(nodesData);
      setProsumers(prosumersData);
      setUsersList(usersData);
      setReservations(resData);
    } catch (error) {
      toast.error('Failed to load system data: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  // --- Handlers: Prosumers ---
  async function handleActivateProsumer(nic) {
    try {
      await activateProsumer(nic);
      toast.success(`Prosumer ${nic} activated successfully!`);
      loadAllData();
    } catch (err) {
      toast.error(err.message || 'Failed to activate prosumer.');
    }
  }

  async function handleReactivateProsumer(nic) {
    try {
      await reactivateProsumer(nic);
      toast.success(`Prosumer ${nic} reactivated successfully!`);
      loadAllData();
    } catch (err) {
      toast.error(err.message || 'Failed to reactivate prosumer.');
    }
  }

  // --- Handlers: Grid Nodes ---
  async function handleCreateNode(e) {
    e.preventDefault();
    if (!newNode.nodeName || !newNode.location) {
      toast.warning('Node name and location are required.');
      return;
    }
    try {
      await createNode({
        ...newNode,
        latitude: parseFloat(newNode.latitude),
        longitude: parseFloat(newNode.longitude),
        capacityKWh: parseFloat(newNode.capacityKWh),
        batterySlots: parseInt(newNode.batterySlots, 10),
        availableBatterySlots: parseInt(newNode.availableBatterySlots, 10)
      });
      toast.success('Grid Node Hub created successfully!');
      setShowNodeModal(false);
      setNewNode({
        nodeName: '',
        location: '',
        latitude: 6.9271,
        longitude: 79.8612,
        capacityKWh: 100,
        batterySlots: 10,
        availableBatterySlots: 10,
        schedule: '06:00-18:00'
      });
      loadAllData();
    } catch (err) {
      toast.error(err.message || 'Failed to create grid node.');
    }
  }

  async function handleDeactivateNode(id, name) {
    if (!window.confirm(`Are you sure you want to deactivate node "${name}"? Active reservations rule will apply.`)) {
      return;
    }
    try {
      await deactivateNode(id);
      toast.success(`Node "${name}" deactivated successfully.`);
      loadAllData();
    } catch (err) {
      // Backend enforces active reservation check
      toast.error(err.message || 'Cannot deactivate node.');
    }
  }

  // --- Handlers: System Users ---
  async function handleCreateUser(e) {
    e.preventDefault();
    if (!newUser.username || !newUser.password) {
      toast.warning('Username and password are required.');
      return;
    }
    try {
      await createUser(newUser);
      toast.success(`User ${newUser.username} created successfully!`);
      setShowUserModal(false);
      setNewUser({ username: '', password: '', role: 'GridOperator' });
      loadAllData();
    } catch (err) {
      toast.error(err.message || 'Failed to create user.');
    }
  }

  async function handleDeleteUser(id, username) {
    if (!window.confirm(`Deactivate system user "${username}"?`)) return;
    try {
      await deleteUser(id);
      toast.success(`User "${username}" deactivated.`);
      loadAllData();
    } catch (err) {
      toast.error(err.message || 'Failed to delete user.');
    }
  }

  // --- Handlers: Reservations ---
  async function handleApproveReservation(id) {
    try {
      await approveReservation(id);
      toast.success(`Reservation #${id} approved! Secure QR Code generated.`);
      loadAllData();
    } catch (err) {
      toast.error(err.message || 'Failed to approve reservation.');
    }
  }

  // Filtered lists
  const pendingProsumers = prosumers.filter(p => p.status === 'Pending');
  const deactivatedProsumers = prosumers.filter(p => p.status === 'Deactivated');
  const activeNodesCount = nodes.filter(n => n.isActive).length;
  const pendingReservations = reservations.filter(r => r.status === 'Pending');
  const approvedReservations = reservations.filter(r => r.status === 'Approved');
  const completedReservations = reservations.filter(r => r.status === 'Completed');

  const filteredProsumers = prosumers.filter(p => {
    if (prosumerFilter === 'All') return true;
    return p.status === prosumerFilter;
  });

  const filteredReservations = reservations.filter(r => {
    if (reservationFilter === 'All') return true;
    return r.status === reservationFilter;
  });

  if (loading) {
    return (
      <div className="page-content">
        <div className="loading-spinner">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-content">
      {/* Portal Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '2rem' }}>🏛️</span>
            <h1 className="page-title" style={{ margin: 0 }}>Backoffice Admin Portal</h1>
          </div>
          <p className="text-muted" style={{ margin: 0 }}>
            Centralized operations, node hubs governance, prosumer verification &amp; system users.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <span className="role-tag" style={{ background: 'var(--gradient-accent)', padding: '0.4rem 0.8rem', borderRadius: '20px', fontSize: '0.85rem' }}>
            👑 Role: Backoffice Admin
          </span>
          <button className="btn btn-secondary btn-sm" onClick={loadAllData}>
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Quick KPI Stat Cards */}
      <div className="stats-grid" style={{ marginBottom: '2rem' }}>
        <div className="stat-card" onClick={() => setActiveTab('nodes')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon green">🔋</div>
          <div className="stat-info">
            <div className="stat-value">{activeNodesCount} / {nodes.length}</div>
            <div className="stat-label">Active Node Hubs</div>
          </div>
        </div>

        <div className="stat-card accent" onClick={() => setActiveTab('prosumers')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon blue">☀️</div>
          <div className="stat-info">
            <div className="stat-value">{prosumers.length}</div>
            <div className="stat-label">Total Prosumers</div>
          </div>
        </div>

        <div className="stat-card warning" onClick={() => setActiveTab('prosumers')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon amber">⏳</div>
          <div className="stat-info">
            <div className="stat-value">{pendingProsumers.length}</div>
            <div className="stat-label">Pending Verification</div>
          </div>
        </div>

        <div className="stat-card" onClick={() => setActiveTab('reservations')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon green">📋</div>
          <div className="stat-info">
            <div className="stat-value">{reservations.length}</div>
            <div className="stat-label">Total Reservations</div>
          </div>
        </div>

        <div className="stat-card accent" onClick={() => setActiveTab('users')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon blue">👥</div>
          <div className="stat-info">
            <div className="stat-value">{usersList.length}</div>
            <div className="stat-label">Staff Users</div>
          </div>
        </div>
      </div>

      {/* Portal Tabs */}
      <div className="role-tabs" style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
        <button
          className={`role-tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          📊 Dashboard Overview
        </button>
        <button
          className={`role-tab ${activeTab === 'nodes' ? 'active' : ''}`}
          onClick={() => setActiveTab('nodes')}
        >
          ⚡ Grid Hub Nodes ({nodes.length})
        </button>
        <button
          className={`role-tab ${activeTab === 'prosumers' ? 'active' : ''}`}
          onClick={() => setActiveTab('prosumers')}
        >
          ☀️ Prosumers ({prosumers.length})
          {pendingProsumers.length > 0 && (
            <span style={{ marginLeft: '6px', background: 'var(--color-warning)', color: '#000', padding: '2px 6px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 'bold' }}>
              {pendingProsumers.length}
            </span>
          )}
        </button>
        <button
          className={`role-tab ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          👥 System Staff ({usersList.length})
        </button>
        <button
          className={`role-tab ${activeTab === 'reservations' ? 'active' : ''}`}
          onClick={() => setActiveTab('reservations')}
        >
          📅 Energy Reservations ({reservations.length})
        </button>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Pending Prosumer Verifications Widget */}
          {pendingProsumers.length > 0 ? (
            <div className="dashboard-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2 className="section-title" style={{ margin: 0 }}>
                  <span className="text-warning">⏳</span> Pending Prosumer Account Activations
                </h2>
                <span className="text-muted" style={{ fontSize: '0.85rem' }}>
                  Requires Backoffice identity verification
                </span>
              </div>
              <div className="card">
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>NIC</th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingProsumers.map(p => (
                        <tr key={p.nic}>
                          <td><strong>{p.nic}</strong></td>
                          <td>{p.firstName} {p.lastName}</td>
                          <td>{p.email}</td>
                          <td>{p.phone}</td>
                          <td><StatusBadge status={p.status} /></td>
                          <td>
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => handleActivateProsumer(p.nic)}
                            >
                              ✅ Approve &amp; Activate
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="card" style={{ padding: '1.25rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
              ✅ No pending prosumer registrations waiting for review. All accounts up to date!
            </div>
          )}

          {/* Pending Reservations Queue Widget */}
          <div className="dashboard-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 className="section-title" style={{ margin: 0 }}>
                <span>📋</span> Pending Booking Approval Queue
              </h2>
              <button className="btn btn-secondary btn-sm" onClick={() => setActiveTab('reservations')}>
                View All ({reservations.length})
              </button>
            </div>
            <div className="card">
              <div className="table-container">
                {pendingReservations.length === 0 ? (
                  <p style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--color-text-secondary)', margin: 0 }}>
                    No pending bookings waiting for approval.
                  </p>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Prosumer NIC</th>
                        <th>Slot</th>
                        <th>Scheduled Date</th>
                        <th>Energy (kWh)</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingReservations.slice(0, 5).map(r => (
                        <tr key={r.id}>
                          <td className="truncate" style={{ maxWidth: '120px' }}>{r.id}</td>
                          <td><strong>{r.prosumerNic}</strong></td>
                          <td>{r.slotId}</td>
                          <td>{new Date(r.reservationDate).toLocaleString()}</td>
                          <td>{r.energyKWh} kWh</td>
                          <td><StatusBadge status={r.status} /></td>
                          <td>
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => handleApproveReservation(r.id)}
                            >
                              Approve &amp; QR
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: GRID HUB NODES */}
      {activeTab === 'nodes' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h2 className="section-title" style={{ margin: 0 }}>⚡ Microgrid Node Stations</h2>
            <button className="btn btn-primary" onClick={() => setShowNodeModal(true)}>
              ➕ Add New Grid Node Hub
            </button>
          </div>

          <div className="card">
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Station Name</th>
                    <th>Location</th>
                    <th>Coordinates</th>
                    <th>Capacity</th>
                    <th>Battery Slots</th>
                    <th>Schedule</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {nodes.map(n => (
                    <tr key={n.id}>
                      <td><strong>{n.nodeName}</strong></td>
                      <td>{n.location}</td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                        {n.latitude?.toFixed(4)}, {n.longitude?.toFixed(4)}
                      </td>
                      <td>{n.capacityKWh} kWh</td>
                      <td>
                        <span style={{ color: 'var(--color-primary-light)', fontWeight: 600 }}>
                          {n.availableBatterySlots}
                        </span> / {n.batterySlots} Avail
                      </td>
                      <td>{n.schedule || '24/7'}</td>
                      <td>
                        <StatusBadge status={n.isActive ? 'Active' : 'Deactivated'} />
                      </td>
                      <td>
                        {n.isActive ? (
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDeactivateNode(n.id, n.nodeName)}
                          >
                            Deactivate
                          </button>
                        ) : (
                          <span className="text-muted" style={{ fontSize: '0.8rem' }}>Inactive</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PROSUMERS */}
      {activeTab === 'prosumers' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h2 className="section-title" style={{ margin: 0 }}>☀️ Prosumer Registry &amp; Lifecycle</h2>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span className="text-muted" style={{ fontSize: '0.85rem' }}>Filter:</span>
              {['All', 'Pending', 'Active', 'Deactivated'].map(status => (
                <button
                  key={status}
                  className={`btn btn-sm ${prosumerFilter === status ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setProsumerFilter(status)}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="table-container">
              {filteredProsumers.length === 0 ? (
                <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                  No prosumers matching filter "{prosumerFilter}".
                </p>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>NIC</th>
                      <th>Name</th>
                      <th>Contact Info</th>
                      <th>Address</th>
                      <th>Solar Capacity</th>
                      <th>Status</th>
                      <th>Admin Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProsumers.map(p => (
                      <tr key={p.nic}>
                        <td><strong>{p.nic}</strong></td>
                        <td>{p.firstName} {p.lastName}</td>
                        <td style={{ fontSize: '0.85rem' }}>
                          <div>📧 {p.email}</div>
                          <div>📞 {p.phone}</div>
                        </td>
                        <td style={{ fontSize: '0.85rem', maxWidth: '200px' }}>{p.address}</td>
                        <td>{p.solarCapacityKWh ? `${p.solarCapacityKWh} kW` : '10 kW'}</td>
                        <td><StatusBadge status={p.status} /></td>
                        <td>
                          {p.status === 'Pending' && (
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => handleActivateProsumer(p.nic)}
                            >
                              ✅ Activate
                            </button>
                          )}
                          {p.status === 'Deactivated' && (
                            <button
                              className="btn btn-secondary btn-sm"
                              style={{ borderColor: 'var(--color-accent)', color: 'var(--color-accent-light)' }}
                              onClick={() => handleReactivateProsumer(p.nic)}
                            >
                              🔄 Reactivate
                            </button>
                          )}
                          {p.status === 'Active' && (
                            <span style={{ fontSize: '0.8rem', color: 'var(--color-primary-light)' }}>
                              ✓ Operational
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: SYSTEM USERS */}
      {activeTab === 'users' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 className="section-title" style={{ margin: 0 }}>👥 System User Accounts (RBAC)</h2>
              <span className="text-muted" style={{ fontSize: '0.85rem' }}>
                Manage Backoffice administrators and Grid Operators.
              </span>
            </div>
            <button className="btn btn-primary" onClick={() => setShowUserModal(true)}>
              ➕ Create Staff User
            </button>
          </div>

          <div className="card">
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {usersList.map(u => (
                    <tr key={u.id}>
                      <td><strong>{u.username}</strong></td>
                      <td>
                        <span className="role-tag" style={{
                          background: u.role === 'Backoffice' ? 'var(--gradient-accent)' : 'var(--gradient-primary)'
                        }}>
                          {u.role}
                        </span>
                      </td>
                      <td><StatusBadge status={u.isActive ? 'Active' : 'Deactivated'} /></td>
                      <td>
                        {u.isActive ? (
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDeleteUser(u.id, u.username)}
                          >
                            Deactivate
                          </button>
                        ) : (
                          <span className="text-muted" style={{ fontSize: '0.8rem' }}>Deactivated</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: ALL RESERVATIONS */}
      {activeTab === 'reservations' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h2 className="section-title" style={{ margin: 0 }}>📅 All Energy Reservations</h2>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span className="text-muted" style={{ fontSize: '0.85rem' }}>Filter:</span>
              {['All', 'Pending', 'Approved', 'Completed', 'Cancelled'].map(status => (
                <button
                  key={status}
                  className={`btn btn-sm ${reservationFilter === status ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setReservationFilter(status)}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="table-container">
              {filteredReservations.length === 0 ? (
                <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                  No reservations matching filter "{reservationFilter}".
                </p>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Prosumer NIC</th>
                      <th>Node Station</th>
                      <th>Slot</th>
                      <th>Scheduled Date</th>
                      <th>Energy (kWh)</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReservations.map(r => (
                      <tr key={r.id}>
                        <td className="truncate" style={{ maxWidth: '100px' }}>{r.id}</td>
                        <td><strong>{r.prosumerNic}</strong></td>
                        <td>{r.nodeId}</td>
                        <td>{r.slotId}</td>
                        <td>{new Date(r.reservationDate).toLocaleString()}</td>
                        <td>{r.energyKWh} kWh</td>
                        <td><StatusBadge status={r.status} /></td>
                        <td>
                          {r.status === 'Pending' && (
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => handleApproveReservation(r.id)}
                            >
                              Approve &amp; QR
                            </button>
                          )}
                          {r.status === 'Approved' && (
                            <span style={{ fontSize: '0.8rem', color: 'var(--color-primary-light)' }}>
                              QR Ready
                            </span>
                          )}
                          {r.status === 'Completed' && (
                            <span style={{ fontSize: '0.8rem', color: 'var(--color-accent-light)' }}>
                              ⚡ Transferred
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create Grid Node Hub */}
      {showNodeModal && (
        <div className="modal-overlay" onClick={() => setShowNodeModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">⚡ Add New Microgrid Node Hub</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowNodeModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateNode}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Station Name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Colombo South Station"
                    value={newNode.nodeName}
                    onChange={e => setNewNode({ ...newNode, nodeName: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Physical Location</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Havelock City, Colombo 05"
                    value={newNode.location}
                    onChange={e => setNewNode({ ...newNode, location: e.target.value })}
                    required
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Latitude</label>
                    <input
                      type="number"
                      step="any"
                      className="form-input"
                      value={newNode.latitude}
                      onChange={e => setNewNode({ ...newNode, latitude: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Longitude</label>
                    <input
                      type="number"
                      step="any"
                      className="form-input"
                      value={newNode.longitude}
                      onChange={e => setNewNode({ ...newNode, longitude: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Capacity (kWh)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={newNode.capacityKWh}
                      onChange={e => setNewNode({ ...newNode, capacityKWh: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Battery Slots</label>
                    <input
                      type="number"
                      className="form-input"
                      value={newNode.batterySlots}
                      onChange={e => setNewNode({ ...newNode, batterySlots: e.target.value, availableBatterySlots: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Operating Schedule</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="06:00-18:00"
                    value={newNode.schedule}
                    onChange={e => setNewNode({ ...newNode, schedule: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowNodeModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Station Node
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create System Staff User */}
      {showUserModal && (
        <div className="modal-overlay" onClick={() => setShowUserModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">👥 Create System Staff User</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowUserModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateUser}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Username</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. operator_colombo"
                    value={newUser.username}
                    onChange={e => setNewUser({ ...newUser, username: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Temporary Password</label>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="Enter password"
                    value={newUser.password}
                    onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Role</label>
                  <select
                    className="form-select"
                    value={newUser.role}
                    onChange={e => setNewUser({ ...newUser, role: e.target.value })}
                  >
                    <option value="GridOperator">GridOperator (Physical Station Hub)</option>
                    <option value="Backoffice">Backoffice (Administrator)</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowUserModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
