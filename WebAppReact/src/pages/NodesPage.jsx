// ============================================================
// File: NodesPage.jsx
// Project: Smart Solar Microgrid Trading System - React Web App
// Description: Microgrid node management page. Backoffice users
//              create/update/deactivate nodes. Grid Operators can
//              view nodes and manage energy slots.
// ============================================================

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getNodes, createNode, updateNode, deactivateNode, getSlotsByNode, createSlot, updateSlot, deleteSlot } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import { toast } from 'react-toastify';

// Renders the microgrid node management page with slot management.
export default function NodesPage() {
  const { user } = useAuth();
  const isBackoffice = user?.role === 'Backoffice';
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNodeModal, setShowNodeModal] = useState(false);
  const [editingNode, setEditingNode] = useState(null);
  const [showSlotModal, setShowSlotModal] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const [slots, setSlots] = useState([]);
  const [nodeForm, setNodeForm] = useState({
    nodeName: '', location: '', latitude: '', longitude: '',
    capacityKWh: '', batterySlots: '', availableBatterySlots: '', schedule: '06:00-18:00'
  });
  const [slotForm, setSlotForm] = useState({
    slotDate: '', startTime: '', endTime: '', availableKWh: '', status: 'Available'
  });

  // Loads all nodes on mount.
  useEffect(() => { loadNodes(); }, []);

  // Fetches node list from the backend.
  async function loadNodes() {
    try {
      setLoading(true);
      const data = await getNodes();
      setNodes(data);
    } catch (error) {
      toast.error('Failed to load nodes.');
    } finally {
      setLoading(false);
    }
  }

  // Opens the create/edit node modal.
  function openNodeModal(node = null) {
    if (node) {
      setEditingNode(node);
      setNodeForm({
        nodeName: node.nodeName, location: node.location,
        latitude: node.latitude, longitude: node.longitude,
        capacityKWh: node.capacityKWh, batterySlots: node.batterySlots,
        availableBatterySlots: node.availableBatterySlots, schedule: node.schedule
      });
    } else {
      setEditingNode(null);
      setNodeForm({ nodeName: '', location: '', latitude: '', longitude: '', capacityKWh: '', batterySlots: '', availableBatterySlots: '', schedule: '06:00-18:00' });
    }
    setShowNodeModal(true);
  }

  // Handles node form submission.
  async function handleNodeSubmit(e) {
    e.preventDefault();
    const payload = {
      ...nodeForm,
      latitude: parseFloat(nodeForm.latitude),
      longitude: parseFloat(nodeForm.longitude),
      capacityKWh: parseFloat(nodeForm.capacityKWh),
      batterySlots: parseInt(nodeForm.batterySlots),
      availableBatterySlots: parseInt(nodeForm.availableBatterySlots)
    };
    try {
      if (editingNode) {
        await updateNode(editingNode.id, payload);
        toast.success('Node updated!');
      } else {
        await createNode(payload);
        toast.success('Node created!');
      }
      setShowNodeModal(false);
      loadNodes();
    } catch (error) {
      toast.error(error.message);
    }
  }

  // Deactivates a node (business rule: blocked if active reservations exist).
  async function handleDeactivate(id) {
    if (!window.confirm('Deactivate this node? This is blocked if active reservations exist.')) return;
    try {
      await deactivateNode(id);
      toast.success('Node deactivated.');
      loadNodes();
    } catch (error) {
      toast.error(error.message);
    }
  }

  // Opens the slot management view for a node.
  async function viewSlots(node) {
    setSelectedNode(node);
    try {
      const data = await getSlotsByNode(node.id);
      setSlots(data);
    } catch (error) {
      toast.error('Failed to load slots.');
    }
  }

  // Creates a new energy slot for the selected node.
  async function handleCreateSlot(e) {
    e.preventDefault();
    try {
      await createSlot({
        nodeId: selectedNode.id,
        slotDate: slotForm.slotDate,
        startTime: slotForm.startTime,
        endTime: slotForm.endTime,
        availableKWh: parseFloat(slotForm.availableKWh),
        status: 'Available'
      });
      toast.success('Slot created!');
      setShowSlotModal(false);
      viewSlots(selectedNode);
    } catch (error) {
      toast.error(error.message);
    }
  }

  // Deletes a slot.
  async function handleDeleteSlot(id) {
    if (!window.confirm('Delete this slot?')) return;
    try {
      await deleteSlot(id);
      toast.success('Slot deleted.');
      viewSlots(selectedNode);
    } catch (error) {
      toast.error(error.message);
    }
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <h1 className="page-title"><span className="icon">🔋</span> Microgrid Nodes</h1>
        {isBackoffice && <button className="btn btn-primary" onClick={() => openNodeModal()}>+ Create Node</button>}
      </div>

      {/* If viewing slots for a node */}
      {selectedNode ? (
        <div>
          <button className="btn btn-secondary mb-2" onClick={() => setSelectedNode(null)}>← Back to Nodes</button>
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">🔌 Slots — {selectedNode.nodeName}</h3>
              <button className="btn btn-primary btn-sm" onClick={() => { setSlotForm({ slotDate: '', startTime: '', endTime: '', availableKWh: '', status: 'Available' }); setShowSlotModal(true); }}>
                + Add Slot
              </button>
            </div>
            <div className="table-container">
              <table>
                <thead>
                  <tr><th>Date</th><th>Time</th><th>Available kWh</th><th>Status</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {slots.length === 0 ? (
                    <tr><td colSpan="5" className="text-center text-muted" style={{ padding: '2rem' }}>No slots found</td></tr>
                  ) : slots.map(s => (
                    <tr key={s.id}>
                      <td>{new Date(s.slotDate).toLocaleDateString()}</td>
                      <td>{s.startTime} - {s.endTime}</td>
                      <td>{s.availableKWh} kWh</td>
                      <td><StatusBadge status={s.status} /></td>
                      <td className="actions">
                        {isBackoffice && <button className="btn btn-danger btn-sm" onClick={() => handleDeleteSlot(s.id)}>🗑️</button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Slot Create Modal */}
          {showSlotModal && (
            <div className="modal-overlay" onClick={() => setShowSlotModal(false)}>
              <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                  <h3 className="modal-title">Add Energy Slot</h3>
                  <button className="btn btn-ghost" onClick={() => setShowSlotModal(false)}>✕</button>
                </div>
                <form onSubmit={handleCreateSlot}>
                  <div className="modal-body">
                    <div className="form-group">
                      <label className="form-label">Slot Date</label>
                      <input type="date" className="form-input" value={slotForm.slotDate} onChange={e => setSlotForm({ ...slotForm, slotDate: e.target.value })} required />
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Start Time</label>
                        <input type="time" className="form-input" value={slotForm.startTime} onChange={e => setSlotForm({ ...slotForm, startTime: e.target.value })} required />
                      </div>
                      <div className="form-group">
                        <label className="form-label">End Time</label>
                        <input type="time" className="form-input" value={slotForm.endTime} onChange={e => setSlotForm({ ...slotForm, endTime: e.target.value })} required />
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Available kWh</label>
                      <input type="number" step="0.1" className="form-input" value={slotForm.availableKWh} onChange={e => setSlotForm({ ...slotForm, availableKWh: e.target.value })} required />
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={() => setShowSlotModal(false)}>Cancel</button>
                    <button type="submit" className="btn btn-primary">Create Slot</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Nodes Table */
        <div className="card">
          {loading ? (
            <div className="loading-spinner"><div className="spinner"></div></div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Location</th>
                    <th>Capacity</th>
                    <th>Slots</th>
                    <th>Schedule</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {nodes.length === 0 ? (
                    <tr><td colSpan="7" className="text-center text-muted" style={{ padding: '2rem' }}>No nodes found</td></tr>
                  ) : nodes.map(n => (
                    <tr key={n.id}>
                      <td><strong>{n.nodeName}</strong></td>
                      <td>{n.location}</td>
                      <td>{n.capacityKWh} kWh</td>
                      <td>{n.availableBatterySlots}/{n.batterySlots}</td>
                      <td>{n.schedule}</td>
                      <td><StatusBadge status={n.isActive ? 'Active' : 'Deactivated'} /></td>
                      <td className="actions">
                        <button className="btn btn-secondary btn-sm" onClick={() => viewSlots(n)}>📋 Slots</button>
                        {isBackoffice && (
                          <>
                            <button className="btn btn-secondary btn-sm" onClick={() => openNodeModal(n)}>✏️</button>
                            {n.isActive && <button className="btn btn-danger btn-sm" onClick={() => handleDeactivate(n.id)}>🚫</button>}
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
      )}

      {/* Node Create/Edit Modal */}
      {showNodeModal && (
        <div className="modal-overlay" onClick={() => setShowNodeModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editingNode ? 'Edit Node' : 'Create Microgrid Node'}</h3>
              <button className="btn btn-ghost" onClick={() => setShowNodeModal(false)}>✕</button>
            </div>
            <form onSubmit={handleNodeSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Node Name</label>
                  <input className="form-input" value={nodeForm.nodeName} onChange={e => setNodeForm({ ...nodeForm, nodeName: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Location</label>
                  <input className="form-input" value={nodeForm.location} onChange={e => setNodeForm({ ...nodeForm, location: e.target.value })} required />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Latitude</label>
                    <input type="number" step="any" className="form-input" value={nodeForm.latitude} onChange={e => setNodeForm({ ...nodeForm, latitude: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Longitude</label>
                    <input type="number" step="any" className="form-input" value={nodeForm.longitude} onChange={e => setNodeForm({ ...nodeForm, longitude: e.target.value })} required />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Capacity (kWh)</label>
                    <input type="number" step="0.1" className="form-input" value={nodeForm.capacityKWh} onChange={e => setNodeForm({ ...nodeForm, capacityKWh: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Total Battery Slots</label>
                    <input type="number" className="form-input" value={nodeForm.batterySlots} onChange={e => setNodeForm({ ...nodeForm, batterySlots: e.target.value })} required />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Available Battery Slots</label>
                    <input type="number" className="form-input" value={nodeForm.availableBatterySlots} onChange={e => setNodeForm({ ...nodeForm, availableBatterySlots: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Schedule</label>
                    <input className="form-input" placeholder="06:00-18:00" value={nodeForm.schedule} onChange={e => setNodeForm({ ...nodeForm, schedule: e.target.value })} required />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowNodeModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editingNode ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
