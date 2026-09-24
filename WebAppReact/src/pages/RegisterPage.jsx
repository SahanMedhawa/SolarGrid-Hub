// ============================================================
// File: RegisterPage.jsx
// Project: Smart Solar Microgrid Trading System - React Web App
// Description: Prosumer registration page. Prosumers register
//              using NIC as the primary key and await activation
//              by a Backoffice officer.
// ============================================================

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registerProsumer } from '../services/api';
import { toast } from 'react-toastify';

// Renders the prosumer registration form.
export default function RegisterPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    nic: '', firstName: '', lastName: '',
    email: '', phone: '', address: '', password: '', confirmPassword: ''
  });

  // Updates form field state.
  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // Validates and submits the registration form to the API.
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }
    if (!form.nic || !form.firstName || !form.lastName || !form.email || !form.phone || !form.address || !form.password) {
      toast.warning('Please fill in all fields.');
      return;
    }

    setLoading(true);
    try {
      await registerProsumer({
        nic: form.nic,
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone,
        address: form.address,
        password: form.password
      });
      toast.success('Registration successful! Your account is pending activation by a Backoffice officer.');
      navigate('/login');
    } catch (error) {
      toast.error(error.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: '560px' }}>
        <div className="logo">
          <div style={{ fontSize: '2.5rem' }}>☀️</div>
          <h2>Prosumer Registration</h2>
          <p>Create your solar prosumer account using your NIC</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">NIC Number (Primary Key)</label>
            <input name="nic" className="form-input" placeholder="e.g. 199012345678" value={form.nic} onChange={handleChange} />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">First Name</label>
              <input name="firstName" className="form-input" placeholder="First name" value={form.firstName} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label className="form-label">Last Name</label>
              <input name="lastName" className="form-input" placeholder="Last name" value={form.lastName} onChange={handleChange} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Email</label>
            <input name="email" type="email" className="form-input" placeholder="email@example.com" value={form.email} onChange={handleChange} />
          </div>

          <div className="form-group">
            <label className="form-label">Phone</label>
            <input name="phone" className="form-input" placeholder="0771234567" value={form.phone} onChange={handleChange} />
          </div>

          <div className="form-group">
            <label className="form-label">Address</label>
            <input name="address" className="form-input" placeholder="Your address" value={form.address} onChange={handleChange} />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Password</label>
              <input name="password" type="password" className="form-input" placeholder="••••••••" value={form.password} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <input name="confirmPassword" type="password" className="form-input" placeholder="••••••••" value={form.confirmPassword} onChange={handleChange} />
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
            {loading ? 'Registering...' : 'Create Account'}
          </button>
        </form>

        <p className="mt-2 text-center text-muted" style={{ fontSize: '0.85rem' }}>
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
