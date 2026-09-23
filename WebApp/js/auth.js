// ============================================================
// File: auth.js
// Project: Smart Solar Microgrid Trading System - Web App
// Description: Handles authentication state, login/logout,
//              and role-based navigation rendering.
// ============================================================

// Retrieves the stored JWT token.
function getToken() {
    return localStorage.getItem(TOKEN_KEY);
}

// Retrieves the stored user object.
function getUser() {
    const user = localStorage.getItem(USER_KEY);
    return user ? JSON.parse(user) : null;
}

// Stores authentication data after successful login.
function setAuth(token, user) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
}

// Clears authentication data on logout.
function clearAuth() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
}

// Checks if user is currently authenticated.
function isAuthenticated() {
    return !!getToken();
}

// Returns default headers with Authorization for API calls.
function getAuthHeaders() {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
    };
}

// Redirects to login page if not authenticated.
function requireAuth() {
    if (!isAuthenticated()) {
        window.location.href = 'login.html';
    }
}

// Handles user logout.
function logout() {
    clearAuth();
    window.location.href = '../index.html';
}

// Renders navigation links based on user role.
function renderNavigation() {
    const navLinks = document.getElementById('navLinks');
    const authButtons = document.getElementById('authButtons');
    const user = getUser();

    if (!navLinks) return;

    if (isAuthenticated() && user) {
        let links = '';

        if (user.role === 'Backoffice') {
            links = `
                <li class="nav-item"><a class="nav-link" href="pages/dashboard.html">Dashboard</a></li>
                <li class="nav-item"><a class="nav-link" href="pages/users.html">Users</a></li>
                <li class="nav-item"><a class="nav-link" href="pages/prosumers.html">Prosumers</a></li>
                <li class="nav-item"><a class="nav-link" href="pages/nodes.html">Grid Nodes</a></li>
                <li class="nav-item"><a class="nav-link" href="pages/reservations.html">Reservations</a></li>
            `;
        } else if (user.role === 'GridOperator') {
            links = `
                <li class="nav-item"><a class="nav-link" href="pages/dashboard.html">Dashboard</a></li>
                <li class="nav-item"><a class="nav-link" href="pages/nodes.html">Grid Nodes</a></li>
                <li class="nav-item"><a class="nav-link" href="pages/reservations.html">Reservations</a></li>
            `;
        }

        navLinks.innerHTML = links;
        authButtons.innerHTML = `
            <span class="text-white me-3"><i class="bi bi-person-circle"></i> ${user.displayName} (${user.role})</span>
            <button class="btn btn-outline-light" onclick="logout()">Logout</button>
        `;
    } else {
        navLinks.innerHTML = '';
        authButtons.innerHTML = `
            <a href="pages/login.html" class="btn btn-outline-light me-2">Login</a>
            <a href="pages/register.html" class="btn btn-light">Register</a>
        `;
    }
}

// Initialize navigation on page load.
document.addEventListener('DOMContentLoaded', renderNavigation);
