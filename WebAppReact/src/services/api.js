// ============================================================
// File: api.js
// Project: Smart Solar Microgrid Trading System - React Web App
// Description: Centralized API helper for making HTTP requests
//              to the backend Web API. All business logic
//              resides in the API (FAT service pattern).
// ============================================================

import { API_BASE_URL, TOKEN_KEY } from '../config';

// Makes an authenticated API request to the backend.
export async function apiRequest(endpoint, method = 'GET', body = null) {
  const token = localStorage.getItem(TOKEN_KEY);
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  };

  if (body && method !== 'GET') {
    options.body = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(`${API_BASE_URL}/${endpoint}`, options);
  } catch (networkError) {
    throw new Error('Network error — is the API server running?');
  }

  if (response.status === 401) {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('smts_user');
    window.location.href = '/login';
    return null;
  }

  // Handle empty responses (204 No Content)
  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { message: text };
  }

  if (!response.ok) {
    throw new Error(data.message || `API request failed (${response.status})`);
  }

  return data;
}

// ── Auth endpoints ──

// Authenticates user credentials and returns JWT token.
export async function loginUser(username, password, loginType = 'User') {
  return apiRequest('auth/login', 'POST', { username, password, loginType });
}

// ── User endpoints ──

// Retrieves all system users (Backoffice + GridOperator).
export async function getUsers() {
  return apiRequest('user');
}

// Creates a new system user.
export async function createUser(userData) {
  return apiRequest('user', 'POST', userData);
}

// Updates an existing system user.
export async function updateUser(id, userData) {
  return apiRequest(`user/${id}`, 'PUT', userData);
}

// Deactivates a system user.
export async function deleteUser(id) {
  return apiRequest(`user/${id}`, 'DELETE');
}

// ── Prosumer endpoints ──

// Retrieves all prosumer profiles.
export async function getProsumers() {
  return apiRequest('prosumer');
}

// Retrieves a prosumer by NIC.
export async function getProsumerByNic(nic) {
  return apiRequest(`prosumer/${nic}`);
}

// Registers a new prosumer account.
export async function registerProsumer(data) {
  return apiRequest('prosumer/register', 'POST', data);
}

// Updates a prosumer profile.
export async function updateProsumer(nic, data) {
  return apiRequest(`prosumer/${nic}`, 'PUT', data);
}

// Activates a pending prosumer account (Backoffice only).
export async function activateProsumer(nic) {
  return apiRequest(`prosumer/${nic}/activate`, 'PUT');
}

// Deactivates a prosumer account.
export async function deactivateProsumer(nic) {
  return apiRequest(`prosumer/${nic}/deactivate`, 'PUT');
}

// Reactivates a deactivated prosumer (Backoffice only).
// Uses the same activate endpoint since the backend treats it as reactivation.
export async function reactivateProsumer(nic) {
  return apiRequest(`prosumer/${nic}/activate`, 'PUT');
}

// ── Microgrid Node endpoints ──

// Retrieves all microgrid nodes.
export async function getNodes() {
  return apiRequest('microgridnode');
}

// Retrieves a single node by ID.
export async function getNodeById(id) {
  return apiRequest(`microgridnode/${id}`);
}

// Creates a new microgrid node.
export async function createNode(nodeData) {
  return apiRequest('microgridnode', 'POST', nodeData);
}

// Updates a microgrid node.
export async function updateNode(id, nodeData) {
  return apiRequest(`microgridnode/${id}`, 'PUT', nodeData);
}

// Deactivates a microgrid node (blocked if active reservations exist).
export async function deactivateNode(id) {
  return apiRequest(`microgridnode/${id}`, 'DELETE');
}

// ── Energy Slot endpoints ──

// Retrieves all slots for a node.
export async function getSlotsByNode(nodeId) {
  return apiRequest(`energyslot/node/${nodeId}`);
}

// Retrieves available slots for a node.
export async function getAvailableSlotsByNode(nodeId) {
  return apiRequest(`energyslot/node/${nodeId}/available`);
}

// Creates a new energy slot.
export async function createSlot(slotData) {
  return apiRequest('energyslot', 'POST', slotData);
}

// Updates an energy slot.
export async function updateSlot(id, slotData) {
  return apiRequest(`energyslot/${id}`, 'PUT', slotData);
}

// Deletes an energy slot.
export async function deleteSlot(id) {
  return apiRequest(`energyslot/${id}`, 'DELETE');
}

// ── Reservation endpoints ──

// Retrieves all reservations.
export async function getReservations() {
  return apiRequest('reservation');
}

// Retrieves a single reservation by ID.
export async function getReservationById(id) {
  return apiRequest(`reservation/${id}`);
}

// Retrieves reservations for a specific prosumer.
export async function getReservationsByProsumer(nic) {
  return apiRequest(`reservation/prosumer/${nic}`);
}

// Retrieves reservations filtered by status.
export async function getReservationsByStatus(status) {
  return apiRequest(`reservation/status/${status}`);
}

// Gets the count of approved future reservations for a prosumer.
export async function getApprovedFutureCount(nic) {
  return apiRequest(`reservation/prosumer/${nic}/future-count`);
}

// Creates a new reservation (7-day rule enforced server-side).
export async function createReservation(data) {
  return apiRequest('reservation', 'POST', data);
}

// Updates a reservation (12-hour rule enforced server-side).
export async function updateReservation(id, data) {
  return apiRequest(`reservation/${id}`, 'PUT', data);
}

// Cancels a reservation (12-hour rule enforced server-side).
export async function cancelReservation(id) {
  return apiRequest(`reservation/${id}/cancel`, 'PUT');
}

// Approves a pending reservation and generates QR code.
export async function approveReservation(id) {
  return apiRequest(`reservation/${id}/approve`, 'PUT');
}

// Completes a reservation via QR code verification (Grid Operator).
export async function completeReservation(id, qrData) {
  return apiRequest(`reservation/${id}/complete`, 'PUT', { qrData });
}

// ── Profile (self-service) endpoints ──

// Retrieves the logged-in user's own profile.
export async function getMyProfile() {
  return apiRequest('profile');
}

// Updates the logged-in user's own username/email.
export async function updateMyProfile(data) {
  return apiRequest('profile', 'PUT', data);
}

// Changes the logged-in user's own password.
export async function changeMyPassword(currentPassword, newPassword) {
  return apiRequest('profile/password', 'PATCH', { currentPassword, newPassword });
}

// Deactivates the logged-in user's own account.
export async function deactivateMyAccount() {
  return apiRequest('profile', 'DELETE');
}

// Reactivates a previously deactivated system user (Backoffice only).
export async function activateUser(id) {
  return apiRequest(`user/${id}/activate`, 'PATCH');
}
