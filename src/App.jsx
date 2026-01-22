import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import MenuPage from './pages/MenuPage';
import AdminPanel from './components/AdminPanel';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/hut" element={<MenuPage category="hut" title="HUT Menu" />} />
        <Route path="/cafe" element={<MenuPage category="cafe" title="CAFE Menu" />} />
        <Route path="/restaurant" element={<MenuPage category="restaurant" title="RESTAURANT Menu" />} />
        <Route path="/service" element={<ServiceBellPage />} />
        <Route path="/rate" element={<RateWinPage />} />
        <Route path="/admin" element={<AdminPanel />} />
      </Routes>
    </Router>
  );
}

// Simple placeholder components
const ServiceBellPage = () => {
  const navigate = require('react-router-dom').useNavigate();
  const [searchParams] = require('react-router-dom').useSearchParams();
  const tableNumber = searchParams.get('table') || 'unknown';

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      color: 'white'
    }}>
      <button
        onClick={() => navigate(`/?table=${tableNumber}`)}
        style={{
          position: 'absolute',
          top: '1rem',
          left: '1rem',
          background: 'rgba(255,255,255,0.2)',
          border: 'none',
          padding: '0.5rem 1rem',
          borderRadius: '8px',
          color: 'white',
          cursor: 'pointer'
        }}
      >
        ← Back
      </button>
      <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Service Bell</h1>
      <p style={{ fontSize: '1.125rem', marginBottom: '2rem' }}>Need assistance? We're here to help!</p>
      <button style={{
        background: 'white',
        color: '#667eea',
        border: 'none',
        padding: '1rem 2rem',
        borderRadius: '25px',
        fontSize: '1.125rem',
        fontWeight: '600',
        cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
      }}>
        Call Waiter
      </button>
    </div>
  );
};

const RateWinPage = () => {
  const navigate = require('react-router-dom').useNavigate();
  const [searchParams] = require('react-router-dom').useSearchParams();
  const tableNumber = searchParams.get('table') || 'unknown';

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      color: 'white'
    }}>
      <button
        onClick={() => navigate(`/?table=${tableNumber}`)}
        style={{
          position: 'absolute',
          top: '1rem',
          left: '1rem',
          background: 'rgba(255,255,255,0.2)',
          border: 'none',
          padding: '0.5rem 1rem',
          borderRadius: '8px',
          color: 'white',
          cursor: 'pointer'
        }}
      >
        ← Back
      </button>
      <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Rate & Win</h1>
      <p style={{ fontSize: '1.125rem', marginBottom: '2rem', textAlign: 'center' }}>
        Share your feedback and get a chance to win exciting prizes!
      </p>
      <div style={{
        background: 'white',
        padding: '2rem',
        borderRadius: '16px',
        color: '#333',
        maxWidth: '400px',
        width: '100%'
      }}>
        <p style={{ marginBottom: '1rem', fontWeight: '600' }}>How was your experience?</p>
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', fontSize: '2rem' }}>
          {['⭐', '⭐', '⭐', '⭐', '⭐'].map((star, i) => (
            <span key={i} style={{ cursor: 'pointer' }}>{star}</span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default App;
