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
  updateProsumer,
  changeProsumerPassword,
  deactivateProsumer,
  getAvailability,
  getHourlyAvailability,
  getSlotsByNode
} from '../services/api';
import StatusBadge from '../components/StatusBadge';
import { toast } from 'react-toastify';
import { QRCodeSVG } from 'qrcode.react';
import MapboxLocationMap from '../components/MapboxLocationMap';

const DEFAULT_MAP_CENTER = { lat: 7.8731, lng: 80.7718 };

function isBookableHour(slot) {
  return slot.isWithinOperatingHours && Number(slot.availableKWh) > 0 && Number(slot.reservedKWh) <= 0;
}

function getHourlySlots(availability) {
  return availability?.hourlySlots || availability?.slots || [];
}

function getBookableStartTimes(availability) {
  return getHourlySlots(availability).filter(isBookableHour).map(slot => slot.startTime);
}

function getBookableEndTimes(availability, startTime) {
  if (!startTime) return [];
  const slotsByStart = new Map(getHourlySlots(availability).map(slot => [slot.startTime, slot]));
  const endTimes = [];
  let currentTime = startTime;
  while (true) {
    const slot = slotsByStart.get(currentTime);
    if (!slot || !isBookableHour(slot)) break;
    endTimes.push(slot.endTime);
    currentTime = slot.endTime;
  }
  return endTimes;
}

