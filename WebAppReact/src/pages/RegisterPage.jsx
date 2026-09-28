// ============================================================
// File: RegisterPage.jsx
// Project: Smart Solar Microgrid Trading System - React Web App
// Description: Modern, user-friendly prosumer registration page
//              built with Tailwind CSS and NIC-primary key support.
// ============================================================

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registerProsumer } from '../services/api';
import { toast } from 'react-toastify';
import {
  Sun,
  Zap,
  CreditCard,
  User,
  Mail,
  Phone,
  MapPin,
  Lock,
  ArrowRight,
  ShieldAlert,
  CheckCircle2
} from 'lucide-react';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    nic: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    password: '',
    confirmPassword: ''
  });

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }
    if (!form.nic || !form.firstName || !form.lastName || !form.email || !form.phone || !form.address || !form.password) {
      toast.warning('Please fill in all required fields.');
      return;
    }

    setLoading(true);
    try {
      await registerProsumer({
        nic: form.nic.trim(),
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        password: form.password
      });
      toast.success('Registration submitted! Your account is pending activation by a Backoffice officer.');
      navigate('/login');
    } catch (error) {
      toast.error(error.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Background Decorative Lighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-96 bg-gradient-to-b from-amber-500/10 via-emerald-500/5 to-transparent blur-3xl pointer-events-none" />

      {/* Header / Logo */}
      <div className="text-center mb-6 relative z-10">
        <Link to="/" className="inline-flex items-center gap-3 group mb-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-amber-500/25 group-hover:scale-105 transition-transform duration-200">
            <Sun className="w-6 h-6 text-slate-950 fill-current" />
          </div>
        </Link>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">Join as Solar Prosumer</h1>
        <p className="text-slate-400 text-sm mt-1">Register your solar setup to trade excess energy on the microgrid</p>
      </div>

      {/* Main Form Card */}
      <div className="w-full max-w-xl bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl relative z-10">
        <div className="flex items-center gap-3 p-3.5 mb-6 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
          <ShieldAlert className="w-5 h-5 shrink-0 text-amber-400" />
          <span>
            <strong>Note:</strong> Prosumer accounts require verification &amp; activation by the Backoffice Admin before energy slot reservations can be booked.
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              National ID Card (NIC) <span className="text-emerald-400">* Primary Key</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <CreditCard className="w-4 h-4" />
              </div>
              <input
                name="nic"
                type="text"
                className="w-full pl-10 pr-4 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                placeholder="e.g. 199012345678 or 901234567V"
                value={form.nic}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                First Name *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  name="firstName"
                  type="text"
                  className="w-full pl-10 pr-4 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                  placeholder="John"
                  value={form.firstName}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Last Name *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  name="lastName"
                  type="text"
                  className="w-full pl-10 pr-4 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                  placeholder="Doe"
                  value={form.lastName}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Email Address *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  name="email"
                  type="email"
                  className="w-full pl-10 pr-4 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                  placeholder="john@example.com"
                  value={form.email}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Phone Number *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  name="phone"
                  type="tel"
                  className="w-full pl-10 pr-4 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                  placeholder="0771234567"
                  value={form.phone}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Physical Location / Address *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <MapPin className="w-4 h-4" />
              </div>
              <input
                name="address"
                type="text"
                className="w-full pl-10 pr-4 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                placeholder="e.g. 123 Solar Ave, Colombo 03"
                value={form.address}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Password *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  name="password"
                  type="password"
                  className="w-full pl-10 pr-4 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Confirm Password *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  name="confirmPassword"
                  type="password"
                  className="w-full pl-10 pr-4 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                  placeholder="••••••••"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 transition-all flex items-center justify-center gap-2 mt-6 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                Registering Account...
              </span>
            ) : (
              <>
                <span>Complete Prosumer Registration</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-400">
          Already registered?{' '}
          <Link to="/login" className="text-emerald-400 hover:text-emerald-300 font-semibold underline underline-offset-2">
            Sign in to your account
          </Link>
        </p>
      </div>

      <div className="mt-6 text-center text-xs text-slate-500">
        <Link to="/" className="hover:text-slate-400 transition-colors">
          ← Back to Homepage
        </Link>
      </div>
    </div>
  );
}
