// ============================================================
// File: passwordValidation.js
// Project: Smart Solar Microgrid Trading System - React Web App
// Description: Shared strong-password validation, matching the
//              backend rule exactly.
// ============================================================

const SPECIAL_CHARS = /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/;

export function validatePassword(password) {
  if (!password) return 'Password is required.';
  if (password.length < 8) return 'Password must be at least 8 characters long.';
  if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter.';
  if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter.';
  if (!/[0-9]/.test(password)) return 'Password must contain at least one number.';
  if (!SPECIAL_CHARS.test(password)) return 'Password must contain at least one special character (e.g. ! @ # $ % ^ & *).';
  return null;
}