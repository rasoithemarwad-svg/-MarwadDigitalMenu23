require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const https = require('https');

// Models
const MenuItem = require('./models/MenuItem.cjs');
const Order = require('./models/Order.cjs');
const Sale = require('./models/Sale.cjs');
const Expense = require('./models/Expense.cjs');
const Setting = require('./models/Setting.cjs');
const User = require('./models/User.cjs');

const app = express();

// 1. Immediate Health Check for Render
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const distPath = path.join(__dirname, 'dist');

// Global States
let isKitchenOpen = true;

// 2. MongoDB Connection safely
if (!process.env.MONGODB_URI) {
    console.error('❌ CRITICAL: MONGODB_URI is not defined in environment variables!');
} else {
    mongoose.connect(process.env.MONGODB_URI, {
        serverApi: {
            version: '1',
            strict: true,
            deprecationErrors: true,
        },
        connectTimeoutMS: 30000,
        socketTimeoutMS: 45000,
        bufferCommands: true // Re-enable buffering to prevent immediate failure
    })
        .then(() => {
            console.log('✅ Connected to MongoDB');
            initializeData().catch(err => console.error('❌ Data initialization error:', err));
        })
        .catch(err => {
            console.error('❌ MongoDB Connection Error:', err.message);
        });

    mongoose.connection.on('error', err => {
        console.error('❌ Mongoose Connection Error Event:', err);
    });

    mongoose.connection.on('disconnected', () => {
        console.log('⚠️ Mongoose Disconnected');
    });
}

// Global check for database readiness
const checkDB = () => mongoose.connection.readyState === 1;

// Port Data from JSON to DB if empty
async function initializeData() {
    try {
        const menuCount = await MenuItem.countDocuments();
        if (menuCount === 0) {
            const DATA_FILE = path.join(__dirname, 'menu_data.json');
            if (fs.existsSync(DATA_FILE)) {
                const fileData = fs.readFileSync(DATA_FILE, 'utf8');
                const legacyMenu = JSON.parse(fileData);
                await MenuItem.insertMany(legacyMenu);
                console.log('✅ legacy menu imported to MongoDB');
            }
        }

        const radiusSetting = await Setting.findOne({ key: 'deliveryRadiusKm' });
        if (!radiusSetting) {
            await Setting.create({ key: 'deliveryRadiusKm', value: 5.0 });
        }

        // Initialize RBAC Users
        const adminUser = await User.findOne({ role: 'ADMIN' });
        if (!adminUser) {
            await User.create({
                username: 'THEMARWADRASOI',
                password: 'THEMARWADRASOI@2026',
                role: 'ADMIN'
            });
            console.log('👤 Admin user created');
        }

        const managerUser = await User.findOne({ role: 'MANAGER' });
        if (!managerUser) {
            await User.create({
                username: 'THEMARWADRASOI',
                password: '130289',
                role: 'MANAGER'
            });
            console.log('👤 Manager user created');
        }
    } catch (err) {
        console.error('❌ Error in initializeData:', err);
    }
}

// 3. Static Files & Routing
app.use(express.static(distPath));

app.get('*', (req, res) => {
    const indexPath = path.join(distPath, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(404).send('Frontend build not found. Verify dist folder exists.');
    }
});

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });

