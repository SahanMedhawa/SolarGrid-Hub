// ============================================================
// File: UsersPage.jsx
// Project: Smart Solar Microgrid Trading System - React Web App
// Description: User management page for Backoffice admins to
//              create, update, and delete web app users
//              (Backoffice and Grid Operator roles).
// ============================================================

import { useState, useEffect } from 'react';
import { getUsers, createUser, updateUser, deleteUser } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import { toast } from 'react-toastify';

// Renders the user management page with CRUD operations.
export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ username: '', email: '', password: '', role: 'GridOperator' });

  // Loads all users from the API on mount.
  useEffect(() => { loadUsers(); }, []);

  // Fetches user list from the backend.
  async function loadUsers() {
    try {
      setLoading(true);
      const data = await getUsers();
      setUsers(data);
    } catch (error) {
      toast.error('Failed to load users.');
    } finally {
      setLoading(false);
    }
  }

  // Opens the create/edit modal.
  function openModal(user = null) {
    if (user) {
      setEditing(user);
      setForm({ username: user.username, email: user.email, password: '', role: user.role });
    } else {
      setEditing(null);
      setForm({ username: '', email: '', password: '', role: 'GridOperator' });
    }
    setShowModal(true);
  }

  // Handles form submission for creating or updating a user.
  async function handleSubmit(e) {
    e.preventDefault();
    try {
      if (editing) {
        await updateUser(editing.id, form);
        toast.success('User updated successfully!');
      } else {
        await createUser(form);
        toast.success('User created successfully!');
      }
      setShowModal(false);
      loadUsers();
    } catch (error) {
      toast.error(error.message || 'Operation failed.');
    }
  }

  // Deletes a user after confirmation.
  async function handleDelete(id) {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await deleteUser(id);
      toast.success('User deleted!');
      loadUsers();
    } catch (error) {
      toast.error(error.message || 'Failed to delete user.');
    }
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <h1 className="page-title"><span className="icon">👥</span> User Management</h1>
        <button className="btn btn-primary" onClick={() => openModal()}>+ Create User</button>
      </div>

      <div className="card">
        {loading ? (
          <div className="loading-spinner"><div className="spinner"></div></div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr><td colSpan="6" className="text-center text-muted" style={{ padding: '2rem' }}>No users found</td></tr>
                ) : users.map(u => (
                  <tr key={u.id}>
                    <td><strong>{u.username}</strong></td>
                    <td>{u.email}</td>
                    <td><StatusBadge status={u.role === 'Backoffice' ? 'Active' : 'Available'} /><span style={{ marginLeft: 8 }}>{u.role}</span></td>
                    <td><StatusBadge status={u.isActive ? 'Active' : 'Deactivated'} /></td>
                    <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td className="actions">
                      <button className="btn btn-secondary btn-sm" onClick={() => openModal(u)}>✏️ Edit</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(u.id)}>🗑️ Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editing ? 'Edit User' : 'Create User'}</h3>
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Username</label>
                  <input className="form-input" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input type="email" className="form-input" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Password {editing && '(leave blank to keep current)'}</label>
                  <input type="password" className="form-input" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} {...(!editing && { required: true })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Role</label>
                  <select className="form-select" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                    <option value="Backoffice">Backoffice</option>
                    <option value="GridOperator">Grid Operator</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editing ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
