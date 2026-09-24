// ============================================================
// File: LoginPage.jsx
// Project: Smart Solar Microgrid Trading System - React Web App
// Description: Unified login page supporting both web app users
//              (Backoffice/GridOperator) and prosumers, with
//              role-based redirection directly to their dedicated portals.
// ============================================================

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { loginUser } from '../services/api';
import { getRolePortalPath, getRoleDisplayName } from '../utils/authUtils';
import { toast } from 'react-toastify';

export default function LoginPage() {
  const [loginType, setLoginType] = useState('User');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  // Handles form submission and authenticates credentials via the API.
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      toast.warning('Please enter your credentials.');
      return;
    }

    setLoading(true);
    try {
      const data = await loginUser(username, password, loginType);
      if (data && data.token) {
        login(data.token, {
          userId: data.userId,
          displayName: data.displayName,
          role: data.role,
          nic: data.role === 'Prosumer' ? data.userId : null
        });

        const targetPortal = getRolePortalPath(data.role);
        toast.success(`Welcome back, ${data.displayName}! (${getRoleDisplayName(data.role)})`);
        navigate(targetPortal);
      } else {
        toast.error('Invalid credentials.');
      }
    } catch (error) {
      toast.error(error.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="logo">
          <div style={{ fontSize: '2.5rem' }}>⚡</div>
          <h2>Welcome Back</h2>
          <p>Sign in to the Smart Solar Microgrid Trading System</p>
        </div>

        <div className="role-tabs">
          <button
            className={`role-tab ${loginType === 'User' ? 'active' : ''}`}
            onClick={() => { setLoginType('User'); setUsername(''); setPassword(''); }}
          >
            🏢 Staff (Admin / Operator)
          </button>
          <button
            className={`role-tab ${loginType === 'Prosumer' ? 'active' : ''}`}
            onClick={() => { setLoginType('Prosumer'); setUsername(''); setPassword(''); }}
          >
            ☀️ Solar Prosumer
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">
              {loginType === 'Prosumer' ? 'National ID Card (NIC)' : 'Username'}
            </label>
            <input
              id="loginUsername"
              type="text"
              className="form-input"
              placeholder={loginType === 'Prosumer' ? 'Enter your NIC (e.g. 199012345678)' : 'Enter staff username (e.g. admin)'}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              id="loginPassword"
              type="password"
              className="form-input"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          <button
            id="loginSubmit"
            type="submit"
            className="btn btn-primary btn-lg"
            style={{ width: '100%', justifyContent: 'center' }}
            disabled={loading}
          >
            {loading ? 'Authenticating...' : `Sign In to ${loginType === 'Prosumer' ? 'Prosumer Portal' : 'Staff Portal'}`}
          </button>
        </form>

        <p className="mt-2 text-center text-muted" style={{ fontSize: '0.85rem' }}>
          Are you a solar owner? <Link to="/register">Register as a Prosumer here</Link>
        </p>

        <div style={{ marginTop: '1.5rem', padding: '0.75rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', color: 'var(--color-text-secondary)', textAlign: 'center' }}>
          🔐 <strong>Role-Based Access:</strong> You will be automatically redirected to your authorized portal (Backoffice, Grid Operator, or Prosumer).
        </div>
      </div>
    </div>
  );
}
