// ============================================================
// File: LandingPage.jsx
// Project: Smart Solar Microgrid Trading System - React Web App
// Description: Clean, modern, cognitive-friendly landing page.
//              Spacious vertical rhythm, zero text clipping,
//              and clear role-based access points.
// ============================================================

import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getRolePortalPath, getRoleDisplayName } from '../utils/authUtils';
import {
  Zap,
  Sun,
  ShieldCheck,
  Activity,
  ArrowRight,
  Server,
  Database,
  Smartphone,
  CheckCircle2,
  Globe2
} from 'lucide-react';

export default function LandingPage() {
  const { isAuthenticated, user } = useAuth();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased">
      {/* ── Top Navigation Bar ── */}
      <header className="border-b border-slate-800/80 bg-slate-950/90 sticky top-0 z-50 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-slate-950">
              <Zap className="w-4 h-4 fill-current" />
            </div>
            <span className="font-bold text-base text-white tracking-tight">SolarGrid-Hub</span>
          </Link>

          <div className="flex items-center gap-3">
            {isAuthenticated && user ? (
              <Link
                to={getRolePortalPath(user.role)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs transition-colors"
              >
                <span>Dashboard ({getRoleDisplayName(user.role)})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-900 rounded-lg transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs transition-colors"
                >
                  <Sun className="w-3.5 h-3.5" />
                  <span>Register</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Hero Section ── */}
      <section className="pt-20 pb-16 px-6 max-w-4xl mx-auto text-center flex flex-col items-center">
        {/* Simple Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/70 border border-emerald-800/50 text-emerald-400 text-xs font-medium mb-6">
          <Zap className="w-3 h-3" />
          <span>Decentralized Clean Energy Trading</span>
        </div>

        {/* Clean, Non-Clipping Headline with Generous Spacing */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white tracking-tight leading-tight sm:leading-tight mb-6">
          Smart Solar Microgrid <br />
          <span className="text-emerald-400">Energy Trading Platform</span>
        </h1>

        {/* Clear Subtitle */}
        <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed mb-8">
          A centralized microgrid system connecting solar prosumers with local grid substations.
          Trade surplus energy, manage node capacity, and verify reservations seamlessly.
        </p>

        {/* Call to Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          {isAuthenticated && user ? (
            <Link
              to={getRolePortalPath(user.role)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition-all"
            >
              <span>Go to {getRoleDisplayName(user.role)} Portal</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition-all"
              >
                <span>Enter Web Portal</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/register"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-semibold text-sm transition-all"
              >
                <Sun className="w-4 h-4 text-amber-400" />
                <span>Register as Prosumer</span>
              </Link>
            </>
          )}
        </div>
      </section>

      {/* ── 3 Role Portals ── */}
      <section className="py-16 px-6 max-w-6xl mx-auto w-full">
        <div className="text-center mb-10">
          <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1">
            Role-Based Access
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold text-white">Three Dedicated Portals</h2>
          <p className="text-sm text-slate-400 mt-1">Select your portal to log in or register</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Backoffice */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-4">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-base font-bold text-white">Backoffice Admin</h3>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
                  Governance
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                System governance, prosumer account activations, user RBAC management, and substation node creation.
              </p>
              <ul className="space-y-2 text-xs text-slate-300 mb-6">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Prosumer NIC verification &amp; activation</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Substation node capacity management</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>User account and role provisioning</span>
                </li>
              </ul>
            </div>
            <Link
              to="/login"
              className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1.5 pt-3 border-t border-slate-800/80"
            >
              <span>Login to Backoffice</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Card 2: Grid Operator */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4">
                <Activity className="w-5 h-5" />
              </div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-base font-bold text-white">Grid Operator</h3>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                  Operations
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                On-site station operations, prosumer arrival check-in, live QR scanner verification, and transfer dispatch.
              </p>
              <ul className="space-y-2 text-xs text-slate-300 mb-6">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Integrated camera QR scanner</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Real-time station slot arrivals</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Instant energy transfer execution</span>
                </li>
              </ul>
            </div>
            <Link
              to="/login"
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1.5 pt-3 border-t border-slate-800/80"
            >
              <span>Login to Operator Desk</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Card 3: Solar Prosumer */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-4">
                <Sun className="w-5 h-5" />
              </div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-base font-bold text-white">Solar Prosumer</h3>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
                  Trading
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                Log solar generation, locate nearby stations on Mapbox, book slots with 7-day rule, and get QR passes.
              </p>
              <ul className="space-y-2 text-xs text-slate-300 mb-6">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Interactive station map &amp; distance</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>7-day advance booking &amp; 12h cancel</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>High-resolution digital QR passes</span>
                </li>
              </ul>
            </div>
            <Link
              to="/register"
              className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1.5 pt-3 border-t border-slate-800/80"
            >
              <span>Register as Prosumer</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Architecture Overview Strip ── */}
      <section className="py-12 px-6 max-w-6xl mx-auto w-full border-t border-slate-800/80">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
            <Globe2 className="w-4 h-4 text-teal-400 mb-2" />
            <div className="font-semibold text-xs text-white">Web Thin Client</div>
            <div className="text-[11px] text-slate-400 mt-0.5">React 19 Single Page App</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
            <Smartphone className="w-4 h-4 text-emerald-400 mb-2" />
            <div className="font-semibold text-xs text-white">Mobile Thin Client</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Pure Native Android (Kotlin)</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
            <Server className="w-4 h-4 text-blue-400 mb-2" />
            <div className="font-semibold text-xs text-white">FAT Server (IIS)</div>
            <div className="text-[11px] text-slate-400 mt-0.5">ASP.NET Core Web API</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
            <Database className="w-4 h-4 text-amber-400 mb-2" />
            <div className="font-semibold text-xs text-white">NoSQL Database</div>
            <div className="text-[11px] text-slate-400 mt-0.5">MongoDB Atlas Database</div>
          </div>
        </div>
      </section>

      {/* ── Simple Footer ── */}
      <footer className="mt-auto border-t border-slate-800/80 py-5 px-6 text-center text-xs text-slate-500">
        <p>© 2026 Smart Solar Microgrid Trading System | SE4040 Enterprise Application Development</p>
      </footer>
    </div>
  );
}
