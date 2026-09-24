// ============================================================
// File: ProsumerPortal.jsx
// Project: Smart Solar Microgrid Trading System - React Web App
// Description: Dedicated Solar Prosumer Portal with 7-day energy
//              booking wizard, digital QR pass viewer, 12-hour
//              cancellation notice rules, and stations finder.
// ============================================================

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getReservationsByProsumer,
  getNodes,
  createReservation,
  cancelReservation,
  updateReservation,
  getProsumerByNic,
  deactivateProsumer
} from '../services/api';
import StatusBadge from '../components/StatusBadge';
import { toast } from 'react-toastify';
import { QRCodeSVG } from 'qrcode.react';

export default function ProsumerPortal() {
  const { user } = useAuth();
  const prosumerNic = user?.userId || user?.nic || user?.displayName;

  const [activeTab, setActiveTab] = useState('bookings');
  const [loading, setLoading] = useState(true);

  // Data states
  const [myReservations, setMyReservations] = useState([]);
  const [nodes, setNodes] = useState([]);
  const [prosumerProfile, setProsumerProfile] = useState(null);

  // QR Modal state
  const [selectedQrPass, setSelectedQrPass] = useState(null);

  // Modify Booking Modal state
  const [modifyingRes, setModifyingRes] = useState(null);
  const [modifyData, setModifyData] = useState({ reservationDate: '', energyKWh: 10 });

  // Filter state
  const [statusFilter, setStatusFilter] = useState('All');

  // Booking Form state (7-Day Rule)
  const todayIso = new Date().toISOString().slice(0, 16);
  const maxDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16);

  const [bookingForm, setBookingForm] = useState({
    nodeId: '',
    slotId: 'SLOT-01',
    reservationDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
    energyKWh: 15.0
  });
  const [submittingBooking, setSubmittingBooking] = useState(false);

  useEffect(() => {
    loadProsumerData();
  }, [prosumerNic]);

  async function loadProsumerData() {
    if (!prosumerNic) return;
    try {
      setLoading(true);
      const [resData, nodesData, profileData] = await Promise.all([
        getReservationsByProsumer(prosumerNic).catch(() => []),
        getNodes().catch(() => []),
        getProsumerByNic(prosumerNic).catch(() => null)
      ]);

      setMyReservations(resData || []);
      setNodes(nodesData || []);
      setProsumerProfile(profileData);

      if (nodesData && nodesData.length > 0 && !bookingForm.nodeId) {
        setBookingForm(prev => ({ ...prev, nodeId: nodesData[0].id }));
      }
    } catch (err) {
      toast.error('Failed to load prosumer details: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  // Helper: Checks if reservation is at least 12 hours in the future
  function canModifyOrCancel(reservationDate) {
    const resTime = new Date(reservationDate).getTime();
    const now = Date.now();
    const hoursRemaining = (resTime - now) / (1000 * 60 * 60);
    return hoursRemaining > 12;
  }

  function getHoursNoticeText(reservationDate) {
    const resTime = new Date(reservationDate).getTime();
    const now = Date.now();
    const hoursRemaining = (resTime - now) / (1000 * 60 * 60);
    if (hoursRemaining <= 0) return 'Past slot';
    return `${Math.round(hoursRemaining)}h notice remaining`;
  }

  // --- Handlers: Cancel Booking (12-hour rule) ---
  async function handleCancel(id, reservationDate) {
    if (!canModifyOrCancel(reservationDate)) {
      toast.error('Cancellations require at least 12 hours’ notice before the scheduled slot.');
      return;
    }

    if (!window.confirm('Are you sure you want to cancel this reservation?')) return;

    try {
      await cancelReservation(id);
      toast.success('Reservation cancelled successfully.');
      loadProsumerData();
    } catch (err) {
      toast.error(err.message || 'Failed to cancel reservation.');
    }
  }

  // --- Handlers: Modify Booking (12-hour rule) ---
  function openModifyModal(res) {
    if (!canModifyOrCancel(res.reservationDate)) {
      toast.error('Updates require at least 12 hours’ notice before the scheduled slot.');
      return;
    }
    setModifyingRes(res);
    setModifyData({
      reservationDate: new Date(res.reservationDate).toISOString().slice(0, 16),
      energyKWh: res.energyKWh
    });
  }

  async function handleSaveModify(e) {
    e.preventDefault();
    if (!modifyingRes) return;
    try {
      await updateReservation(modifyingRes.id, {
        reservationDate: new Date(modifyData.reservationDate).toISOString(),
        energyKWh: parseFloat(modifyData.energyKWh)
      });
      toast.success('Reservation updated successfully!');
      setModifyingRes(null);
      loadProsumerData();
    } catch (err) {
      toast.error(err.message || 'Failed to update reservation.');
    }
  }

  // --- Handlers: Create Booking (7-Day rule) ---
  async function handleCreateBooking(e) {
    e.preventDefault();
    const selectedDate = new Date(bookingForm.reservationDate);
    const now = new Date();
    const maxAllowed = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    if (selectedDate <= now) {
      toast.error('Reservation date must be in the future.');
      return;
    }

    if (selectedDate > maxAllowed) {
      toast.error('7-Day Rule: Reservation must be scheduled within the next 7 days.');
      return;
    }

    setSubmittingBooking(true);
    try {
      await createReservation({
        prosumerNic: prosumerNic,
        nodeId: bookingForm.nodeId,
        slotId: bookingForm.slotId,
        reservationDate: selectedDate.toISOString(),
        energyKWh: parseFloat(bookingForm.energyKWh)
      });
      toast.success('Energy reservation created successfully! Awaiting station operator approval.');
      setActiveTab('bookings');
      loadProsumerData();
    } catch (err) {
      toast.error(err.message || 'Failed to book slot.');
    } finally {
      setSubmittingBooking(false);
    }
  }

  // --- Handlers: Request Deactivation ---
  async function handleDeactivateAccount() {
    if (!window.confirm('Request account deactivation? Note: You cannot have pending/approved reservations.')) {
      return;
    }
    try {
      await deactivateProsumer(prosumerNic);
      toast.info('Account deactivation requested.');
      loadProsumerData();
    } catch (err) {
      toast.error(err.message || 'Deactivation request failed.');
    }
  }

  // Calculations
  const approvedBookings = myReservations.filter(r => r.status === 'Approved');
  const pendingBookings = myReservations.filter(r => r.status === 'Pending');
  const completedBookings = myReservations.filter(r => r.status === 'Completed');
  const totalKWhExported = completedBookings.reduce((sum, r) => sum + (r.energyKWh || 0), 0);

  const filteredReservations = myReservations.filter(r => {
    if (statusFilter === 'All') return true;
    return r.status === statusFilter;
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
      {/* Prosumer Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '2rem' }}>☀️</span>
            <h1 className="page-title" style={{ margin: 0 }}>Solar Prosumer Portal</h1>
          </div>
          <p className="text-muted" style={{ margin: 0 }}>
            Welcome, <strong>{prosumerProfile ? `${prosumerProfile.firstName} ${prosumerProfile.lastName}` : user?.displayName}</strong> (NIC: {prosumerNic})
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <StatusBadge status={prosumerProfile?.status || 'Active'} />
          <button className="btn btn-primary btn-sm" onClick={() => setActiveTab('book')}>
            ➕ Book Energy Slot
          </button>
          <button className="btn btn-secondary btn-sm" onClick={loadProsumerData}>
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid" style={{ marginBottom: '2rem' }}>
        <div className="stat-card" onClick={() => setActiveTab('bookings')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon green">⚡</div>
          <div className="stat-info">
            <div className="stat-value">{totalKWhExported.toFixed(1)} kWh</div>
            <div className="stat-label">Total Energy Supplied</div>
          </div>
        </div>

        <div className="stat-card accent" onClick={() => setActiveTab('bookings')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon blue">🎟️</div>
          <div className="stat-info">
            <div className="stat-value">{approvedBookings.length}</div>
            <div className="stat-label">Active QR Passes</div>
          </div>
        </div>

        <div className="stat-card warning" onClick={() => setActiveTab('bookings')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon amber">⏳</div>
          <div className="stat-info">
            <div className="stat-value">{pendingBookings.length}</div>
            <div className="stat-label">Pending Approvals</div>
          </div>
        </div>

        <div className="stat-card" onClick={() => setActiveTab('stations')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon green">🔋</div>
          <div className="stat-info">
            <div className="stat-value">{nodes.filter(n => n.isActive).length}</div>
            <div className="stat-label">Nearby Grid Hubs</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="role-tabs" style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
        <button
          className={`role-tab ${activeTab === 'bookings' ? 'active' : ''}`}
          onClick={() => setActiveTab('bookings')}
        >
          🎟️ My Bookings &amp; QR Passes ({myReservations.length})
        </button>
        <button
          className={`role-tab ${activeTab === 'book' ? 'active' : ''}`}
          onClick={() => setActiveTab('book')}
        >
          ⚡ Book Energy Slot (7-Day Wizard)
        </button>
        <button
          className={`role-tab ${activeTab === 'stations' ? 'active' : ''}`}
          onClick={() => setActiveTab('stations')}
        >
          📍 Find Grid Stations ({nodes.length})
        </button>
        <button
          className={`role-tab ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          👤 My Solar Profile
        </button>
      </div>

      {/* TAB 1: MY BOOKINGS & QR PASSES */}
      {activeTab === 'bookings' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 className="section-title" style={{ margin: 0 }}>🎟️ Your Reservation History</h2>
              <span className="text-muted" style={{ fontSize: '0.85rem' }}>
                View your digital QR passes. Notice: Cancellations/updates require at least 12 hours' notice.
              </span>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span className="text-muted" style={{ fontSize: '0.85rem' }}>Filter:</span>
              {['All', 'Approved', 'Pending', 'Completed', 'Cancelled'].map(status => (
                <button
                  key={status}
                  className={`btn btn-sm ${statusFilter === status ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setStatusFilter(status)}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="table-container">
              {filteredReservations.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center' }}>
                  <p className="text-muted" style={{ marginBottom: '1rem' }}>
                    No bookings found matching filter "{statusFilter}".
                  </p>
                  <button className="btn btn-primary" onClick={() => setActiveTab('book')}>
                    Book Your First Energy Slot
                  </button>
                </div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Booking ID</th>
                      <th>Grid Station</th>
                      <th>Slot</th>
                      <th>Scheduled Date</th>
                      <th>Energy (kWh)</th>
                      <th>Status</th>
                      <th>Notice Window</th>
                      <th>Digital Pass &amp; Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReservations.map(r => {
                      const modifiable = canModifyOrCancel(r.reservationDate);
                      const isApproved = r.status === 'Approved';
                      const isPending = r.status === 'Pending';
                      const isFinished = r.status === 'Completed' || r.status === 'Cancelled';

                      return (
                        <tr key={r.id}>
                          <td className="truncate" style={{ maxWidth: '100px' }}>{r.id}</td>
                          <td>
                            <strong>{r.nodeId}</strong>
                          </td>
                          <td>{r.slotId}</td>
                          <td>{new Date(r.reservationDate).toLocaleString()}</td>
                          <td><strong style={{ color: 'var(--color-primary-light)' }}>{r.energyKWh} kWh</strong></td>
                          <td><StatusBadge status={r.status} /></td>
                          <td style={{ fontSize: '0.8rem' }}>
                            {!isFinished ? (
                              <span style={{ color: modifiable ? 'var(--color-primary-light)' : 'var(--color-warning)' }}>
                                {modifiable ? '✓ ' : '🔒 '}{getHoursNoticeText(r.reservationDate)}
                              </span>
                            ) : (
                              <span className="text-muted">—</span>
                            )}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                              {/* QR Pass Button for Approved Bookings */}
                              {isApproved && (
                                <button
                                  className="btn btn-primary btn-sm"
                                  onClick={() => setSelectedQrPass(r)}
                                >
                                  🎟️ View QR Pass
                                </button>
                              )}

                              {/* Modify & Cancel Buttons with 12-hour rule */}
                              {(isApproved || isPending) && (
                                <>
                                  <button
                                    className="btn btn-secondary btn-sm"
                                    disabled={!modifiable}
                                    title={!modifiable ? 'Updates require at least 12 hours notice before scheduled time.' : ''}
                                    onClick={() => openModifyModal(r)}
                                  >
                                    ✏️ Edit
                                  </button>
                                  <button
                                    className="btn btn-danger btn-sm"
                                    disabled={!modifiable}
                                    title={!modifiable ? 'Cancellations require at least 12 hours notice before scheduled time.' : ''}
                                    onClick={() => handleCancel(r.id, r.reservationDate)}
                                  >
                                    Cancel
                                  </button>
                                </>
                              )}

                              {isFinished && (
                                <span className="text-muted" style={{ fontSize: '0.8rem' }}>
                                  {r.status === 'Completed' ? '✓ Transferred' : 'Cancelled'}
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: BOOK ENERGY SLOT (7-DAY WIZARD) */}
      {activeTab === 'book' && (
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <div className="card" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <span style={{ fontSize: '2rem' }}>📅</span>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.4rem' }}>Reserve Energy Slot</h2>
                <span className="text-muted" style={{ fontSize: '0.85rem' }}>
                  Schedule solar energy injection at a physical microgrid node hub.
                </span>
              </div>
            </div>

            {/* 7-Day Rule Reminder Alert */}
            <div
              style={{
                background: 'rgba(34, 197, 94, 0.1)',
                border: '1px solid var(--color-primary)',
                padding: '1rem',
                borderRadius: 'var(--radius-md)',
                marginBottom: '1.5rem',
                fontSize: '0.85rem',
                display: 'flex',
                gap: '0.75rem',
                alignItems: 'flex-start'
              }}
            >
              <span style={{ fontSize: '1.2rem' }}>ℹ️</span>
              <div>
                <strong style={{ color: 'var(--color-primary-light)' }}>7-Day Advance Reservation Rule:</strong>
                <p style={{ margin: '0.25rem 0 0 0', color: 'var(--color-text-secondary)' }}>
                  Reservations can only be scheduled up to <strong>7 days in advance</strong>. Once approved, you will receive a secure QR Code to present to the station operator.
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateBooking}>
              {/* Select Station */}
              <div className="form-group">
                <label className="form-label">Select Microgrid Station</label>
                <select
                  className="form-select"
                  value={bookingForm.nodeId}
                  onChange={e => setBookingForm({ ...bookingForm, nodeId: e.target.value })}
                  required
                >
                  <option value="">-- Choose a Station --</option>
                  {nodes.map(n => (
                    <option key={n.id} value={n.id}>
                      {n.nodeName} ({n.location}) — {n.availableBatterySlots} slots avail
                    </option>
                  ))}
                </select>
              </div>

              {/* Slot Identifier */}
              <div className="form-group">
                <label className="form-label">Battery Slot Preference</label>
                <select
                  className="form-select"
                  value={bookingForm.slotId}
                  onChange={e => setBookingForm({ ...bookingForm, slotId: e.target.value })}
                >
                  {['SLOT-01', 'SLOT-02', 'SLOT-03', 'SLOT-04', 'SLOT-05', 'SLOT-06', 'SLOT-07', 'SLOT-08'].map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Reservation Date and Time */}
              <div className="form-group">
                <label className="form-label">Reservation Date &amp; Time (Max 7 Days Ahead)</label>
                <input
                  type="datetime-local"
                  className="form-input"
                  min={todayIso}
                  max={maxDate}
                  value={bookingForm.reservationDate}
                  onChange={e => setBookingForm({ ...bookingForm, reservationDate: e.target.value })}
                  required
                />
                <span className="text-muted" style={{ fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>
                  Allowed range: Today through {new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                </span>
              </div>

              {/* Energy Amount */}
              <div className="form-group">
                <label className="form-label">Energy to Supply (kWh)</label>
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  max="500"
                  className="form-input"
                  placeholder="e.g. 15.0"
                  value={bookingForm.energyKWh}
                  onChange={e => setBookingForm({ ...bookingForm, energyKWh: e.target.value })}
                  required
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                className="btn btn-primary btn-lg"
                style={{ width: '100%', justifyContent: 'center', marginTop: '1rem' }}
                disabled={submittingBooking || !bookingForm.nodeId}
              >
                {submittingBooking ? 'Submitting Reservation...' : '⚡ Confirm Energy Reservation'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 3: FIND GRID STATIONS */}
      {activeTab === 'stations' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div>
              <h2 className="section-title" style={{ margin: 0 }}>📍 Nearby Microgrid Energy Stations</h2>
              <span className="text-muted" style={{ fontSize: '0.85rem' }}>
                Find solar battery intake hubs equipped with charging and transfer terminals.
              </span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
            {nodes.map(n => (
              <div key={n.id} className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.15rem' }}>{n.nodeName}</h3>
                  <StatusBadge status={n.isActive ? 'Active' : 'Inactive'} />
                </div>
                <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>
                  📍 {n.location}
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div style={{ background: 'var(--color-surface)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>CAPACITY</div>
                    <strong>{n.capacityKWh} kWh</strong>
                  </div>
                  <div style={{ background: 'var(--color-surface)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>AVAILABLE SLOTS</div>
                    <strong style={{ color: 'var(--color-primary-light)' }}>
                      {n.availableBatterySlots} / {n.batterySlots}
                    </strong>
                  </div>
                </div>

                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>
                  🕒 Operating Hours: <strong>{n.schedule || '06:00 - 18:00'}</strong>
                  <br />
                  🌐 Coordinates: <strong>{n.latitude?.toFixed(4)}, {n.longitude?.toFixed(4)}</strong>
                </div>

                <button
                  className="btn btn-primary"
                  style={{ marginTop: 'auto', justifyContent: 'center' }}
                  onClick={() => {
                    setBookingForm(prev => ({ ...prev, nodeId: n.id }));
                    setActiveTab('book');
                  }}
                >
                  ⚡ Book at this Station
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: MY PROFILE */}
      {activeTab === 'profile' && (
        <div style={{ maxWidth: '650px', margin: '0 auto' }}>
          <div className="card" style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.4rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>👤</span> Prosumer Solar Profile
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.95rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-sm)' }}>
                <span className="text-muted">National Identity Card (NIC):</span>
                <strong>{prosumerNic}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-sm)' }}>
                <span className="text-muted">Full Name:</span>
                <strong>{prosumerProfile ? `${prosumerProfile.firstName} ${prosumerProfile.lastName}` : user?.displayName}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-sm)' }}>
                <span className="text-muted">Email Address:</span>
                <strong>{prosumerProfile?.email || 'N/A'}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-sm)' }}>
                <span className="text-muted">Phone Number:</span>
                <strong>{prosumerProfile?.phone || 'N/A'}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-sm)' }}>
                <span className="text-muted">Solar Generation Capacity:</span>
                <strong style={{ color: 'var(--color-primary-light)' }}>
                  {prosumerProfile?.solarCapacityKWh ? `${prosumerProfile.solarCapacityKWh} kW` : '10 kW'}
                </strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-sm)' }}>
                <span className="text-muted">Account Status:</span>
                <StatusBadge status={prosumerProfile?.status || 'Active'} />
              </div>
            </div>

            <div style={{ marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--color-border)' }}>
              <h4 style={{ color: 'var(--color-danger-light)', marginBottom: '0.5rem' }}>Account Lifecycle Management</h4>
              <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>
                You can request deactivation of your prosumer account if you no longer wish to trade energy. Only allowed if there are no pending or approved reservations.
              </p>
              <button className="btn btn-danger" onClick={handleDeactivateAccount}>
                Request Account Deactivation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DIGITAL QR PASS */}
      {selectedQrPass && (
        <div className="modal-overlay" onClick={() => setSelectedQrPass(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px', textAlign: 'center' }}>
            <div className="modal-header">
              <h3 className="modal-title">🎟️ Digital Energy Transfer Pass</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelectedQrPass(null)}>✕</button>
            </div>
            <div className="modal-body" style={{ padding: '2rem 1.5rem' }}>
              <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                Show this secure QR code to the Grid Station Operator upon arrival.
              </p>

              {/* QR Code Canvas */}
              <div
                style={{
                  background: '#ffffff',
                  padding: '1.25rem',
                  borderRadius: 'var(--radius-md)',
                  display: 'inline-block',
                  boxShadow: 'var(--shadow-md)',
                  marginBottom: '1.5rem'
                }}
              >
                <QRCodeSVG
                  value={selectedQrPass.qrCodeData || `SMTS-${selectedQrPass.id}-${selectedQrPass.prosumerNic}`}
                  size={220}
                  level="H"
                  includeMargin={true}
                />
              </div>

              {/* Token Code Display */}
              <div
                style={{
                  background: 'var(--color-surface)',
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.75rem',
                  fontFamily: 'monospace',
                  wordBreak: 'break-all',
                  marginBottom: '1rem',
                  color: 'var(--color-primary-light)'
                }}
              >
                {selectedQrPass.qrCodeData || `SMTS-${selectedQrPass.id}-${selectedQrPass.prosumerNic}`}
              </div>

              {/* Pass Metadata */}
              <div style={{ fontSize: '0.85rem', textAlign: 'left', background: 'var(--color-surface)', padding: '1rem', borderRadius: 'var(--radius-sm)', lineHeight: '1.8' }}>
                <div>Booking: <strong>#{selectedQrPass.id}</strong></div>
                <div>Prosumer NIC: <strong>{selectedQrPass.prosumerNic}</strong></div>
                <div>Slot: <strong>{selectedQrPass.slotId}</strong></div>
                <div>Energy to Transfer: <strong style={{ color: 'var(--color-primary)' }}>{selectedQrPass.energyKWh} kWh</strong></div>
                <div>Scheduled: <strong>{new Date(selectedQrPass.reservationDate).toLocaleString()}</strong></div>
              </div>
            </div>
            <div className="modal-footer" style={{ justifyContent: 'center' }}>
              <button className="btn btn-secondary" onClick={() => window.print()}>
                🖨️ Print Pass
              </button>
              <button className="btn btn-primary" onClick={() => setSelectedQrPass(null)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: MODIFY RESERVATION (12-HOUR RULE) */}
      {modifyingRes && (
        <div className="modal-overlay" onClick={() => setModifyingRes(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3 className="modal-title">✏️ Modify Reservation #{modifyingRes.id}</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setModifyingRes(null)}>✕</button>
            </div>
            <form onSubmit={handleSaveModify}>
              <div className="modal-body">
                <div
                  style={{
                    background: 'rgba(59, 130, 246, 0.1)',
                    border: '1px solid var(--color-accent)',
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    marginBottom: '1rem',
                    fontSize: '0.8rem'
                  }}
                >
                  ℹ️ 12-Hour Notice Rule applies. Changes must be finalized at least 12 hours before slot time.
                </div>

                <div className="form-group">
                  <label className="form-label">New Reservation Date &amp; Time</label>
                  <input
                    type="datetime-local"
                    className="form-input"
                    min={todayIso}
                    max={maxDate}
                    value={modifyData.reservationDate}
                    onChange={e => setModifyData({ ...modifyData, reservationDate: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">New Energy Amount (kWh)</label>
                  <input
                    type="number"
                    step="0.5"
                    className="form-input"
                    value={modifyData.energyKWh}
                    onChange={e => setModifyData({ ...modifyData, energyKWh: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModifyingRes(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
