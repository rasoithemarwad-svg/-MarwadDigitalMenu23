import { io } from 'socket.io-client';

// Define variables FIRST to avoid ReferenceError
const hostname = window.location.hostname;
const port = window.location.port;
const protocol = window.location.protocol;
let socketUrl = window.location.origin; // Default to current origin

// 1. Production / Render Deploy
if (hostname.includes('onrender.com')) {
    // Dynamically use the current Render URL (e.g. marwaddigitalmenu23-1.onrender.com)
    socketUrl = window.location.origin;
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
