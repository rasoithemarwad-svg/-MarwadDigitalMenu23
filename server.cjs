const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const path = require('path');
app.use(cors());

// Serve static files from the React app build directory
app.use(express.static(path.join(__dirname, 'dist')));

// Catch-all route to serve the index.html for any request (SPA support)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // In production, replace with your frontend URL
        methods: ["GET", "POST"]
    }
});

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Listen for service requests from customers
    socket.on('service-call', (data) => {
        console.log(`Service request from Table: ${data.tableId}`);
        // Broadcast to all connected clients (especially the admin)
        io.emit('new-service-alert', {
            id: Date.now(),
            tableId: data.tableId,
            timestamp: new Date().toISOString(),
            status: 'new'
        });
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
