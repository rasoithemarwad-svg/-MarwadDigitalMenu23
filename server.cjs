const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3001;
const distPath = path.join(__dirname, 'dist');

console.log('--- Server Startup ---');
console.log('__dirname:', __dirname);
console.log('PORT:', PORT);
console.log('Checking dist folder at:', distPath);

if (fs.existsSync(distPath)) {
    console.log('✓ dist folder found');
} else {
    console.warn('! WARNING: dist folder NOT found. Run "npm run build" first.');
}

// Health check route
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// Serve static files from the React app build directory
app.use(express.static(distPath));

// Catch-all route to serve the index.html for any request (SPA support)
app.get('*', (req, res) => {
    const indexPath = path.join(distPath, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(404).send('Frontend build not found. Please ensure "npm run build" was successful.');
    }
});

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('service-call', (data) => {
        console.log(`Service request from Table: ${data.tableId}`);
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

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log('-----------------------');
});
