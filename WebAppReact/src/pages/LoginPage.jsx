// ============================================================
// File: LoginPage.jsx
// Project: Smart Solar Microgrid Trading System - React Web App
// Description: Clean, minimalist, cognitive-friendly login page.
//              Role-based authentication, 1-click test fill,
//              and automatic redirection to dedicated portals.
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
  Shield,
  Building2,
  Lock,
  User,
  CreditCard,
  ArrowRight,
  Sparkles
} from 'lucide-react';

export default function LoginPage() {
  const [loginType, setLoginType] = useState('User'); // 'User' (Staff) or 'Prosumer'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  // Quick fill helper for presentation and testing
  const handleQuickFill = (type, u, p) => {
    setLoginType(type);
    setUsername(u);
    setPassword(p);
  };

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
        toast.success(`Welcome, ${data.displayName}!`);
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center px-4 py-12 antialiased">
      {/* Brand Icon & Heading */}
      <div className="text-center mb-6">
        <Link to="/" className="inline-flex items-center gap-2 mb-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-slate-950">
            <Zap className="w-5 h-5 fill-current" />
          </div>
        </Link>
        <h1 className="text-2xl font-bold text-white tracking-tight">Sign In</h1>
        <p className="text-xs text-slate-400 mt-1">Smart Solar Microgrid Trading Platform</p>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        {/* Role Type Tabs */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800 mb-5">
          <button
            type="button"
            className={`py-2 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
              loginType === 'User'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            onClick={() => {
              setLoginType('User');
              setUsername('');
              setPassword('');
            }}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Staff Portal</span>
          </button>
          <button
            type="button"
            className={`py-2 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
              loginType === 'Prosumer'
                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            onClick={() => {
              setLoginType('Prosumer');
              setUsername('');
              setPassword('');
            }}
          >
            <Sun className="w-3.5 h-3.5" />
            <span>Solar Prosumer</span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              {loginType === 'Prosumer' ? 'National ID Card (NIC)' : 'Username'}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                {loginType === 'Prosumer' ? <CreditCard className="w-4 h-4" /> : <User className="w-4 h-4" />}
              </div>
              <input
                id="loginUsername"
                type="text"
                className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                placeholder={loginType === 'Prosumer' ? 'e.g. 199012345678' : 'e.g. admin or operator1'}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="loginPassword"
                type="password"
                className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
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
            className="w-full py-2.5 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition-colors flex items-center justify-center gap-2 mt-4 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <span>Signing in...</span>
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* 1-Click Test Credentials */}
        <div className="mt-5 pt-4 border-t border-slate-800 text-center">
          <div className="flex items-center justify-center gap-1 text-[11px] text-slate-400 mb-2 font-medium">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>Test accounts:</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5 text-[11px]">
            <button
              type="button"
              onClick={() => handleQuickFill('User', 'admin', 'admin123')}
              className="px-2 py-1 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors"
            >
              Admin
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('User', 'operator1', 'operator123')}
              className="px-2 py-1 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors"
            >
              Operator
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('Prosumer', '199012345678', 'prosumer123')}
              className="px-2 py-1 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors"
            >
              Prosumer
            </button>
          </div>
        </div>

        {/* Footer Link */}
        <div className="mt-4 text-center text-xs text-slate-400">
          New prosumer?{' '}
          <Link to="/register" className="text-emerald-400 hover:underline">
            Register here
          </Link>
        </div>
      </div>

      <div className="mt-4 text-center">
        <Link to="/" className="text-xs text-slate-500 hover:text-slate-400 transition-colors">
          ← Back to Homepage
        </Link>
      </div>
    </div>
  );
}