export default function ProsumerPortal() {
  const { user, logout } = useAuth();
  const prosumerNic = user?.userId || user?.nic || user?.displayName;

  const [activeTab, setActiveTab] = useState('bookings');
  const [loading, setLoading] = useState(true);

  // Data states
  const [myReservations, setMyReservations] = useState([]);
  const [nodes, setNodes] = useState([]);
  const [prosumerProfile, setProsumerProfile] = useState(null);

  // Profile Edit state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: ''
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [savingPassword, setSavingPassword] = useState(false);

  // QR Modal state
  const [selectedQrPass, setSelectedQrPass] = useState(null);

  // Nearby microgrid map modal state
  const [selectedMapNode, setSelectedMapNode] = useState(null);

  // Modify Booking Modal state
  const [modifyingRes, setModifyingRes] = useState(null);
  const [modifyData, setModifyData] = useState({ reservationDate: '', startTime: '08:00', endTime: '09:00', energyKWh: 10, selectedSlotIds: [] });
  const [modifySlots, setModifySlots] = useState([]);

  // Filter state
  const [statusFilter, setStatusFilter] = useState('All');

  // Booking Form state (7-Day Rule)
  const todayDateStr = new Date().toISOString().split('T')[0];
  const tomorrowDateStr = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const maxDateStr = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  function addOneHour(timeStr) {
    if (!timeStr || !timeStr.includes(':')) return '09:00';
    const [h, m] = timeStr.split(':').map(Number);
    const nextH = h + 1;
    if (nextH === 24 && m === 0) return '24:00';
    const paddedH = String(Math.min(23, nextH)).padStart(2, '0');
    const paddedM = String(m).padStart(2, '0');
    return `${paddedH}:${paddedM}`;
  }

  const [bookingForm, setBookingForm] = useState({
    nodeId: '',
    reservationDate: tomorrowDateStr,
    startTime: '08:00',
    endTime: '09:00',
    selectedSlotIds: []
  });
  const [hourlyAvailability, setHourlyAvailability] = useState(null);
  const [loadingHourly, setLoadingHourly] = useState(false);
  const [windowAvailability, setWindowAvailability] = useState(null);
  const [evaluatingWindow, setEvaluatingWindow] = useState(false);
  const [submittingBooking, setSubmittingBooking] = useState(false);
  const [availabilityRefreshKey, setAvailabilityRefreshKey] = useState(0);

  const [showDeactivateModal, setShowDeactivateModal] = useState(false);

  useEffect(() => {
    loadProsumerData();
  }, [prosumerNic]);

  // Maintenance can be scheduled from the mobile app. Recheck availability
  // while this page is open and whenever the user returns to the browser tab.
  useEffect(() => {
    const refreshAvailability = () => setAvailabilityRefreshKey(key => key + 1);
    const intervalId = window.setInterval(refreshAvailability, 10000);
    window.addEventListener('focus', refreshAvailability);
    document.addEventListener('visibilitychange', refreshAvailability);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', refreshAvailability);
      document.removeEventListener('visibilitychange', refreshAvailability);
    };
  }, []);

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

      const firstActiveNode = (nodesData || []).find(node => node.isActive);
      if (firstActiveNode && (!bookingForm.nodeId || !nodesData.some(node => node.id === bookingForm.nodeId && node.isActive))) {
        setBookingForm(prev => ({ ...prev, nodeId: firstActiveNode.id }));
      } else if (!firstActiveNode) {
        setBookingForm(prev => ({ ...prev, nodeId: '' }));
      }
    } catch (err) {
      toast.error('Failed to load prosumer details: ' + err.message);
    } finally {
      setLoading(false);
    }
  }



  // --- Handlers: Edit Prosumer Profile ---

  function openProfileEdit() {
    if (!prosumerProfile) return;

    setProfileForm({
      firstName: prosumerProfile.firstName || '',
      lastName: prosumerProfile.lastName || '',
      email: prosumerProfile.email || '',
      phone: prosumerProfile.phone || '',
      address: prosumerProfile.address || ''
    });

    setIsEditingProfile(true);
  }

  async function handleSaveProfile(e) {
    e.preventDefault();

    try {
      setSavingProfile(true);

      await updateProsumer(prosumerNic, profileForm);

      toast.success('Profile updated successfully!');

      setIsEditingProfile(false);
      await loadProsumerData();
    } catch (err) {
      toast.error(err.message || 'Failed to update profile.');
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault();

    if (passwordForm.newPassword.length < 6) {
      toast.error('New password must be at least 6 characters long.');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New password and confirmation do not match.');
      return;
    }
    if (passwordForm.currentPassword === passwordForm.newPassword) {
      toast.error('New password must be different from the current password.');
      return;
    }

    try {
      setSavingPassword(true);
      await changeProsumerPassword(passwordForm.currentPassword, passwordForm.newPassword);
      toast.success('Password changed successfully!');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast.error(err.message || 'Failed to change password.');
    } finally {
      setSavingPassword(false);
    }
  }




  // Load hourly breakdown when node and date change
  useEffect(() => {
    if (bookingForm.nodeId && bookingForm.reservationDate) {
      let active = true;
      setLoadingHourly(true);
      setHourlyAvailability(null);
      getHourlyAvailability(bookingForm.nodeId, bookingForm.reservationDate)
        .then(data => { if (active) setHourlyAvailability(data); })
        .catch(() => { if (active) setHourlyAvailability(null); })
        .finally(() => { if (active) setLoadingHourly(false); });
      return () => { active = false; };
    }
  }, [bookingForm.nodeId, bookingForm.reservationDate, availabilityRefreshKey]);

  useEffect(() => {
    if (!hourlyAvailability?.slots) return;
    const startTimes = getBookableStartTimes(hourlyAvailability);
    setBookingForm(current => {
      const startTime = startTimes.includes(current.startTime) ? current.startTime : (startTimes[0] || '');
      const endTimes = getBookableEndTimes(hourlyAvailability, startTime);
      const endTime = endTimes.includes(current.endTime) ? current.endTime : (endTimes[0] || '');
      return startTime === current.startTime && endTime === current.endTime
        ? current
        : { ...current, startTime, endTime };
    });
  }, [hourlyAvailability]);

  // Load window availability when node, date, and times change
  useEffect(() => {
    if (bookingForm.nodeId && bookingForm.reservationDate && bookingForm.startTime && bookingForm.endTime) {
      if (bookingForm.startTime >= bookingForm.endTime) {
        setWindowAvailability({ error: 'Start time must be earlier than end time.' });
        return;
      }
      let active = true;
      setEvaluatingWindow(true);
      getAvailability(bookingForm.nodeId, bookingForm.reservationDate, bookingForm.startTime, bookingForm.endTime)
        .then(data => { if (active) setWindowAvailability(data); })
        .catch(err => { if (active) setWindowAvailability({ error: err.message }); })
        .finally(() => { if (active) setEvaluatingWindow(false); });
      return () => { active = false; };
    }
  }, [bookingForm.nodeId, bookingForm.reservationDate, bookingForm.startTime, bookingForm.endTime, availabilityRefreshKey]);

  // Helper: Computes Date object with reservation start time
  function getReservationDateTime(r) {
    if (!r) return new Date();
    const d = new Date(r.reservationDate);
    if (r.startTime && r.startTime.includes(':')) {
      const [h, m] = r.startTime.split(':').map(Number);
      d.setHours(h, m, 0, 0);
    }
    return d;
  }

  // Helper: Checks if reservation is at least 12 hours in the future
  function canModifyOrCancel(r) {
    const resTime = getReservationDateTime(r).getTime();
    const now = Date.now();
    const hoursRemaining = (resTime - now) / (1000 * 60 * 60);
    return hoursRemaining > 12;
  }

  function getHoursNoticeText(r) {
    const resTime = getReservationDateTime(r).getTime();
    const now = Date.now();
    const hoursRemaining = (resTime - now) / (1000 * 60 * 60);
    if (hoursRemaining <= 0) return 'Past slot';
    return `${Math.round(hoursRemaining)}h notice remaining`;
  }

  // --- Handlers: Cancel Booking (12-hour rule) ---
  async function handleCancel(res) {
    if (!canModifyOrCancel(res)) {
      toast.error('Cancellations require at least 12 hours’ notice before the scheduled slot.');
      return;
    }

    if (!window.confirm('Are you sure you want to cancel this reservation? Its allocated battery capacity will be freed.')) return;

    try {
      await cancelReservation(res.id);
      toast.success('Reservation cancelled successfully.');
      loadProsumerData();
    } catch (err) {
      toast.error(err.message || 'Failed to cancel reservation.');
    }
  }

  // Helper for available slots in the current window
  const availabilityMatchesSelection = windowAvailability &&
    windowAvailability.nodeId === bookingForm.nodeId &&
    String(windowAvailability.date || '').slice(0, 10) === bookingForm.reservationDate &&
    windowAvailability.startTime === bookingForm.startTime &&
    windowAvailability.endTime === bookingForm.endTime;
  const displayedSlots = availabilityMatchesSelection && Array.isArray(windowAvailability.slots)
    ? windowAvailability.slots
    : [];

  const selectedSlots = displayedSlots.filter(s => (bookingForm.selectedSlotIds || []).includes(s.id));
  const totalCalculatedKWh = selectedSlots.reduce((sum, s) => sum + (s.capacityKWh || 0), 0);

  // --- Handlers: Modify Booking (12-hour rule) ---
  function openModifyModal(res) {
    if (!canModifyOrCancel(res)) {
      toast.error('Updates require at least 12 hours’ notice before the scheduled slot.');
      return;
    }
    const start = res.startTime || '08:00';
    setModifyingRes(res);
    setModifyData({
      reservationDate: res.reservationDate ? new Date(res.reservationDate).toISOString().split('T')[0] : '',
      startTime: start,
      endTime: addOneHour(start),
      energyKWh: res.energyKWh,
      selectedSlotIds: res.allocatedSlotIds || []
    });
    getSlotsByNode(res.nodeId)
      .then(data => setModifySlots(data || []))
      .catch(() => setModifySlots([]));
  }

  async function handleSaveModify(e) {
    e.preventDefault();
    if (!modifyingRes) return;
    if (modifyData.startTime >= modifyData.endTime) {
      toast.error('Start time must be earlier than end time.');
      return;
    }
    const activeModifySlots = modifySlots.filter(s => (modifyData.selectedSlotIds || []).includes(s.id));
    const newEnergy = activeModifySlots.reduce((sum, s) => sum + (s.availableKWh || 0), 0);

    try {
      await updateReservation(modifyingRes.id, {
        reservationDate: modifyData.reservationDate,
        startTime: modifyData.startTime,
        endTime: modifyData.endTime,
        energyKWh: newEnergy > 0 ? newEnergy : modifyingRes.energyKWh,
        selectedSlotIds: modifyData.selectedSlotIds && modifyData.selectedSlotIds.length > 0 ? modifyData.selectedSlotIds : modifyingRes.allocatedSlotIds
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
    now.setHours(0, 0, 0, 0);
    const maxAllowed = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    if (selectedDate < now) {
      toast.error('Reservation date must be today or in the future.');
      return;
    }

    if (selectedDate > maxAllowed) {
      toast.error('7-Day Rule: Reservation must be scheduled within the next 7 days.');
      return;
    }

    if (bookingForm.startTime >= bookingForm.endTime) {
      toast.error('Start time must be earlier than end time.');
      return;
    }

    if (!bookingForm.selectedSlotIds || bookingForm.selectedSlotIds.length === 0) {
      toast.error('Please select at least one available battery storage slot.');
      return;
    }

    if (totalCalculatedKWh <= 0) {
      toast.error('Selected slot capacity must be greater than 0 kWh.');
      return;
    }

    setSubmittingBooking(true);
    try {
      await createReservation({
        prosumerNic: prosumerNic,
        nodeId: bookingForm.nodeId,
        reservationDate: bookingForm.reservationDate,
        startTime: bookingForm.startTime,
        endTime: bookingForm.endTime,
        energyKWh: totalCalculatedKWh,
        selectedSlotIds: bookingForm.selectedSlotIds
      });
      toast.success(`Energy reservation of ${totalCalculatedKWh.toFixed(1)} kWh created successfully! Awaiting station operator approval.`);
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
    try {
      await deactivateProsumer(prosumerNic);
      toast.success('Account deactivated successfully.');
      setShowDeactivateModal(false);

      setTimeout(() => {
        logout();
      }, 1500);
    } catch (err) {
      toast.error(err.message || 'Account deactivation failed.');
      setShowDeactivateModal(false);
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

  const activeNodes = nodes.filter(n => n.isActive);
  const mappedNodes = activeNodes.filter(n => Number.isFinite(Number(n.latitude)) && Number.isFinite(Number(n.longitude)));
  const mapCenter = selectedMapNode
    ? { lat: Number(selectedMapNode.latitude), lng: Number(selectedMapNode.longitude) }
    : mappedNodes.length > 0
      ? { lat: Number(mappedNodes[0].latitude), lng: Number(mappedNodes[0].longitude) }
      : DEFAULT_MAP_CENTER;

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
            <div className="stat-value">{activeNodes.length}</div>
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
          📍 Find Grid Stations ({activeNodes.length})
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
                      <th>Grid Station</th>
                      <th>Scheduled Date &amp; Time</th>
                      <th>Energy (kWh)</th>
                      <th>Slots</th>
                      <th>Status</th>
                      <th>Notice Window</th>
                      <th>Digital Pass &amp; Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReservations.map(r => {
                      const modifiable = canModifyOrCancel(r);
                      const isApproved = r.status === 'Approved';
                      const isPending = r.status === 'Pending';
                      const isFinished = r.status === 'Completed' || r.status === 'Cancelled';
                      const stationName = nodes.find(n => n.id === r.nodeId)?.nodeName || r.nodeId;

                      return (
                        <tr key={r.id}>
                          <td>
                            <strong>{stationName}</strong>
                          </td>
                          <td>
                            <div>{new Date(r.reservationDate).toLocaleDateString()}</div>
                            {r.startTime && r.endTime && (
                              <small className="text-muted" style={{ display: 'block' }}>⏱️ {r.startTime} - {r.endTime}</small>
                            )}
                          </td>
                          <td><strong style={{ color: 'var(--color-primary-light)' }}>{r.energyKWh} kWh</strong></td>
                          <td>
                            {r.allocatedSlotNames?.length > 0 ? (
                              <span className="badge badge-info" style={{ fontSize: '0.75rem' }}>
                                {r.allocatedSlotNames.join(', ')}
                              </span>
                            ) : r.allocatedSlotIds?.length > 0 ? (
                              <span className="badge badge-info" style={{ fontSize: '0.75rem' }}>
                                {r.allocatedSlotIds.length} slot(s)
                              </span>
                            ) : (
                              <span className="text-muted">Auto</span>
                            )}
                          </td>
                          <td><StatusBadge status={r.status} /></td>
                          <td style={{ fontSize: '0.8rem' }}>
                            {!isFinished ? (
                              <span style={{ color: modifiable ? 'var(--color-primary-light)' : 'var(--color-warning)' }}>
                                {modifiable ? '✓ ' : '🔒 '}{getHoursNoticeText(r)}
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
                                    onClick={() => handleCancel(r)}
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
                  {activeNodes.map(n => (
                    <option key={n.id} value={n.id}>
                      {n.nodeName} ({n.location}) — Total {n.capacityKWh} kWh | Schedule: {n.schedule}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date & Time Window */}
              <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">Reservation Date</label>
                  <input
                    type="date"
                    className="form-input"
                    min={todayDateStr}
                    max={maxDateStr}
                    value={bookingForm.reservationDate}
                    onChange={e => setBookingForm({ ...bookingForm, reservationDate: e.target.value })}
                    required
                  />
                  <span className="text-muted" style={{ fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>
                    Within 7 days
                  </span>
                </div>
                <div className="form-group">
                  <label className="form-label">Start Time</label>
                  <select
                    className="form-select"
                    value={bookingForm.startTime}
                    onChange={e => setBookingForm({ ...bookingForm, startTime: e.target.value })}
                    required
                    disabled={loadingHourly || getBookableStartTimes(hourlyAvailability).length === 0}
                  >
                    {getBookableStartTimes(hourlyAvailability).length === 0
                      ? <option value="">No unbooked times available</option>
                      : getBookableStartTimes(hourlyAvailability).map(time => <option key={time} value={time}>{time}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">End Time</label>
                  <input
                    type="time"
                    className="form-input"
                    value={bookingForm.endTime}
                    onChange={e => setBookingForm({ ...bookingForm, endTime: e.target.value })}
                    required
                  />
                </div>
              </div>

              {/* Hourly Capacity Breakdown Grid */}
              {loadingHourly && (
                <div className="text-muted" style={{ padding: '0.5rem 0', fontSize: '0.85rem' }}>
                  ⏳ Loading station hourly schedule and availability...
                </div>
              )}
              {hourlyAvailability && !loadingHourly && (
                <div style={{
                  margin: '1rem 0',
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <strong style={{ fontSize: '0.9rem' }}>📊 Station Hourly Capacity on {bookingForm.reservationDate}</strong>
                    <span className="text-muted" style={{ fontSize: '0.75rem' }}>Operating Hours: {hourlyAvailability.schedule} (1-hr slots)</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.5rem' }}>
                    {getHourlySlots(hourlyAvailability).filter(isBookableHour).map(s => {
                      const isSelected = bookingForm.startTime <= s.startTime && bookingForm.endTime > s.startTime;
                      return (
                        <div
                          key={s.startTime}
                          onClick={() => {
                            if (s.isWithinOperatingHours) {
                              const start = `${String(s.hour).padStart(2, '0')}:00`;
                              const end = `${String(Math.min(23, s.hour + 2)).padStart(2, '0')}:00`;
                              setBookingForm(prev => ({ ...prev, startTime: start, endTime: end }));
                            }
                          }}
                          style={{
                            padding: '0.5rem',
                            borderRadius: 'var(--radius-sm)',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            textAlign: 'center',
                            border: isSelected ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                            background: isSelected
                              ? 'rgba(34, 197, 94, 0.15)'
                              : 'var(--color-bg)'
                          }}
                          title="Click to select this unbooked time"
                        >
                          <div style={{ fontWeight: 600 }}>{s.startTime}–{s.endTime}</div>
                          <div style={{ color: 'var(--color-primary-light)' }}>
                            {s.availableKWh} / {hourlyAvailability.totalCapacityKWh} kWh
                          </div>
                        </div>
                      );
                    })}
                    {getBookableStartTimes(hourlyAvailability).length === 0 && (
                      <div className="text-muted">No unbooked times are available for this date.</div>
                    )}
                  </div>
                </div>
              )}

              {/* Window Capacity Evaluation Alert */}
              {evaluatingWindow && (
                <div className="text-muted" style={{ padding: '0.5rem 0', fontSize: '0.85rem' }}>
                  ⏳ Evaluating requested time window...
                </div>
              )}
              {windowAvailability && !evaluatingWindow && (
                <div style={{
                  margin: '1rem 0',
                  padding: '0.85rem',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: windowAvailability.error || !windowAvailability.isWithinOperatingHours ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                  border: `1px solid ${windowAvailability.error || !windowAvailability.isWithinOperatingHours ? 'rgba(239, 68, 68, 0.3)' : 'rgba(34, 197, 94, 0.3)'}`
                }}>
                  {windowAvailability.error ? (
                    <span style={{ color: '#ef4444', fontSize: '0.85rem' }}>⚠️ {windowAvailability.error}</span>
                  ) : (
                    <div style={{ fontSize: '0.85rem' }}>
                      <div><strong>Station Schedule:</strong> {windowAvailability.schedule} {!windowAvailability.isWithinOperatingHours && <span style={{ color: '#ef4444' }}>(OUTSIDE OPERATING HOURS)</span>}</div>
                      <div><strong>Station Capacity:</strong> {windowAvailability.totalCapacityKWh} kWh {windowAvailability.maintenanceSlotsCount > 0 && `(${windowAvailability.maintenanceSlotsCount} slot under maintenance)`}</div>
                      <div><strong>Reserved in this window:</strong> {windowAvailability.reservedKWh} kWh</div>
                      <div style={{ fontWeight: 600, color: windowAvailability.availableKWh > 0 ? '#10b981' : '#ef4444', marginTop: '0.25rem' }}>
                        Available for Injection: {windowAvailability.availableKWh} kWh
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Select Physical Battery Slot(s) */}
              <div className="form-group" style={{ marginTop: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <label className="form-label" style={{ margin: 0, fontWeight: 700, fontSize: '0.95rem' }}>
                    🔋 Select Station Battery Storage Slot(s)
                  </label>
                  <span className="text-muted" style={{ fontSize: '0.8rem' }}>
                    Click available slots to reserve capacity
                  </span>
                </div>

                {!bookingForm.nodeId ? (
                  <div style={{ padding: '1rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-sm)', border: '1px dashed var(--color-border)', color: 'var(--color-text-secondary)', fontSize: '0.85rem', textAlign: 'center' }}>
                    Please choose a microgrid station above to view its actual battery slots.
                  </div>
                ) : displayedSlots.length === 0 ? (
                  <div style={{ padding: '1rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', fontSize: '0.85rem', textAlign: 'center' }}>
                    ⏳ Loading station battery slots...
                  </div>
                ) : (
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
                      {displayedSlots.map(slot => {
                        const isSelected = (bookingForm.selectedSlotIds || []).includes(slot.id);
                        const isMaintenance = slot.status === 'Maintenance';
                        const isBooked = slot.isBooked;
                        const isSelectable = !isMaintenance && !isBooked;

                        return (
                          <div
                            key={slot.id || slot.slotNumber}
                            onClick={() => {
                              if (!isSelectable) return;
                              setBookingForm(prev => {
                                const current = prev.selectedSlotIds || [];
                                const next = isSelected
                                  ? current.filter(id => id !== slot.id)
                                  : [...current, slot.id];
                                return { ...prev, selectedSlotIds: next };
                              });
                            }}
                            style={{
                              padding: '0.85rem',
                              borderRadius: 'var(--radius-md)',
                              border: isSelected
                                ? '2px solid var(--color-primary)'
                                : isSelectable
                                  ? '1px solid var(--color-border)'
                                  : '1px dashed rgba(255, 255, 255, 0.1)',
                              background: isSelected
                                ? 'rgba(34, 197, 94, 0.18)'
                                : isSelectable
                                  ? 'var(--color-surface)'
                                  : 'rgba(255, 255, 255, 0.03)',
                              cursor: isSelectable ? 'pointer' : 'not-allowed',
                              opacity: isSelectable ? 1 : 0.45,
                              transition: 'all 0.2s ease',
                              boxShadow: isSelected ? '0 0 12px rgba(34, 197, 94, 0.35)' : 'none',
                              position: 'relative'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                              <strong style={{ fontSize: '0.9rem', color: isSelected ? 'var(--color-primary-light)' : 'var(--color-text)' }}>
                                🔋 Slot #{slot.slotNumber}
                              </strong>
                              {isSelected && (
                                <span style={{ fontSize: '0.8rem', color: 'var(--color-primary-light)', fontWeight: 700 }}>✓ Selected</span>
                              )}
                            </div>
                            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-text)', marginBottom: '0.35rem' }}>
                              {slot.capacityKWh} <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--color-text-secondary)' }}>kWh</span>
                            </div>
                            <div>
                              {isMaintenance ? (
                                <span style={{ fontSize: '0.72rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', fontWeight: 600 }}>
                                  🔧 Maintenance
                                </span>
                              ) : isBooked ? (
                                <span style={{ fontSize: '0.72rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', fontWeight: 600 }}>
                                  ⏳ Booked in Window
                                </span>
                              ) : (
                                <span style={{ fontSize: '0.72rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', fontWeight: 600 }}>
                                  ● Available
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Calculated Energy Summary */}
                    <div style={{
                      padding: '1rem',
                      borderRadius: 'var(--radius-sm)',
                      background: totalCalculatedKWh > 0 ? 'rgba(34, 197, 94, 0.12)' : 'rgba(255, 255, 255, 0.04)',
                      border: `1px solid ${totalCalculatedKWh > 0 ? 'var(--color-primary)' : 'var(--color-border)'}`,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '0.75rem'
                    }}>
                      <div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Calculated Energy to Supply
                        </div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: totalCalculatedKWh > 0 ? 'var(--color-primary-light)' : 'var(--color-text-secondary)' }}>
                          {totalCalculatedKWh.toFixed(1)} kWh
                          <span style={{ fontSize: '0.85rem', fontWeight: 400, color: 'var(--color-text-secondary)', marginLeft: '0.5rem' }}>
                            ({selectedSlots.length} slot{selectedSlots.length === 1 ? '' : 's'} selected)
                          </span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                          ⚡ Capacity is determined directly by your physical battery slot choice
                        </div>
                      </div>
                      {selectedSlots.length > 0 && (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => setBookingForm(prev => ({ ...prev, selectedSlotIds: [] }))}
                          style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem' }}
                        >
                          ✕ Clear Selection
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                className="btn btn-primary btn-lg"
                style={{ width: '100%', justifyContent: 'center', marginTop: '1.25rem' }}
                disabled={submittingBooking || !bookingForm.nodeId || selectedSlots.length === 0 || (windowAvailability && !windowAvailability.error && !windowAvailability.isWithinOperatingHours)}
              >
                {submittingBooking ? 'Submitting Reservation...' : `⚡ Confirm Energy Reservation (${totalCalculatedKWh.toFixed(1)} kWh)`}
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
            {activeNodes.map(n => (
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

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto' }}>
                  <button
                    className="btn btn-secondary"
                    style={{ flex: 1, justifyContent: 'center' }}
                    onClick={() => setSelectedMapNode(n)}
                    disabled={!Number.isFinite(Number(n.latitude)) || !Number.isFinite(Number(n.longitude))}
                  >
                    🗺️ View Map
                  </button>
                  <button
                    className="btn btn-primary"
                    style={{ flex: 1, justifyContent: 'center' }}
                    onClick={() => {
                      setBookingForm(prev => ({ ...prev, nodeId: n.id }));
                      setActiveTab('book');
                    }}
                  >
                    ⚡ Book Here
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: MY PROFILE */}
      {activeTab === 'profile' && (
        <div style={{ maxWidth: '650px', margin: '0 auto' }}>
          <div className="card" style={{ padding: '2rem' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.5rem'
              }}
            >
              <h2
                style={{
                  fontSize: '1.4rem',
                  margin: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <span>👤</span> Prosumer Solar Profile
              </h2>

              {!isEditingProfile && (
                <button
                  className="btn btn-primary btn-sm"
                  onClick={openProfileEdit}
                >
                  ✏️ Edit Profile
                </button>
              )}
            </div>
            {isEditingProfile ? (
              <form onSubmit={handleSaveProfile}>
                <div className="form-group">
                  <label className="form-label">First Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={profileForm.firstName}
                    onChange={e =>
                      setProfileForm({ ...profileForm, firstName: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Last Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={profileForm.lastName}
                    onChange={e =>
                      setProfileForm({ ...profileForm, lastName: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input
                    type="email"
                    className="form-input"
                    value={profileForm.email}
                    onChange={e =>
                      setProfileForm({ ...profileForm, email: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input
                    type="text"
                    className="form-input"
                    value={profileForm.phone}
                    onChange={e =>
                      setProfileForm({ ...profileForm, phone: e.target.value })
                    }
                    pattern="07[0-9]{8}"
                    onInvalid={e =>
                      e.currentTarget.setCustomValidity(
                        'Enter a valid Sri Lankan mobile number (e.g. 0771234567).'
                      )
                    }
                    onInput={e => e.currentTarget.setCustomValidity('')}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Address</label>
                  <input
                    type="text"
                    className="form-input"
                    value={profileForm.address}
                    onChange={e =>
                      setProfileForm({ ...profileForm, address: e.target.value })
                    }
                    required
                  />
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '0.75rem',
                    marginTop: '1.5rem'
                  }}
                >
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setIsEditingProfile(false)}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={savingProfile}
                  >
                    {savingProfile ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            ) : (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  fontSize: '0.95rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-sm)' }}>
                  <span className="text-muted">National Identity Card (NIC):</span>
                  <strong>{prosumerNic}</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-sm)' }}>
                  <span className="text-muted">Full Name:</span>
                  <strong>
                    {prosumerProfile
                      ? `${prosumerProfile.firstName} ${prosumerProfile.lastName}`
                      : user?.displayName}
                  </strong>
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
                  <span className="text-muted">Address:</span>
                  <strong>{prosumerProfile?.address || 'N/A'}</strong>
                </div>



                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-sm)' }}>
                  <span className="text-muted">Account Status:</span>
                  <StatusBadge status={prosumerProfile?.status || 'Active'} />
                </div>
              </div>
            )}


          </div>

          <div className="card" style={{ padding: '2rem', marginTop: '1.5rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>Change Password</h3>
            <form onSubmit={handleChangePassword}>
              <div className="form-group">
                <label className="form-label">Current Password</label>
                <input
                  type="password"
                  className="form-input"
                  value={passwordForm.currentPassword}
                  onChange={e => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">New Password</label>
                <input
                  type="password"
                  className="form-input"
                  value={passwordForm.newPassword}
                  onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  minLength={6}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Confirm New Password</label>
                <input
                  type="password"
                  className="form-input"
                  value={passwordForm.confirmPassword}
                  onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  minLength={6}
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary" disabled={savingPassword}>
                {savingPassword ? 'Changing...' : 'Change Password'}
              </button>
            </form>
          </div>

          <div style={{ marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--color-border)' }}>
            <h4 style={{ color: 'var(--color-danger-light)', marginBottom: '0.5rem' }}>Account Lifecycle Management</h4>
            <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>
              You can request deactivation of your prosumer account if you no longer wish to trade energy. Only allowed if there are no pending or approved reservations.
            </p>
            <button className="btn btn-danger" onClick={() => setShowDeactivateModal(true)}>
              Request Account Deactivation
            </button>
          </div>
        </div>

      )}
      {/* MODAL: ACCOUNT DEACTIVATION CONFIRMATION */}
      {showDeactivateModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowDeactivateModal(false)}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '450px', textAlign: 'center' }}
          >
            <h3>Deactivate Account?</h3>

            <p className="text-muted">
              Are you sure you want to deactivate your prosumer account?
            </p>

            <p className="text-muted">
              You cannot deactivate your account while pending or approved
              reservations exist.
            </p>

            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '1rem',
                marginTop: '1.5rem'
              }}
            >
              <button
                className="btn"
                onClick={() => setShowDeactivateModal(false)}
              >
                Cancel
              </button>

              <button
                className="btn btn-danger"
                onClick={async () => {
                  setShowDeactivateModal(false);
                  await handleDeactivateAccount();
                }}
              >
                Yes, Deactivate
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
                <div>Prosumer NIC: <strong>{selectedQrPass.prosumerNic}</strong></div>
                <div>Station: <strong>{nodes.find(n => n.id === selectedQrPass.nodeId)?.nodeName || selectedQrPass.nodeId}</strong></div>
                <div>Time Window: <strong>{selectedQrPass.startTime && selectedQrPass.endTime ? `${selectedQrPass.startTime} - ${selectedQrPass.endTime}` : 'Full Day'}</strong></div>
                <div>Allocated Slots: <strong>{selectedQrPass.allocatedSlotNames?.length > 0 ? selectedQrPass.allocatedSlotNames.join(', ') : (selectedQrPass.allocatedSlotIds?.length > 0 ? `${selectedQrPass.allocatedSlotIds.length} slot(s)` : 'Auto-allocated')}</strong></div>
                <div>Energy to Transfer: <strong style={{ color: 'var(--color-primary)' }}>{selectedQrPass.energyKWh} kWh</strong></div>
                <div>Scheduled Date: <strong>{new Date(selectedQrPass.reservationDate).toLocaleDateString()}</strong></div>
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

      {/* MODAL: NEARBY MICROGRID MAP */}
      {selectedMapNode && (
        <div className="modal-overlay" onClick={() => setSelectedMapNode(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '850px' }}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">🗺️ Nearby Microgrid Stations</h3>
                <span className="text-muted" style={{ fontSize: '0.8rem' }}>
                  {selectedMapNode.nodeName} selected
                </span>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelectedMapNode(null)}>✕</button>
            </div>
            <div className="modal-body" style={{ padding: '1rem' }}>
              <MapboxLocationMap
                height="420px"
                center={mapCenter}
                zoom={13}
                markers={[{
                  id: selectedMapNode.id,
                  name: selectedMapNode.nodeName,
                  latitude: Number(selectedMapNode.latitude),
                  longitude: Number(selectedMapNode.longitude)
                }]}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                <div>
                  <strong>{selectedMapNode.nodeName}</strong>
                  <div className="text-muted" style={{ fontSize: '0.85rem' }}>{selectedMapNode.location}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: MODIFY RESERVATION (12-HOUR RULE) */}
      {modifyingRes && (
        <div className="modal-overlay" onClick={() => setModifyingRes(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3 className="modal-title">✏️ Modify Reservation #{modifyingRes.id.substring(0, 8)}</h3>
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
                  <label className="form-label">New Reservation Date</label>
                  <input
                    type="date"
                    className="form-input"
                    min={todayDateStr}
                    max={maxDateStr}
                    value={modifyData.reservationDate}
                    onChange={e => setModifyData({ ...modifyData, reservationDate: e.target.value })}
                    required
                  />
                </div>

                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label className="form-label">Start Time</label>
                    <input
                      type="time"
                      className="form-input"
                      value={modifyData.startTime}
                      onChange={e => {
                        const start = e.target.value;
                        const end = addOneHour(start);
                        setModifyData(prev => ({ ...prev, startTime: start, endTime: end }));
                      }}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      End Time
                      <span style={{ fontSize: '0.7rem', color: 'var(--color-primary-light)', background: 'rgba(56, 189, 248, 0.1)', padding: '1px 6px', borderRadius: '4px' }}>
                        🔒 1-Hour Fixed
                      </span>
                    </label>
                    <input
                      type="time"
                      className="form-input"
                      value={modifyData.endTime}
                      readOnly
                      disabled
                      style={{ opacity: 0.85, cursor: 'not-allowed', background: 'rgba(255,255,255,0.05)' }}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">New Energy Amount (kWh)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
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
