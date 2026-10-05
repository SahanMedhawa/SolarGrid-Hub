// ============================================================
// File: ProtectedRoute.jsx
// Project: Smart Solar Microgrid Trading System - React Web App
// Description: Route guard that ensures the user is authenticated
//              and enforces Role-Based Access Control (RBAC).
//              Redirects unauthorized roles to their own portal.
// ============================================================

import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getRolePortalPath } from '../utils/authUtils';

export default function ProtectedRoute({ children, roles }) {
  const { isAuthenticated, user } = useAuth();

  // If not logged in, send to login page
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // If roles specified and user's role is not authorized, redirect to their own portal
  if (roles && user && !roles.includes(user.role)) {
    return <Navigate to={getRolePortalPath(user.role)} replace />;
  }

  return children;
}
