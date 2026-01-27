import { io } from 'socket.io-client';

// Automatically detect environment
// If running in development (localhost), use window.location.origin (which is localhost:3001 via proxy)
// If running in production (built APK/site), use the Render.com URL
const MATCH_PROD_URL = 'digital-marwad-1.onrender.com';
const PROD_URL = 'https://digital-marwad-1.onrender.com';

let socketUrl;

if (import.meta.env.DEV) {
    // Development mode
    socketUrl = window.location.origin;
} else {
    // Production mode (APK or deployed site)
    socketUrl = PROD_URL;
}

console.log(`🔌 Initializing Socket Mode: ${import.meta.env.DEV ? 'DEV' : 'PROD'}`);
console.log(`📡 Connecting to: ${socketUrl}`);

export const socket = io(socketUrl, {
    transports: ['websocket', 'polling'], // Allow fallback
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
});
