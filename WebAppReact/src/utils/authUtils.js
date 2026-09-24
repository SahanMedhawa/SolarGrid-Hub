// ============================================================
// File: authUtils.js
// Project: Smart Solar Microgrid Trading System - React Web App
// Description: Utility helpers for Role-Based Access Control (RBAC)
//              and role-specific portal redirection.
// ============================================================

/**
 * Returns the dedicated portal path for a given user role.
 * @param {string} role - The user role ('Backoffice', 'GridOperator', 'Prosumer')
 * @returns {string} The portal route
 */
export function getRolePortalPath(role) {
  switch (role) {
    case 'Backoffice':
      return '/portal/backoffice';
    case 'GridOperator':
      return '/portal/operator';
    case 'Prosumer':
      return '/portal/prosumer';
    default:
      return '/login';
  }
}

/**
 * Returns a human-friendly role label.
 * @param {string} role 
 * @returns {string}
 */
export function getRoleDisplayName(role) {
  switch (role) {
    case 'Backoffice':
      return 'Backoffice Administrator';
    case 'GridOperator':
      return 'Grid Station Operator';
    case 'Prosumer':
      return 'Solar Energy Prosumer';
    default:
      return role || 'Guest';
  }
}
