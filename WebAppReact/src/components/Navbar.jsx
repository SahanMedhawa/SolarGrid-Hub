// ============================================================
// File: Navbar.jsx
// Project: Smart Solar Microgrid Trading System - React Web App
// Description: Modern navigation bar with Tailwind CSS, dynamic
//              role-based tabs, quick profile view, and logout.
// ============================================================

import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getRolePortalPath, getRoleDisplayName } from '../utils/authUtils';
import {
  Zap,
  ShieldCheck,
  Activity,
  Sun,
  User,
  LogOut,
  Layers,
  Users,
  QrCode,
  Calendar,
  Settings
} from 'lucide-react';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isActive = (path) =>
    location.pathname === path
      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold'
      : 'text-slate-300 hover:text-white hover:bg-slate-800/60 font-medium';

  const getRoleBadge = (role) => {
    switch (role) {
      case 'Backoffice':
        return 'bg-blue-950 text-blue-300 border-blue-800/60';
      case 'GridOperator':
        return 'bg-emerald-950 text-emerald-300 border-emerald-800/60';
      case 'Prosumer':
        return 'bg-amber-950 text-amber-300 border-amber-800/60';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center gap-6">
          <Link
            to={isAuthenticated && user ? getRolePortalPath(user.role) : '/'}
            className="flex items-center gap-2.5 group"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
              <Zap className="w-5 h-5 text-slate-950 fill-current" />
            </div>
            <span className="font-bold text-base sm:text-lg tracking-tight bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
              SolarGrid-Hub
            </span>
          </Link>

          {/* Role Navigation Links */}
          {isAuthenticated && user && (
            <nav className="hidden md:flex items-center gap-1.5">
              {/* Backoffice Admin Nav */}
              {user.role === 'Backoffice' && (
                <>
                  <Link
                    to="/portal/backoffice"
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm transition-all ${isActive(
                      '/portal/backoffice'
                    )}`}
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Admin Portal</span>
                  </Link>
                  <Link
                    to="/nodes"
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm transition-all ${isActive(
                      '/nodes'
                    )}`}
                  >
                    <Layers className="w-4 h-4" />
                    <span>Grid Nodes</span>
                  </Link>
                  <Link
                    to="/prosumers"
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm transition-all ${isActive(
                      '/prosumers'
                    )}`}
                  >
                    <Sun className="w-4 h-4" />
                    <span>Prosumers</span>
                  </Link>
                  <Link
                    to="/reservations"
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm transition-all ${isActive(
                      '/reservations'
                    )}`}
                  >
                    <Calendar className="w-4 h-4" />
                    <span>Reservations</span>
                  </Link>
                </>
              )}

              {/* Grid Operator Nav */}
              {user.role === 'GridOperator' && (
                <>
                  <Link
                    to="/portal/operator"
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm transition-all ${isActive(
                      '/portal/operator'
                    )}`}
                  >
                    <Activity className="w-4 h-4" />
                    <span>Operator Portal</span>
                  </Link>
                  <Link
                    to="/qr-verify"
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm transition-all ${isActive(
                      '/qr-verify'
                    )}`}
                  >
                    <QrCode className="w-4 h-4" />
                    <span>QR Scanner</span>
                  </Link>
                  <Link
                    to="/nodes"
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm transition-all ${isActive(
                      '/nodes'
                    )}`}
                  >
                    <Layers className="w-4 h-4" />
                    <span>Station Nodes</span>
                  </Link>
                  <Link
                    to="/reservations"
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm transition-all ${isActive(
                      '/reservations'
                    )}`}
                  >
                    <Calendar className="w-4 h-4" />
                    <span>Bookings</span>
                  </Link>
                </>
              )}

              {/* Prosumer Nav */}
              {user.role === 'Prosumer' && (
                <>
                  <Link
                    to="/portal/prosumer"
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm transition-all ${isActive(
                      '/portal/prosumer'
                    )}`}
                  >
                    <Sun className="w-4 h-4" />
                    <span>Prosumer Dashboard</span>
                  </Link>
                </>
              )}
            </nav>
          )}
        </div>

        {/* Right Section: User Pill & Logout */}
        <div className="flex items-center gap-3">
          {isAuthenticated && user ? (
            <>
              <Link
                to="/profile"
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors"
                title="View & Edit Profile"
              >
                <div className="w-6 h-6 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300">
                  <User className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-medium text-slate-200 hidden sm:inline">
                  {user.displayName || user.userId}
                </span>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getRoleBadge(
                    user.role
                  )}`}
                >
                  {getRoleDisplayName(user.role)}
                </span>
              </Link>
              <button
                onClick={handleLogout}
                className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-slate-900 border border-transparent hover:border-slate-800 transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-sm transition-all"
              >
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}