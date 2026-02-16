import { io } from 'socket.io-client';

const MATCH_PROD_URL = 'digital-marwad-1.onrender.com';
const PROD_URL = 'https://digital-marwad-1.onrender.com';

let socketUrl = window.location.origin;

// Smart Detection for Development/Split Environment
// If we are running on a dev port (typically 5173 for Vite), point to the backend port (3001)
// keeping the same hostname (localhost or IP)

const hostname = window.location.hostname;
const port = window.location.port;
const protocol = window.location.protocol;

// 1. Production / Render Deploy
if (hostname.includes('onrender.com')) {
    socketUrl = PROD_URL;
}
// 2. Local Development (Vite on 5173 -> Backend on 3001)
else if (port === '5173' || (port && port !== '3001')) {
    // If accessing via IP (192.168.x.x:5173) or Localhost:5173
    socketUrl = `${protocol}//${hostname}:3001`;
}
// 3. Tunnels (ngrok, localtunnel, serveo) - usually port 80/443 (empty string)
// If serving via tunnel, backend is likely proxied through the same tunnel or needs specific handling.
// For simple tunnels forwarding to server.cjs (3001), origin is correct.
// For tunnels forwarding to vite (5173), vite proxies /socket.io to 3001, so origin is also correct.
else {
    // Default to current origin (Production build served on 3001 or Tunnel)
    socketUrl = window.location.origin;
}

console.log(`🔌 Socket connecting to: ${socketUrl}`);

export const socket = io(socketUrl, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 20,
    reconnectionDelay: 1000,
});
