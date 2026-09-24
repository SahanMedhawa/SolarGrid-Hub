// ============================================================
// File: LandingPage.jsx
// Project: Smart Solar Microgrid Trading System - React Web App
// Description: Public landing page showing system overview
//              and feature highlights for the solar microgrid
//              trading platform, with dynamic portal shortcuts.
// ============================================================

import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getRolePortalPath, getRoleDisplayName } from '../utils/authUtils';

export default function LandingPage() {
  const { isAuthenticated, user } = useAuth();

  return (
    <>
      <section className="hero">
        <div className="hero-content">
          <h1 className="hero-title">
            Smart <span className="highlight">Solar Microgrid</span><br />
            Trading System
          </h1>
          <p className="hero-subtitle">
            Manage solar energy trading, microgrid nodes, and power reservations efficiently.
            Connect prosumers with grid stations for seamless decentralized energy exchange.
          </p>

          <div className="hero-actions">
            {isAuthenticated && user ? (
              <Link to={getRolePortalPath(user.role)} className="btn btn-primary btn-lg">
                ⚡ Go to {getRoleDisplayName(user.role)}
              </Link>
            ) : (
              <>
                <Link to="/login" className="btn btn-primary btn-lg">
                  ⚡ Sign In to Portal
                </Link>
                <Link to="/register" className="btn btn-secondary btn-lg">
                  ☀️ Register as Prosumer
                </Link>
              </>
            )}
          </div>

          <div className="hero-features">
            <div className="hero-feature-card">
              <div className="feature-icon">🏛️</div>
              <h3>Backoffice Portal</h3>
              <p>System-wide governance, microgrid node hub management, prosumer verification &amp; reactivation, and user RBAC controls.</p>
            </div>
            <div className="hero-feature-card">
              <div className="feature-icon">⚡</div>
              <h3>Grid Operator Portal</h3>
              <p>Physical station operations, live prosumer arrivals, camera QR scanner verification, and instant energy transfer execution.</p>
            </div>
            <div className="hero-feature-card">
              <div className="feature-icon">☀️</div>
              <h3>Solar Prosumer Portal</h3>
              <p>Find nearby station hubs, reserve energy injection slots with 7-day rule, download secure QR passes, and 12-hour booking control.</p>
            </div>
            <div className="hero-feature-card">
              <div className="feature-icon">📱</div>
              <h3>Mobile &amp; Web Sync</h3>
              <p>Unified real-time backend API integration supporting both Android mobile application and modern React web client.</p>
            </div>
          </div>
        </div>
      </section>

      <footer className="footer">
        <p>© 2026 Smart Solar Microgrid Trading System | SE4040 Enterprise Application Development</p>
      </footer>
    </>
  );
}
