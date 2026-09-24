// ============================================================
// File: OperatorPortal.jsx
// Project: Smart Solar Microgrid Trading System - React Web App
// Description: Dedicated Grid Operator Station Portal with camera
//              and manual QR verification, booking approvals, and
//              energy slot monitoring.
// ============================================================

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getReservations,
  getNodes,
  approveReservation,
  completeReservation
} from '../services/api';
import StatusBadge from '../components/StatusBadge';
import { toast } from 'react-toastify';
import { Html5Qrcode } from 'html5-qrcode';

export default function OperatorPortal() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('qr');
  const [loading, setLoading] = useState(true);

  // Data states
  const [reservations, setReservations] = useState([]);
  const [nodes, setNodes] = useState([]);

  // QR Verification states
  const [qrInput, setQrInput] = useState('');
  const [scannedResult, setScannedResult] = useState(null);
  const [matchedReservation, setMatchedReservation] = useState(null);
  const [scannerActive, setScannerActive] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [transferReceipt, setTransferReceipt] = useState(null);

  const html5QrCodeRef = useRef(null);

  useEffect(() => {
    loadPortalData();

    return () => {
      // Clean up camera scanner if active
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current.stop().catch(() => {});
      }
    };
  }, []);

  async function loadPortalData() {
    try {
      setLoading(true);
      const [resData, nodesData] = await Promise.all([
        getReservations().catch(() => []),
        getNodes().catch(() => [])
      ]);
      setReservations(resData);
      setNodes(nodesData);
    } catch (err) {
      toast.error('Failed to load station data: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  // --- QR Scanner Controls ---
  async function startScanner() {
    try {
      const qrRegion = document.getElementById('qr-reader');
      if (!qrRegion) return;

      const html5QrCode = new Html5Qrcode('qr-reader');
      html5QrCodeRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          handleQrDetected(decodedText);
          stopScanner();
        },
        () => {} // Ignore scan errors
      );
      setScannerActive(true);
    } catch (err) {
      toast.warning('Camera not accessible or permission denied. Please use manual code entry.');
      setScannerActive(false);
    }
  }

  async function stopScanner() {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        await html5QrCodeRef.current.stop();
        setScannerActive(false);
      } catch (err) {
        // Ignore
      }
    }
  }

  function handleQrDetected(text) {
    setQrInput(text);
    processQrString(text);
  }

  // Process QR string and find matched reservation
  function processQrString(qrString) {
    const trimmed = qrString.trim();
    if (!trimmed) {
      toast.warning('Please enter a QR token.');
      return;
    }

    // Typical format: SMTS-{resId}-{nic}-{guid}
    const parts = trimmed.split('-');
    let targetId = '';
    if (parts.length >= 2 && trimmed.startsWith('SMTS-')) {
      targetId = parts[1];
    } else {
      // In case user entered reservation ID directly
      targetId = trimmed;
    }

    const matched = reservations.find(r => r.id === targetId || r.qrCodeData === trimmed);
    setScannedResult(trimmed);
    setMatchedReservation(matched || null);

    if (matched) {
      toast.info(`Found booking #${matched.id} for Prosumer ${matched.prosumerNic}`);
    } else {
      toast.warning(`No matching reservation found for code. You may still attempt transfer completion.`);
    }
  }

  // --- Complete Energy Transfer ---
  async function handleConfirmTransfer() {
    if (!qrInput.trim()) {
      toast.warning('Please scan or enter a QR token first.');
      return;
    }

    const trimmed = qrInput.trim();
    const parts = trimmed.split('-');
    const resId = matchedReservation ? matchedReservation.id : (parts.length >= 2 ? parts[1] : trimmed);

    setCompleting(true);
    try {
      await completeReservation(resId, trimmed);
      toast.success(`⚡ Energy Transfer Completed for booking #${resId}!`);
      
      setTransferReceipt({
        reservationId: resId,
        prosumerNic: matchedReservation?.prosumerNic || 'Verified',
        energyKWh: matchedReservation?.energyKWh || 'N/A',
        timestamp: new Date().toLocaleTimeString(),
        status: 'Completed'
      });

      setQrInput('');
      setMatchedReservation(null);
      setScannedResult(null);
      loadPortalData();
    } catch (err) {
      toast.error(err.message || 'Verification failed. Token invalid or transfer already completed.');
    } finally {
      setCompleting(false);
    }
  }

  // --- Approve Reservation ---
  async function handleApprove(id) {
    try {
      await approveReservation(id);
      toast.success(`Booking #${id} approved! QR Code generated.`);
      loadPortalData();
    } catch (err) {
      toast.error(err.message || 'Approval failed.');
    }
  }

  // Counts
  const pendingCount = reservations.filter(r => r.status === 'Pending').length;
  const approvedCount = reservations.filter(r => r.status === 'Approved').length;
  const completedCount = reservations.filter(r => r.status === 'Completed').length;
  const totalEnergyTransferred = reservations
    .filter(r => r.status === 'Completed')
    .reduce((sum, r) => sum + (r.energyKWh || 0), 0);

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
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '2rem' }}>⚡</span>
            <h1 className="page-title" style={{ margin: 0 }}>Grid Operator Station Portal</h1>
          </div>
          <p className="text-muted" style={{ margin: 0 }}>
            Physical node hub management, prosumer arrival verification &amp; energy slot transfer execution.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <span className="role-tag" style={{ background: 'var(--gradient-primary)', padding: '0.4rem 0.8rem', borderRadius: '20px', fontSize: '0.85rem' }}>
            🔌 Role: Grid Station Operator
          </span>
          <button className="btn btn-secondary btn-sm" onClick={loadPortalData}>
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Operator KPIs */}
      <div className="stats-grid" style={{ marginBottom: '2rem' }}>
        <div className="stat-card" onClick={() => setActiveTab('qr')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon green">⚡</div>
          <div className="stat-info">
            <div className="stat-value">{totalEnergyTransferred.toFixed(1)} kWh</div>
            <div className="stat-label">Energy Transferred</div>
          </div>
        </div>

        <div className="stat-card warning" onClick={() => setActiveTab('queue')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon amber">⏳</div>
          <div className="stat-info">
            <div className="stat-value">{pendingCount}</div>
            <div className="stat-label">Pending Approvals</div>
          </div>
        </div>

        <div className="stat-card accent" onClick={() => setActiveTab('queue')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon blue">🚚</div>
          <div className="stat-info">
            <div className="stat-value">{approvedCount}</div>
            <div className="stat-label">Awaiting Arrivals</div>
          </div>
        </div>

        <div className="stat-card" onClick={() => setActiveTab('history')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon green">✅</div>
          <div className="stat-info">
            <div className="stat-value">{completedCount}</div>
            <div className="stat-label">Completed Transfers</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="role-tabs" style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
        <button
          className={`role-tab ${activeTab === 'qr' ? 'active' : ''}`}
          onClick={() => setActiveTab('qr')}
        >
          📷 Scan &amp; Complete Transfer
        </button>
        <button
          className={`role-tab ${activeTab === 'queue' ? 'active' : ''}`}
          onClick={() => setActiveTab('queue')}
        >
          📋 Station Bookings Queue ({pendingCount + approvedCount})
        </button>
        <button
          className={`role-tab ${activeTab === 'nodes' ? 'active' : ''}`}
          onClick={() => setActiveTab('nodes')}
        >
          🔋 Station Node Slots ({nodes.length})
        </button>
        <button
          className={`role-tab ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          📑 Transfer History ({completedCount})
        </button>
      </div>

      {/* TAB 1: QR VERIFICATION & TRANSFER EXECUTION */}
      {activeTab === 'qr' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '2rem' }}>
          {/* Left Column: Verification Action Card */}
          <div className="card" style={{ padding: '1.75rem' }}>
            <h3 style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>📷</span> Prosumer Arrival Verification
            </h3>
            <p className="text-muted" style={{ fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              When a prosumer arrives with their solar energy batteries, scan their QR pass or enter their security token to finalize the energy transfer.
            </p>

            {/* Camera Viewport */}
            <div
              id="qr-reader"
              style={{
                width: '100%',
                minHeight: scannerActive ? '260px' : '0px',
                marginBottom: '1rem',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden'
              }}
            />

            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
              {!scannerActive ? (
                <button className="btn btn-primary" onClick={startScanner} style={{ flex: 1, justifyContent: 'center' }}>
                  🎥 Turn On Camera Scanner
                </button>
              ) : (
                <button className="btn btn-danger" onClick={stopScanner} style={{ flex: 1, justifyContent: 'center' }}>
                  ⏹️ Turn Off Camera
                </button>
              )}
            </div>

            {/* Manual Token Fallback */}
            <div className="form-group">
              <label className="form-label">Or Enter / Paste QR Security Token</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="SMTS-{id}-{nic}-{guid}"
                  value={qrInput}
                  onChange={e => {
                    setQrInput(e.target.value);
                    if (e.target.value.length > 8) processQrString(e.target.value);
                  }}
                />
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => processQrString(qrInput)}
                >
                  Lookup
                </button>
              </div>
              <span className="text-muted" style={{ fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>
                Example: SMTS-66f012...-199012345678-abc123...
              </span>
            </div>

            {/* Matched Booking Preview */}
            {matchedReservation && (
              <div
                style={{
                  background: 'var(--color-surface)',
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-primary)',
                  marginBottom: '1.5rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <strong style={{ color: 'var(--color-primary-light)' }}>✓ Verified Booking #{matchedReservation.id}</strong>
                  <StatusBadge status={matchedReservation.status} />
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div>Prosumer NIC: <strong>{matchedReservation.prosumerNic}</strong></div>
                  <div>Energy: <strong style={{ color: 'var(--color-primary)' }}>{matchedReservation.energyKWh} kWh</strong></div>
                  <div>Slot ID: <strong>{matchedReservation.slotId}</strong></div>
                  <div>Scheduled: <strong>{new Date(matchedReservation.reservationDate).toLocaleDateString()}</strong></div>
                </div>
              </div>
            )}

            {/* Confirm Transfer Button */}
            <button
              className="btn btn-primary btn-lg"
              style={{ width: '100%', justifyContent: 'center' }}
              disabled={!qrInput.trim() || completing}
              onClick={handleConfirmTransfer}
            >
              {completing ? 'Completing Transfer...' : '⚡ Confirm & Complete Energy Transfer'}
            </button>
          </div>

          {/* Right Column: Recent Handover Receipt & Quick Action List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {transferReceipt && (
              <div
                className="card"
                style={{
                  padding: '1.5rem',
                  border: '1px solid var(--color-primary)',
                  background: 'linear-gradient(145deg, rgba(34,197,94,0.1), rgba(17,24,39,0.9))'
                }}
              >
                <h4 style={{ color: 'var(--color-primary-light)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>🎉</span> Energy Transfer Handover Receipt
                </h4>
                <div style={{ fontSize: '0.9rem', lineHeight: '1.8' }}>
                  <div>Reservation: <strong>#{transferReceipt.reservationId}</strong></div>
                  <div>Prosumer: <strong>{transferReceipt.prosumerNic}</strong></div>
                  <div>Energy Injected: <strong style={{ color: 'var(--color-primary)' }}>{transferReceipt.energyKWh} kWh</strong></div>
                  <div>Timestamp: <strong>{transferReceipt.timestamp}</strong></div>
                  <div>Status: <StatusBadge status="Completed" /></div>
                </div>
              </div>
            )}

            {/* Today's Expected Arrivals */}
            <div className="card" style={{ padding: '1.5rem', flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h4 style={{ margin: 0 }}>🚚 Approved Arrivals (Ready to Verify)</h4>
                <span className="badge" style={{ background: 'var(--color-surface)', padding: '2px 8px', borderRadius: '10px', fontSize: '0.8rem' }}>
                  {approvedCount} waiting
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {reservations
                  .filter(r => r.status === 'Approved')
                  .slice(0, 5)
                  .map(r => (
                    <div
                      key={r.id}
                      style={{
                        padding: '0.75rem 1rem',
                        background: 'var(--color-surface)',
                        borderRadius: 'var(--radius-sm)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                          NIC: {r.prosumerNic} ({r.energyKWh} kWh)
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                          Slot: {r.slotId} | {new Date(r.reservationDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          if (r.qrCodeData) {
                            setQrInput(r.qrCodeData);
                            processQrString(r.qrCodeData);
                          } else {
                            setQrInput(`SMTS-${r.id}-${r.prosumerNic}`);
                            processQrString(`SMTS-${r.id}-${r.prosumerNic}`);
                          }
                        }}
                      >
                        Auto-Fill
                      </button>
                    </div>
                  ))}
                {approvedCount === 0 && (
                  <p className="text-muted" style={{ fontSize: '0.85rem', textAlign: 'center', margin: '1rem 0' }}>
                    No prosumers currently awaiting transfer verification.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: STATION BOOKINGS QUEUE */}
      {activeTab === 'queue' && (
        <div className="card">
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Booking ID</th>
                  <th>Prosumer NIC</th>
                  <th>Node</th>
                  <th>Slot ID</th>
                  <th>Scheduled Date</th>
                  <th>Energy (kWh)</th>
                  <th>Status</th>
                  <th>Operator Action</th>
                </tr>
              </thead>
              <tbody>
                {reservations.map(r => (
                  <tr key={r.id}>
                    <td className="truncate" style={{ maxWidth: '100px' }}>{r.id}</td>
                    <td><strong>{r.prosumerNic}</strong></td>
                    <td>{r.nodeId}</td>
                    <td>{r.slotId}</td>
                    <td>{new Date(r.reservationDate).toLocaleString()}</td>
                    <td><strong style={{ color: 'var(--color-primary-light)' }}>{r.energyKWh} kWh</strong></td>
                    <td><StatusBadge status={r.status} /></td>
                    <td>
                      {r.status === 'Pending' && (
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => handleApprove(r.id)}
                        >
                          ✅ Approve Booking
                        </button>
                      )}
                      {r.status === 'Approved' && (
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => {
                            setActiveTab('qr');
                            setQrInput(r.qrCodeData || `SMTS-${r.id}-${r.prosumerNic}`);
                            processQrString(r.qrCodeData || `SMTS-${r.id}-${r.prosumerNic}`);
                          }}
                        >
                          ⚡ Complete Transfer
                        </button>
                      )}
                      {r.status === 'Completed' && (
                        <span style={{ fontSize: '0.8rem', color: 'var(--color-primary)' }}>
                          ✓ Transferred
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: GRID NODE SLOTS */}
      {activeTab === 'nodes' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {nodes.map(n => (
            <div key={n.id} className="card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem' }}>{n.nodeName}</h3>
                <StatusBadge status={n.isActive ? 'Active' : 'Inactive'} />
              </div>
              <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>
                📍 {n.location}
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.9rem' }}>
                <div style={{ background: 'var(--color-surface)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
                  <div className="text-muted" style={{ fontSize: '0.75rem' }}>TOTAL CAPACITY</div>
                  <strong>{n.capacityKWh} kWh</strong>
                </div>
                <div style={{ background: 'var(--color-surface)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
                  <div className="text-muted" style={{ fontSize: '0.75rem' }}>BATTERY SLOTS</div>
                  <strong style={{ color: 'var(--color-primary-light)' }}>
                    {n.availableBatterySlots} / {n.batterySlots} Avail
                  </strong>
                </div>
              </div>
              <div style={{ marginTop: '1rem', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                🕒 Operating Hours: <strong>{n.schedule || '06:00 - 18:00'}</strong>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 4: TRANSFER HISTORY */}
      {activeTab === 'history' && (
        <div className="card">
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Booking ID</th>
                  <th>Prosumer NIC</th>
                  <th>Slot ID</th>
                  <th>Transferred Date</th>
                  <th>Energy Received</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {reservations
                  .filter(r => r.status === 'Completed')
                  .map(r => (
                    <tr key={r.id}>
                      <td className="truncate" style={{ maxWidth: '120px' }}>{r.id}</td>
                      <td><strong>{r.prosumerNic}</strong></td>
                      <td>{r.slotId}</td>
                      <td>{new Date(r.reservationDate).toLocaleString()}</td>
                      <td><strong style={{ color: 'var(--color-primary)' }}>{r.energyKWh} kWh</strong></td>
                      <td><StatusBadge status="Completed" /></td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
