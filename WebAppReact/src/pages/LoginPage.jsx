// ============================================================
// File: LoginPage.jsx
// Project: Smart Solar Microgrid Trading System - React Web App
// Description: Modern, user-friendly authentication page with
//              Tailwind CSS, role switcher, 1-click demo logins,
//              and automatic redirection to role-specific portals.
// ============================================================

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { loginUser } from '../services/api';
import { getRolePortalPath, getRoleDisplayName } from '../utils/authUtils';
import { toast } from 'react-toastify';
import {
  Zap,
  Sun,
  ShieldCheck,
  Building2,
  Lock,
  User,
  CreditCard,
  ArrowRight,
  Sparkles,
  Info,
  CheckCircle
} from 'lucide-react';

export default function LoginPage() {
  const [loginType, setLoginType] = useState('User'); // 'User' (Staff) or 'Prosumer'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  // Quick fill helper for testing / presentation
  const handleQuickFill = (type, u, p) => {
    setLoginType(type);
    setUsername(u);
    setPassword(p);
  };

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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Background Decorative Lighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-96 bg-gradient-to-b from-emerald-500/10 via-teal-500/5 to-transparent blur-3xl pointer-events-none" />

      {/* Header / Logo */}
      <div className="text-center mb-8 relative z-10">
        <Link to="/" className="inline-flex items-center gap-3 group mb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/25 group-hover:scale-105 transition-transform duration-200">
            <Zap className="w-6 h-6 text-slate-950 fill-current" />
          </div>
        </Link>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">Welcome Back</h1>
        <p className="text-slate-400 text-sm mt-1">Sign in to the Smart Solar Microgrid Trading System</p>
      </div>

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl relative z-10">
        {/* Role Type Toggle */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-2xl border border-slate-800 mb-6">
          <button
            type="button"
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              loginType === 'User'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-950'
                : 'text-slate-400 hover:text-white'
            }`}
            onClick={() => {
              setLoginType('User');
              setUsername('');
              setPassword('');
            }}
          >
            <Building2 className="w-4 h-4" />
            <span>Staff Portal</span>
          </button>
          <button
            type="button"
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              loginType === 'Prosumer'
                ? 'bg-gradient-to-r from-amber-500 to-emerald-500 text-slate-950 shadow-md shadow-amber-950'
                : 'text-slate-400 hover:text-white'
            }`}
            onClick={() => {
              setLoginType('Prosumer');
              setUsername('');
              setPassword('');
            }}
          >
            <Sun className="w-4 h-4 fill-current" />
            <span>Solar Prosumer</span>
          </button>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              {loginType === 'Prosumer' ? 'National ID Card (NIC)' : 'Staff Username'}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                {loginType === 'Prosumer' ? <CreditCard className="w-4 h-4" /> : <User className="w-4 h-4" />}
              </div>
              <input
                id="loginUsername"
                type="text"
                className="w-full pl-10 pr-4 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                placeholder={loginType === 'Prosumer' ? 'e.g. 199012345678' : 'e.g. admin or operator1'}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Password
              </label>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="loginPassword"
                type="password"
                className="w-full pl-10 pr-4 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
          </div>

          <button
            id="loginSubmit"
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all flex items-center justify-center gap-2 mt-6 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                Authenticating...
              </span>
            ) : (
              <>
                <span>Sign In to {loginType === 'Prosumer' ? 'Prosumer Portal' : 'Staff Portal'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Fill Credentials Shortcut */}
        <div className="mt-6 pt-5 border-t border-slate-800/80">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium mb-3">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>1-Click Test Credentials:</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleQuickFill('User', 'admin', 'admin123')}
              className="px-2 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs text-center transition-colors"
            >
              <div className="font-semibold text-blue-400">Backoffice</div>
              <div className="text-[10px] text-slate-500">admin</div>
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('User', 'operator1', 'operator123')}
              className="px-2 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs text-center transition-colors"
            >
              <div className="font-semibold text-emerald-400">Operator</div>
              <div className="text-[10px] text-slate-500">operator1</div>
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('Prosumer', '199012345678', 'prosumer123')}
              className="px-2 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs text-center transition-colors"
            >
              <div className="font-semibold text-amber-400">Prosumer</div>
              <div className="text-[10px] text-slate-500">NIC Login</div>
            </button>
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-6 text-center text-xs text-slate-400">
          {loginType === 'Prosumer' ? (
            <p>
              New solar owner?{' '}
              <Link to="/register" className="text-emerald-400 hover:text-emerald-300 font-semibold underline underline-offset-2">
                Register as Prosumer
              </Link>
            </p>
          ) : (
            <p className="flex items-center justify-center gap-1 text-[11px] text-slate-500">
              <Info className="w-3.5 h-3.5" />
              Staff accounts are provisioned via the Backoffice Administrator.
            </p>
          )}
        </div>
      </div>

      <div className="mt-6 text-center text-xs text-slate-500">
        <Link to="/" className="hover:text-slate-400 transition-colors">
          ← Back to Homepage
        </Link>
      </div>
    </div>
  );
}
