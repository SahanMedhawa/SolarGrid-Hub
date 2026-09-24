// ============================================================
// File: main.jsx
// Project: Smart Solar Microgrid Trading System - React Web App
// Description: Application entry point. Mounts the React app
//              to the DOM root element.
// ============================================================

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
