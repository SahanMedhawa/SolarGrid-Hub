// ============================================================
// File: Navbar.jsx
// Project: Smart Solar Microgrid Trading System - React Web App
// Description: Top navigation bar with dynamic role-based links,
//              role badge indicators, and portal navigation.
// ============================================================

import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getRolePortalPath } from '../utils/authUtils';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isActive = (path) => location.pathname === path ? 'active' : '';

  const getRoleBadgeStyle = (role) => {
    switch (role) {
      case 'Backoffice':
        return { background: 'var(--gradient-accent)', color: '#fff' };
      case 'GridOperator':
        return { background: 'var(--gradient-primary)', color: '#fff' };
      case 'Prosumer':
        return { background: 'var(--gradient-solar)', color: '#000', fontWeight: 'bold' };
      default:
        return {};
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link
          to={isAuthenticated && user ? getRolePortalPath(user.role) : '/'}
          className="navbar-brand"
        >
          <span className="brand-icon">⚡</span>
          Smart Solar Microgrid
        </Link>

        {isAuthenticated && user && (
          <ul className="navbar-links">
            {/* Backoffice Admin Links */}
            {user.role === 'Backoffice' && (
              <>
                <li>
                  <Link to="/portal/backoffice" className={isActive('/portal/backoffice')}>
                    🏛️ Backoffice Portal
                  </Link>
                </li>
                <li>
                  <Link to="/nodes" className={isActive('/nodes')}>
                    ⚡ Grid Nodes
                  </Link>
                </li>
                <li>
                  <Link to="/prosumers" className={isActive('/prosumers')}>
                    ☀️ Prosumers
                  </Link>
                </li>
                <li>
                  <Link to="/users" className={isActive('/users')}>
                    👥 Staff
                  </Link>
                </li>
                <li>
                  <Link to="/reservations" className={isActive('/reservations')}>
                    📅 Reservations
                  </Link>
                </li>
              </>
            )}

            {/* Grid Operator Links */}
            {user.role === 'GridOperator' && (
              <>
                <li>
                  <Link to="/portal/operator" className={isActive('/portal/operator')}>
                    ⚡ Operator Portal
                  </Link>
                </li>
                <li>
                  <Link to="/qr-verify" className={isActive('/qr-verify')}>
                    📷 QR Scanner
                  </Link>
                </li>
                <li>
                  <Link to="/nodes" className={isActive('/nodes')}>
                    🔋 Grid Nodes
                  </Link>
                </li>
                <li>
                  <Link to="/reservations" className={isActive('/reservations')}>
                    📋 Station Bookings
                  </Link>
                </li>
              </>
            )}

            {/* Prosumer Links */}
            {user.role === 'Prosumer' && (
              <>
                <li>
                  <Link to="/portal/prosumer" className={isActive('/portal/prosumer')}>
                    ☀️ Prosumer Portal
                  </Link>
                </li>
              </>
            )}
          </ul>
        )}

        <div className="navbar-right">
          {isAuthenticated && user ? (
            <>
              <div className="user-badge">
                <span>👤 {user.displayName}</span>
                <span className="role-tag" style={getRoleBadgeStyle(user.role)}>
                  {user.role}
                </span>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={handleLogout}>
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-secondary btn-sm">Login</Link>
              <Link to="/register" className="btn btn-primary btn-sm">Register</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
