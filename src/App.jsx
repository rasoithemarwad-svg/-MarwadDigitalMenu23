import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppHome from './pages/AppHome';
import AdminDashboard from './pages/AdminDashboard';
import CustomerView from './pages/CustomerView';
import PrintQRs from './pages/PrintQRs';
import DeliveryPartner from './pages/DeliveryPartner';
import './index.css';

function App() {
  return (
    <BrowserRouter>
      {/* GLOBAL DEBUG HEADER - TEMPORARY */}
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', background: 'red', color: 'white', zIndex: 99999, textAlign: 'center', fontSize: '10px', padding: '2px', pointerEvents: 'none', opacity: 0.5 }}>
        DEBUG: v1.5 | Path: {window.location.pathname}
      </div>
      <Routes>
        {/* Admin Dashboard is now the primary landing page */}
        <Route path="/" element={<AppHome />} />

        {/* Customer view remains accessible via QR code / URL params */}
        <Route path="/table/:tableId" element={<CustomerView />} />
        <Route path="/customer/:tableId" element={<CustomerView />} />

        {/* Maintain /admin path for convenience */}
        <Route path="/admin" element={<AdminDashboard />} />

        {/* Old landing page moved to /home if ever needed */}
        <Route path="/home" element={<AppHome />} />

        {/* Print QR Codes View */}
        <Route path="/print-qrs" element={<PrintQRs />} />

        {/* Delivery Partner Interface */}
        <Route path="/delivery-partner" element={<DeliveryPartner />} />
        <Route path="/delivery/dashboard" element={<DeliveryPartner />} />

        {/* Catch-all for 404 */}
        <Route path="*" element={
          <div style={{ color: 'white', textAlign: 'center', marginTop: '50px' }}>
            <h1>404 - Page Not Found</h1>
            <p>Current Path: {window.location.pathname}</p>
          </div>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
