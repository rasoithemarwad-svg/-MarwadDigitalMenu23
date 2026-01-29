const MATCH_PROD_URL = 'digital-marwad-1.onrender.com';
const PROD_URL = 'https://digital-marwad-1.onrender.com';

let socketUrl = window.location.origin;

// Smart Detection for Development/Split Environment
// If we are running on a dev port (typically 5173 for Vite), point to the backend port (3001)
// keeping the same hostname (localhost or IP)
if (window.location.port && window.location.port !== '3001' && !window.location.hostname.includes('onrender.com')) {
    // If we're on port 8085 (User's case) or 5173 (Dev), target port 3001
    // This assumes the backend is always running on 3001 locally/LAN
    const backendPort = '3001';
    socketUrl = `${window.location.protocol}//${window.location.hostname}:${backendPort}`;
}

console.log(`🔌 Socket connecting to: ${socketUrl}`);

export const socket = io(socketUrl, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 20,
    reconnectionDelay: 1000,
});
