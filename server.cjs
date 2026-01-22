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
    { id: 9, name: 'Tea+Toast', price: 40, category: 'CAFE', subCategory: 'DRINKS', isAvailable: true, image: 'https://images.unsplash.com/photo-1544787210-2211d7c928c0?w=500&q=80', description: 'Refreshing tea served with crispy toast.' },
    { id: 10, name: 'Coffee hot', price: 50, category: 'CAFE', subCategory: 'DRINKS', isAvailable: true, image: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=500&q=80', description: 'Hot brewed classic coffee.' },
    { id: 11, name: 'cold coffee', price: 80, category: 'CAFE', subCategory: 'DRINKS', isAvailable: true, image: 'https://images.unsplash.com/photo-1517701550927-30cf4bb1dba5?w=500&q=80', description: 'Chilled coffee with a creamy texture.' },
    { id: 12, name: 'lemon tea', price: 30, category: 'CAFE', subCategory: 'DRINKS', isAvailable: true, image: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=500&q=80', description: 'Light tea with a zing of lemon.' },
    { id: 13, name: 'ginger honey tea', price: 50, category: 'CAFE', subCategory: 'DRINKS', isAvailable: true, image: 'https://images.unsplash.com/photo-1556881286-fc6915169721?w=500&q=80', description: 'Warm tea with ginger and honey notes.' },
    { id: 14, name: 'coke', price: 35, category: 'CAFE', subCategory: 'DRINKS', isAvailable: true, image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500&q=80', description: 'Classic Coca-Cola.' },
    { id: 15, name: 'thumps up', price: 35, category: 'CAFE', subCategory: 'DRINKS', isAvailable: true, image: 'https://images.unsplash.com/photo-1581006852262-e4307cf6283a?w=500&q=80', description: 'Strong thumps up cola.' },
    { id: 16, name: 'dew', price: 35, category: 'CAFE', subCategory: 'DRINKS', isAvailable: true, image: 'https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?w=500&q=80', description: 'Mountain Dew citrus soda.' },
    { id: 17, name: 'sprite', price: 35, category: 'CAFE', subCategory: 'DRINKS', isAvailable: true, image: 'https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?w=500&q=80', description: 'Clear lemon-lime soda.' },
    { id: 18, name: 'fanta', price: 35, category: 'CAFE', subCategory: 'DRINKS', isAvailable: true, image: 'https://images.unsplash.com/photo-1624517452488-04869289c4ca?w=500&q=80', description: 'Bubbly orange fanta.' },
    { id: 19, name: 'Egg maggie', price: 100, category: 'CAFE', subCategory: 'Maggie', isAvailable: true, image: 'https://images.unsplash.com/photo-1626808642820-20059969562a?w=500&q=80', description: 'Classic maggie noodles with scrambled eggs.' },
    { id: 20, name: 'peri peri maggie', price: 120, category: 'CAFE', subCategory: 'Maggie', isAvailable: true, image: 'https://images.unsplash.com/photo-1623245455621-933618de488f?w=500&q=80', description: 'Spicy maggie with a peri-peri kick.' },
    { id: 21, name: 'Masala maggie', price: 120, category: 'CAFE', subCategory: 'Maggie', isAvailable: true, image: 'https://images.unsplash.com/photo-1612927601601-663840275991?w=500&q=80', description: 'Extra spicy masala maggie.' },
    { id: 22, name: 'vegitable maggie', price: 110, category: 'CAFE', subCategory: 'Maggie', isAvailable: true, image: 'https://images.unsplash.com/photo-1526318896980-cf78c088247c?w=500&q=80', description: 'Healthy maggie loaded with fresh vegetables.' },
    { id: 23, name: 'maggie with cheese', price: 140, category: 'CAFE', subCategory: 'Maggie', isAvailable: true, image: 'https://images.unsplash.com/photo-1619531043563-780ba306354a?w=500&q=80', description: 'Creamy maggie topped with melted cheese.' },
    { id: 24, name: 'hakka noodels', price: 130, category: 'CAFE', subCategory: 'NOODELS', isAvailable: true, image: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=500&q=80', description: 'Classic stir-fried hakka noodles.' },
    { id: 25, name: 'veg chowmine', price: 140, category: 'CAFE', subCategory: 'NOODELS', isAvailable: true, image: 'https://images.unsplash.com/photo-1617093727343-374698b1b08d?w=500&q=80', description: 'Delicious vegetable chowmein.' },
    { id: 26, name: 'shejwan noodel', price: 150, category: 'CAFE', subCategory: 'NOODELS', isAvailable: true, image: 'https://images.unsplash.com/photo-1543339308-43e59d6b73a6?w=500&q=80', description: 'Spicy Schezwan style noodles.' },
    { id: 27, name: 'veg paneer noodels', price: 170, category: 'CAFE', subCategory: 'NOODELS', isAvailable: true, image: 'https://images.unsplash.com/photo-1645177623570-5283899933c7?w=500&q=80', description: 'Stir-fried noodles with fresh paneer cubes.' },
    { id: 28, name: 'paneer pakode', price: 200, category: 'CAFE', subCategory: 'pakode', isAvailable: true, image: 'https://plus.unsplash.com/premium_photo-1694141253457-4187317730e2?w=500&q=80', description: 'Crispy paneer fritters.' },
    { id: 29, name: 'veg pakode', price: 180, category: 'CAFE', subCategory: 'pakode', isAvailable: true, image: 'https://images.unsplash.com/photo-1601050690597-df056fb04791?w=500&q=80', description: 'Assorted vegetable fritters.' },
    { id: 30, name: 'egg pakode', price: 180, category: 'CAFE', subCategory: 'pakode', isAvailable: true, image: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&q=80', description: 'Spicy egg fritters.' },
    { id: 31, name: 'chicken roll', price: 100, category: 'CAFE', subCategory: 'ROLLS', isAvailable: true, image: 'https://images.unsplash.com/photo-1563379091339-03b21bc4a4f8?w=500&q=80', description: 'Spicy chicken filled roll.' },
    { id: 32, name: 'egg roll', price: 80, category: 'CAFE', subCategory: 'ROLLS', isAvailable: true, image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=500&q=80', description: 'Classic egg paratha roll.' },
    { id: 33, name: 'veg roll', price: 60, category: 'CAFE', subCategory: 'ROLLS', isAvailable: true, image: 'https://images.unsplash.com/photo-1626776876729-bab4369a5a5a?w=500&q=80', description: 'Fresh vegetable roll.' },
    { id: 34, name: 'spring roll', price: 50, category: 'CAFE', subCategory: 'ROLLS', isAvailable: true, image: 'https://images.unsplash.com/photo-1517433367423-c7e5b0f35086?w=500&q=80', description: 'Crispy vegetable spring rolls.' },
    { id: 35, name: 'veg paneer roll', price: 120, category: 'CAFE', subCategory: 'ROLLS', isAvailable: true, image: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&q=80', description: 'Soft roll with paneer stuffing.' },
    { id: 36, name: 'cheese corn roll', price: 140, category: 'CAFE', subCategory: 'ROLLS', isAvailable: true, image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500&q=80', description: 'Cheesy corn filled roll.' },
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
