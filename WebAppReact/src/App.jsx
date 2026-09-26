// ============================================================
// File: App.jsx
// Project: Smart Solar Microgrid Trading System - React Web App
// Description: Root application component with routing, layout,
//              authentication context, and Role-Based Access
//              Control (RBAC) across 3 distinct role portals:
//              Backoffice, Grid Operator, and Solar Prosumer.
// ============================================================

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import { getRolePortalPath } from './utils/authUtils';

// Public pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

// 3 Dedicated Role Portals
import BackofficePortal from './pages/BackofficePortal';
import OperatorPortal from './pages/OperatorPortal';
import ProsumerPortal from './pages/ProsumerPortal';

// Sub-management pages
import UsersPage from './pages/UsersPage';
import ProsumersPage from './pages/ProsumersPage';
import NodesPage from './pages/NodesPage';
import ReservationsPage from './pages/ReservationsPage';
import QrVerifyPage from './pages/QrVerifyPage';

// Self-service profile page — available to any logged-in staff user
import MyProfilePage from './pages/MyProfilePage';

// Layout wrapper that renders navbar and footer
function AppLayout({ children }) {
  const { isAuthenticated } = useAuth();
  return (
    <div className="app-container">
      {isAuthenticated && <Navbar />}
      {children}
      {isAuthenticated && (
        <footer className="footer">
          <p>© 2026 Smart Solar Microgrid Trading System | SE4040 Enterprise Application Development</p>
        </footer>
      )}
    </div>
  );
}

// Redirects /dashboard dynamically to the user's role-based portal
function DashboardRedirect() {
  const { user } = useAuth();
  return <Navigate to={getRolePortalPath(user?.role)} replace />;
}

// Main App routing configuration with RBAC route protection
function AppRoutes() {
  return (
    <AppLayout>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* ── 3 DEDICATED ROLE PORTALS (RBAC) ── */}
        {/* 1. Backoffice Portal */}
        <Route path="/portal/backoffice" element={
          <ProtectedRoute roles={['Backoffice']}>
            <BackofficePortal />
          </ProtectedRoute>
        } />

        {/* 2. Grid Operator Portal */}
        <Route path="/portal/operator" element={
          <ProtectedRoute roles={['GridOperator']}>
            <OperatorPortal />
          </ProtectedRoute>
        } />

        {/* 3. Solar Prosumer Portal */}
        <Route path="/portal/prosumer" element={
          <ProtectedRoute roles={['Prosumer']}>
            <ProsumerPortal />
          </ProtectedRoute>
        } />

        {/* Dynamic dashboard redirect */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <DashboardRedirect />
          </ProtectedRoute>
        } />

        {/* Sub-management views */}
        <Route path="/users" element={
          <ProtectedRoute roles={['Backoffice']}>
            <UsersPage />
          </ProtectedRoute>
        } />
        <Route path="/prosumers" element={
          <ProtectedRoute roles={['Backoffice']}>
            <ProsumersPage />
          </ProtectedRoute>
        } />
        <Route path="/nodes" element={
          <ProtectedRoute roles={['Backoffice', 'GridOperator']}>
            <NodesPage />
          </ProtectedRoute>
        } />
        <Route path="/reservations" element={
          <ProtectedRoute roles={['Backoffice', 'GridOperator']}>
            <ReservationsPage />
          </ProtectedRoute>
        } />
        <Route path="/qr-verify" element={
          <ProtectedRoute roles={['GridOperator']}>
            <QrVerifyPage />
          </ProtectedRoute>
        } />

        <Route path="/profile" element={
          <ProtectedRoute>  
            <MyProfilePage />      
          </ProtectedRoute>
        }/>
        
        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppLayout>
  );
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
        <ToastContainer
          position="bottom-right"
          autoClose={3500}
          hideProgressBar={false}
          closeOnClick
          pauseOnHover
          theme="dark"
        />
      </AuthProvider>
    </Router>
  );
}
