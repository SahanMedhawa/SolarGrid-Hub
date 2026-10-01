// ============================================================
// File: NodesPage.jsx
// Project: Smart Solar Microgrid Trading System - React Web App
// Description: Microgrid node management page. Backoffice users
//              create/update/deactivate nodes. Grid Operators can
//              view nodes and manage energy slots.
// ============================================================

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getNodes, getNodeById, createNode, updateNode, deactivateNode, getSlotsByNode, createSlot, updateSlot, deleteSlot, toggleSlotMaintenance } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import { toast } from 'react-toastify';
import LocationPicker from '../components/LocationPicker';
import SchedulePicker from '../components/SchedulePicker';

function getLocalDateValue() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function getDefaultMaintenanceForm() {
  const date = new Date();
  let startHour = date.getHours() + 1;
  if (startHour >= 23) {
    date.setDate(date.getDate() + 1);
    startHour = 0;
  }
  const endHour = startHour + 1;
  const formatHour = hour => String(hour).padStart(2, '0');
  const dateValue = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  return { date: dateValue, schedule: `${formatHour(startHour)}:00-${formatHour(endHour)}:00` };
}

// Renders the microgrid node management page with slot management.
export default function NodesPage() {
  const { user } = useAuth();
  const isBackoffice = user?.role === 'Backoffice';
  const isOperator = user?.role === 'GridOperator';
  const canManageSlots = isBackoffice || isOperator;
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNodeModal, setShowNodeModal] = useState(false);
  const [editingNode, setEditingNode] = useState(null);
  const [slotCapacityRows, setSlotCapacityRows] = useState([]);
  const [originalEditSlots, setOriginalEditSlots] = useState([]);
  const [showSlotModal, setShowSlotModal] = useState(false);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [maintenanceTarget, setMaintenanceTarget] = useState(null);
  const [maintenanceForm, setMaintenanceForm] = useState(getDefaultMaintenanceForm);
  const [selectedNode, setSelectedNode] = useState(null);
  const [slots, setSlots] = useState([]);
  const [nodeForm, setNodeForm] = useState({
    nodeName: '', location: '', latitude: '', longitude: '', capacityKWh: '',
    batterySlotCapacities: ['50', '50'], schedule: '06:00-18:00'
  });
  const [slotForm, setSlotForm] = useState({
    availableKWh: '', status: 'Available'
  });
  const totalSlotCapacity = slots.reduce((total, slot) => total + Number(slot.availableKWh || 0), 0);
  const activeSlots = slots.filter(s => s.status !== 'Maintenance');
  const maintenanceSlots = slots.filter(s => s.status === 'Maintenance');
  const activeSlotCapacity = activeSlots.reduce((total, slot) => total + Number(slot.availableKWh || 0), 0);
  const maintenanceSlotCapacity = maintenanceSlots.reduce((total, slot) => total + Number(slot.availableKWh || 0), 0);

  // Loads all nodes on mount.
  useEffect(() => { loadNodes(); }, []);

  // Keep an open node's slot and maintenance data current across operator sessions.
  useEffect(() => {
    if (!selectedNode?.id) return undefined;

    let disposed = false;
    const refreshSlots = async () => {
      try {
        const data = await getSlotsByNode(selectedNode.id);
        if (!disposed) setSlots(data);
      } catch {
        // Keep the last successful view; the next interval or focus will retry.
      }
    };
    const handleFocus = () => refreshSlots();
    const intervalId = window.setInterval(refreshSlots, 10000);
    window.addEventListener('focus', handleFocus);

    return () => {
      disposed = true;
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
    };
  }, [selectedNode?.id]);

  // Fetches node list from the backend.
  async function loadNodes() {
    try {
      setLoading(true);
      const data = await getNodes();
      setNodes(data);
      if (selectedNode) {
        const updated = data.find(n => n.id === selectedNode.id);
        if (updated) setSelectedNode(updated);
      }
    } catch (error) {
      toast.error('Failed to load nodes.');
    } finally {
      setLoading(false);
    }
  }

  // Opens the create/edit node modal.
  async function openNodeModal(node = null) {
    if (node) {
      setEditingNode(node);
      setNodeForm({
        nodeName: node.nodeName, location: node.location,
        latitude: node.latitude, longitude: node.longitude,
        capacityKWh: node.capacityKWh, batterySlotCapacities: [], schedule: node.schedule
      });
      setOriginalEditSlots([]);
      setSlotCapacityRows([]);
      setShowNodeModal(true);
      try {
        const existingSlots = await getSlotsByNode(node.id);
        const rows = existingSlots.map(slot => ({
          id: slot.id,
          availableKWh: String(slot.availableKWh),
          initialAvailableKWh: Number(slot.availableKWh),
          status: slot.status
        }));
        setOriginalEditSlots(rows);
        setSlotCapacityRows(rows);
      } catch (error) {
        toast.error(error.message || 'Failed to load battery slots for editing.');
      }
    } else {
      setEditingNode(null);
      setOriginalEditSlots([]);
      setNodeForm({ nodeName: '', location: '', latitude: '', longitude: '', capacityKWh: '100', batterySlotCapacities: ['50', '50'], schedule: '06:00-18:00' });
      setSlotCapacityRows([{ availableKWh: '50' }, { availableKWh: '50' }]);
      setShowNodeModal(true);
    }
  }

  // Handles node form submission.
  async function handleNodeSubmit(e) {
    e.preventDefault();

    if (nodeForm.latitude === '' || nodeForm.longitude === '') {
      toast.error('Please pick a location on the map.');
      return;
    }

    const payload = {
      ...nodeForm,
      latitude: parseFloat(nodeForm.latitude),
      longitude: parseFloat(nodeForm.longitude)
    };

    const batterySlotCapacities = slotCapacityRows.map(row => Number(row.availableKWh));
    if (batterySlotCapacities.length === 0 || batterySlotCapacities.some(value => !Number.isFinite(value) || value <= 0)) {
      toast.error('Keep at least one battery slot and enter a positive capacity for every slot.');
      return;
    }

    if (!editingNode) {
      const sumCap = batterySlotCapacities.reduce((sum, value) => sum + value, 0);
      payload.capacityKWh = sumCap;
      payload.batterySlotCapacities = batterySlotCapacities;
    }

    try {
      if (editingNode) {
        const retainedSlotIds = new Set(slotCapacityRows.map(row => row.id).filter(Boolean));
        for (const slot of originalEditSlots.filter(existing => !retainedSlotIds.has(existing.id))) {
          await deleteSlot(slot.id);
        }
        for (const row of slotCapacityRows) {
          const capacity = Number(row.availableKWh);
          if (row.id && capacity !== row.initialAvailableKWh) {
            await updateSlot(row.id, { availableKWh: capacity, status: row.status });
          } else if (!row.id) {
            await createSlot({ nodeId: editingNode.id, availableKWh: capacity, status: 'Available' });
          }
        }
        await updateNode(editingNode.id, payload);
        toast.success('Node and battery slots updated!');
      } else {
        await createNode(payload);
        toast.success('Node created with auto-calculated slot capacity!');
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
      const [slotData, nodeData] = await Promise.all([
        getSlotsByNode(node.id),
        getNodeById(node.id)
      ]);
      setSlots(slotData);
      if (nodeData) setSelectedNode(nodeData);
    } catch (error) {
      toast.error('Failed to load slots.');
    }
  }

  // Creates a new energy slot for the selected node.
  async function handleCreateSlot(e) {
    e.preventDefault();
    if (!selectedNode?.isActive) {
      toast.error('Cannot add slots to an inactive node. Reactivate the node first.');
      return;
    }
    const cap = parseFloat(slotForm.availableKWh);
    if (!cap || cap <= 0) {
      toast.error('Slot capacity must be greater than 0 kWh.');
      return;
    }
    try {
      await createSlot({
        nodeId: selectedNode.id,
        availableKWh: cap,
        status: 'Available'
      });
      toast.success('Battery slot added! Station capacity updated.');
      setShowSlotModal(false);
      setSlotForm({ availableKWh: '', status: 'Available' });
      await viewSlots(selectedNode);
      await loadNodes();
    } catch (error) {
      toast.error(error.message);
    }
  }

  // Toggles maintenance status on a slot.
  async function handleToggleMaintenance(slot) {
    let currentSlot = slot;
    try {
      const latestSlots = await getSlotsByNode(selectedNode.id);
      setSlots(latestSlots);
      currentSlot = latestSlots.find(item => item.id === slot.id) || slot;
    } catch {
      // The server validates the current status again when the schedule is saved.
    }

    const isMaint = currentSlot.status === 'Maintenance';
    if (!isMaint) {
      setMaintenanceTarget(currentSlot);
      setMaintenanceForm(getDefaultMaintenanceForm());
      setShowMaintenanceModal(true);
      return;
    }
    try {
      await toggleSlotMaintenance(currentSlot.id, { underMaintenance: false });
      toast.success(`Slot ${currentSlot.slotNumber || ''} returned to service.`);
      await viewSlots(selectedNode);
      await loadNodes();
    } catch (error) {
      toast.error(error.message);
    }
  }

  async function handleScheduleMaintenance(event) {
    event.preventDefault();
    if (!maintenanceTarget) return;
    const [startTime, endTime] = maintenanceForm.schedule.split('-');
    if (!maintenanceForm.date || maintenanceForm.date < getLocalDateValue() || !startTime || !endTime || endTime <= startTime) {
      toast.error('Choose a valid date and maintenance window.');
      return;
    }
    try {
      const result = await toggleSlotMaintenance(maintenanceTarget.id, {
        underMaintenance: true,
        maintenanceDate: maintenanceForm.date,
        startTime,
        endTime
      });
      toast.success(result.message || 'Maintenance scheduled.');
      setShowMaintenanceModal(false);
      setMaintenanceTarget(null);
      await viewSlots(selectedNode);
      await loadNodes();
    } catch (error) {
      toast.error(error.message);
    }
  }

  // Deletes a slot.
  async function handleDeleteSlot(id) {
    if (!window.confirm('Delete this battery slot? Active reservations on this slot will block deletion.')) return;
    try {
      await deleteSlot(id);
      toast.success('Slot deleted. Station capacity updated.');
      await viewSlots(selectedNode);
      await loadNodes();
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
              <h3 className="card-title">🔌 Battery Slots — {selectedNode.nodeName}</h3>
              {isBackoffice && (
                <button
                  className="btn btn-primary btn-sm"
                  disabled={!selectedNode.isActive}
                  title={selectedNode.isActive ? 'Add a battery slot' : 'Reactivate this node before adding battery slots'}
                  onClick={() => { setSlotForm({ availableKWh: '', status: 'Available' }); setShowSlotModal(true); }}
                >
                  + Add Battery Slot
                </button>
              )}
            </div>
            <div className="card-body" style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
              <div><strong>Total Station Capacity:</strong> {selectedNode.capacityKWh} kWh</div>
              <div><strong>Active Capacity:</strong> <span style={{ color: 'var(--success, #22c55e)' }}>{activeSlotCapacity} kWh</span> ({activeSlots.length} slots)</div>
              {maintenanceSlots.length > 0 && (
                <div><strong>Maintenance:</strong> <span style={{ color: 'var(--warning, #f59e0b)' }}>{maintenanceSlotCapacity} kWh</span> ({maintenanceSlots.length} slots)</div>
              )}
              <div><strong>Operating Schedule:</strong> {selectedNode.schedule}</div>
            </div>
            <div className="table-container">
              <table>
                <thead>
                  <tr><th>Battery Slot</th><th>Capacity</th><th>Status</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {slots.length === 0 ? (
                    <tr><td colSpan="4" className="text-center text-muted" style={{ padding: '2rem' }}>No battery slots configured.</td></tr>
                  ) : slots.map(s => (
                    <tr key={s.id}>
                      <td>Slot {s.slotNumber || slots.indexOf(s) + 1}</td>
                      <td>{s.availableKWh} kWh</td>
                      <td>
                        <StatusBadge status={s.status} />
                        {s.status === 'Maintenance' && s.maintenanceDate && s.maintenanceStartTime && s.maintenanceEndTime && (
                          <small className="text-muted" style={{ display: 'block', marginTop: 4 }}>
                            {String(s.maintenanceDate).slice(0, 10)} · {s.maintenanceStartTime}–{s.maintenanceEndTime}
                          </small>
                        )}
                      </td>
                      <td className="actions" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        {canManageSlots && (
                          <button
                            className={`btn btn-sm ${s.status === 'Maintenance' ? 'btn-success' : 'btn-warning'}`}
                            onClick={() => handleToggleMaintenance(s)}
                            title={s.status === 'Maintenance' ? 'Return slot to service' : 'Place slot under maintenance'}
                          >
                            {s.status === 'Maintenance' ? '✅ Restore' : '🔧 Maintenance'}
                          </button>
                        )}
                        {isBackoffice && (
                          <button className="btn btn-danger btn-sm" onClick={() => handleDeleteSlot(s.id)} title="Delete battery slot">🗑️</button>
                        )}
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
                  <h3 className="modal-title">Add Battery Slot</h3>
                  <button className="btn btn-ghost" onClick={() => setShowSlotModal(false)}>✕</button>
                </div>
                <form onSubmit={handleCreateSlot}>
                  <div className="modal-body">
                    <div className="form-group">
                      <label className="form-label">Battery Slot Capacity (kWh)</label>
                      <input type="number" min="0.1" step="0.1" className="form-input" value={slotForm.availableKWh} onChange={e => setSlotForm({ ...slotForm, availableKWh: e.target.value })} required />
                      <small className="text-muted">Station total capacity will automatically increase with this slot's capacity.</small>
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={() => setShowSlotModal(false)}>Cancel</button>
                    <button type="submit" className="btn btn-primary" disabled={!Number(slotForm.availableKWh) || Number(slotForm.availableKWh) <= 0}>Add Battery Slot</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {showMaintenanceModal && maintenanceTarget && (
            <div className="modal-overlay" onClick={() => setShowMaintenanceModal(false)}>
              <div className="modal-content" onClick={event => event.stopPropagation()}>
                <div className="modal-header">
                  <h3 className="modal-title">Schedule Slot Maintenance</h3>
                  <button type="button" className="btn btn-ghost" onClick={() => setShowMaintenanceModal(false)}>×</button>
                </div>
                <form onSubmit={handleScheduleMaintenance}>
                  <div className="modal-body">
                    <p className="text-muted">Slot {maintenanceTarget.slotNumber} will be unavailable only during this window. An active reservation in that window will prevent scheduling.</p>
                    <div className="form-group">
                      <label className="form-label">Maintenance date</label>
                      <input
                        type="date"
                        className="form-input"
                        min={getLocalDateValue()}
                        value={maintenanceForm.date}
                        onChange={event => setMaintenanceForm(current => ({ ...current, date: event.target.value }))}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Maintenance time</label>
                      <SchedulePicker value={maintenanceForm.schedule} onChange={schedule => setMaintenanceForm(current => ({ ...current, schedule }))} />
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={() => setShowMaintenanceModal(false)}>Cancel</button>
                    <button type="submit" className="btn btn-primary">Schedule Maintenance</button>
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
                <LocationPicker
                  latitude={nodeForm.latitude}
                  longitude={nodeForm.longitude}
                  onChange={({ latitude, longitude, address }) =>
                    setNodeForm(prev => ({
                      ...prev,
                      latitude,
                      longitude,
                      // only auto-fill the location text if it's empty or an address was resolved
                      location: address ? address : prev.location
                    }))
                  }
                />
                <div className="form-group">
                  <label className="form-label">Battery Slot Capacities (kWh)</label>
                  <p className="text-muted">
                    Total station capacity: <strong>{slotCapacityRows.reduce((sum, row) => sum + (Number(row.availableKWh) || 0), 0)} kWh</strong> across {slotCapacityRows.length} slot(s).
                  </p>
                  {slotCapacityRows.map((row, index) => (
                    <div className="slot-capacity-row" key={row.id || `new-slot-${index}`}>
                      <div className="form-group slot-capacity-input">
                        <label className="form-label">Slot {index + 1}</label>
                        <input
                          type="number"
                          min="0.1"
                          step="0.1"
                          className="form-input"
                          value={row.availableKWh}
                          onChange={event => setSlotCapacityRows(current => current.map((item, slotIndex) => slotIndex === index ? { ...item, availableKWh: event.target.value } : item))}
                          required
                        />
                      </div>
                      {slotCapacityRows.length > 1 && (
                        <button
                          type="button"
                          className="btn btn-danger btn-sm slot-remove-btn"
                          onClick={() => setSlotCapacityRows(current => current.filter((_, slotIndex) => slotIndex !== index))}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    disabled={Boolean(editingNode && !editingNode.isActive)}
                    onClick={() => setSlotCapacityRows(current => [...current, { availableKWh: '50' }])}
                  >
                    + Add battery slot
                  </button>
                  {editingNode && !editingNode.isActive && <small className="text-muted">Reactivate this node before adding new battery slots.</small>}
                </div>
                <div className="form-group">
                  <label className="form-label">Operating Schedule</label>
                  <SchedulePicker value={nodeForm.schedule} onChange={schedule => setNodeForm({ ...nodeForm, schedule })} />
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
