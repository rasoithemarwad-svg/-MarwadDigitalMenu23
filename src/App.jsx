import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import CustomerView from './pages/CustomerView';
import AdminDashboard from './pages/AdminDashboard';
import './index.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Customer view with table ID param */}
        <Route path="/table/:tableId" element={<CustomerView />} />
        
        {/* Default route for customers without table ID */}
        <Route path="/" element={<Navigate to="/table/1" replace />} />
        
        {/* Admin Dashboard */}
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
