// ============================================================
// File: AuthContext.jsx
// Project: Smart Solar Microgrid Trading System - React Web App
// Description: Provides authentication context across the app,
//              including login/logout, token management, and
//              role-based access control.
// ============================================================

import { createContext, useContext, useState, useCallback } from 'react';
import { TOKEN_KEY, USER_KEY } from '../config';

const AuthContext = createContext(null);

// Retrieves the stored user object from localStorage.
function getStoredUser() {
  try {
    const user = localStorage.getItem(USER_KEY);
    return user ? JSON.parse(user) : null;
  } catch {
    return null;
  }
}

// AuthProvider wraps the application and provides auth state + helpers.
export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(getStoredUser);

  // Stores authentication data after successful login.
  const login = useCallback((newToken, userData) => {
    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem(USER_KEY, JSON.stringify(userData));
    setToken(newToken);
    setUser(userData);
  }, []);

  // Clears authentication data on logout.
  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  }, []);

  // Checks if user is currently authenticated.
  const isAuthenticated = !!token;

  // Returns default headers with Authorization for API calls.
  const getAuthHeaders = useCallback(() => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  }), [token]);

  return (
    <AuthContext.Provider value={{ token, user, login, logout, isAuthenticated, getAuthHeaders }}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook to access auth context from any component.
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
