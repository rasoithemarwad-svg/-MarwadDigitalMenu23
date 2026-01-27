import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, CheckCircle, Clock, Timer, User, RefreshCcw, QrCode, ClipboardList, ScanLine, Receipt, BarChart3, Calendar, ChevronRight, BellRing, X, Utensils, Plus, Trash2, LogOut } from 'lucide-react';
import { socket } from '../socket';
import QRScannerComp from '../components/QRScanner';
import QRManager from '../components/QRManager';

// const socket = io(window.location.origin); // Connects to the host that served this page

const AdminDashboard = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('orders'); // 'orders', 'billing', 'sales', 'menu', 'expenses', 'qr'
    const [orders, setOrders] = useState([]);
    const [menuItems, setMenuItems] = useState([]);
    const [salesHistory, setSalesHistory] = useState([]);
    const [serviceAlerts, setServiceAlerts] = useState([]);
    const [orderAlerts, setOrderAlerts] = useState([]); // New order popups
    const [songAlerts, setSongAlerts] = useState([]); // New song request popups
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isKitchenOpen, setIsKitchenOpen] = useState(true);
    const [customAlert, setCustomAlert] = useState({ show: false, title: '', message: '' });
    const [currentUser, setCurrentUser] = useState(null); // { username, role }
    const [loginForm, setLoginForm] = useState({ username: 'THEMARWADRASOI', password: '' });
    const [loginError, setLoginError] = useState('');
    const [appSettings, setAppSettings] = useState({ deliveryRadiusKm: 5.0 });
    const [socketConnected, setSocketConnected] = useState(false);
    const [connectionError, setConnectionError] = useState('');

    const showAlert = (title, message) => {
        setCustomAlert({ show: true, title, message });
    };
    const [selectedTableBill, setSelectedTableBill] = useState(null);
    const [paymentModeModal, setPaymentModeModal] = useState({ show: false, tableId: null, paymentMode: 'CASH' });
    const [expenses, setExpenses] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('marwad_expenses') || '[]');
        } catch (e) {
            console.error("Failed to parse expenses from localStorage", e);
            return [];
        }
    });
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null); // Track which item is being edited
    const [newItemForm, setNewItemForm] = useState({
        name: '',
        price: '',
        category: 'RESTAURANT',
        subCategory: '',
        image: '',
        description: '',
        isAvailable: true,
        usePortions: false,
        portions: [{ label: 'Half', price: '' }, { label: 'Full', price: '' }]
    });

    const [expenseForm, setExpenseForm] = useState({
        item: 'vegitable',
        amount: '',
        paidBy: '',
        description: '',
        paymentMode: 'CASH',
        date: new Date().toISOString().split('T')[0]
    });

    // --- REPORTS STATE ---
    const [reportDateRange, setReportDateRange] = useState({ start: '', end: '' });
    const [reportData, setReportData] = useState({ sales: 0, expenses: 0, profit: 0, salesList: [], expenseList: [] });
    // ---------------------

    // --- MANUAL BILL STATE ---
    const [manualCart, setManualCart] = useState([]);
    const [manualItem, setManualItem] = useState({ name: '', price: '', qty: 1 });

    const addToManualCart = (e) => {
        e.preventDefault();
        if (!manualItem.name || !manualItem.price || manualItem.qty < 1) return;

        const newItem = {
            id: Date.now(),
            name: manualItem.name,
            price: parseFloat(manualItem.price),
            qty: parseInt(manualItem.qty),
            total: parseFloat(manualItem.price) * parseInt(manualItem.qty)
        };

        setManualCart([...manualCart, newItem]);
        setManualItem({ name: '', price: '', qty: 1 });
    };

    const removeManualItem = (id) => {
        setManualCart(manualCart.filter(item => item.id !== id));
    };

    const settleManualBill = (paymentMode) => {
        if (manualCart.length === 0) return;

        const totalAmount = manualCart.reduce((acc, item) => acc + item.total, 0);

        // Construct a mock order object for the backend
        const manualOrder = {
            tableId: 'WALK-IN',
            items: manualCart,
            status: 'completed',
            total: totalAmount,
            paymentMode: paymentMode, // 'CASH' or 'ONLINE'
            timestamp: new Date().toISOString()
        };

        // Reuse the existing settle-bill event logic but we might need to adapt it 
        // OR emit a direct event if the backend supports it. 
        // Since backend expects tableId to settle, we can mock it.
        // However, standard settle-bill usually takes a TABLE ID, not an order object.
        // Let's check how settleBill works. 
        // It seems settleBill(tableId) tells server to find ACTIVE orders for that table.
        // We don't have active orders for WALK-IN.
        // So we probably need a new event 'direct-sale' OR we just create a "completed" order directly.

        // Based on typical patterns, let's emit 'direct-sale' or formatted 'settle-bill'
        // Ideally we should emit 'place-order' then 'settle'? No that's too slow.
        // Let's try emitting 'direct-sale' (Admin needs to handle this)
        // OR easier: emit 'settle-bill-manual'

        // For now, I will assume we need to emit a specific event that the server handles for direct sales.
        // Usage of 'add-expense' suggests we have generic DB insert events.
        // Let's try to assume the server has a 'record-sale' or we treat it as a pre-settled order.

        // Actually, looking at previous code, `settleBill` just sends `tableId`.
        // If we want to support this without backend changes, we might need to:
        // 1. Emit 'place-order' for table 'WALK-IN' with the items.
        // 2. Wait for it to be acknowledged?
        // 3. Emit 'settle-bill' for 'WALK-IN'.

        // SIMPLER APPROACH: Emit 'process-manual-sale'
        socket.emit('process-manual-sale', manualOrder);

        // Clear local state
        setManualCart([]);
        showAlert("Bill Settled", `Walk-in bill of ₹${totalAmount} settled via ${paymentMode}`);
    };
    // -------------------------

    // --- BACKGROUND MUSIC ---
    const ROMANTIC_TRACKS = [
        { title: "Gentle Instrumental", url: "/music/gentle-instrumental-1-322812.mp3" },
        { title: "Inspiring Song 1", url: "/music/inspiring-instrumental-song-462285.mp3" },
        { title: "Inspiring Song 2", url: "/music/inspiring-instrumental-song-466453.mp3" },
        { title: "Instrumental Mix", url: "/music/instrumental-136113.mp3" },
        { title: "Acoustic Guitar", url: "/music/instrumental-acoustic-guitar-music-401434.mp3" },
        { title: "Flamenco Instrumental", url: "/music/ki-instrumental-flamenco-460208.mp3" },
        { title: "Sad Instrumental", url: "/music/sad-sad-instrumental-music-471913.mp3" }
    ];
    const [isSitarPlaying, setIsSitarPlaying] = useState(false);
    const [sitarVolume, setSitarVolume] = useState(0.3); // Lower volume for background
    const [currentSitarIndex, setCurrentSitarIndex] = useState(0);
    const sitarRef = useRef(null);

    // Sync state if audio starts playing
    useEffect(() => {
        const audio = sitarRef.current;
        if (!audio) return;

        const onPlay = () => setIsSitarPlaying(true);
        const onPause = () => setIsSitarPlaying(false);

        audio.addEventListener('play', onPlay);
        audio.addEventListener('pause', onPause);

        return () => {
            audio.removeEventListener('play', onPlay);
            audio.removeEventListener('pause', onPause);
        };
    }, []);

    // Handle track ending (loop playlist)
    const handleSitarEnd = () => {
        setCurrentSitarIndex((prev) => (prev + 1) % ROMANTIC_TRACKS.length);
    };

    // Update volume
    useEffect(() => {
        if (sitarRef.current) sitarRef.current.volume = sitarVolume;
    }, [sitarVolume]);


    const audioRef = useRef(null);
    const prevAlertsCount = useRef(0);

    const playNotificationSound = (isCritical = false) => {
        if (audioRef.current) {
            audioRef.current.loop = isCritical;
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(e => console.log("Audio play failed (user interaction needed):", e));
        }
    };

    const fetchData = () => {
        setIsRefreshing(true);
        socket.emit('get-orders');
        socket.emit('get-menu');
        socket.emit('get-sales');
        socket.emit('get-expenses');
        socket.emit('get-settings');
        setTimeout(() => setIsRefreshing(false), 500);
    };

    useEffect(() => {
        // Socket.IO Connection Handlers
        socket.on('connect', () => {
            console.log('✅ Socket connected:', socket.id);
            setSocketConnected(true);
            setConnectionError('');
        });

        socket.on('connect_error', (error) => {
            console.error('❌ Socket connection error:', error);
            setSocketConnected(false);
            setConnectionError('Unable to connect to server. Please refresh the page.');
        });

        socket.on('disconnect', (reason) => {
            console.log('⚠️ Socket disconnected:', reason);
            setSocketConnected(false);
            if (reason === 'io server disconnect') {
                // Server initiated disconnect, try to reconnect
                socket.connect();
            }
        });

        // Check if already connected (in case of hot reload)
        if (socket.connected) {
            setSocketConnected(true);
        }

        fetchData();

        socket.on('orders-updated', (updatedOrders) => {
            setOrders(updatedOrders);
        });

        socket.on('menu-updated', (updatedMenu) => {
            setMenuItems(updatedMenu);
        });

        socket.on('sales-updated', (updatedSales) => {
            setSalesHistory(updatedSales);
        });

        socket.on('expenses-updated', (updatedExpenses) => {
            setExpenses(updatedExpenses);
        });

        socket.on('settings-updated', (newSettings) => {
            setAppSettings(newSettings);
        });

        socket.on('new-service-alert', (newAlert) => {
            setServiceAlerts(prev => {
                if (prev.find(a => a.id === newAlert.id)) return prev;
                return [newAlert, ...prev];
            });
            playNotificationSound(true);
        });

        socket.on('new-order-alert', (newOrder) => {
            const orderAlert = { id: Date.now(), tableId: newOrder.tableId, total: newOrder.total };
            setOrderAlerts(prev => [orderAlert, ...prev]);
            playNotificationSound(false);
            socket.emit('get-orders');
        });

        socket.on('new-song-request', (request) => {
            setSongAlerts(prev => [request, ...prev]);
            playNotificationSound(false); // Music request isn't a "critical service" sound
            // Auto hide song request after 30 seconds
            setTimeout(() => {
                setSongAlerts(prev => prev.filter(a => a.id !== request.id));
            }, 30000);
        });

        socket.on('kitchen-status-updated', (status) => {
            setIsKitchenOpen(status);
        });

        socket.on('login-success', (userData) => {
            setCurrentUser(userData);
            localStorage.setItem('marwad_user', JSON.stringify(userData));
        });

        socket.on('login-error', (error) => {
            setLoginError(error);
        });

        // Load session if exists
        const savedUser = localStorage.getItem('marwad_user');
        if (savedUser) {
            try {
                const parsedUser = JSON.parse(savedUser);
                // INVALIDATE OLD SESSIONS (ADMIN/MANAGER) OR UNKNOWN ROLES
                if (!['OWNER', 'STAFF', 'DELIVERY', 'ADMIN', 'MANAGER'].includes(parsedUser.role)) {
                    console.log("Cleaning stale old session...");
                    localStorage.removeItem('marwad_user');
                    setCurrentUser(null);
                } else if (parsedUser.role === 'DELIVERY') {
                    // Don't auto-redirect, just clear if on admin page to allow new login
                    console.log("Delivery user on admin page - clearing session to allow admin login");
                    localStorage.removeItem('marwad_user');
                    setCurrentUser(null);
                } else {
                    console.log(`Resuming ${parsedUser.role} session`);
                    setCurrentUser(parsedUser);
                }
            } catch (e) {
                localStorage.removeItem('marwad_user');
                setCurrentUser(null);
            }
        }

        return () => {
            socket.off('orders-updated');
            socket.off('menu-updated');
            socket.off('sales-updated');
            socket.off('expenses-updated');
            socket.off('settings-updated');
            socket.off('new-service-alert');
            socket.off('new-order-alert');
            socket.off('kitchen-status-updated');
        };
    }, []);

    const updateStatus = (id, newStatus) => {
        socket.emit('update-order-status', { id, status: newStatus });

        // AUTO-SAVE SALE FOR DELIVERED ORDERS
        if (newStatus === 'delivered') {
            const order = orders.find(o => o._id === id);
            if (order) {
                const saleRecord = {
                    tableId: 'delivery',
                    items: order.items.map(i => ({ name: i.name, qty: i.qty, price: i.price })),
                    total: order.total,
                    paymentMode: 'CASH', // Default to CASH for delivery (can be enhanced later)
                    settledAt: new Date().toISOString(),
                    isDelivery: true,
                    deliveryDetails: order.deliveryDetails
                };
                console.log("Auto-saving delivery sale:", saleRecord);
                socket.emit('save-sale', saleRecord);
            }
        }

        // Auto-dismiss alert when order is accepted/processed
        if (newStatus !== 'pending') {
            const order = orders.find(o => o._id === id);
            if (order) {
                // Remove the specific alert for this table
                setOrderAlerts(prev => prev.filter(a => a.tableId !== order.tableId));
            }
        }
    };

    const clearAlert = (alertId) => {
        setServiceAlerts(prev => prev.filter(a => a.id !== alertId));
    };

    const clearOrderAlert = (alertId) => {
        setOrderAlerts(prev => prev.filter(a => a.id !== alertId));
    };

    const toggleKitchenStatus = () => {
        socket.emit('toggle-kitchen-status', !isKitchenOpen);
    };

    const addExpense = (expense) => {
        socket.emit('add-expense', { ...expense, id: undefined }); // Remove client-side ID for DB
    };

    const deleteExpense = (id) => {
        socket.emit('delete-expense', id);
    };

    const saveMenu = (item) => {
        socket.emit('update-menu-item', item);
        setIsAddModalOpen(false);
        setEditingItem(null);
    };

    const deleteMenuItem = (id) => {
        if (currentUser?.role !== 'OWNER') return showAlert("OWNER ONLY", "Staff members are not allowed to delete menu items. Please ask the Owner.");
        socket.emit('delete-menu-item', id);
    };

    const handleLogin = (e) => {
        e.preventDefault();
        setLoginError('');
        socket.emit('login', loginForm);

        // Attempt to start music on user interaction (login click)
        if (sitarRef.current) {
            sitarRef.current.play().then(() => {
                setIsSitarPlaying(true);
            }).catch(err => console.log("Manual play failed:", err));
        }
    };

    const handleLogout = () => {
        // Automatically close kitchen on admin logout
        socket.emit('toggle-kitchen-status', false);
        setCurrentUser(null);
        localStorage.removeItem('marwad_user');
    };

    const saveSettings = (settings) => {
        socket.emit('update-settings', settings);
        setAppSettings(settings);
    };

    const setRestaurantLocation = () => {
        if (!navigator.geolocation) return showAlert("Error", "Geolocation not supported");
        navigator.geolocation.getCurrentPosition((pos) => {
            const newSettings = {
                ...appSettings,
                restaurantLocation: {
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude
                }
            };
            saveSettings(newSettings);
            showAlert("Success", "Restaurant location updated successfully!");
        }, (err) => showAlert("Error", "Failed to get location: " + err.message));
    };

    const toggleAvailability = (item) => {
        socket.emit('update-menu-item', { ...item, isAvailable: !item.isAvailable });
    };

    const startEditing = (item) => {
        setEditingItem(item);
        setNewItemForm({
            ...newItemForm,
            _id: item._id,
            name: item.name,
            price: item.price,
            category: item.category,
            subCategory: item.subCategory || '',
            image: item.image || '',
            description: item.description || '',
            isAvailable: item.isAvailable !== false,
            usePortions: item.usePortions || false,
            portions: item.portions || [{ label: 'Half', price: '' }, { label: 'Full', price: '' }]
        });
        setIsAddModalOpen(true);
    };

    const settleBill = (tableId) => {
        const tableOrders = orders.filter(o => o.tableId === tableId && o.status !== 'cancelled' && o.status !== 'pending_approval');

        if (tableOrders.length === 0) return;

        // Show payment mode selection modal
        setPaymentModeModal({ show: true, tableId, paymentMode: 'CASH' });
    };

    const confirmSettleBill = () => {
        const { tableId, paymentMode } = paymentModeModal;
        const tableOrders = orders.filter(o => o.tableId === tableId && o.status !== 'cancelled' && o.status !== 'pending_approval');

        if (tableOrders.length === 0) return;

        const total = tableOrders.reduce((acc, o) => acc + o.total, 0);
        const allItems = tableOrders.flatMap(o => o.items);

        const saleRecord = {
            tableId,
            items: allItems.map(i => ({ name: i.name, qty: i.qty, price: i.price })),
            total,
            paymentMode,  // Add payment mode
            settledAt: new Date().toISOString(),
        };

        socket.emit('save-sale', saleRecord);
        setSelectedTableBill(null);
        setPaymentModeModal({ show: false, tableId: null, paymentMode: 'CASH' });

        // Auto-dismiss "New Order" alerts for this table
        setOrderAlerts(prev => prev.filter(alert => alert.tableId !== tableId));
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'pending': return '#ff9800';
            case 'preparing': return '#2196f3';
            case 'completed': return '#4caf50';
            default: return 'var(--text-secondary)';
        }
    };

    const tableGroups = orders.reduce((groups, order) => {
        if (order.status === 'cancelled' || order.status === 'pending_approval') return groups;
        const tableId = order.tableId;
        if (!groups[tableId]) groups[tableId] = [];
        groups[tableId].push(order);
        return groups;
    }, {});

    const todaysSales = salesHistory.filter(s => new Date(s.settledAt).toDateString() === new Date().toDateString());
    const todaysRevenue = todaysSales.reduce((acc, s) => acc + s.total, 0);

    const thisMonthSales = salesHistory.filter(s => {
        const d = new Date(s.settledAt);
        const now = new Date();
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const thisMonthRevenue = thisMonthSales.reduce((acc, s) => acc + s.total, 0);

    const todaysExpenses = expenses.filter(e => new Date(e.date).toDateString() === new Date().toDateString());
    const todaysExpensesTotal = todaysExpenses.reduce((acc, e) => acc + e.amount, 0);

    const thisMonthExpenses = expenses.filter(e => {
        const d = new Date(e.date);
        const now = new Date();
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const thisMonthExpensesTotal = thisMonthExpenses.reduce((acc, e) => acc + e.amount, 0);

    const generateReport = () => {
        if (!reportDateRange.start || !reportDateRange.end) return showAlert("Dates Required", "Please select start and end dates");

        const start = new Date(reportDateRange.start);
        const end = new Date(reportDateRange.end);
        end.setHours(23, 59, 59, 999); // Include the entire end day

        const filteredSales = salesHistory.filter(s => {
            const d = new Date(s.settledAt);
            return d >= start && d <= end;
        });

        const filteredExpenses = expenses.filter(e => {
            const d = new Date(e.date);
            return d >= start && d <= end;
        });

        const totalSales = filteredSales.reduce((acc, s) => acc + s.total, 0);
        const totalExpenses = filteredExpenses.reduce((acc, e) => acc + e.amount, 0);

        setReportData({
            sales: totalSales,
            expenses: totalExpenses,
            profit: totalSales - totalExpenses,
            salesList: filteredSales,
            expenseList: filteredExpenses
        });
    };

    if (!currentUser) {
        return (
            <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="glass-card" style={{ width: '100%', maxWidth: '400px', padding: '40px 30px' }}>
                    <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                        <h2 className="gold-text" style={{ fontSize: '1.8rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '4px' }}>THE MARWAD RASOI</h2>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '5px' }}>Authentication Required</p>
                    </div>

                    <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div style={{ textAlign: 'center', background: 'rgba(212, 175, 55, 0.05)', padding: '15px', borderRadius: '12px', border: '1px solid rgba(212, 175, 55, 0.1)' }}>
                            <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '5px' }}>Username</p>
                            <p className="gold-text" style={{ fontSize: '1.1rem', fontWeight: 800 }}>THEMARWADRASOI</p>
                        </div>

                        <div>
                            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px', display: 'block' }}>Enter Password</label>
                            <input
                                type="password"
                                value={loginForm.password}
                                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                                style={{ width: '100%', padding: '15px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: '12px', color: 'white', fontSize: '1.1rem', textAlign: 'center' }}
                                placeholder="••••••••"
                                autoFocus
                                required
                            />
                        </div>

                        {!socketConnected && (
                            <div style={{ padding: '10px', borderRadius: '8px', background: 'rgba(255, 152, 0, 0.1)', border: '1px solid rgba(255, 152, 0, 0.3)' }}>
                                <p style={{ color: '#ff9800', fontSize: '0.75rem', textAlign: 'center', wordBreak: 'break-word' }}>
                                    ⏳ Connecting to server...
                                </p>
                            </div>
                        )}

                        {connectionError && (
                            <div style={{ padding: '10px', borderRadius: '8px', background: 'rgba(255, 59, 48, 0.1)', border: '1px solid rgba(255, 59, 48, 0.2)' }}>
                                <p style={{ color: '#ff3b30', fontSize: '0.75rem', textAlign: 'center', wordBreak: 'break-word' }}>
                                    🔌 {connectionError}
                                </p>
                            </div>
                        )}

                        {loginError && (
                            <div style={{ padding: '10px', borderRadius: '8px', background: 'rgba(255, 59, 48, 0.1)', border: '1px solid rgba(255, 59, 48, 0.2)' }}>
                                <p style={{ color: '#ff3b30', fontSize: '0.75rem', textAlign: 'center', wordBreak: 'break-word' }}>
                                    ⚠️ {loginError}
                                </p>
                            </div>
                        )}
                        <button
                            type="submit"
                            className="btn-primary"
                            disabled={!socketConnected}
                            style={{
                                padding: '15px',
                                color: 'black',
                                fontWeight: 800,
                                opacity: socketConnected ? 1 : 0.5,
                                cursor: socketConnected ? 'pointer' : 'not-allowed'
                            }}>
                            {socketConnected ? 'UNLOCK DASHBOARD' : 'CONNECTING...'}
                        </button>

                        <div style={{ marginTop: '10px', textAlign: 'center' }}>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.65rem', fontStyle: 'italic' }}>
                                Use your unique password to access Owner or Staff controls.
                            </p>
                        </div>
                    </form>
                </motion.div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', background: '#0a0a0a', paddingBottom: '90px' }}>
            <audio ref={audioRef} src="/notification.mp3" preload="auto" />
            {/* Background Music Player */}
            <audio
                ref={sitarRef}
                src={ROMANTIC_TRACKS[currentSitarIndex].url}
                onEnded={handleSitarEnd}
            />

            <div className="admin-container">

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                    <div style={{ flex: 1 }}>
                        <h1 className="gold-text" style={{ fontSize: '1.4rem', textTransform: 'uppercase', letterSpacing: '2px' }}>
                            THE MARWAD RASOI
                        </h1>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: currentUser.role === 'OWNER' ? 'rgba(212, 175, 55, 0.2)' : 'rgba(255, 255, 255, 0.05)', padding: '4px 12px', borderRadius: '30px', marginTop: '6px', border: `1px solid ${currentUser.role === 'OWNER' ? 'var(--primary)' : 'rgba(255,255,255,0.1)'}` }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: currentUser.role === 'OWNER' ? 'var(--primary)' : '#aaa' }}></div>
                            <span style={{ color: currentUser.role === 'OWNER' ? 'var(--primary)' : 'white', fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase' }}>{currentUser.role} SESSION</span>
                        </div>
                    </div>
                    <div className="flex gap-4 items-center">
                        <button
                            onClick={toggleKitchenStatus}
                            className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all ${isKitchenOpen
                                ? 'bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20'
                                : 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20'
                                }`}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', border: isKitchenOpen ? '1px solid rgba(76, 175, 80, 0.3)' : '1px solid rgba(244, 67, 54, 0.3)', background: isKitchenOpen ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)', color: isKitchenOpen ? '#4caf50' : '#f44336', borderRadius: '12px' }}
                        >
                            <Utensils size={18} />
                            <span className="font-medium" style={{ fontSize: '0.85rem' }}>{isKitchenOpen ? 'Kitchen Open' : 'Kitchen Closed'}</span>
                        </button>
                        {/* Music Control */}
                        {currentUser && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.3)', padding: '5px 12px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)', marginRight: '10px' }}>
                                <button
                                    onClick={() => {
                                        if (isSitarPlaying) {
                                            sitarRef.current.pause();
                                            setIsSitarPlaying(false);
                                        } else {
                                            sitarRef.current.play();
                                            setIsSitarPlaying(true);
                                        }
                                    }}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}
                                    title="Toggle Background Music"
                                >
                                    {isSitarPlaying ? '🎵' : '🔇'}
                                </button>
                                <button
                                    onClick={handleSitarEnd}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: 'var(--primary)' }}
                                    title="Next Track"
                                >
                                    ⏭️
                                </button>
                                {isSitarPlaying && (
                                    <input
                                        type="range"
                                        min="0" max="1" step="0.05"
                                        value={sitarVolume}
                                        onChange={(e) => setSitarVolume(parseFloat(e.target.value))}
                                        style={{ width: '60px', height: '4px', accentColor: 'var(--primary)' }}
                                    />
                                )}
                            </div>
                        )}

                        <motion.button whileTap={{ scale: 0.9 }} onClick={fetchData} className="glass-card" style={{ padding: '10px', borderRadius: '12px', border: 'none' }}>
                            <RefreshCcw size={18} className={isRefreshing ? 'spin' : ''} style={{ color: 'var(--primary)' }} />
                        </motion.button>

                        <motion.button whileTap={{ scale: 0.9 }} onClick={handleLogout} className="glass-card" style={{ padding: '10px', borderRadius: '12px', border: '1px solid rgba(255,59,48,0.2)', color: '#ff3b30' }}>
                            <LogOut size={18} />
                        </motion.button>
                    </div>
                </div>

                <style>{`
            @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            .spin { animation: spin 1s linear infinite; }
            .pulse-critical { animation: pulse-red 1.5s infinite; }
            @keyframes pulse-red { 
                0% { background: #ff3b30; transform: scale(1); } 
                50% { background: #ff7b7b; transform: scale(1.02); } 
                100% { background: #ff3b30; transform: scale(1); } 
            }
            .ring-animation { animation: ring 0.5s infinite; }
            @keyframes ring {
                0% { transform: rotate(0); }
                25% { transform: rotate(15deg); }
                50% { transform: rotate(0); }
                75% { transform: rotate(-15deg); }
                100% { transform: rotate(0); }
            }
          `}</style>

                {/* Real-time Alerts Overlay (Service & Orders) */}
                <div style={{ position: 'fixed', top: '20px', left: '20px', right: '20px', zIndex: 2000, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <AnimatePresence>
                        {/* Service Bell Alerts (Persistent & Ringing) */}
                        {serviceAlerts.length > 0 && (
                            <button onClick={() => {
                                setServiceAlerts([]);
                                localStorage.setItem('marwad_service_alerts', '[]');
                            }} style={{ alignSelf: 'flex-end', background: 'white', color: 'red', border: 'none', padding: '5px 10px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 'bold', boxShadow: '0 2px 5px rgba(0,0,0,0.2)', marginBottom: '-5px', zIndex: 2001, cursor: 'pointer' }}>
                                Clear All Bells
                            </button>
                        )}
                        {serviceAlerts.map(alert => (
                            <motion.div
                                key={alert.id}
                                initial={{ opacity: 0, x: 50 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, scale: 0.5 }}
                                className="pulse-critical"
                                style={{
                                    background: '#ff3b30',
                                    color: 'white',
                                    padding: '16px 20px',
                                    borderRadius: '16px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    boxShadow: '0 8px 25px rgba(255, 59, 48, 0.5)',
                                    border: '2px solid rgba(255,255,255,0.3)'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div className="ring-animation">
                                        <BellRing size={24} />
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 900, fontSize: '0.9rem', letterSpacing: '1px' }}>SERVICE REQUIRED</div>
                                        <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>TABLE #{alert.tableId} IS CALLING</div>
                                    </div>
                                </div>
                                <button onClick={() => clearAlert(alert.id)} style={{ background: 'white', border: 'none', color: '#ff3b30', borderRadius: '50%', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 10px rgba(0,0,0,0.2)' }}>
                                    <X size={18} strokeWidth={3} />
                                </button>
                            </motion.div>
                        ))}

                        {/* New Order Alerts */}
                        {orderAlerts.map(alert => (
                            <motion.div
                                key={alert.id}
                                initial={{ opacity: 0, x: -50 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, scale: 0.5 }}
                                style={{
                                    background: 'var(--primary)',
                                    color: 'black',
                                    padding: '16px 20px',
                                    borderRadius: '16px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    boxShadow: '0 8px 25px rgba(212, 175, 55, 0.4)',
                                    border: '2px solid rgba(0,0,0,0.1)'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <Receipt size={24} />
                                    <div>
                                        <div style={{ fontWeight: 900, fontSize: '0.9rem', letterSpacing: '1px' }}>NEW ORDER RECEIVED</div>
                                        <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>TABLE #{alert.tableId} • ₹{alert.total}</div>
                                    </div>
                                </div>
                                <button onClick={() => clearOrderAlert(alert.id)} style={{ background: 'black', border: 'none', color: 'var(--primary)', borderRadius: '50%', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                                    <X size={18} strokeWidth={3} />
                                </button>
                            </motion.div>
                        ))}
                        {/* Song Request Alerts */}
                        {songAlerts.map(alert => (
                            <motion.div
                                key={alert.id}
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                style={{
                                    background: 'rgba(212, 175, 55, 0.95)',
                                    color: 'black',
                                    padding: '12px 20px',
                                    borderRadius: '16px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    boxShadow: '0 10px 30px rgba(212, 175, 55, 0.3)',
                                    border: '1px solid white'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <Utensils size={20} />
                                    <div>
                                        <div style={{ fontWeight: 900, fontSize: '0.75rem', letterSpacing: '1px' }}>SONG REQUEST (TABLE #{alert.tableId})</div>
                                        <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{alert.songName}</div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <button
                                        onClick={() => {
                                            socket.emit('song-accepted', { tableId: alert.tableId, songName: alert.songName });
                                            setSongAlerts(prev => prev.filter(a => a.id !== alert.id));
                                        }}
                                        style={{ background: 'black', border: 'none', color: '#4caf50', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 10px rgba(0,0,0,0.2)' }}
                                    >
                                        <CheckCircle size={18} />
                                    </button>
                                    <button onClick={() => setSongAlerts(prev => prev.filter(a => a.id !== alert.id))} style={{ background: 'black', border: 'none', color: 'white', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                                        <X size={18} />
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>

                <AnimatePresence mode="wait">
                    {activeTab === 'orders' && (
                        <motion.div key="orders" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '25px' }}>
                                <div className="glass-card" style={{ padding: '15px', position: 'relative', overflow: 'hidden' }}>
                                    <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: 'var(--primary)' }}></div>
                                    <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Pending KOT</p>
                                    <h2 style={{ fontSize: '1.2rem', marginTop: '5px' }}>{orders.filter(o => o.status === 'pending' || o.status === 'pending_approval').length}</h2>
                                </div>
                                <div className="glass-card" style={{ padding: '15px', position: 'relative', overflow: 'hidden' }}>
                                    <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: '#4caf50' }}></div>
                                    <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Today's Sale</p>
                                    <h2 className="gold-text" style={{ fontSize: '1.2rem', marginTop: '5px' }}>₹{todaysRevenue}</h2>
                                </div>
                            </div>

                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
                                gap: '20px'
                            }}>
                                {orders.filter(o => o.status !== 'completed' && o.status !== 'delivered' && o.status !== 'cancelled').map((order) => (
                                    <div key={order._id} className="glass-card" style={{ borderLeft: `8px solid ${getStatusColor(order.status)}`, display: 'flex', flexDirection: 'column' }}>
                                        <div style={{ padding: '20px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <div>
                                                <h4 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Table #{order.tableId}</h4>
                                                <span style={{ fontSize: '0.7rem', color: getStatusColor(order.status), fontWeight: 900, letterSpacing: '1px' }}>{order.status.toUpperCase()}</span>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <span style={{ fontWeight: 900, fontSize: '1.2rem', color: 'var(--primary)' }}>₹{order.total}</span>
                                                <p style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>{new Date(order.timestamp).toLocaleTimeString()}</p>
                                            </div>
                                        </div>
                                        <div style={{ padding: '20px', flex: 1 }}>
                                            <div style={{ paddingBottom: '15px' }}>
                                                {order.items.map((it, i) => (
                                                    <div key={i} style={{ fontSize: '0.9rem', display: 'flex', justifyContent: 'space-between', marginBottom: '8px', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                        <span style={{ fontWeight: 600 }}>{it.qty}x {it.name}</span>
                                                        <span style={{ opacity: 0.7 }}>₹{it.price * it.qty}</span>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Delivery Order Details */}
                                            {order.isDelivery && order.deliveryDetails && (
                                                <div style={{
                                                    padding: '15px',
                                                    background: 'rgba(255, 152, 0, 0.1)',
                                                    borderRadius: '12px',
                                                    marginBottom: '15px',
                                                    border: '1px solid rgba(255, 152, 0, 0.3)'
                                                }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                                        <span style={{ fontSize: '1.3rem' }}>🚚</span>
                                                        <strong style={{ color: '#ff9800', fontSize: '0.9rem', letterSpacing: '1px' }}>DELIVERY ORDER</strong>
                                                    </div>

                                                    <div style={{ fontSize: '0.85rem', lineHeight: 1.8 }}>
                                                        <p><strong>Customer:</strong> {order.deliveryDetails.customerName}</p>
                                                        <p>
                                                            <strong>Phone:</strong>{' '}
                                                            <a
                                                                href={`tel:${order.deliveryDetails.customerPhone}`}
                                                                style={{ color: 'var(--primary)', marginLeft: '5px', textDecoration: 'none' }}
                                                            >
                                                                {order.deliveryDetails.customerPhone}
                                                            </a>
                                                        </p>
                                                        <p><strong>Address:</strong> {order.deliveryDetails.deliveryAddress}</p>
                                                        {order.deliveryDetails.distance && (
                                                            <p><strong>Distance:</strong> {order.deliveryDetails.distance.toFixed(2)} km</p>
                                                        )}
                                                    </div>

                                                    {order.deliveryDetails.location && (
                                                        <a
                                                            href={`https://www.google.com/maps/dir/?api=1&destination=${order.deliveryDetails.location.lat},${order.deliveryDetails.location.lng}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            style={{
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: '8px',
                                                                marginTop: '10px',
                                                                padding: '8px 12px',
                                                                background: 'var(--primary)',
                                                                color: 'black',
                                                                borderRadius: '8px',
                                                                textDecoration: 'none',
                                                                fontSize: '0.85rem',
                                                                fontWeight: 800
                                                            }}
                                                        >
                                                            📍 View on Google Maps
                                                        </a>
                                                    )}
                                                </div>
                                            )}

                                            <div style={{ marginTop: 'auto', display: 'flex', gap: '12px' }}>
                                                {order.status === 'pending_approval' && (
                                                    <>
                                                        <button
                                                            onClick={() => socket.emit('approve-order', { orderId: order._id, tableId: order.tableId })}
                                                            className="btn-primary"
                                                            style={{
                                                                flex: 1,
                                                                padding: '12px',
                                                                fontSize: '0.85rem',
                                                                background: '#4caf50',
                                                                border: '2px solid #4caf50',
                                                                fontWeight: 800
                                                            }}
                                                        >
                                                            ✅ Approve Order
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                const reason = prompt('Enter rejection reason (optional):');
                                                                socket.emit('reject-order', {
                                                                    orderId: order._id,
                                                                    tableId: order.tableId,
                                                                    reason: reason || 'Order cannot be accepted at this time'
                                                                });
                                                            }}
                                                            className="btn-primary"
                                                            style={{
                                                                flex: 1,
                                                                padding: '12px',
                                                                fontSize: '0.85rem',
                                                                background: '#f44336',
                                                                border: '2px solid #f44336',
                                                                fontWeight: 800
                                                            }}
                                                        >
                                                            ❌ Reject
                                                        </button>
                                                    </>
                                                )}
                                                {order.status === 'pending' && <button onClick={() => updateStatus(order._id, 'preparing')} className="btn-primary" style={{ flex: 1, padding: '12px', fontSize: '0.85rem' }}>Start Preparing</button>}
                                                {order.status === 'preparing' && !order.isDelivery && <button onClick={() => updateStatus(order._id, 'completed')} className="btn-primary" style={{ flex: 1, padding: '12px', fontSize: '0.85rem', background: '#4caf50' }}>Mark as Served</button>}
                                                {order.status === 'preparing' && order.isDelivery && <button onClick={() => updateStatus(order._id, 'out_for_delivery')} className="btn-primary" style={{ flex: 1, padding: '12px', fontSize: '0.85rem', background: '#ff9800' }}>🚚 Out for Delivery</button>}
                                                {order.status === 'out_for_delivery' && <button onClick={() => updateStatus(order._id, 'delivered')} className="btn-primary" style={{ flex: 1, padding: '12px', fontSize: '0.85rem', background: '#4caf50' }}>✅ Mark Delivered</button>}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {orders.filter(o => o.status !== 'completed' && o.status !== 'cancelled').length === 0 && (
                                    <div style={{ gridColumn: '1/-1', textAlign: 'center', opacity: 0.3, padding: '60px 0' }}>
                                        <Clock size={60} style={{ margin: '0 auto 20px' }} />
                                        <p style={{ fontSize: '1.2rem' }}>No Active Orders Right Now</p>
                                    </div>
                                )}
                            </div>

                            {/* Recently Served Section */}
                            {orders.filter(o => o.status === 'completed').length > 0 && (
                                <div style={{ marginTop: '50px' }}>
                                    <h3 className="gold-text" style={{ marginBottom: '20px', fontSize: '1rem', opacity: 0.8, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <CheckCircle size={18} /> Recently Served (Awaiting Bill)
                                    </h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '15px' }}>
                                        {orders.filter(o => o.status === 'completed').map((order) => (
                                            <div key={order._id} className="glass-card" style={{ padding: '15px', borderLeft: '4px solid #4caf50', opacity: 0.8 }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                                    <h4 style={{ fontSize: '1rem' }}>Table #{order.tableId}</h4>
                                                    <span style={{ fontWeight: 800, color: 'var(--primary)' }}>₹{order.total}</span>
                                                </div>
                                                <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                                                    {order.items.map((it, i) => <span key={i}>{it.qty}x {it.name}{i < order.items.length - 1 ? ', ' : ''}</span>)}
                                                </div>
                                                <button onClick={() => setActiveTab('billing')} style={{ marginTop: '15px', background: 'none', border: '1px solid var(--primary)', color: 'var(--primary)', padding: '8px', borderRadius: '8px', width: '100%', fontSize: '0.75rem', cursor: 'pointer' }}>
                                                    Go to Billing
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {activeTab === 'billing' && (
                        <motion.div key="billing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <h3 className="gold-text" style={{ margin: 0 }}>Active Tables</h3>
                                <button onClick={() => setActiveTab('orders')} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', padding: '8px 15px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    <X size={16} /> Close
                                </button>
                            </div>
                            {Object.entries(tableGroups).map(([tid, torders]) => (
                                <div key={tid} onClick={() => setSelectedTableBill(tid)} className="glass-card" style={{ padding: '20px', marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div><h4 style={{ fontSize: '1.1rem' }}>Table #{tid}</h4><p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{torders.length} orders total</p></div>
                                    <div style={{ textAlign: 'right' }}><p className="gold-text" style={{ fontWeight: 800 }}>₹{torders.reduce((acc, o) => acc + o.total, 0)}</p><span style={{ fontSize: '0.6rem' }}>View Bill</span></div>
                                </div>
                            ))}
                        </motion.div>
                    )}

                    {activeTab === 'sales' && (
                        <motion.div key="sales" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '25px' }}>
                                <div className="glass-card" style={{ padding: '20px', textAlign: 'center' }}>
                                    <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '5px' }}>DAILY SALE</p>
                                    <h2 className="gold-text" style={{ fontSize: '1.4rem' }}>₹{todaysRevenue}</h2>
                                </div>
                                <div className="glass-card" style={{ padding: '20px', textAlign: 'center' }}>
                                    <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '5px' }}>MONTHLY SALE</p>
                                    <h2 className="gold-text" style={{ fontSize: '1.4rem' }}>₹{thisMonthRevenue}</h2>
                                </div>
                            </div>

                            <div className="glass-card" style={{ padding: '20px', marginBottom: '25px', textAlign: 'center' }}>
                                <BarChart3 size={24} color="var(--primary)" style={{ margin: '0 auto 10px' }} />
                                <h2 className="gold-text" style={{ fontSize: '1.6rem' }}>₹{salesHistory.reduce((acc, s) => acc + s.total, 0)}</h2>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Lifetime Sales History</p>
                            </div>
                            <h3 style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem' }}><Calendar size={18} /> Past Transactions</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {salesHistory.map(sale => (
                                    <div key={sale._id} className="glass-card" style={{ padding: '15px', display: 'flex', justifyContent: 'space-between' }}>
                                        <div>
                                            <h5 style={{ fontSize: '0.85rem' }}>Table #{sale.tableId}</h5>
                                            <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{new Date(sale.settledAt).toLocaleDateString()} {new Date(sale.settledAt).toLocaleTimeString()}</p>
                                        </div>
                                        <span style={{ fontWeight: 800, color: '#4caf50' }}>₹{sale.total}</span>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'qr' && (
                        <motion.div key="qr" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <h3 className="gold-text" style={{ margin: 0 }}>QR Management</h3>
                                    <button
                                        onClick={() => navigate('/print-qrs')}
                                        className="btn-primary"
                                        style={{ padding: '10px 20px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}
                                    >
                                        <QrCode size={18} /> Print All QR Codes
                                    </button>
                                </div>
                                <section><h3 className="gold-text" style={{ marginBottom: '15px' }}>Scan Any QR</h3>
                                    <QRScannerComp onScanSuccess={(txt) => {
                                        // Handle Table Redirect logic
                                        if (txt.includes('/table/')) {
                                            const parts = txt.split('/table/');
                                            if (parts.length > 1) {
                                                const tableId = parts[1];
                                                if (tableId) {
                                                    const confirmNav = window.confirm(`Identify Table #${tableId}? Redirecting to Customer View...`);
                                                    if (confirmNav) {
                                                        navigate(`/table/${tableId}`);
                                                    }
                                                    return;
                                                }
                                            }
                                        }
                                        showAlert("QR Result", `Scanned: ${txt}`);
                                    }} />
                                </section>
                                <section>
                                    <div style={{ marginBottom: '20px', padding: '15px', background: 'rgba(212, 175, 55, 0.1)', borderRadius: '15px', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
                                        <p style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600 }}>💡 Pro Tip for Scanning</p>
                                        <p style={{ fontSize: '0.7rem', color: '#aaa', marginTop: '5px' }}>Make sure the <b>Base URL</b> in the tab below is set to your Public Tunnel (e.g., Serveo or Ngrok URL) so your phone can open the links!</p>
                                    </div>
                                    <QRManager />
                                </section>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'settings' && (
                        <motion.div key="settings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            <div className="glass-card" style={{ padding: '20px', marginBottom: '20px' }}>
                                <h3 className="gold-text" style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <User size={20} /> System Settings
                                </h3>

                                <div style={{ marginBottom: '20px' }}>
                                    <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '8px', display: 'block' }}>Delivery / Testing Range (km)</label>
                                    <p style={{ fontSize: '0.75rem', color: '#aaa', marginBottom: '10px' }}>Maximum distance allowed for 'Delivery' QR code scans.</p>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={appSettings.deliveryRadiusKm || 5.0}
                                        onChange={(e) => saveSettings({ ...appSettings, deliveryRadiusKm: parseFloat(e.target.value) })}
                                        style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: '12px', color: 'white', marginBottom: '15px' }}
                                    />
                                </div>

                                <div style={{ paddingTop: '15px', borderTop: '1px solid var(--glass-border)' }}>
                                    <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '8px', display: 'block' }}>Restaurant Identity (Static Location)</label>
                                    <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                                        <div style={{ flex: 1 }}>
                                            <p style={{ fontSize: '0.75rem', color: '#aaa', marginBottom: '5px' }}>Latitude</p>
                                            <input
                                                type="number"
                                                step="0.000001"
                                                value={appSettings.restaurantLocation?.lat || 26.909946}
                                                onChange={(e) => {
                                                    const newLat = parseFloat(e.target.value);
                                                    saveSettings({
                                                        ...appSettings,
                                                        restaurantLocation: {
                                                            ...appSettings.restaurantLocation,
                                                            lat: newLat,
                                                            lng: appSettings.restaurantLocation?.lng || 75.722026
                                                        }
                                                    });
                                                }}
                                                style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: 'white' }}
                                            />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <p style={{ fontSize: '0.75rem', color: '#aaa', marginBottom: '5px' }}>Longitude</p>
                                            <input
                                                type="number"
                                                step="0.000001"
                                                value={appSettings.restaurantLocation?.lng || 75.722026}
                                                onChange={(e) => {
                                                    const newLng = parseFloat(e.target.value);
                                                    saveSettings({
                                                        ...appSettings,
                                                        restaurantLocation: {
                                                            ...appSettings.restaurantLocation,
                                                            lat: appSettings.restaurantLocation?.lat || 26.909946,
                                                            lng: newLng
                                                        }
                                                    });
                                                }}
                                                style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: 'white' }}
                                            />
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => saveSettings(appSettings)}
                                        className="btn-primary"
                                        style={{ width: '100%', padding: '12px', background: 'var(--primary)', color: 'black', fontWeight: 800 }}
                                    >
                                        Update Location Manually
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'menu' && (
                        <motion.div key="menu" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <h3 className="gold-text">Menu Management</h3>
                                <button onClick={() => setIsAddModalOpen(true)} className="btn-primary" style={{ padding: '8px 15px', fontSize: '0.8rem' }}>+ Add Item</button>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                                {['HUT', 'RESTAURANT', 'CAFE'].map(cat => (
                                    <div key={cat} style={{ gridColumn: '1 / -1' }}>
                                        <h4 style={{ color: 'var(--primary)', borderBottom: '1px solid var(--glass-border)', paddingBottom: '5px', marginBottom: '15px', fontSize: '1rem' }}>{cat} CATEGORY</h4>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '15px' }}>
                                            {menuItems.filter(item => item.category === cat).map(item => (
                                                <div key={item._id} className="glass-card" style={{ display: 'flex', padding: '15px', gap: '15px', alignItems: 'center' }}>
                                                    <img src={item.image} style={{ width: '60px', height: '60px', borderRadius: '10px', objectFit: 'cover' }} alt="" />
                                                    <div style={{ flex: 1 }}>
                                                        <h5 style={{ fontSize: '0.9rem', opacity: item.isAvailable ? 1 : 0.5 }}>{item.name} {!item.isAvailable && '(Out of Stock)'}</h5>
                                                        <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{item.subCategory || 'General'}</p>
                                                        <p className="gold-text" style={{ fontSize: '0.8rem' }}>₹{item.price}</p>
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '8px' }}>
                                                        <button onClick={() => toggleAvailability(item)} style={{ background: item.isAvailable ? 'rgba(76, 175, 80, 0.1)' : 'rgba(255, 77, 77, 0.1)', border: 'none', color: item.isAvailable ? '#4caf50' : '#ff4d4d', padding: '6px', borderRadius: '8px', cursor: 'pointer' }}>
                                                            {item.isAvailable ? <CheckCircle size={16} /> : <X size={16} />}
                                                        </button>
                                                        <button onClick={() => startEditing(item)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'var(--primary)', padding: '6px', borderRadius: '8px', cursor: 'pointer' }}>
                                                            <ClipboardList size={16} />
                                                        </button>
                                                        {currentUser.role === 'OWNER' && (
                                                            <button onClick={() => deleteMenuItem(item._id)} style={{ background: 'rgba(255, 77, 77, 0.05)', border: 'none', color: '#ff4d4d', padding: '6px', borderRadius: '8px', cursor: 'pointer' }}>
                                                                <Trash2 size={16} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                            {menuItems.filter(item => item.category === cat).length === 0 && <p style={{ opacity: 0.5, fontSize: '0.8rem' }}>No items in this category.</p>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'expenses' && (
                        <motion.div key="expenses" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            <div className="glass-card" style={{ padding: '20px', marginBottom: '25px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                    <h3 className="gold-text" style={{ margin: 0 }}>Daily Expenses</h3>
                                    <button onClick={() => setActiveTab('orders')} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', padding: '8px 15px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        <X size={16} /> Close
                                    </button>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    <div>
                                        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '5px', display: 'block' }}>Item</label>
                                        <select
                                            value={expenseForm.item}
                                            onChange={(e) => setExpenseForm({ ...expenseForm, item: e.target.value })}
                                            style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: '12px', color: 'white' }}
                                        >
                                            <option value="vegitable">Vegetable</option>
                                            <option value="grocery">Grocery</option>
                                            <option value="chicken">Chicken</option>
                                            <option value="mutton">Mutton</option>
                                            <option value="worker">Worker</option>
                                            <option value="gas">Gas</option>
                                            <option value="coal">Coal</option>
                                            <option value="others">Others</option>
                                        </select>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '5px', display: 'block' }}>Amount (₹)</label>
                                            <input
                                                type="number"
                                                value={expenseForm.amount}
                                                onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                                                placeholder="0.00"
                                                style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: '12px', color: 'white' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '5px', display: 'block' }}>By Person</label>
                                            <input
                                                type="text"
                                                value={expenseForm.paidBy}
                                                onChange={(e) => setExpenseForm({ ...expenseForm, paidBy: e.target.value })}
                                                placeholder="Name"
                                                style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: '12px', color: 'white' }}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '5px', display: 'block' }}>Description (Optional)</label>
                                        <input
                                            type="text"
                                            value={expenseForm.description}
                                            onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                                            placeholder="Details..."
                                            style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: '12px', color: 'white' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '5px', display: 'block' }}>Payment Mode</label>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                            <button
                                                type="button"
                                                onClick={() => setExpenseForm({ ...expenseForm, paymentMode: 'CASH' })}
                                                style={{ padding: '12px', borderRadius: '8px', border: expenseForm.paymentMode === 'CASH' ? '2px solid #4caf50' : '1px solid rgba(255,255,255,0.2)', background: expenseForm.paymentMode === 'CASH' ? 'rgba(76,175,80,0.1)' : 'rgba(255,255,255,0.02)', color: expenseForm.paymentMode === 'CASH' ? '#4caf50' : 'white', fontWeight: 600, cursor: 'pointer' }}
                                            >
                                                💵 CASH
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setExpenseForm({ ...expenseForm, paymentMode: 'ONLINE' })}
                                                style={{ padding: '12px', borderRadius: '8px', border: expenseForm.paymentMode === 'ONLINE' ? '2px solid #00bcd4' : '1px solid rgba(255,255,255,0.2)', background: expenseForm.paymentMode === 'ONLINE' ? 'rgba(0,188,212,0.1)' : 'rgba(255,255,255,0.02)', color: expenseForm.paymentMode === 'ONLINE' ? '#00bcd4' : 'white', fontWeight: 600, cursor: 'pointer' }}
                                            >
                                                💳 ONLINE
                                            </button>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => {
                                            if (!expenseForm.amount) return showAlert('Information Needed', 'Please enter the expense amount');
                                            addExpense({
                                                ...expenseForm,
                                                amount: parseFloat(expenseForm.amount)
                                            });
                                            setExpenseForm({ item: 'vegitable', amount: '', paidBy: '', description: '', paymentMode: 'CASH', date: new Date().toISOString().split('T')[0] });
                                        }}
                                        className="btn-primary"
                                        style={{ padding: '15px', marginTop: '10px' }}
                                    >
                                        Add Expense
                                    </button>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '25px' }}>
                                <div className="glass-card" style={{ padding: '20px', textAlign: 'center', borderLeft: '4px solid #f44336' }}>
                                    <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '5px' }}>DAILY EXPENSE</p>
                                    <h2 style={{ fontSize: '1.4rem', color: '#f44336' }}>₹{todaysExpensesTotal}</h2>
                                </div>
                                <div className="glass-card" style={{ padding: '20px', textAlign: 'center', borderLeft: '4px solid #f44336' }}>
                                    <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '5px' }}>MONTHLY EXPENSE</p>
                                    <h2 style={{ fontSize: '1.4rem', color: '#f44336' }}>₹{thisMonthExpensesTotal}</h2>
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {expenses.map(exp => (
                                    <div key={exp._id} className="glass-card" style={{ padding: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <h5 style={{ textTransform: 'capitalize', fontSize: '1rem', fontWeight: 600 }}>{exp.item}</h5>
                                                <span style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '4px' }}>By {exp.paidBy || 'N/A'}</span>
                                            </div>
                                            {exp.description && <p style={{ fontSize: '0.8rem', color: 'var(--primary)', marginTop: '4px' }}>{exp.description}</p>}
                                            <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{new Date(exp.date).toLocaleDateString()}</p>
                                        </div>
                                        <div style={{ textAlign: 'right', marginLeft: '15px' }}>
                                            <span style={{ display: 'block', fontWeight: 800, color: '#f44336' }}>-₹{exp.amount}</span>
                                            <button onClick={() => deleteExpense(exp._id)} style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer', marginTop: '5px' }}>Remove</button>
                                        </div>
                                    </div>
                                ))}
                                {expenses.length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '20px' }}>No expenses recorded yet.</p>}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {activeTab === 'reports' && (
                        <motion.div key="reports" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            <div className="glass-card" style={{ padding: '20px', marginBottom: '25px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                    <h3 className="gold-text" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <BarChart3 size={20} /> Financial Reports
                                    </h3>
                                    <button onClick={() => setActiveTab('orders')} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', padding: '8px 15px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        <X size={16} /> Close
                                    </button>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                                    <div>
                                        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '5px' }}>Start Date</label>
                                        <input type="date" value={reportDateRange.start} onChange={(e) => setReportDateRange({ ...reportDateRange, start: e.target.value })} style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: '10px', color: 'white' }} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '5px' }}>End Date</label>
                                        <input type="date" value={reportDateRange.end} onChange={(e) => setReportDateRange({ ...reportDateRange, end: e.target.value })} style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: '10px', color: 'white' }} />
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button onClick={generateReport} className="btn-primary" style={{ flex: 1, padding: '12px' }}>Generate Report</button>
                                    <button onClick={() => downloadReport('sales')} className="glass-card" style={{ padding: '12px', border: '1px solid #4caf50', color: '#4caf50', fontWeight: 'bold' }}>Export Sales (Excel)</button>
                                    <button onClick={() => downloadReport('expenses')} className="glass-card" style={{ padding: '12px', border: '1px solid #f44336', color: '#f44336', fontWeight: 'bold' }}>Export Expense (Excel)</button>
                                </div>

                                <div style={{ marginTop: '20px', borderTop: '1px solid var(--glass-border)', paddingTop: '20px' }}>
                                    <button
                                        onClick={() => {
                                            if (window.confirm("⚠️ DANGER ZONE: Are you sure you want to delete ALL sales and expense history? This action cannot be undone.")) {
                                                if (window.confirm("Please confirm again to ERASE EVERYTHING.")) {
                                                    socket.emit('clear-history');
                                                    showAlert("History Cleared", "All sales and expenses have been completely erased.");
                                                }
                                            }
                                        }}
                                        style={{
                                            width: '100%',
                                            padding: '15px',
                                            background: 'rgba(255, 0, 0, 0.1)',
                                            border: '2px solid red',
                                            color: 'red',
                                            borderRadius: '12px',
                                            fontWeight: 'bold',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '10px'
                                        }}
                                    >
                                        <Trash2 size={20} /> RESET ALL DATA (ERASE HISTORY)
                                    </button>
                                </div>
                            </div>

                            {reportData.sales > 0 || reportData.expenses > 0 ? (
                                <>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '25px' }}>
                                        <div className="glass-card" style={{ padding: '15px', textAlign: 'center' }}>
                                            <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>SALES</p>
                                            <h3 style={{ color: '#4caf50', fontSize: '1.1rem' }}>₹{reportData.sales}</h3>
                                        </div>
                                        <div className="glass-card" style={{ padding: '15px', textAlign: 'center' }}>
                                            <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>EXPENSES</p>
                                            <h3 style={{ color: '#f44336', fontSize: '1.1rem' }}>₹{reportData.expenses}</h3>
                                        </div>
                                        <div className="glass-card" style={{ padding: '15px', textAlign: 'center', background: reportData.profit >= 0 ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)' }}>
                                            <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>NET PROFIT</p>
                                            <h3 style={{ color: reportData.profit >= 0 ? '#4caf50' : '#f44336', fontSize: '1.1rem' }}>
                                                {reportData.profit >= 0 ? '+' : ''}₹{reportData.profit}
                                            </h3>
                                        </div>
                                    </div>

                                    <h4 className="gold-text" style={{ marginBottom: '15px', fontSize: '1rem' }}>Detailed Breakdown</h4>

                                    <div style={{ marginBottom: '20px' }}>
                                        <h5 style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '10px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '5px' }}>Sales Transactions ({reportData.salesList.length})</h5>
                                        {reportData.salesList.map(sale => (
                                            <div key={sale._id} style={{ marginBottom: '12px', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px dashed rgba(255,255,255,0.1)' }}>
                                                    <div>
                                                        <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>Table #{sale.tableId}</span>
                                                        <span style={{ opacity: 0.5, fontSize: '0.7rem', marginLeft: '8px' }}>({new Date(sale.settledAt).toLocaleDateString()} {new Date(sale.settledAt).toLocaleTimeString()})</span>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', background: sale.paymentMode === 'ONLINE' ? 'rgba(0,188,212,0.2)' : 'rgba(76,175,80,0.2)', color: sale.paymentMode === 'ONLINE' ? '#00bcd4' : '#4caf50' }}>{sale.paymentMode || 'CASH'}</span>
                                                        <span style={{ color: '#4caf50', fontWeight: 700 }}>₹{sale.total}</span>
                                                    </div>
                                                </div>
                                                {sale.items && sale.items.length > 0 && (
                                                    <div style={{ paddingLeft: '10px' }}>
                                                        {sale.items.map((item, idx) => (
                                                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', opacity: 0.8, padding: '4px 0' }}>
                                                                <span>{item.qty}x {item.name}</span>
                                                                <span>₹{item.price} × {item.qty} = ₹{item.price * item.qty}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    <div>
                                        <h5 style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '10px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '5px' }}>Expense Transactions ({reportData.expenseList.length})</h5>
                                        {reportData.expenseList.map(exp => (
                                            <div key={exp._id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', padding: '8px 0', borderBottom: '1px dashed rgba(255,255,255,0.05)' }}>
                                                <span>{exp.item} <span style={{ opacity: 0.5 }}>({new Date(exp.date).toLocaleDateString()})</span></span>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', background: exp.paymentMode === 'ONLINE' ? 'rgba(0,188,212,0.2)' : 'rgba(76,175,80,0.2)', color: exp.paymentMode === 'ONLINE' ? '#00bcd4' : '#4caf50' }}>{exp.paymentMode || 'CASH'}</span>
                                                    <span style={{ color: '#f44336' }}>-₹{exp.amount}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <p style={{ textAlign: 'center', color: 'var(--text-secondary)', opacity: 0.7, padding: '20px' }}>Select dates and click Generate to view the report.</p>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {activeTab === 'manual' && (
                        <motion.div key="manual" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            <div className="glass-card" style={{ padding: '20px', marginBottom: '25px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                    <h3 className="gold-text" style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
                                        <Receipt size={20} /> Quick Bill (Walk-in)
                                    </h3>
                                    <button onClick={() => setActiveTab('orders')} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', padding: '8px 15px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        <X size={16} /> Close
                                    </button>
                                </div>

                                {/* Add Item Form */}
                                <form onSubmit={addToManualCart} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '5px' }}>Item Name</label>
                                        <input
                                            type="text"
                                            value={manualItem.name}
                                            onChange={(e) => setManualItem({ ...manualItem, name: e.target.value })}
                                            placeholder="e.g. Water Bottle"
                                            style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.2)', color: 'white' }}
                                            required
                                        />
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                        <div>
                                            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '5px' }}>Price (₹)</label>
                                            <input
                                                type="number"
                                                value={manualItem.price}
                                                onChange={(e) => setManualItem({ ...manualItem, price: e.target.value })}
                                                placeholder="0"
                                                style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.2)', color: 'white' }}
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '5px' }}>Quantity</label>
                                            <input
                                                type="number"
                                                value={manualItem.qty}
                                                onChange={(e) => setManualItem({ ...manualItem, qty: e.target.value })}
                                                style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.2)', color: 'white' }}
                                                min="1"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <button type="submit" className="btn-primary" style={{ padding: '12px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                        <Plus size={18} /> Add Item
                                    </button>
                                </form>

                                {/* Cart List */}
                                <div style={{ minHeight: '150px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', padding: '10px', marginBottom: '20px' }}>
                                    {manualCart.length === 0 ? (
                                        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', opacity: 0.5, marginTop: '40px' }}>No items added yet.</p>
                                    ) : (
                                        manualCart.map(item => (
                                            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', borderBottom: '1px dashed rgba(255,255,255,0.1)' }}>
                                                <div>
                                                    <span style={{ fontWeight: 600 }}>{item.name}</span>
                                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                                        {item.qty} x ₹{item.price}
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                                    <span style={{ fontWeight: 600 }}>₹{item.total}</span>
                                                    <button onClick={() => removeManualItem(item.id)} style={{ color: '#f44336', background: 'none', border: 'none' }}>
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>

                                {/* Total & Actions */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', fontSize: '1.2rem', fontWeight: 800 }}>
                                    <span>Total Amount</span>
                                    <span className="gold-text">₹{manualCart.reduce((acc, i) => acc + i.total, 0)}</span>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                    <button
                                        onClick={() => settleManualBill('CASH')}
                                        disabled={manualCart.length === 0}
                                        className="glass-card"
                                        style={{ padding: '15px', border: '1px solid #4caf50', color: '#4caf50', fontWeight: 'bold', display: 'flex', justifyContent: 'center', gap: '8px', opacity: manualCart.length === 0 ? 0.5 : 1 }}
                                    >
                                        <ScanLine size={18} /> CASH
                                    </button>
                                    <button
                                        onClick={() => settleManualBill('ONLINE')}
                                        disabled={manualCart.length === 0}
                                        className="glass-card"
                                        style={{ padding: '15px', border: '1px solid #00bcd4', color: '#00bcd4', fontWeight: 'bold', display: 'flex', justifyContent: 'center', gap: '8px', opacity: manualCart.length === 0 ? 0.5 : 1 }}
                                    >
                                        <QrCode size={18} /> ONLINE
                                    </button>
                                </div>

                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Settle Modal (Existing) */}
                {selectedTableBill && (
                    <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'var(--bg-card)', borderTopLeftRadius: '30px', borderTopRightRadius: '30px', zIndex: 1001, padding: '30px 20px', maxHeight: '80vh', overflowY: 'auto' }}>
                        <h2 className="gold-text" style={{ textAlign: 'center', marginBottom: '20px' }}>Settlement - #{selectedTableBill}</h2>
                        <div style={{ marginBottom: '25px' }}>
                            {tableGroups[selectedTableBill].map((o, idx) => (
                                <div key={idx} style={{ padding: '10px 0', borderBottom: '1px dashed var(--glass-border)' }}>
                                    {o.items.map((it, i) => (<div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}><span>{it.qty}x {it.name}</span><span>₹{it.price * it.qty}</span></div>))}
                                </div>
                            ))}
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '20px 0', fontSize: '1.3rem', fontWeight: 800 }}><span>TOTAL</span><span className="gold-text">₹{tableGroups[selectedTableBill].reduce((acc, o) => acc + o.total, 0)}</span></div>
                        </div>
                        <div style={{ display: 'flex', gap: '15px' }}>
                            <button onClick={() => setSelectedTableBill(null)} className="glass-card" style={{ flex: 1, padding: '15px', border: 'none', color: 'white' }}>Cancel</button>
                            <button onClick={() => settleBill(selectedTableBill)} className="btn-primary" style={{ flex: 2, padding: '15px' }}>Settle Bill</button>
                        </div>
                    </motion.div>
                )}

                <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'var(--bg-card)', borderTop: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-around', padding: '15px 0', zIndex: 1000, boxShadow: '0 -10px 30px rgba(0,0,0,0.5)' }}>
                    <button onClick={() => setActiveTab('orders')} style={{ background: 'none', border: 'none', color: activeTab === 'orders' ? 'var(--primary)' : 'var(--text-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer', transition: 'var(--transition)' }}><ClipboardList size={24} /><span style={{ fontSize: '0.7rem', fontWeight: 600 }}>Orders</span></button>
                    <button onClick={() => setActiveTab('billing')} style={{ background: 'none', border: 'none', color: activeTab === 'billing' ? 'var(--primary)' : 'var(--text-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer', transition: 'var(--transition)' }}><Receipt size={24} /><span style={{ fontSize: '0.7rem', fontWeight: 600 }}>Billing</span></button>
                    <button onClick={() => setActiveTab('manual')} style={{ background: 'none', border: 'none', color: activeTab === 'manual' ? 'var(--primary)' : 'var(--text-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer', transition: 'var(--transition)' }}><Plus size={24} /><span style={{ fontSize: '0.7rem', fontWeight: 600 }}>Quick Bill</span></button>
                    <button onClick={() => setActiveTab('menu')} style={{ background: 'none', border: 'none', color: activeTab === 'menu' ? 'var(--primary)' : 'var(--text-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer', transition: 'var(--transition)' }}><Utensils size={24} /><span style={{ fontSize: '0.7rem', fontWeight: 600 }}>Menu</span></button>

                    {(currentUser?.role === 'OWNER' || currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER') && (
                        <button onClick={() => setActiveTab('expenses')} style={{ background: 'none', border: 'none', color: activeTab === 'expenses' ? 'var(--primary)' : 'var(--text-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer', transition: 'var(--transition)' }}><Receipt size={24} /><span style={{ fontSize: '0.7rem', fontWeight: 600 }}>Exp.</span></button>
                    )}

                    {(currentUser?.role === 'OWNER' || currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER') && (
                        <>
                            <button onClick={() => setActiveTab('reports')} style={{ background: 'none', border: 'none', color: activeTab === 'reports' ? 'var(--primary)' : 'var(--text-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer', transition: 'var(--transition)' }}><BarChart3 size={24} /><span style={{ fontSize: '0.7rem', fontWeight: 600 }}>Reports</span></button>
                            <button onClick={() => setActiveTab('qr')} style={{ background: 'none', border: 'none', color: activeTab === 'qr' ? 'var(--primary)' : 'var(--text-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer', transition: 'var(--transition)' }}><QrCode size={24} /><span style={{ fontSize: '0.7rem', fontWeight: 600 }}>QR</span></button>
                            <button onClick={() => setActiveTab('settings')} style={{ background: 'none', border: 'none', color: activeTab === 'settings' ? 'var(--primary)' : 'var(--text-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer', transition: 'var(--transition)' }}><User size={24} /><span style={{ fontSize: '0.7rem', fontWeight: 600 }}>System</span></button>
                        </>
                    )}
                </div>

                {/* Add/Edit Item Modal */}
                <AnimatePresence>
                    {isAddModalOpen && (
                        <>
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setIsAddModalOpen(false); setEditingItem(null); setNewItemForm({ name: '', price: '', category: 'RESTAURANT', subCategory: '', image: '', description: '', isAvailable: true }); }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1100, backdropFilter: 'blur(5px)' }} />
                            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'var(--bg-card)', borderTopLeftRadius: '30px', borderTopRightRadius: '30px', zIndex: 1101, padding: '30px 20px', maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--glass-border)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                                    <h2 className="gold-text">{editingItem ? 'Edit Dish' : 'Add New Dish'}</h2>
                                    <button onClick={() => { setIsAddModalOpen(false); setEditingItem(null); setNewItemForm({ name: '', price: '', category: 'RESTAURANT', subCategory: '', image: '', description: '', isAvailable: true }); }} style={{ background: 'none', border: 'none', color: 'white' }}><X size={24} /></button>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                    <div>
                                        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px', display: 'block' }}>Dish Name</label>
                                        <input type="text" value={newItemForm.name} onChange={(e) => setNewItemForm({ ...newItemForm, name: e.target.value })} style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: '12px', color: 'white' }} placeholder="e.g. Paneer Tikka" />
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px', display: 'block' }}>Price (₹)</label>
                                            <input type="number" value={newItemForm.price} onChange={(e) => setNewItemForm({ ...newItemForm, price: e.target.value })} style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: '12px', color: 'white' }} placeholder="250" />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px', display: 'block' }}>Category</label>
                                            <select value={newItemForm.category} onChange={(e) => setNewItemForm({ ...newItemForm, category: e.target.value })} style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: '12px', color: 'white', appearance: 'none' }}>
                                                <option value="RESTAURANT">🍽️ Restaurant</option>
                                                <option value="CAFE">☕ Cafe</option>
                                                <option value="HUT">🛖 The Hut</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px', display: 'block' }}>Sub-Category (e.g. Burger, Pizza)</label>
                                        <input type="text" value={newItemForm.subCategory} onChange={(e) => setNewItemForm({ ...newItemForm, subCategory: e.target.value })} style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: '12px', color: 'white' }} placeholder="Dal, Starters, Breads" />
                                    </div>

                                    <div>
                                        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px', display: 'block' }}>Image URL</label>
                                        <input type="text" value={newItemForm.image} onChange={(e) => setNewItemForm({ ...newItemForm, image: e.target.value })} style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: '12px', color: 'white' }} placeholder="Paste Image Link (e.g. from Google Images)..." />
                                        <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '5px' }}>Tip: Right-click any image on Google -&gt; "Copy Image Link" -&gt; Paste here.</p>
                                    </div>

                                    <div>
                                        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px', display: 'block' }}>Description</label>
                                        <textarea value={newItemForm.description} onChange={(e) => setNewItemForm({ ...newItemForm, description: e.target.value })} style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: '12px', color: 'white', minHeight: '80px' }} placeholder="Brief description of the dish..." />
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <input type="checkbox" checked={newItemForm.isAvailable} onChange={(e) => setNewItemForm({ ...newItemForm, isAvailable: e.target.checked })} style={{ width: '20px', height: '20px' }} />
                                        <label style={{ fontSize: '0.9rem' }}>Item Available / In Stock</label>
                                    </div>

                                    <button onClick={() => {
                                        if (newItemForm.name && newItemForm.price && newItemForm.category) {
                                            saveMenu({
                                                ...newItemForm,
                                                price: parseInt(newItemForm.price)
                                            });
                                            setIsAddModalOpen(false);
                                            setEditingItem(null);
                                            setNewItemForm({ name: '', price: '', category: 'RESTAURANT', subCategory: '', image: '', description: '', isAvailable: true });
                                        } else {
                                            showAlert("Incomplete Form", "Please fill in Name, Price and Category");
                                        }
                                    }} className="btn-primary" style={{ marginTop: '10px', padding: '18px' }}>{editingItem ? 'Update Item' : 'Save Item to Menu'}</button>
                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>

                {/* Custom Alert Modal */}
                <AnimatePresence>
                    {customAlert.show && (
                        <div style={{ position: 'fixed', inset: 0, zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setCustomAlert({ ...customAlert, show: false })}
                                style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)' }}
                            />
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                                className="glass-card"
                                style={{
                                    position: 'relative',
                                    width: '100%',
                                    maxWidth: '350px',
                                    padding: '40px 30px',
                                    textAlign: 'center',
                                    border: '1px solid var(--glass-border)',
                                    boxShadow: '0 25px 60px rgba(0,0,0,0.6)'
                                }}
                            >
                                <button
                                    onClick={() => setCustomAlert({ ...customAlert, show: false })}
                                    style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                                >
                                    <X size={20} />
                                </button>

                                <div style={{ marginBottom: '20px', display: 'inline-flex', padding: '15px', borderRadius: '50%', background: 'rgba(212, 175, 55, 0.1)', color: 'var(--primary)' }}>
                                    <BellRing size={32} />
                                </div>

                                <h3 className="gold-text" style={{ fontSize: '1.4rem', marginBottom: '15px' }}>{customAlert.title}</h3>
                                <p style={{ color: 'white', lineHeight: 1.6, fontSize: '1rem', marginBottom: '30px' }}>{customAlert.message}</p>

                                <button
                                    onClick={() => setCustomAlert({ ...customAlert, show: false })}
                                    className="btn-primary"
                                    style={{ width: '100%', padding: '15px', borderRadius: '12px', fontWeight: 800, fontSize: '1rem' }}
                                >
                                    OK
                                </button>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* Payment Mode Selection Modal */}
                <AnimatePresence>
                    {paymentModeModal.show && (
                        <div style={{ position: 'fixed', inset: 0, zIndex: 1002, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setPaymentModeModal({ show: false, tableId: null, paymentMode: 'CASH' })}
                                style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)' }}
                            />
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                                className="glass-card"
                                style={{
                                    position: 'relative',
                                    width: '100%',
                                    maxWidth: '400px',
                                    padding: '30px 25px',
                                    border: '1px solid var(--glass-border)',
                                    boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
                                }}
                            >
                                <button
                                    onClick={() => setPaymentModeModal({ show: false, tableId: null, paymentMode: 'CASH' })}
                                    style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                                >
                                    <X size={20} />
                                </button>

                                <div style={{ marginBottom: '25px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>💳</div>
                                    <h3 className="gold-text" style={{ fontSize: '1.4rem', marginBottom: '8px' }}>Select Payment Mode</h3>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                        How did the customer pay?
                                    </p>
                                </div>

                                <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                                    <button
                                        onClick={() => setPaymentModeModal({ ...paymentModeModal, paymentMode: 'CASH' })}
                                        style={{
                                            flex: 1,
                                            padding: '15px',
                                            background: paymentModeModal.paymentMode === 'CASH' ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                                            color: paymentModeModal.paymentMode === 'CASH' ? 'black' : 'white',
                                            border: `2px solid ${paymentModeModal.paymentMode === 'CASH' ? 'var(--primary)' : 'var(--glass-border)'}`,
                                            borderRadius: '12px',
                                            fontSize: '1rem',
                                            fontWeight: 800,
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        💵 CASH
                                    </button>
                                    <button
                                        onClick={() => setPaymentModeModal({ ...paymentModeModal, paymentMode: 'ONLINE' })}
                                        style={{
                                            flex: 1,
                                            padding: '15px',
                                            background: paymentModeModal.paymentMode === 'ONLINE' ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                                            color: paymentModeModal.paymentMode === 'ONLINE' ? 'black' : 'white',
                                            border: `2px solid ${paymentModeModal.paymentMode === 'ONLINE' ? 'var(--primary)' : 'var(--glass-border)'}`,
                                            borderRadius: '12px',
                                            fontSize: '1rem',
                                            fontWeight: 800,
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        📱 ONLINE
                                    </button>
                                </div>

                                <button
                                    onClick={confirmSettleBill}
                                    className="btn-primary"
                                    style={{
                                        width: '100%',
                                        padding: '15px',
                                        borderRadius: '12px',
                                        fontWeight: 800,
                                        fontSize: '1rem'
                                    }}
                                >
                                    Confirm & Settle Bill
                                </button>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </div >
    );
};

export default AdminDashboard;
