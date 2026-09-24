// ============================================================
// File: QrVerifyPage.jsx
// Project: Smart Solar Microgrid Trading System - React Web App
// Description: Grid Operator QR verification page. Supports
//              both camera-based QR scanning (html5-qrcode) and
//              manual QR code entry. Verifies the scanned data
//              against the server and finalizes energy transfer.
// ============================================================

import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { getReservationById, completeReservation, getReservations, getNodes } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import { toast } from 'react-toastify';

// Renders the QR verification page for Grid Operators.
export default function QrVerifyPage() {
  const [mode, setMode] = useState('scan'); // 'scan' | 'manual'
  const [scanning, setScanning] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [verifyResult, setVerifyResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [approvedBookings, setApprovedBookings] = useState([]);
  const [nodes, setNodes] = useState([]);
  const scannerRef = useRef(null);
  const html5QrCodeRef = useRef(null);

  // Load approved bookings and nodes on mount.
  useEffect(() => {
    loadApprovedBookings();
    return () => {
      // Cleanup scanner on unmount
      stopScanner();
    };
  }, []);

  // Loads all approved bookings for the operator to see.
  async function loadApprovedBookings() {
    try {
      const [resData, nodeData] = await Promise.all([getReservations(), getNodes()]);
      setNodes(nodeData);
      setApprovedBookings(resData.filter(r => r.status === 'Approved'));
    } catch (error) {
      console.error('Failed to load bookings:', error);
    }
  }

  // Returns the node name for a given nodeId.
  function getNodeName(nodeId) {
    const node = nodes.find(n => n.id === nodeId);
    return node ? node.nodeName : nodeId;
  }

  // Starts the camera-based QR scanner.
  async function startScanner() {
    try {
      const html5QrCode = new Html5Qrcode('qr-reader');
      html5QrCodeRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        },
        (decodedText) => {
          // QR code successfully scanned
          handleQrScanned(decodedText);
          stopScanner();
        },
        (errorMessage) => {
          // Scan error (ignored — continuous scanning)
        }
      );

      setScanning(true);
    } catch (error) {
      toast.error('Failed to start camera. Please check permissions or use manual entry.');
      console.error('Scanner error:', error);
    }
  }

  // Stops the camera-based QR scanner.
  async function stopScanner() {
    try {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      }
    } catch (e) {
      // Ignore stop errors
    }
    setScanning(false);
  }

  // Handles a QR code being scanned or manually entered.
  async function handleQrScanned(qrData) {
    if (!qrData || !qrData.trim()) {
      toast.warning('No QR code data provided.');
      return;
    }

    setLoading(true);
    setVerifyResult(null);

    try {
      // Parse the QR code to extract the reservation ID
      // QR format: "SMTS-{reservationId}-{prosumerNic}-{guid}"
      const parts = qrData.split('-');
      if (parts.length < 3 || parts[0] !== 'SMTS') {
        setVerifyResult({
          valid: false,
          message: 'Invalid QR code format. Expected SMTS transaction code.',
          qrData
        });
        setLoading(false);
        return;
      }

      // The reservation ID is the second part (MongoDB ObjectId)
      const reservationId = parts[1];

      // Fetch the reservation from the server to verify
      const reservation = await getReservationById(reservationId);

      if (!reservation) {
        setVerifyResult({
          valid: false,
          message: 'Reservation not found. This QR code may be invalid.',
          qrData
        });
        setLoading(false);
        return;
      }

      // Verify the QR code matches
      if (reservation.qrCodeData !== qrData) {
        setVerifyResult({
          valid: false,
          message: 'QR code verification failed. The code does not match the reservation.',
          qrData,
          reservation
        });
        setLoading(false);
        return;
      }

      // Check reservation status
      if (reservation.status !== 'Approved') {
        setVerifyResult({
          valid: false,
          message: `Reservation is not in "Approved" status. Current status: ${reservation.status}`,
          qrData,
          reservation
        });
        setLoading(false);
        return;
      }

      // Everything is valid!
      setVerifyResult({
        valid: true,
        message: 'QR code verified successfully! Booking is valid.',
        qrData,
        reservation
      });
    } catch (error) {
      setVerifyResult({
        valid: false,
        message: error.message || 'Failed to verify QR code.',
        qrData
      });
    } finally {
      setLoading(false);
    }
  }

  // Handles manual QR code entry submission.
  function handleManualSubmit(e) {
    e.preventDefault();
    handleQrScanned(manualCode.trim());
  }

  // Finalizes the energy transfer (marks reservation as Completed).
  async function handleComplete() {
    if (!verifyResult?.reservation?.id || !verifyResult?.qrData) return;
    setLoading(true);
    try {
      await completeReservation(verifyResult.reservation.id, verifyResult.qrData);
      setVerifyResult({
        valid: true,
        completed: true,
        message: 'Energy transfer completed successfully! The transaction has been finalized.',
        qrData: verifyResult.qrData,
        reservation: { ...verifyResult.reservation, status: 'Completed' }
      });
      toast.success('Energy transfer completed!');
      loadApprovedBookings();
    } catch (error) {
      toast.error(error.message || 'Failed to complete transfer.');
    } finally {
      setLoading(false);
    }
  }

  // Resets the verification state for a new scan.
  function resetVerification() {
    setVerifyResult(null);
    setManualCode('');
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <h1 className="page-title"><span className="icon">📱</span> QR Verification</h1>
        <span className="text-muted">Grid Operator — Verify bookings and complete energy transfers</span>
      </div>

      {/* Verification Result Summary */}
      {verifyResult && (
        <div className="summary-panel" style={{ maxWidth: 700 }}>
          <div className={`summary-icon ${verifyResult.valid ? 'success' : 'error'}`}>
            {verifyResult.completed ? '⚡' : verifyResult.valid ? '✅' : '❌'}
          </div>
          <h3>{verifyResult.completed ? 'Transfer Completed!' : verifyResult.valid ? 'Booking Verified' : 'Verification Failed'}</h3>
          <p className="summary-message">{verifyResult.message}</p>

          {verifyResult.reservation && (
            <div className="summary-details">
              <div className="detail-row">
                <span className="detail-label">Reservation ID</span>
                <span className="detail-value">{verifyResult.reservation.id}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Prosumer NIC</span>
                <span className="detail-value">{verifyResult.reservation.prosumerNic}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Station</span>
                <span className="detail-value">{getNodeName(verifyResult.reservation.nodeId)}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Date</span>
                <span className="detail-value">{new Date(verifyResult.reservation.reservationDate).toLocaleDateString()}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Energy</span>
                <span className="detail-value">{verifyResult.reservation.energyKWh} kWh</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Status</span>
                <span className="detail-value"><StatusBadge status={verifyResult.reservation.status} /></span>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            {verifyResult.valid && !verifyResult.completed && (
              <button className="btn btn-primary btn-lg" onClick={handleComplete} disabled={loading}>
                {loading ? 'Processing...' : '⚡ Complete Energy Transfer'}
              </button>
            )}
            <button className="btn btn-secondary" onClick={resetVerification}>
              {verifyResult.completed ? '📱 Scan Another' : '🔄 Try Again'}
            </button>
          </div>
        </div>
      )}

      {/* Scanner/Manual Entry Section */}
      {!verifyResult && (
        <>
          {/* Mode Toggle */}
          <div className="tabs" style={{ maxWidth: 400 }}>
            <button className={`tab-btn ${mode === 'scan' ? 'active' : ''}`} onClick={() => { setMode('scan'); stopScanner(); }}>
              📷 Camera Scan
            </button>
            <button className={`tab-btn ${mode === 'manual' ? 'active' : ''}`} onClick={() => { setMode('manual'); stopScanner(); }}>
              ⌨️ Manual Entry
            </button>
          </div>

          <div className="card" style={{ maxWidth: 600, margin: '0 auto' }}>
            {mode === 'scan' ? (
              <div className="qr-section">
                <div id="qr-reader" ref={scannerRef} className="qr-scanner-container" style={{ marginBottom: '1.5rem' }}></div>

                {!scanning ? (
                  <button className="btn btn-primary btn-lg" onClick={startScanner}>
                    📷 Start Camera Scanner
                  </button>
                ) : (
                  <button className="btn btn-danger" onClick={stopScanner}>
                    ⏹️ Stop Scanner
                  </button>
                )}

                <p className="text-muted mt-2" style={{ fontSize: '0.85rem' }}>
                  Point your camera at the prosumer's QR code to scan and verify the booking.
                </p>
              </div>
            ) : (
              <div className="qr-section">
                <h3 style={{ marginBottom: '1rem' }}>Enter QR Code Data</h3>
                <form onSubmit={handleManualSubmit}>
                  <div className="qr-manual-entry">
                    <input
                      className="form-input"
                      placeholder="e.g. SMTS-6650abc123-199012345678-a1b2c3d4..."
                      value={manualCode}
                      onChange={e => setManualCode(e.target.value)}
                      required
                    />
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                      {loading ? '...' : '🔍 Verify'}
                    </button>
                  </div>
                </form>
                <p className="text-muted mt-1" style={{ fontSize: '0.85rem' }}>
                  Enter the QR code data string manually (format: SMTS-ReservationId-NIC-GUID)
                </p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Approved Bookings Awaiting Verification */}
      {!verifyResult && approvedBookings.length > 0 && (
        <div className="mt-3">
          <h2 className="section-title">📋 Approved Bookings Awaiting Verification</h2>
          <div className="card">
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Prosumer NIC</th>
                    <th>Station</th>
                    <th>Date</th>
                    <th>Energy</th>
                    <th>Status</th>
                    <th>QR Data</th>
                  </tr>
                </thead>
                <tbody>
                  {approvedBookings.map(r => (
                    <tr key={r.id}>
                      <td><span className="truncate" title={r.id}>{r.id.substring(0, 8)}...</span></td>
                      <td><strong>{r.prosumerNic}</strong></td>
                      <td>{getNodeName(r.nodeId)}</td>
                      <td>{new Date(r.reservationDate).toLocaleDateString()}</td>
                      <td>{r.energyKWh} kWh</td>
                      <td><StatusBadge status={r.status} /></td>
                      <td>
                        <button className="btn btn-accent btn-sm" onClick={() => {
                          setManualCode(r.qrCodeData || '');
                          setMode('manual');
                          handleQrScanned(r.qrCodeData);
                        }}>
                          🔍 Verify
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
    </div>
  );
}
