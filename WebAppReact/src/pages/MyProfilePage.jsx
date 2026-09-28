// ============================================================
// File: MyProfilePage.jsx
// Project: Smart Solar Microgrid Trading System - React Web App
// Description: Self-service profile page for any logged-in staff
//              user (Backoffice or GridOperator) to view/update
//              their own info, change password, or deactivate
//              their own account.
// ============================================================

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getMyProfile, updateMyProfile, changeMyPassword, deactivateMyAccount } from '../services/api';
import { toast } from 'react-toastify';

export default function MyProfilePage() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const [profileForm, setProfileForm] = useState({ username: '', email: '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  useEffect(() => { loadProfile(); }, []);

  // Loads the logged-in user's own profile.
  async function loadProfile() {
    try {
      setLoading(true);
      const data = await getMyProfile();
      setProfile(data);
      setProfileForm({ username: data.username, email: data.email || '' });
    } catch (err) {
      toast.error('Failed to load profile: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  // Saves username/email changes.
  async function handleProfileSubmit(e) {
    e.preventDefault();
    try {
      await updateMyProfile(profileForm);
      toast.success('Profile updated successfully!');
      loadProfile();
    } catch (err) {
      toast.error(err.message || 'Failed to update profile.');
    }
  }

  // Changes the user's own password after validating the confirmation matches.
  async function handlePasswordSubmit(e) {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New passwords do not match.');
      return;
    }
    try {
      await changeMyPassword(passwordForm.currentPassword, passwordForm.newPassword);
      toast.success('Password changed successfully!');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast.error(err.message || 'Failed to change password.');
    }
  }

  // Deactivates the user's own account, then logs them out.
  async function handleDeactivate() {
    if (!window.confirm('Are you sure you want to deactivate your own account? You will be logged out immediately.')) {
      return;
    }
    try {
      await deactivateMyAccount();
      toast.success('Account deactivated.');
      logout();
      navigate('/login');
    } catch (err) {
      toast.error(err.message || 'Failed to deactivate account.');
    }
  }

  if (loading) {
    return (
      <div className="page-content">
        <div className="loading-spinner"><div className="spinner"></div></div>
      </div>
    );
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <h1 className="page-title"><span className="icon">👤</span> My Profile</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
        {/* Profile Info Card */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>Account Details</h3>
          <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>
            Role: <strong>{profile.role}</strong> · Status: <strong>{profile.isActive ? 'Active' : 'Deactivated'}</strong>
          </p>
          <form onSubmit={handleProfileSubmit}>
            <div className="form-group">
              <label className="form-label">Username</label>
              <input
                className="form-input"
                value={profileForm.username}
                onChange={e => setProfileForm({ ...profileForm, username: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-input"
                value={profileForm.email}
                onChange={e => setProfileForm({ ...profileForm, email: e.target.value })}
              />
            </div>
            <button type="submit" className="btn btn-primary">Save Changes</button>
          </form>
        </div>

        {/* Change Password Card */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>Change Password</h3>
          <form onSubmit={handlePasswordSubmit}>
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
                required
              />
            </div>
            <button type="submit" className="btn btn-primary">Change Password</button>
          </form>
        </div>

        {/* Danger Zone Card */}
        <div className="card" style={{ padding: '1.5rem', border: '1px solid var(--color-danger, #ef4444)' }}>
          <h3 style={{ marginBottom: '0.5rem' }}>⚠️ Danger Zone</h3>
          <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>
            Deactivating your account will log you out immediately. A Backoffice officer can reactivate it later.
          </p>
          <button className="btn btn-danger" onClick={handleDeactivate}>
            Deactivate My Account
          </button>
        </div>
      </div>
    </div>
  );
}