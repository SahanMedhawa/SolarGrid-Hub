// ============================================================
// File: StatusBadge.jsx
// Project: Smart Solar Microgrid Trading System - React Web App
// Description: Reusable status badge component for displaying
//              entity statuses with appropriate styling.
// ============================================================

// Renders a styled status badge based on the status string.
export default function StatusBadge({ status }) {
  const className = status ? status.toLowerCase() : '';
  return (
    <span className={`status-badge ${className}`}>
      {status}
    </span>
  );
}
