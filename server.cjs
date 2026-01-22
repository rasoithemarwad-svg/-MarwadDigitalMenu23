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

// In-memory menu storage (with default items)
let currentMenu = [
    { id: 1, name: 'Marwad Special Dal Bati', price: 350, category: 'RESTAURANT', subCategory: 'Main Course', isAvailable: true, image: 'https://images.unsplash.com/photo-1546549032-9571cd6b27df?w=500&q=80', description: 'Traditional Rajasthani dal with baked bati and ghee.' },
    { id: 2, name: 'Paneer Tikka Masala', price: 280, category: 'RESTAURANT', subCategory: 'Main Course', isAvailable: true, image: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=500&q=80', description: 'Grilled paneer cubes in rich tomato gravy.' },
    { id: 3, name: 'Club Sandwich', price: 180, category: 'CAFE', subCategory: 'Snacks', isAvailable: true, image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=500&q=80', description: 'Triple decker sandwich with fresh veggies.' },
    { id: 4, name: 'Masala Fries', price: 120, category: 'CAFE', subCategory: 'Snacks', isAvailable: true, image: 'https://images.unsplash.com/photo-1630384066252-1911ca992f16?w=500&q=80', description: 'Crispy fries with marwad spices.' },
    { id: 5, name: 'Special Garlic Naan', price: 60, category: 'RESTAURANT', subCategory: 'Breads', isAvailable: true, image: 'https://images.unsplash.com/photo-1601050690597-df056fb04791?w=500&q=80', description: 'Soft leavened bread with garlic.' },
    { id: 6, name: 'Cold Coffee with Ice Cream', price: 150, category: 'CAFE', subCategory: 'Drinks', isAvailable: true, image: 'https://images.unsplash.com/photo-1517701550927-30cf4bb1dba5?w=500&q=80', description: 'Rich creamy cold coffee.' },
    { id: 7, name: 'Hut Special Thali', price: 450, category: 'HUT', subCategory: 'Platter', isAvailable: true, image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=500&q=80', description: 'Exclusive premium Rajasthani meal.' },
    { id: 8, name: 'Smoked Junglee Maas', price: 550, category: 'HUT', subCategory: 'Platter', isAvailable: true, image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=500&q=80', description: 'Smoked spicy meat speciality.' },
];

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

    socket.on('place-order', (orderData) => {
        console.log(`New order from Table: ${orderData.tableId}`);
        io.emit('new-order-alert', orderData);
    });

    // Provide current menu to new connections
    socket.emit('menu-updated', currentMenu);

    socket.on('get-menu', () => {
        socket.emit('menu-updated', currentMenu);
    });

    socket.on('update-menu', (newMenu) => {
        console.log('Global Menu Updated');
        currentMenu = newMenu;
        io.emit('menu-updated', currentMenu);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log('-----------------------');
});
