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

// 2. MongoDB Connection with auto-reconnect (NO MANUAL RESTART NEEDED)
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_INTERVAL_BASE = 5000; // 5 seconds

async function connectMongoDB() {
    if (!process.env.MONGODB_URI) {
        console.error('❌ CRITICAL: MONGODB_URI is not defined in environment variables!');
        return;
    }

    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            serverApi: {
                version: '1',
                strict: true,
                deprecationErrors: true,
            },
            connectTimeoutMS: 30000,
            socketTimeoutMS: 45000,
            bufferCommands: true // Re-enable buffering to prevent immediate failure
        });

        console.log('✅ Connected to MongoDB');
        reconnectAttempts = 0; // Reset on successful connection

        await initializeData().catch(err => console.error('❌ Data initialization error:', err));
    } catch (err) {
        console.error('❌ MongoDB Connection Error:', err.message);

        // Auto-reconnect with exponential backoff
        if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            reconnectAttempts++;
            const delay = RECONNECT_INTERVAL_BASE * Math.pow(2, reconnectAttempts - 1);
            console.log(`⏳ Reconnection attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS} in ${delay / 1000}s...`);
            setTimeout(connectMongoDB, delay);
        } else {
            console.error('❌ Max reconnection attempts reached. Server will continue without database.');
        }
    }
}

// Event handlers for connection lifecycle
mongoose.connection.on('error', err => {
    console.error('❌ Mongoose Connection Error Event:', err);
});

mongoose.connection.on('disconnected', () => {
    console.log('⚠️ Mongoose Disconnected');

    // Auto-reconnect on disconnect (production reliability)
    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        console.log('🔄 Attempting automatic reconnection...');
        connectMongoDB();
    }
});

mongoose.connection.on('reconnected', () => {
    console.log('✅ MongoDB Reconnected successfully');
    reconnectAttempts = 0;
});

// Initial connection
connectMongoDB();

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
const io = new Server(server, {
    cors: {
        origin: process.env.RENDER_EXTERNAL_URL || "*",
        methods: ["GET", "POST"],
        credentials: true
    },
    transports: ['websocket', 'polling'], // Explicitly allow both transports
    allowEIO3: true, // Backward compatibility
    pingTimeout: 60000, // 60 seconds
    pingInterval: 25000 // 25 seconds
});

