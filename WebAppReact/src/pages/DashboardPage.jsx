// ============================================================
// File: DashboardPage.jsx
// Project: Smart Solar Microgrid Trading System - React Web App
// Description: Dashboard showing key metrics: pending activations,
//              reservation counts, and station status. Displays
//              pending prosumer activations for Backoffice users.
// ============================================================

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getReservations, getNodes, getProsumers, getReservationsByStatus } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import { toast } from 'react-toastify';
import { activateProsumer } from '../services/api';

// Renders the main dashboard with stats and pending activations table.
export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ totalNodes: 0, activeNodes: 0, totalReservations: 0, pending: 0, approved: 0, completed: 0 });
  const [pendingProsumers, setPendingProsumers] = useState([]);
  const [pendingReservations, setPendingReservations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Loads dashboard data from the API.
  useEffect(() => {
    loadDashboard();
  }, []);

  // Fetches all dashboard metrics and lists.
  async function loadDashboard() {
    try {
      setLoading(true);
      const [reservations, nodes] = await Promise.all([
        getReservations(),
        getNodes()
      ]);

      const pending = reservations.filter(r => r.status === 'Pending').length;
      const approved = reservations.filter(r => r.status === 'Approved').length;
      const completed = reservations.filter(r => r.status === 'Completed').length;

      setStats({
        totalNodes: nodes.length,
        activeNodes: nodes.filter(n => n.isActive).length,
        totalReservations: reservations.length,
        pending,
        approved,
        completed
      });

      setPendingReservations(reservations.filter(r => r.status === 'Pending').slice(0, 10));

      // Load pending prosumers for Backoffice
      if (user?.role === 'Backoffice') {
        const prosumers = await getProsumers();
        setPendingProsumers(prosumers.filter(p => p.status === 'Pending'));
      }
    } catch (error) {
      toast.error('Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  }

  // Activates a pending prosumer account and refreshes the list.
  async function handleActivate(nic) {
    try {
      await activateProsumer(nic);
      toast.success('Prosumer activated successfully!');
      loadDashboard();
    } catch (error) {
      toast.error(error.message || 'Failed to activate prosumer.');
    }
  }

  if (loading) {
    return <div className="page-content"><div className="loading-spinner"><div className="spinner"></div></div></div>;
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <h1 className="page-title"><span className="icon">📊</span> Dashboard</h1>
        <span className="text-muted">Welcome, {user?.displayName}</span>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon green">🔋</div>
          <div className="stat-info">
            <div className="stat-value">{stats.activeNodes}</div>
            <div className="stat-label">Active Nodes</div>
          </div>
        </div>
        <div className="stat-card accent">
          <div className="stat-icon blue">📅</div>
          <div className="stat-info">
            <div className="stat-value">{stats.totalReservations}</div>
            <div className="stat-label">Total Reservations</div>
          </div>
        </div>
        <div className="stat-card warning">
          <div className="stat-icon amber">⏳</div>
          <div className="stat-info">
            <div className="stat-value">{stats.pending}</div>
            <div className="stat-label">Pending Bookings</div>
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
            <div className="stat-label">Completed Transfers</div>
          </div>
        </div>
      </div>

      {/* Pending Prosumer Activations (Backoffice only) */}
      {user?.role === 'Backoffice' && pendingProsumers.length > 0 && (
        <div className="dashboard-section">
          <h2 className="section-title"><span className="text-warning">⏳</span> Pending Prosumer Activations</h2>
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
                    <th>Actions</th>
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
                        <button className="btn btn-primary btn-sm" onClick={() => handleActivate(p.nic)}>
                          ✅ Activate
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

      {/* Pending Reservations */}
      {pendingReservations.length > 0 && (
        <div className="dashboard-section">
          <h2 className="section-title"><span className="text-warning">📋</span> Pending Reservations</h2>
          <div className="card">
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Prosumer NIC</th>
                    <th>Date</th>
                    <th>Energy (kWh)</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingReservations.map(r => (
                    <tr key={r.id}>
                      <td className="truncate">{r.id}</td>
                      <td>{r.prosumerNic}</td>
                      <td>{new Date(r.reservationDate).toLocaleDateString()}</td>
                      <td>{r.energyKWh} kWh</td>
                      <td><StatusBadge status={r.status} /></td>
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
