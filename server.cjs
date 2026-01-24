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

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const distPath = path.join(__dirname, 'dist');

// Global States
let isKitchenOpen = true;

// MongoDB Connection safely
if (!process.env.MONGODB_URI) {
    console.error('✗ CRITICAL: MONGODB_URI is not defined in environment variables!');
} else {
    mongoose.connect(process.env.MONGODB_URI, {
        serverApi: {
            version: '1',
            strict: true,
            deprecationErrors: true,
        }
    })
        .then(() => {
            console.log('✓ Connected to MongoDB');
            initializeData();
        })
        .catch(err => {
            console.error('✗ Initial MongoDB connection error:', err.message);
        });
}

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
                console.log('✓ Ported legacy menu to MongoDB');
            }
        }

        // Initial Settings
        const radiusSetting = await Setting.findOne({ key: 'deliveryRadiusKm' });
        if (!radiusSetting) {
            await Setting.create({ key: 'deliveryRadiusKm', value: 5.0 });
        }
    } catch (err) {
        console.error('Error initializing data:', err);
    }
}

// Routes
app.get('/health', (req, res) => res.status(200).send('OK'));
app.use(express.static(distPath));

app.get('*', (req, res) => {
    const indexPath = path.join(distPath, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(404).send('Frontend build not found.');
    }
});

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });

io.on('connection', async (socket) => {
    console.log('User connected:', socket.id);

    // Initial Sync
    socket.emit('kitchen-status-updated', isKitchenOpen);

    const settings = await Setting.find({});
    const settingsObj = {};
    settings.forEach(s => settingsObj[s.key] = s.value);
    socket.emit('settings-updated', settingsObj);

    // Service Alerts
    socket.on('service-call', (data) => {
        io.emit('new-service-alert', {
            id: Date.now(),
            tableId: data.tableId,
            timestamp: new Date().toISOString(),
            status: 'new'
        });
    });

    // Orders
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
            console.error('Error placing order:', err);
        }
    });

    socket.on('update-order-status', async ({ id, status }) => {
        await Order.findByIdAndUpdate(id, { status });
        const allOrders = await Order.find({ status: { $ne: 'cancelled' } }).sort({ timestamp: -1 });
        io.emit('orders-updated', allOrders);
    });

    // Menu
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

    // Sales
    socket.on('save-sale', async (saleData) => {
        const newSale = new Sale(saleData);
        await newSale.save();
        await Order.updateMany({ tableId: saleData.tableId, status: 'completed' }, { status: 'cancelled' });
        const updatedSales = await Sale.find({}).sort({ settledAt: -1 });
        io.emit('sales-updated', updatedSales);
        const allOrders = await Order.find({ status: { $ne: 'cancelled' } }).sort({ timestamp: -1 });
        io.emit('orders-updated', allOrders);
    });

    socket.on('get-sales', async () => {
        const sales = await Sale.find({}).sort({ settledAt: -1 });
        socket.emit('sales-updated', sales);
    });

    // Expenses
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

    socket.on('disconnect', () => console.log('User disconnected:', socket.id));
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`✓ Server running on port ${PORT} (0.0.0.0)`);

    // Self-ping mechanism to keep Render server awake
    const RENDER_URL = process.env.RENDER_EXTERNAL_URL;

    if (RENDER_URL) {
        console.log(`🔄 Self-ping keep-alive enabled for: ${RENDER_URL}`);

        setInterval(() => {
            try {
                const url = `${RENDER_URL}/health`;
                https.get(url, (res) => {
                    res.resume(); // Consume data
                    if (res.statusCode === 200) {
                        console.log(`✓ Keep-alive ping successful at ${new Date().toLocaleTimeString()}`);
                    }
                }).on('error', (err) => {
                    console.log(`⚠ Keep-alive ping error: ${err.message}`);
                });
            } catch (error) {
                console.log(`⚠ Keep-alive error: ${error.message}`);
            }
        }, 5 * 60 * 1000); // 5 minutes

        // Initial ping after 30 seconds
        setTimeout(() => {
            https.get(`${RENDER_URL}/health`, (res) => {
                res.resume();
                console.log('✓ Initial keep-alive ping sent');
            }).on('error', () => { });
        }, 30000);
    } else {
        console.log('ℹ RENDER_EXTERNAL_URL not set - self-ping disabled');
    }
});
