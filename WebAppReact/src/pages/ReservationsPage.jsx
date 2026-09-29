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
  getReservations, getReservationsByStatus, getNodes,
  createReservation, updateReservation, cancelReservation, approveReservation,
  getAvailability
} from '../services/api';
import StatusBadge from '../components/StatusBadge';
import { toast } from 'react-toastify';

function addOneHour(timeStr) {
  if (!timeStr || !timeStr.includes(':')) return '09:00';
  const [h, m] = timeStr.split(':').map(Number);
  const nextH = h + 1;
  if (nextH >= 24) return '24:00';
  return `${String(nextH).padStart(2, '0')}:${String(m || 0).padStart(2, '0')}`;
}

// Renders the full reservation management page.
export default function ReservationsPage() {
  const { user } = useAuth();
  const [reservations, setReservations] = useState([]);
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  // Create modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    prosumerNic: '', nodeId: '', reservationDate: '', startTime: '08:00', endTime: '09:00', energyKWh: ''
  });
  const [availabilityCheck, setAvailabilityCheck] = useState(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);

  // Update modal state
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [editingRes, setEditingRes] = useState(null);
  const [updateForm, setUpdateForm] = useState({ reservationDate: '', startTime: '', endTime: '', energyKWh: '' });

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

  // Returns the node for a given nodeId.
  function getNode(nodeId) {
    return nodes.find(n => n.id === nodeId);
  }

  // Returns the node name for a given nodeId.
  function getNodeName(nodeId) {
    const node = getNode(nodeId);
    return node ? node.nodeName : nodeId;
  }

  // Check capacity availability when create form parameters change
  useEffect(() => {
    if (showCreateModal && createForm.nodeId && createForm.reservationDate && createForm.startTime && createForm.endTime) {
      if (createForm.startTime >= createForm.endTime) {
        setAvailabilityCheck({ error: 'Start time must be earlier than end time.' });
        return;
      }
      let active = true;
      setCheckingAvailability(true);
      getAvailability(createForm.nodeId, createForm.reservationDate, createForm.startTime, createForm.endTime)
        .then(res => {
          if (active) setAvailabilityCheck(res);
        })
        .catch(err => {
          if (active) setAvailabilityCheck({ error: err.message });
        })
        .finally(() => {
          if (active) setCheckingAvailability(false);
        });
      return () => { active = false; };
    } else {
      setAvailabilityCheck(null);
    }
  }, [showCreateModal, createForm.nodeId, createForm.reservationDate, createForm.startTime, createForm.endTime]);

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

  // Creates a new reservation with summary dialog.
  async function handleCreate(e) {
    e.preventDefault();
    if (createForm.startTime >= createForm.endTime) {
      toast.error('Start time must be earlier than end time.');
      return;
    }
    try {
      const payload = {
        prosumerNic: createForm.prosumerNic.trim(),
        nodeId: createForm.nodeId,
        reservationDate: createForm.reservationDate,
        startTime: createForm.startTime,
        endTime: createForm.endTime,
        energyKWh: parseFloat(createForm.energyKWh)
      };
      const result = await createReservation(payload);
      setShowCreateModal(false);
      setSummary({
        type: 'success',
        title: 'Booking Created Successfully!',
        message: 'Your energy reservation has been submitted with auto-allocated battery slots and is pending approval.',
        details: {
          'Reservation ID': result.id,
          'Prosumer NIC': result.prosumerNic,
          'Station': getNodeName(result.nodeId),
          'Date': new Date(result.reservationDate).toLocaleDateString(),
          'Time Window': `${result.startTime} - ${result.endTime}`,
          'Energy': `${result.energyKWh} kWh`,
          'Allocated Slots': result.allocatedSlotIds?.length ? `${result.allocatedSlotIds.length} slot(s)` : 'Auto-allocated',
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
    const start = res.startTime || '08:00';
    setEditingRes(res);
    setUpdateForm({
      reservationDate: res.reservationDate ? new Date(res.reservationDate).toISOString().split('T')[0] : '',
      startTime: start,
      endTime: addOneHour(start),
      energyKWh: res.energyKWh || ''
    });
    setShowUpdateModal(true);
  }

  // Updates a reservation with summary dialog.
  async function handleUpdate(e) {
    e.preventDefault();
    if (updateForm.startTime && updateForm.endTime && updateForm.startTime >= updateForm.endTime) {
      toast.error('Start time must be earlier than end time.');
      return;
    }
    try {
      const payload = {};
      if (updateForm.reservationDate) payload.reservationDate = updateForm.reservationDate;
      if (updateForm.startTime) payload.startTime = updateForm.startTime;
      if (updateForm.endTime) payload.endTime = updateForm.endTime;
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
          'New Date': updateForm.reservationDate || 'Unchanged',
          'Time Window': `${updateForm.startTime || editingRes.startTime} - ${updateForm.endTime || editingRes.endTime}`,
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
        message: 'The reservation has been cancelled and its allocated battery capacity has been freed.',
        details: {
          'Reservation ID': res.id,
          'Prosumer NIC': res.prosumerNic,
          'Date': new Date(res.reservationDate).toLocaleDateString(),
          'Time Window': `${res.startTime} - ${res.endTime}`,
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
          'Time Window': `${res.startTime} - ${res.endTime}`,
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
          setCreateForm({ prosumerNic: '', nodeId: '', reservationDate: '', startTime: '08:00', endTime: '09:00', energyKWh: '' });
          setAvailabilityCheck(null);
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
                  <th>Date & Time</th>
                  <th>Energy</th>
                  <th>Slots</th>
                  <th>Status</th>
                  <th>QR</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan="9" className="text-center text-muted" style={{ padding: '2rem' }}>No reservations found</td></tr>
                ) : filtered.map(r => (
                  <tr key={r.id}>
                    <td><span className="truncate" title={r.id}>{r.id.substring(0, 8)}...</span></td>
                    <td><strong>{r.prosumerNic}</strong></td>
                    <td>{getNodeName(r.nodeId)}</td>
                    <td>
                      <div>{new Date(r.reservationDate).toLocaleDateString()}</div>
                      {r.startTime && r.endTime && (
                        <small className="text-muted" style={{ display: 'block' }}>⏱️ {r.startTime} - {r.endTime}</small>
                      )}
                    </td>
                    <td>{r.energyKWh} kWh</td>
                    <td>
                      {r.allocatedSlotIds?.length > 0 ? (
                        <span className="badge badge-info" style={{ fontSize: '0.8rem' }}>
                          {r.allocatedSlotIds.length} slot(s)
                        </span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
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
                  <select className="form-select" value={createForm.nodeId} onChange={e => setCreateForm({ ...createForm, nodeId: e.target.value })} required>
                    <option value="">Select a station...</option>
                    {nodes.filter(n => n.isActive).map(n => (
                      <option key={n.id} value={n.id}>
                        {n.nodeName} — {n.location} (Total {n.capacityKWh} kWh | {n.schedule})
                      </option>
                    ))}
                  </select>
                </div>
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
                    <label className="form-label">Start Time</label>
                    <input type="time" className="form-input" value={createForm.startTime}
                      onChange={e => {
                        const start = e.target.value;
                        setCreateForm({ ...createForm, startTime: start, endTime: addOneHour(start) });
                      }} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      End Time
                      <span style={{ fontSize: '0.7rem', color: 'var(--color-primary-light)', background: 'rgba(56, 189, 248, 0.1)', padding: '1px 6px', borderRadius: '4px' }}>
                        🔒 1-Hour Fixed
                      </span>
                    </label>
                    <input type="time" className="form-input" value={createForm.endTime}
                      readOnly disabled style={{ opacity: 0.85, cursor: 'not-allowed', background: 'rgba(255,255,255,0.05)' }} />
                  </div>
                </div>

                {/* Real-time availability info */}
                {checkingAvailability && (
                  <div className="text-muted" style={{ padding: '0.5rem 0', fontSize: '0.85rem' }}>
                    ⏳ Evaluating station capacity for time window...
                  </div>
                )}
                {availabilityCheck && !checkingAvailability && (
                  <div style={{
                    margin: '0.75rem 0',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    backgroundColor: availabilityCheck.error ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                    border: `1px solid ${availabilityCheck.error ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`
                  }}>
                    {availabilityCheck.error ? (
                      <span style={{ color: 'var(--color-danger, #ef4444)', fontSize: '0.85rem' }}>
                        ⚠️ {availabilityCheck.error}
                      </span>
                    ) : (
                      <div style={{ fontSize: '0.85rem' }}>
                        <div><strong>Station Schedule:</strong> {availabilityCheck.schedule} {!availabilityCheck.isWithinOperatingHours && <span style={{ color: '#ef4444' }}>(OUTSIDE OPERATING HOURS)</span>}</div>
                        <div><strong>Total Capacity:</strong> {availabilityCheck.totalCapacityKWh} kWh {availabilityCheck.maintenanceSlotsCount > 0 && `(${availabilityCheck.maintenanceSlotsCount} slot under maintenance)`}</div>
                        <div><strong>Reserved in this window:</strong> {availabilityCheck.reservedKWh} kWh</div>
                        <div style={{ fontWeight: 600, color: availabilityCheck.availableKWh > 0 ? '#10b981' : '#ef4444' }}>
                          Available in Window: {availabilityCheck.availableKWh} kWh
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Energy (kWh)</label>
                  <input type="number" step="0.1" min="0.1" className="form-input" value={createForm.energyKWh}
                    onChange={e => setCreateForm({ ...createForm, energyKWh: e.target.value })} required />
                  {availabilityCheck && !availabilityCheck.error && Number(createForm.energyKWh) > availabilityCheck.availableKWh && (
                    <small style={{ color: '#ef4444', display: 'block', marginTop: '0.25rem' }}>
                      ⚠️ Requested {createForm.energyKWh} kWh exceeds available capacity ({availabilityCheck.availableKWh} kWh) in this time window!
                    </small>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={availabilityCheck && !availabilityCheck.error && (!availabilityCheck.isWithinOperatingHours || Number(createForm.energyKWh) > availabilityCheck.availableKWh)}>
                  Create Booking
                </button>
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
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Start Time</label>
                    <input type="time" className="form-input" value={updateForm.startTime}
                      onChange={e => {
                        const start = e.target.value;
                        setUpdateForm({ ...updateForm, startTime: start, endTime: addOneHour(start) });
                      }} />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      End Time
                      <span style={{ fontSize: '0.7rem', color: 'var(--color-primary-light)', background: 'rgba(56, 189, 248, 0.1)', padding: '1px 6px', borderRadius: '4px' }}>
                        🔒 1-Hour Fixed
                      </span>
                    </label>
                    <input type="time" className="form-input" value={updateForm.endTime}
                      readOnly disabled style={{ opacity: 0.85, cursor: 'not-allowed', background: 'rgba(255,255,255,0.05)' }} />
                  </div>
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
