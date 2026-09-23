// ============================================================
// File: api.js
// Project: Smart Solar Microgrid Trading System - Web App
// Description: Centralized API helper for making HTTP requests
//              to the backend Web API.
// ============================================================

// Makes an authenticated API request.
async function apiRequest(endpoint, method = 'GET', body = null) {
    const options = {
        method: method,
        headers: getAuthHeaders()
    };

    if (body && method !== 'GET') {
        options.body = JSON.stringify(body);
    }

    try {
        const response = await fetch(`${API_BASE_URL}/${endpoint}`, options);

        if (response.status === 401) {
            clearAuth();
            window.location.href = 'login.html';
            return null;
        }

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'API request failed');
        }

        return data;
    } catch (error) {
        console.error(`API Error [${method} ${endpoint}]:`, error);
        throw error;
    }
}

// Shows a Bootstrap toast notification.
function showToast(message, type = 'success') {
    const toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) return;

    const toastId = 'toast-' + Date.now();
    const bgClass = type === 'success' ? 'bg-success' : type === 'error' ? 'bg-danger' : 'bg-warning';

    toastContainer.innerHTML += `
        <div id="${toastId}" class="toast ${bgClass} text-white" role="alert">
            <div class="toast-body d-flex justify-content-between align-items-center">
                ${message}
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast"></button>
            </div>
        </div>
    `;

    const toast = new bootstrap.Toast(document.getElementById(toastId));
    toast.show();
}

// Returns a Bootstrap badge class based on status.
function getStatusBadge(status) {
    const badges = {
        'Active': 'badge bg-success',
        'Pending': 'badge bg-warning text-dark',
        'Deactivated': 'badge bg-danger',
        'Approved': 'badge bg-primary',
        'Completed': 'badge bg-secondary',
        'Cancelled': 'badge bg-danger',
        'Available': 'badge bg-info'
    };
    return badges[status] || 'badge bg-secondary';
}