// 4. Socket.IO Events
io.on('connection', async (socket) => {
    console.log('👤 User connected:', socket.id);

    socket.emit('kitchen-status-updated', isKitchenOpen);

    try {
        const settings = await Setting.find({});
        const settingsObj = {};
        settings.forEach(s => settingsObj[s.key] = s.value);
        socket.emit('settings-updated', settingsObj);
    } catch (err) {
        console.error('❌ Socket initialization error:', err);
    }

    socket.on('login', async ({ username, password }) => {
        if (!checkDB()) {
            return socket.emit('login-error', '❌ Database is still connecting. Please wait 10 seconds and try again.');
        }
        try {
            const user = await User.findOne({ username, password });
            if (user) {
                socket.emit('login-success', { username: user.username, role: user.role });
                console.log(`🔑 User ${username} logged in as ${user.role}`);
            } else {
                socket.emit('login-error', 'Invalid username or password');
            }
        } catch (err) {
            console.error('❌ Login error:', err.message);
            console.error(err.stack);
            socket.emit('login-error', `Internal server error: ${err.message}`);
        }
    });

    socket.on('service-call', (data) => {
        io.emit('new-service-alert', {
            id: Date.now(),
            tableId: data.tableId,
            timestamp: new Date().toISOString(),
            status: 'new'
        });
    });

    socket.on('get-orders', async () => {
        const orders = await Order.find({ status: { $ne: 'cancelled' } }).sort({ timestamp: -1 });
        socket.emit('orders-updated', orders);
    });

    socket.on('place-order', async (orderData) => {
        try {
            const newOrder = new Order(orderData);
            await newOrder.save();
            io.emit('new-order-alert', newOrder);
            const allOrders = await Order.find({ status: { $ne: 'cancelled' } }).sort({ timestamp: -1 });
            io.emit('orders-updated', allOrders);
        } catch (err) {
            console.error('❌ Error placing order:', err);
        }
    });

    socket.on('update-order-status', async ({ id, status }) => {
        await Order.findByIdAndUpdate(id, { status });
        const allOrders = await Order.find({ status: { $ne: 'cancelled' } }).sort({ timestamp: -1 });
        io.emit('orders-updated', allOrders);
    });

    socket.on('get-menu', async () => {
        const menu = await MenuItem.find({});
        socket.emit('menu-updated', menu);
    });

    socket.on('update-menu-item', async (item) => {
        if (item._id) {
            await MenuItem.findByIdAndUpdate(item._id, item);
        } else {
            await MenuItem.create(item);
        }
        const updatedMenu = await MenuItem.find({});
        io.emit('menu-updated', updatedMenu);
    });

    socket.on('delete-menu-item', async (id) => {
        await MenuItem.findByIdAndDelete(id);
        const updatedMenu = await MenuItem.find({});
        io.emit('menu-updated', updatedMenu);
    });

    socket.on('toggle-kitchen-status', (status) => {
        isKitchenOpen = status;
        io.emit('kitchen-status-updated', isKitchenOpen);
    });

    socket.on('save-sale', async (saleData) => {
        const newSale = new Sale(saleData);
        await newSale.save();
        await Order.updateMany({ tableId: saleData.tableId, status: { $ne: 'cancelled' } }, { status: 'cancelled' });
        const updatedSales = await Sale.find({}).sort({ settledAt: -1 });
        io.emit('sales-updated', updatedSales);
        const allOrders = await Order.find({ status: { $ne: 'cancelled' } }).sort({ timestamp: -1 });
        io.emit('orders-updated', allOrders);
    });

    socket.on('get-sales', async () => {
        const sales = await Sale.find({}).sort({ settledAt: -1 });
        socket.emit('sales-updated', sales);
    });

    socket.on('get-expenses', async () => {
        const expenses = await Expense.find({}).sort({ date: -1 });
        socket.emit('expenses-updated', expenses);
    });

    socket.on('add-expense', async (expenseData) => {
        await Expense.create(expenseData);
        const updatedExpenses = await Expense.find({}).sort({ date: -1 });
        io.emit('expenses-updated', updatedExpenses);
    });

    socket.on('delete-expense', async (id) => {
        await Expense.findByIdAndDelete(id);
        const updatedExpenses = await Expense.find({}).sort({ date: -1 });
        io.emit('expenses-updated', updatedExpenses);
    });

    socket.on('update-settings', async (settings) => {
        for (const [key, value] of Object.entries(settings)) {
            await Setting.findOneAndUpdate({ key }, { value }, { upsert: true });
        }
        const updatedSettings = await Setting.find({});
        const settingsObj = {};
        updatedSettings.forEach(s => settingsObj[s.key] = s.value);
        io.emit('settings-updated', settingsObj);
    });

    socket.on('disconnect', () => console.log('👤 User disconnected:', socket.id));
});

// 5. Global Process Handlers
process.on('uncaughtException', (err) => {
    console.error('❌ FATAL UNCAUGHT EXCEPTION:', err.stack || err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ FATAL UNHANDLED REJECTION at:', promise, 'reason:', reason);
});

// 6. Server Start
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 STARTUP CONFIGURATION`);
    console.log(`📡 PORT: ${PORT}`);
    console.log(`🏠 HOST: 0.0.0.0`);
    console.log(`📦 NODE: ${process.version}`);
    console.log(`📂 DIR: ${__dirname}`);
    console.log(`🌍 URL: ${process.env.RENDER_EXTERNAL_URL || 'Not Set'}`);

    const RENDER_URL = process.env.RENDER_EXTERNAL_URL;

    if (RENDER_URL) {
        console.log(`🔄 Keep-alive heartbeat enabled for: ${RENDER_URL}`);

        setInterval(() => {
            try {
                const url = `${RENDER_URL}/health`;
                https.get(url, (res) => {
                    res.resume();
                    if (res.statusCode === 200) {
                        console.log(`💓 Heartbeat OK (${new Date().toLocaleTimeString()})`);
                    } else {
                        console.log(`💔 Heartbeat Status: ${res.statusCode}`);
                    }
                }).on('error', (err) => {
                    console.log(`💔 Heartbeat Network Error: ${err.message}`);
                });
            } catch (error) {
                console.log(`💔 Heartbeat Timer Error: ${error.message}`);
            }
        }, 5 * 60 * 1000);

        setTimeout(() => {
            https.get(`${RENDER_URL}/health`, (res) => {
                res.resume();
                console.log('🏁 Startup self-check ping sent');
            }).on('error', () => { });
        }, 30000);
    } else {
        console.log('ℹ️ Local server (No self-ping)');
    }
});
