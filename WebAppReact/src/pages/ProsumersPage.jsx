// ============================================================
// File: ProsumersPage.jsx
// Project: Smart Solar Microgrid Trading System - React Web App
// Description: Prosumer management page for Backoffice admins.
//              Supports activation, deactivation, reactivation,
//              and viewing prosumer profiles.
// ============================================================

import { useState, useEffect } from 'react';
import { getProsumers, activateProsumer, deactivateProsumer, reactivateProsumer } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import { toast } from 'react-toastify';

// Renders the prosumer management page with status filters and actions.
export default function ProsumersPage() {
  const [prosumers, setProsumers] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  // Loads all prosumers from the API on mount.
  useEffect(() => { loadProsumers(); }, []);

  // Applies filter when filter or data changes.
  useEffect(() => {
    if (!filter) {
      setFiltered(prosumers);
    } else {
      setFiltered(prosumers.filter(p => p.status === filter));
    }
  }, [filter, prosumers]);

  // Fetches prosumer list from the backend.
  async function loadProsumers() {
    try {
      setLoading(true);
      const data = await getProsumers();
      setProsumers(data);
    } catch (error) {
      toast.error('Failed to load prosumers.');
    } finally {
      setLoading(false);
    }
  }

  // Activates a pending prosumer account.
  async function handleActivate(nic) {
    try {
      await activateProsumer(nic);
      toast.success('Prosumer activated!');
      loadProsumers();
    } catch (error) {
      toast.error(error.message);
    }
  }

  // Deactivates an active prosumer account.
  async function handleDeactivate(nic) {
    if (!window.confirm('Deactivate this prosumer? Only a Backoffice officer can reactivate them.')) return;
    try {
      await deactivateProsumer(nic);
      toast.success('Prosumer deactivated.');
      loadProsumers();
    } catch (error) {
      toast.error(error.message);
    }
  }

  // Reactivates a deactivated prosumer account (Backoffice only).
  async function handleReactivate(nic) {
    try {
      await reactivateProsumer(nic);
      toast.success('Prosumer reactivated!');
      loadProsumers();
    } catch (error) {
      toast.error(error.message);
    }
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <h1 className="page-title"><span className="icon">☀️</span> Prosumer Management</h1>
      </div>

      <div className="filter-bar">
        <label className="form-label" style={{ marginBottom: 0 }}>Filter by Status</label>
        <select className="form-select" value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="">All Prosumers</option>
          <option value="Pending">Pending</option>
          <option value="Active">Active</option>
          <option value="Deactivated">Deactivated</option>
        </select>
        <span className="text-muted" style={{ marginLeft: 'auto' }}>{filtered.length} prosumer(s)</span>
      </div>

      <div className="card">
        {loading ? (
          <div className="loading-spinner"><div className="spinner"></div></div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>NIC</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Address</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan="7" className="text-center text-muted" style={{ padding: '2rem' }}>No prosumers found</td></tr>
                ) : filtered.map(p => (
                  <tr key={p.nic || p.id}>
                    <td><strong>{p.nic}</strong></td>
                    <td>{p.firstName} {p.lastName}</td>
                    <td>{p.email}</td>
                    <td>{p.phone}</td>
                    <td style={{ maxWidth: 150 }}>{p.address}</td>
                    <td><StatusBadge status={p.status} /></td>
                    <td className="actions">
                      {p.status === 'Pending' && (
                        <button className="btn btn-primary btn-sm" onClick={() => handleActivate(p.nic)}>✅ Activate</button>
                      )}
                      {p.status === 'Active' && (
                        <button className="btn btn-danger btn-sm" onClick={() => handleDeactivate(p.nic)}>🚫 Deactivate</button>
                      )}
                      {p.status === 'Deactivated' && (
                        <button className="btn btn-accent btn-sm" onClick={() => handleReactivate(p.nic)}>🔄 Reactivate</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
