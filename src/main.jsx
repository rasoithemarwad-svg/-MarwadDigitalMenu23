import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

// Global Error Handling for Mobile Debugging
// Global Error Handling for Mobile Debugging
const showErrorOverlay = (msg) => {
  const errorDiv = document.createElement('div');
  errorDiv.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:#8b0000;color:white;z-index:999999;padding:20px;overflow:auto;font-family:monospace;font-size:14px;';
  errorDiv.innerHTML = `<h1>Application Error</h1><pre>${msg}</pre><button onclick="window.location.reload()" style="padding:10px;margin-top:20px;color:black;">Reload</button>`;
  document.body.appendChild(errorDiv);
};

window.onerror = function (message, source, lineno, colno, error) {
  const errorMsg = `Global Error: ${message}\nAt: ${source}:${lineno}:${colno}\nStack: ${error?.stack || 'No stack'}`;
  console.error(errorMsg);
  showErrorOverlay(errorMsg);
  return false;
};

window.onunhandledrejection = function (event) {
  const errorMsg = `Unhandled Promise Rejection: ${event.reason?.stack || event.reason}`;
  console.error(errorMsg);
  showErrorOverlay(errorMsg);
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
