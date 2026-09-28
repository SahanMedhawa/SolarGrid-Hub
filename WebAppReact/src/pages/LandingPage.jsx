// ============================================================
// File: LandingPage.jsx
// Project: Smart Solar Microgrid Trading System - React Web App
// Description: Modern, user-friendly landing page with Tailwind CSS,
//              interactive role previews, system metrics, and
//              thin-client / IIS FAT-server architecture overview.
// ============================================================

import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getRolePortalPath, getRoleDisplayName } from '../utils/authUtils';
import {
  Zap,
  Sun,
  ShieldCheck,
  Smartphone,
  Server,
  Database,
  ArrowRight,
  Activity,
  QrCode,
  Layers,
  Cpu,
  CheckCircle2,
  Lock,
  Globe2,
  TrendingUp
} from 'lucide-react';

export default function LandingPage() {
  const { isAuthenticated, user } = useAuth();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-emerald-500 selection:text-white">
      {/* Background Decorative Glows */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-600/15 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
      </div>

      {/* Top Header / Public Nav */}
      <header className="relative z-10 border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-md sticky top-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform duration-200">
              <Zap className="w-5 h-5 text-slate-950 fill-current" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-emerald-400 via-teal-300 to-blue-400 bg-clip-text text-transparent">
                SolarGrid-Hub
              </span>
              <span className="hidden sm:inline-block ml-2 text-xs px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 font-medium">
                v2.0 Active
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            {isAuthenticated && user ? (
              <Link
                to={getRolePortalPath(user.role)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium text-sm shadow-md shadow-emerald-900/30 transition-all hover:shadow-emerald-700/40"
              >
                <span>Dashboard ({getRoleDisplayName(user.role)})</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-4 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/70 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-sm shadow-md shadow-emerald-500/20 transition-all hover:scale-102"
                >
                  <Sun className="w-4 h-4" />
                  <span>Register Prosumer</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 pt-16 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/90 border border-emerald-500/30 text-emerald-400 text-xs sm:text-sm font-medium mb-6 shadow-inner backdrop-blur-sm animate-pulse">
          <Zap className="w-4 h-4 text-emerald-400" />
          <span>Decentralized Peer-to-Grid Solar Trading Platform</span>
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight max-w-4xl mx-auto leading-tight sm:leading-none mb-6">
          Smart Solar Microgrid <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
            Energy Trading System
          </span>
        </h1>

        <p className="text-base sm:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          Empowering prosumers to sell surplus solar power, manage grid node capacity,
          and secure power slot reservations with real-time QR verification.
        </p>

        {/* Hero CTAs */}
        <div className="flex flex-wrap justify-center items-center gap-4 mb-16">
          {isAuthenticated && user ? (
            <Link
              to={getRolePortalPath(user.role)}
              className="px-8 py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-base shadow-xl shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
            >
              <Zap className="w-5 h-5 fill-slate-950" />
              <span>Launch {getRoleDisplayName(user.role)}</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-base shadow-xl shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
              >
                <Zap className="w-5 h-5 fill-slate-950" />
                <span>Enter Web Portal</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                to="/register"
                className="px-8 py-4 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700/80 font-semibold text-base transition-all transform hover:-translate-y-0.5 flex items-center gap-2 shadow-lg"
              >
                <Sun className="w-5 h-5 text-amber-400" />
                <span>Register as Solar Prosumer</span>
              </Link>
            </>
          )}
        </div>

        {/* Key Real-Time Metrics Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto p-4 rounded-2xl bg-slate-900/70 border border-slate-800 backdrop-blur-md shadow-2xl">
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/60 text-center">
            <div className="text-2xl sm:text-3xl font-bold text-emerald-400">100%</div>
            <div className="text-xs text-slate-400 font-medium mt-1">Thin Client Architecture</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/60 text-center">
            <div className="text-2xl sm:text-3xl font-bold text-teal-400">7-Day</div>
            <div className="text-xs text-slate-400 font-medium mt-1">Advance Slot Booking Rule</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/60 text-center">
            <div className="text-2xl sm:text-3xl font-bold text-cyan-400">&lt; 1s</div>
            <div className="text-xs text-slate-400 font-medium mt-1">Instant QR Verification</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/60 text-center">
            <div className="text-2xl sm:text-3xl font-bold text-amber-400">24 / 7</div>
            <div className="text-xs text-slate-400 font-medium mt-1">Autonomous Grid Balancing</div>
          </div>
        </div>
      </section>

      {/* 3 Dedicated Role Portals Overview */}
      <section className="relative z-10 py-16 bg-slate-900/40 border-t border-slate-800/80 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-xs font-semibold tracking-wider text-emerald-400 uppercase">Role-Based Access Control</h2>
            <p className="mt-2 text-3xl font-bold text-white tracking-tight sm:text-4xl">
              Tailored Portals for Every Grid Stakeholder
            </p>
            <p className="mt-3 text-slate-400 max-w-2xl mx-auto">
              Each user role experiences an optimized, role-specific dashboard with distinct security boundaries.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* 1. Backoffice Portal Card */}
            <div className="group relative rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 p-6 border border-slate-800 hover:border-emerald-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-emerald-950/40">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-5 group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2 flex items-center justify-between">
                <span>Backoffice Admin</span>
                <span className="text-xs font-medium px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800/50">Admin</span>
              </h3>
              <p className="text-slate-400 text-sm mb-4">
                Full governance, system audit logs, prosumer account activation &amp; deactivation, user RBAC management, and node creation.
              </p>
              <ul className="space-y-2 text-xs text-slate-300 mb-6">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Prosumer NIC verification &amp; activation</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Microgrid node capacity configuration</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Centralized user management &amp; security</li>
              </ul>
              <Link to="/login" className="text-sm font-medium text-blue-400 hover:text-blue-300 flex items-center gap-1">
                Access Backoffice <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* 2. Grid Operator Portal Card */}
            <div className="group relative rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 p-6 border border-slate-800 hover:border-emerald-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-emerald-950/40">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-5 group-hover:scale-110 transition-transform">
                <Activity className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2 flex items-center justify-between">
                <span>Grid Operator</span>
                <span className="text-xs font-medium px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/50">Station Staff</span>
              </h3>
              <p className="text-slate-400 text-sm mb-4">
                Real-time physical station operations, prosumer arrival processing, live QR code scanning, and slot completion dispatch.
              </p>
              <ul className="space-y-2 text-xs text-slate-300 mb-6">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Camera &amp; File QR Code validation</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Instant energy injection confirmation</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Live substation node load balancing</li>
              </ul>
              <Link to="/login" className="text-sm font-medium text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
                Access Operator Desk <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* 3. Solar Prosumer Portal Card */}
            <div className="group relative rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 p-6 border border-slate-800 hover:border-amber-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-amber-950/40">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-5 group-hover:scale-110 transition-transform">
                <Sun className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2 flex items-center justify-between">
                <span>Solar Prosumer</span>
                <span className="text-xs font-medium px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800/50">Prosumer</span>
              </h3>
              <p className="text-slate-400 text-sm mb-4">
                Solar energy generation tracking, automated station discovery, 7-day advance booking, and downloadable secure QR passes.
              </p>
              <ul className="space-y-2 text-xs text-slate-300 mb-6">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-amber-400" /> Google Maps &amp; Station Finder</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-amber-400" /> 12-Hour Cancellation Rule adherence</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-amber-400" /> High-resolution digital QR passes</li>
              </ul>
              <Link to="/register" className="text-sm font-medium text-amber-400 hover:text-amber-300 flex items-center gap-1">
                Join as Prosumer <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Architecture Showcase: Thin Clients + IIS FAT Server + MongoDB */}
      <section className="relative z-10 py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="rounded-3xl bg-slate-900/60 border border-slate-800 p-8 sm:p-12 backdrop-blur-md">
          <div className="max-w-3xl mb-10">
            <span className="text-xs font-bold text-emerald-400 tracking-wider uppercase">Enterprise Architecture</span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mt-1">
              Thin Clients &amp; IIS FAT Server with NoSQL Database
            </h2>
            <p className="text-slate-400 text-sm sm:text-base mt-2">
              Both Web and Android Mobile clients operate strictly as presentation interfaces, delegating all data persistence, security validation, and business calculations to the centralized Web API.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-left">
            <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800/80 flex flex-col">
              <div className="w-10 h-10 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center mb-3">
                <Globe2 className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-white text-base">React Thin Client</h4>
              <p className="text-xs text-slate-400 mt-1 flex-1">
                Pure React 19 + Tailwind CSS single page web application. No direct DB queries; communicates solely over REST API.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800/80 flex flex-col">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-3">
                <Smartphone className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-white text-base">Android Thin Client</h4>
              <p className="text-xs text-slate-400 mt-1 flex-1">
                Pure Native Android SDK (Kotlin) with Retrofit / HTTP calls. No embedded databases; full mobile-first workflow.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800/80 flex flex-col">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center mb-3">
                <Server className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-white text-base">FAT Server (IIS / .NET)</h4>
              <p className="text-xs text-slate-400 mt-1 flex-1">
                ASP.NET Core Web API executing 7-day reservation limits, 12h cancellation rules, JWT security, and node load balancing.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800/80 flex flex-col">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center mb-3">
                <Database className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-white text-base">NoSQL Database</h4>
              <p className="text-xs text-slate-400 mt-1 flex-1">
                MongoDB Atlas database cluster storing schema-flexible documents for nodes, users, prosumers, and transactions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-800/80 py-8 px-4 text-center text-xs text-slate-500 bg-slate-950">
        <p>© 2026 Smart Solar Microgrid Trading System | SE4040 Enterprise Application Development</p>
        <p className="mt-1 text-slate-600">Pure Thin Client UI Architecture connected exclusively to ASP.NET Core Web Service &amp; MongoDB</p>
      </footer>
    </div>
  );
}