// 4. Socket.IO Events
io.on('connection', async (socket) => {
    console.log('👤 User connected:', socket.id, 'at', new Date().toISOString());
    console.log('   Transport:', socket.conn.transport.name); // Log connection transport method

    socket.emit('kitchen-status-updated', isKitchenOpen);

    try {
        const settings = await Setting.find({});
        const settingsObj = {};
        settings.forEach(s => settingsObj[s.key] = s.value);
        socket.emit('settings-updated', settingsObj);
    } catch (err) {
        console.error('❌ Socket initialization error:', err);
    }

    socket.on('login', async ({ password }) => {
        // STATIC AUTHENTICATION (Bypasses DB for reliability)
        if (password === 'THEMARWADRASOI@2026') {
            socket.emit('login-success', { username: 'THE MARWAD RASOI', role: 'OWNER' });
            console.log(`🔑 Owner logged in via password`);
        } else if (password === '130289') {
            socket.emit('login-success', { username: 'STAFF', role: 'STAFF' });
            console.log(`🔑 Staff logged in via password`);
        } else if (password === '123123') {
            socket.emit('login-success', { username: 'DELIVERY PARTNER', role: 'DELIVERY' });
            console.log(`🔑 Delivery Partner logged in via password`);
        } else {
            socket.emit('login-error', 'Invalid password');
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

    socket.on('song-request', (data) => {
        io.emit('new-song-request', {
            id: Date.now(),
            tableId: data.tableId,
            songName: data.songName,
            timestamp: new Date().toISOString()
        });
    });

    socket.on('song-accepted', (data) => {
        // Broadcast to all to notify the specific table
        io.emit('song-request-accepted', {
            tableId: data.tableId,
            songName: data.songName
        });
    });

    socket.on('get-orders', async () => {
        const orders = await Order.find({ status: { $ne: 'cancelled' } }).sort({ timestamp: -1 });
        socket.emit('orders-updated', orders);
    });

    socket.on('place-order', async (orderData) => {
        try {
            // PRODUCTION VALIDATION (prevents bad data)

            // 1. Validate items exist and not empty
            if (!orderData.items || !Array.isArray(orderData.items) || orderData.items.length === 0) {
                console.error('❌ Invalid order: No items');
                socket.emit('order-error', 'Order must contain at least one item');
                return;
            }

            // 2. Validate each item has required fields
            for (const item of orderData.items) {
                if (!item.name || typeof item.price !== 'number' || !item.qty || item.qty < 1) {
                    console.error('❌ Invalid order: Malformed item data');
                    socket.emit('order-error', 'Invalid item data');
                    return;
                }
            }

            // 3. Validate order total matches calculated total
            const calculatedTotal = orderData.items.reduce((sum, item) => sum + (item.price * item.qty), 0);
            if (Math.abs(calculatedTotal - orderData.total) > 0.01) {
                console.error('❌ Invalid order: Total mismatch');
                socket.emit('order-error', 'Order total does not match items');
                return;
            }

            // 4. Validate delivery details if delivery order
            if (orderData.isDelivery && orderData.deliveryDetails) {
                const dd = orderData.deliveryDetails;

                // Validate customer name
                if (!dd.customerName || dd.customerName.trim().length < 2) {
                    socket.emit('order-error', 'Invalid customer name');
                    return;
                }

                // Validate phone number (10 digits)
                const phoneRegex = /^[6-9]\d{9}$/;
                if (!dd.customerPhone || !phoneRegex.test(dd.customerPhone.trim())) {
                    socket.emit('order-error', 'Invalid phone number');
                    return;
                }

                // Validate address
                if (!dd.deliveryAddress || dd.deliveryAddress.trim().length < 10) {
                    socket.emit('order-error', 'Invalid delivery address');
                    return;
                }

                // Validate GPS coordinates if provided
                if (dd.location) {
                    if (typeof dd.location.lat !== 'number' || typeof dd.location.lng !== 'number') {
                        socket.emit('order-error', 'Invalid GPS coordinates');
                        return;
                    }
                    // Validate coordinate ranges
                    if (dd.location.lat < -90 || dd.location.lat > 90 || dd.location.lng < -180 || dd.location.lng > 180) {
                        socket.emit('order-error', 'GPS coordinates out of range');
                        return;
                    }
                }

                // Sanitize delivery details
                orderData.deliveryDetails.customerName = dd.customerName.trim().substring(0, 100);
                orderData.deliveryDetails.customerPhone = dd.customerPhone.trim();
                orderData.deliveryDetails.deliveryAddress = dd.deliveryAddress.trim().substring(0, 500);
            }

            // 5. Sanitize table ID
            if (orderData.tableId) {
                orderData.tableId = String(orderData.tableId).trim().substring(0, 50);
            }

            // Save validated order
            const newOrder = new Order(orderData);
            await newOrder.save();

            console.log(`✅ Order saved: ${orderData.isDelivery ? 'DELIVERY' : 'Table ' + orderData.tableId}`);

            io.emit('new-order-alert', newOrder);
            const allOrders = await Order.find({ status: { $ne: 'cancelled' } }).sort({ timestamp: -1 });
            io.emit('orders-updated', allOrders);
        } catch (err) {
            console.error('❌ Error placing order:', err);
            socket.emit('order-error', 'Failed to place order. Please try again.');
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

    socket.on('process-manual-sale', async (saleData) => {
        try {
            const newSale = new Sale({
                tableId: saleData.tableId,
                items: saleData.items,
                total: saleData.total,
                paymentMode: saleData.paymentMode,
                settledAt: new Date()
            });
            await newSale.save();
            const updatedSales = await Sale.find({}).sort({ settledAt: -1 });
            io.emit('sales-updated', updatedSales);
            console.log(`✅ Manual sale recorded: ${saleData.tableId} - ₹${saleData.total} (${saleData.paymentMode})`);
        } catch (err) {
            console.error('❌ Error processing manual sale:', err);
        }
    });

    socket.on('get-sales', async () => {
        const sales = await Sale.find({}).sort({ settledAt: -1 });
        socket.emit('sales-updated', sales);
    });

    socket.on('get-expenses', async () => {
        const expenses = await Expense.find({}).sort({ date: -1 });
        socket.emit('expenses-updated', expenses);
    });

    socket.on('clear-history', async () => {
        try {
            await Sale.deleteMany({});
            await Expense.deleteMany({});
            await Order.deleteMany({ status: { $in: ['completed', 'cancelled'] } }); // Optional: keep active?

            io.emit('sales-updated', []);
            io.emit('expenses-updated', []);
            console.log('🧹 History Cleared via Admin');
        } catch (err) {
            console.error('Failed to clear history:', err);
        }
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
