// ============================================================
// File: ReservationsPage.jsx
// Project: Smart Solar Microgrid Trading System - React Web App
// Description: Full reservation management page with:
//              - Create booking (7-day rule enforced)
//              - Update booking (12-hour rule enforced)
//              - Cancel booking (12-hour rule enforced)
//              - Approve bookings (generates QR code)
//              - Summary dialog after each action
//              - Status filtering
//              - Booking history view
//              - Pending and future approved counts
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getReservations, getReservationsByStatus, getNodes, getAvailableSlotsByNode,
  createReservation, updateReservation, cancelReservation, approveReservation
} from '../services/api';
import StatusBadge from '../components/StatusBadge';
import { toast } from 'react-toastify';

// Renders the full reservation management page.
export default function ReservationsPage() {
  const { user } = useAuth();
  const [reservations, setReservations] = useState([]);
  const [nodes, setNodes] = useState([]);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  // Create modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    prosumerNic: '', nodeId: '', slotId: '', reservationDate: '', energyKWh: ''
  });

  // Update modal state
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [editingRes, setEditingRes] = useState(null);
  const [updateForm, setUpdateForm] = useState({ slotId: '', reservationDate: '', energyKWh: '' });

  // Summary dialog state (shown after each action)
  const [summary, setSummary] = useState(null);

  // Dashboard stats
  const [stats, setStats] = useState({ pending: 0, approved: 0, completed: 0, cancelled: 0, total: 0 });

  // Loads reservation data on mount.
  useEffect(() => { loadData(); }, []);

  // Loads all data needed for the page.
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [resData, nodeData] = await Promise.all([
        getReservations(),
        getNodes()
      ]);
      setReservations(resData);
      setNodes(nodeData);

      // Calculate stats
      setStats({
        pending: resData.filter(r => r.status === 'Pending').length,
        approved: resData.filter(r => r.status === 'Approved' && new Date(r.reservationDate) > new Date()).length,
        completed: resData.filter(r => r.status === 'Completed').length,
        cancelled: resData.filter(r => r.status === 'Cancelled').length,
        total: resData.length
      });
    } catch (error) {
      toast.error('Failed to load reservations.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Returns the node name for a given nodeId.
  function getNodeName(nodeId) {
    const node = nodes.find(n => n.id === nodeId);
    return node ? node.nodeName : nodeId;
  }

  // Gets filtered reservations based on tab and search.
  function getFilteredReservations() {
    let filtered = [...reservations];

    // Tab filter
    if (activeTab === 'pending') filtered = filtered.filter(r => r.status === 'Pending');
    else if (activeTab === 'approved') filtered = filtered.filter(r => r.status === 'Approved');
    else if (activeTab === 'history') filtered = filtered.filter(r => r.status === 'Completed' || r.status === 'Cancelled');
    else if (activeTab === 'active') filtered = filtered.filter(r => r.status === 'Pending' || r.status === 'Approved');

    // Status dropdown filter
    if (filter) filtered = filtered.filter(r => r.status === filter);

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(r =>
        r.prosumerNic.toLowerCase().includes(query) ||
        r.id.toLowerCase().includes(query) ||
        getNodeName(r.nodeId).toLowerCase().includes(query)
      );
    }

    return filtered;
  }

  // Loads available slots when a node is selected in the create form.
  async function onNodeSelected(nodeId) {
    setCreateForm(prev => ({ ...prev, nodeId, slotId: '' }));
    if (nodeId) {
      try {
        const data = await getAvailableSlotsByNode(nodeId);
        setSlots(data);
      } catch { setSlots([]); }
    } else {
      setSlots([]);
    }
  }

  // Creates a new reservation with summary dialog.
  async function handleCreate(e) {
    e.preventDefault();
    try {
      const payload = {
        prosumerNic: createForm.prosumerNic,
        slotId: createForm.slotId,
        nodeId: createForm.nodeId,
        reservationDate: new Date(createForm.reservationDate).toISOString(),
        energyKWh: parseFloat(createForm.energyKWh)
      };
      const result = await createReservation(payload);
      setShowCreateModal(false);
      setSummary({
        type: 'success',
        title: 'Booking Created Successfully!',
        message: 'Your energy reservation has been submitted and is pending approval.',
        details: {
          'Reservation ID': result.id,
          'Prosumer NIC': result.prosumerNic,
          'Station': getNodeName(result.nodeId),
          'Date': new Date(result.reservationDate).toLocaleDateString(),
          'Energy': `${result.energyKWh} kWh`,
          'Status': result.status
        }
      });
      loadData();
    } catch (error) {
      setSummary({
        type: 'error',
        title: 'Booking Failed',
        message: error.message
      });
    }
  }

  // Opens update modal for a reservation.
  function openUpdateModal(res) {
    setEditingRes(res);
    setUpdateForm({
      slotId: res.slotId || '',
      reservationDate: res.reservationDate ? new Date(res.reservationDate).toISOString().split('T')[0] : '',
      energyKWh: res.energyKWh || ''
    });
    setShowUpdateModal(true);
  }

  // Updates a reservation with summary dialog.
  async function handleUpdate(e) {
    e.preventDefault();
    try {
      const payload = {};
      if (updateForm.slotId) payload.slotId = updateForm.slotId;
      if (updateForm.reservationDate) payload.reservationDate = new Date(updateForm.reservationDate).toISOString();
      if (updateForm.energyKWh) payload.energyKWh = parseFloat(updateForm.energyKWh);

      await updateReservation(editingRes.id, payload);
      setShowUpdateModal(false);
      setSummary({
        type: 'success',
        title: 'Booking Updated Successfully!',
        message: 'Your reservation has been updated.',
        details: {
          'Reservation ID': editingRes.id,
          'Prosumer NIC': editingRes.prosumerNic,
          'New Date': updateForm.reservationDate ? new Date(updateForm.reservationDate).toLocaleDateString() : 'Unchanged',
          'New Energy': updateForm.energyKWh ? `${updateForm.energyKWh} kWh` : 'Unchanged'
        }
      });
      loadData();
    } catch (error) {
      setSummary({
        type: 'error',
        title: 'Update Failed',
        message: error.message
      });
    }
  }

  // Cancels a reservation with summary dialog.
  async function handleCancel(res) {
    if (!window.confirm(`Cancel reservation ${res.id.substring(0, 8)}...? This requires at least 12 hours' notice.`)) return;
    try {
      await cancelReservation(res.id);
      setSummary({
        type: 'success',
        title: 'Booking Cancelled',
        message: 'The reservation has been cancelled successfully.',
        details: {
          'Reservation ID': res.id,
          'Prosumer NIC': res.prosumerNic,
          'Date': new Date(res.reservationDate).toLocaleDateString(),
          'Energy': `${res.energyKWh} kWh`
        }
      });
      loadData();
    } catch (error) {
      setSummary({
        type: 'error',
        title: 'Cancellation Failed',
        message: error.message
      });
    }
  }

  // Approves a pending reservation.
  async function handleApprove(res) {
    try {
      await approveReservation(res.id);
      setSummary({
        type: 'success',
        title: 'Booking Approved!',
        message: 'The reservation has been approved and a QR code has been generated for the prosumer.',
        details: {
          'Reservation ID': res.id,
          'Prosumer NIC': res.prosumerNic,
          'Station': getNodeName(res.nodeId),
          'Date': new Date(res.reservationDate).toLocaleDateString(),
          'Energy': `${res.energyKWh} kWh`,
          'Status': 'Approved'
        }
      });
      loadData();
    } catch (error) {
      toast.error(error.message);
    }
  }

  const filtered = getFilteredReservations();

  return (
    <div className="page-content">
      {/* Summary Dialog (shown after create/update/cancel) */}
      {summary && (
        <div className="modal-overlay" onClick={() => setSummary(null)}>
          <div className="summary-panel" onClick={e => e.stopPropagation()}>
            <div className={`summary-icon ${summary.type}`}>
              {summary.type === 'success' ? '✅' : '❌'}
            </div>
            <h3>{summary.title}</h3>
            <p className="summary-message">{summary.message}</p>
            {summary.details && (
              <div className="summary-details">
                {Object.entries(summary.details).map(([key, value]) => (
                  <div className="detail-row" key={key}>
                    <span className="detail-label">{key}</span>
                    <span className="detail-value">{value}</span>
                  </div>
                ))}
              </div>
            )}
            <button className="btn btn-primary" onClick={() => setSummary(null)}>Close</button>
          </div>
        </div>
      )}

      <div className="page-header">
        <h1 className="page-title"><span className="icon">📅</span> Reservations</h1>
        <button className="btn btn-primary" onClick={() => {
          setCreateForm({ prosumerNic: '', nodeId: '', slotId: '', reservationDate: '', energyKWh: '' });
          setSlots([]);
          setShowCreateModal(true);
        }}>
          + New Booking
        </button>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card warning">
          <div className="stat-icon amber">⏳</div>
          <div className="stat-info">
            <div className="stat-value">{stats.pending}</div>
            <div className="stat-label">Pending Reservations</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">✅</div>
          <div className="stat-info">
            <div className="stat-value">{stats.approved}</div>
            <div className="stat-label">Approved Future</div>
          </div>
        </div>
        <div className="stat-card accent">
          <div className="stat-icon blue">⚡</div>
          <div className="stat-info">
            <div className="stat-value">{stats.completed}</div>
            <div className="stat-label">Completed</div>
          </div>
        </div>
        <div className="stat-card danger">
          <div className="stat-icon red">🚫</div>
          <div className="stat-info">
            <div className="stat-value">{stats.cancelled}</div>
            <div className="stat-label">Cancelled</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {[
          { id: 'all', label: 'All Bookings' },
          { id: 'active', label: 'Active/Pending' },
          { id: 'pending', label: 'Pending Only' },
          { id: 'approved', label: 'Approved' },
          { id: 'history', label: 'Booking History' }
        ].map(tab => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="filter-bar">
        <select className="form-select" value={filter} onChange={e => setFilter(e.target.value)} style={{ maxWidth: 200 }}>
          <option value="">All Statuses</option>
          <option value="Pending">Pending</option>
          <option value="Approved">Approved</option>
          <option value="Completed">Completed</option>
          <option value="Cancelled">Cancelled</option>
        </select>
        <input
          className="form-input"
          placeholder="Search by NIC, ID, or station..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{ maxWidth: 300 }}
        />
        <span className="text-muted" style={{ marginLeft: 'auto' }}>{filtered.length} booking(s)</span>
      </div>

      {/* Reservations Table */}
      <div className="card">
        {loading ? (
          <div className="loading-spinner"><div className="spinner"></div></div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Prosumer NIC</th>
                  <th>Station</th>
                  <th>Date</th>
                  <th>Energy (kWh)</th>
                  <th>Status</th>
                  <th>QR</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan="8" className="text-center text-muted" style={{ padding: '2rem' }}>No reservations found</td></tr>
                ) : filtered.map(r => (
                  <tr key={r.id}>
                    <td><span className="truncate" title={r.id}>{r.id.substring(0, 8)}...</span></td>
                    <td><strong>{r.prosumerNic}</strong></td>
                    <td>{getNodeName(r.nodeId)}</td>
                    <td>{new Date(r.reservationDate).toLocaleDateString()}</td>
                    <td>{r.energyKWh} kWh</td>
                    <td><StatusBadge status={r.status} /></td>
                    <td>
                      {r.qrCodeData ? <span title={r.qrCodeData} style={{ color: 'var(--color-primary)', cursor: 'pointer' }}>📱 Yes</span> : <span className="text-muted">—</span>}
                    </td>
                    <td className="actions">
                      {r.status === 'Pending' && (
                        <>
                          <button className="btn btn-primary btn-sm" onClick={() => handleApprove(r)}>✅ Approve</button>
                          <button className="btn btn-secondary btn-sm" onClick={() => openUpdateModal(r)}>✏️ Edit</button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleCancel(r)}>🚫 Cancel</button>
                        </>
                      )}
                      {r.status === 'Approved' && (
                        <>
                          <button className="btn btn-secondary btn-sm" onClick={() => openUpdateModal(r)}>✏️ Edit</button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleCancel(r)}>🚫 Cancel</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Reservation Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">📅 Create Energy Reservation</h3>
              <button className="btn btn-ghost" onClick={() => setShowCreateModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Prosumer NIC</label>
                  <input className="form-input" placeholder="e.g. 199012345678" value={createForm.prosumerNic}
                    onChange={e => setCreateForm({ ...createForm, prosumerNic: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Grid Station</label>
                  <select className="form-select" value={createForm.nodeId} onChange={e => onNodeSelected(e.target.value)} required>
                    <option value="">Select a station...</option>
                    {nodes.filter(n => n.isActive).map(n => (
                      <option key={n.id} value={n.id}>{n.nodeName} — {n.location} ({n.availableBatterySlots} slots)</option>
                    ))}
                  </select>
                </div>
                {slots.length > 0 && (
                  <div className="form-group">
                    <label className="form-label">Available Slot</label>
                    <select className="form-select" value={createForm.slotId} onChange={e => setCreateForm({ ...createForm, slotId: e.target.value })} required>
                      <option value="">Select a slot...</option>
                      {slots.map(s => (
                        <option key={s.id} value={s.id}>
                          {new Date(s.slotDate).toLocaleDateString()} | {s.startTime}-{s.endTime} | {s.availableKWh} kWh
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Reservation Date</label>
                    <input type="date" className="form-input" value={createForm.reservationDate}
                      onChange={e => setCreateForm({ ...createForm, reservationDate: e.target.value })}
                      min={new Date().toISOString().split('T')[0]}
                      max={new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                      required />
                    <small className="text-muted">Must be within the next 7 days</small>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Energy (kWh)</label>
                    <input type="number" step="0.1" min="0.1" className="form-input" value={createForm.energyKWh}
                      onChange={e => setCreateForm({ ...createForm, energyKWh: e.target.value })} required />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Booking</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Update Reservation Modal */}
      {showUpdateModal && editingRes && (
        <div className="modal-overlay" onClick={() => setShowUpdateModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">✏️ Update Reservation</h3>
              <button className="btn btn-ghost" onClick={() => setShowUpdateModal(false)}>✕</button>
            </div>
            <form onSubmit={handleUpdate}>
              <div className="modal-body">
                <p className="text-muted mb-2" style={{ fontSize: '0.85rem' }}>
                  ⚠️ Updates require at least 12 hours' notice before the reservation date.
                </p>
                <div className="form-group">
                  <label className="form-label">Reservation Date</label>
                  <input type="date" className="form-input" value={updateForm.reservationDate}
                    onChange={e => setUpdateForm({ ...updateForm, reservationDate: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                    max={new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]} />
                </div>
                <div className="form-group">
                  <label className="form-label">Energy (kWh)</label>
                  <input type="number" step="0.1" min="0.1" className="form-input" value={updateForm.energyKWh}
                    onChange={e => setUpdateForm({ ...updateForm, energyKWh: e.target.value })} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowUpdateModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Update Booking</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
