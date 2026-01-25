import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

// Global Error Handling for Mobile Debugging
window.onerror = function (message, source, lineno, colno, error) {
  const errorMsg = `Error: ${message} at ${source}:${lineno}:${colno}`;
  console.error(errorMsg);
  // Optional: alert(errorMsg); // Temporary for physical mobile debugging
  return false;
};

window.onunhandledrejection = function (event) {
  console.error('Unhandled rejection:', event.reason);
  // alert('Promise Rejection: ' + event.reason);
};

console.log('App starting at:', new Date().toISOString());
console.log('User Agent:', navigator.userAgent);

// Simple Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, errorInfo) { console.error("Caught by boundary:", error, errorInfo); }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', color: 'white', background: '#8b0000', minHeight: '100vh', textAlign: 'center' }}>
          <h1>Something went wrong.</h1>
          <pre style={{ textAlign: 'left', background: 'rgba(0,0,0,0.5)', padding: '10px', overflow: 'auto' }}>
            {this.state.error && this.state.error.toString()}
          </pre>
          <button onClick={() => window.location.reload()} style={{ padding: '10px 20px', marginTop: '20px' }}>Reload App</button>
        </div>
      );
    }
    return this.props.children;
  }
}

import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
