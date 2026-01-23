import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, CheckCircle, Clock, Timer, User, RefreshCcw, QrCode, ClipboardList, ScanLine, Receipt, BarChart3, Calendar, ChevronRight, BellRing, X, Utensils, Plus, Trash2 } from 'lucide-react';
import { io } from 'socket.io-client';
import QRManager from '../components/QRManager';
import QRScanner from '../components/QRScanner';

const socket = io(); // Connects to the same host that served this page

const AdminDashboard = () => {
    const [activeTab, setActiveTab] = useState('orders'); // 'orders', 'billing', 'sales', 'menu', 'expenses', 'qr'
    const [orders, setOrders] = useState([]);
    const [menuItems, setMenuItems] = useState([]);
    const [salesHistory, setSalesHistory] = useState([]);
    const [serviceAlerts, setServiceAlerts] = useState([]);
    const [orderAlerts, setOrderAlerts] = useState([]); // New order popups
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isKitchenOpen, setIsKitchenOpen] = useState(true);
    const [selectedTableBill, setSelectedTableBill] = useState(null);
    const [expenses, setExpenses] = useState(() => {
        return JSON.parse(localStorage.getItem('marwad_expenses') || '[]');
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
        description: '', // New field
        date: new Date().toISOString().split('T')[0]
    });
    const audioRef = useRef(null);
    const prevAlertsCount = useRef(0);

    const fetchData = () => {
        setIsRefreshing(true);
        const savedOrders = JSON.parse(localStorage.getItem('marwad_orders') || '[]');
        const savedHistory = JSON.parse(localStorage.getItem('marwad_sales_history') || '[]');
        const savedAlerts = JSON.parse(localStorage.getItem('marwad_service_alerts') || '[]');
        const savedMenu = JSON.parse(localStorage.getItem('marwad_menu_items') || '[]');

        setMenuItems(savedMenu.length > 0 ? savedMenu : []);

        setOrders(savedOrders.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
        setSalesHistory(savedHistory.sort((a, b) => new Date(b.settledAt) - new Date(a.settledAt)));
        setServiceAlerts(savedAlerts.filter(a => a.status === 'new'));

        // Sound notification for new alerts
        if (savedAlerts.filter(a => a.status === 'new').length > prevAlertsCount.current) {
            playNotificationSound();
        }
        prevAlertsCount.current = savedAlerts.filter(a => a.status === 'new').length;

        setTimeout(() => setIsRefreshing(false), 500);
    };

    const playNotificationSound = (loop = false) => {
        if (!audioRef.current) {
            audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        }
        audioRef.current.loop = loop;
        audioRef.current.play().catch(e => {
            console.log("Sound play blocked by browser. Please interact with the page first.");
        });
    };

    const stopNotificationSound = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 10000); // Poll orders less frequently

        // Socket listener for real-time service alerts
        socket.on('new-service-alert', (newAlert) => {
            setServiceAlerts(prev => {
                if (prev.find(a => a.id === newAlert.id)) return prev;
                const updated = [newAlert, ...prev];
                const existing = JSON.parse(localStorage.getItem('marwad_service_alerts') || '[]');
                localStorage.setItem('marwad_service_alerts', JSON.stringify([newAlert, ...existing.filter(a => a.id !== newAlert.id)]));
                return updated;
            });
        });

        // Socket listener for real-time orders
        socket.on('new-order-alert', (newOrder) => {
            setOrders(prev => {
                const existing = JSON.parse(localStorage.getItem('marwad_orders') || '[]');
                const updated = [newOrder, ...prev];
                localStorage.setItem('marwad_orders', JSON.stringify([newOrder, ...existing]));
                return updated;
            });

            // Add to order alerts popup
            const orderAlert = { id: Date.now(), tableId: newOrder.tableId, total: newOrder.total };
            setOrderAlerts(prev => [orderAlert, ...prev]);

            // Play a quick sound for order (non-looping)
            if (serviceAlerts.length === 0) {
                playNotificationSound(false);
            }
        });

        // Socket listener for real-time menu updates
        socket.on('menu-updated', (newMenu) => {
            setMenuItems(newMenu);
            localStorage.setItem('marwad_menu_items', JSON.stringify(newMenu));
        });

        socket.on('kitchen-status-updated', (status) => {
            setIsKitchenOpen(status);
        });

        return () => {
            clearInterval(interval);
            socket.off('new-service-alert');
            socket.off('new-order-alert');
            socket.off('menu-updated');
            socket.off('kitchen-status-updated');
        };
    }, [serviceAlerts.length, orders.length]); // Fixed dependency array

    // Handle persistent ringing
    useEffect(() => {
        if (serviceAlerts.length > 0) {
            playNotificationSound(true); // Loop if there are service alerts
        } else {
            stopNotificationSound();
        }
    }, [serviceAlerts.length]);

    const updateStatus = (index, newStatus) => {
        const updated = [...orders];
        updated[index].status = newStatus;
        localStorage.setItem('marwad_orders', JSON.stringify(updated));
        setOrders(updated);
    };

    const clearAlert = (alertId) => {
        setServiceAlerts(prev => {
            const updated = prev.filter(a => a.id !== alertId);
            const existing = JSON.parse(localStorage.getItem('marwad_service_alerts') || '[]');
            const filtered = existing.map(a => a.id === alertId ? { ...a, status: 'cleared' } : a);
            localStorage.setItem('marwad_service_alerts', JSON.stringify(filtered));
            return updated;
        });
    };

    const clearOrderAlert = (alertId) => {
        setOrderAlerts(prev => prev.filter(a => a.id !== alertId));
    };

    const toggleKitchenStatus = () => {
        const newStatus = !isKitchenOpen;
        socket.emit('update-kitchen-status', newStatus);
    };

    const saveExpenses = (newExpenses) => {
        setExpenses(newExpenses);
        localStorage.setItem('marwad_expenses', JSON.stringify(newExpenses));
    };

    const addExpense = (expense) => {
        const newExpenses = [expense, ...expenses];
        saveExpenses(newExpenses);
    };

    const deleteExpense = (id) => {
        const newExpenses = expenses.filter(e => e.id !== id);
        saveExpenses(newExpenses);
    };

    const saveMenu = (newMenu) => {
        setMenuItems(newMenu);
        localStorage.setItem('marwad_menu_items', JSON.stringify(newMenu));
        socket.emit('update-menu', newMenu);
    };

    const deleteMenuItem = (id) => {
        const updated = menuItems.filter(item => item.id !== id);
        saveMenu(updated);
    };

    const toggleAvailability = (id) => {
        const updated = menuItems.map(item =>
            item.id === id ? { ...item, isAvailable: !item.isAvailable } : item
        );
        saveMenu(updated);
    };

    const startEditing = (item) => {
        setEditingItem(item);
        setNewItemForm({ ...item });
        setIsAddModalOpen(true);
    };

    const settleBill = (tableId) => {
        const tableOrders = orders.filter(o => o.tableId === tableId);
        if (tableOrders.length === 0) return;

        const total = tableOrders.reduce((acc, o) => acc + o.total, 0);
        const allItems = tableOrders.flatMap(o => o.items);

        const saleRecord = {
            id: Date.now(),
            tableId,
            items: allItems,
            total,
            settledAt: new Date().toISOString(),
        };

        const updatedHistory = [saleRecord, ...salesHistory];
        localStorage.setItem('marwad_sales_history', JSON.stringify(updatedHistory));
        setSalesHistory(updatedHistory);

        const remainingOrders = orders.filter(o => o.tableId !== tableId);
        localStorage.setItem('marwad_orders', JSON.stringify(remainingOrders));
        setOrders(remainingOrders);

        setSelectedTableBill(null);
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

    return (
        <div style={{ minHeight: '100vh', background: '#0a0a0a', paddingBottom: '90px' }}>
            <div className="admin-container">

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                    <div>
                        <h1 className="gold-text" style={{ fontSize: '1.4rem' }}>Marwad Admin</h1>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>Automated Kitchen System</p>
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
                        <motion.button whileTap={{ scale: 0.9 }} onClick={fetchData} className="glass-card" style={{ padding: '10px', borderRadius: '12px', border: 'none' }}>
                            <RefreshCcw size={18} className={isRefreshing ? 'spin' : ''} style={{ color: 'var(--primary)' }} />
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
                    </AnimatePresence>
                </div>

                <AnimatePresence mode="wait">
                    {activeTab === 'orders' && (
                        <motion.div key="orders" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '25px' }}>
                                <div className="glass-card" style={{ padding: '15px', position: 'relative', overflow: 'hidden' }}>
                                    <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: 'var(--primary)' }}></div>
                                    <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Pending KOT</p>
                                    <h2 style={{ fontSize: '1.2rem', marginTop: '5px' }}>{orders.filter(o => o.status === 'pending').length}</h2>
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
                                {orders.map((order, idx) => (
                                    <div key={idx} className="glass-card" style={{ borderLeft: `8px solid ${getStatusColor(order.status)}`, display: 'flex', flexDirection: 'column' }}>
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
                                            <div style={{ marginTop: 'auto', display: 'flex', gap: '12px' }}>
                                                {order.status === 'pending' && <button onClick={() => updateStatus(idx, 'preparing')} className="btn-primary" style={{ flex: 1, padding: '12px', fontSize: '0.85rem' }}>Start Preparing</button>}
                                                {order.status === 'preparing' && <button onClick={() => updateStatus(idx, 'completed')} className="btn-primary" style={{ flex: 1, padding: '12px', fontSize: '0.85rem', background: '#4caf50' }}>Mark as Served</button>}
                                                {order.status === 'completed' && <div style={{ flex: 1, textAlign: 'center', color: '#4caf50', fontSize: '0.9rem', fontWeight: 700, padding: '10px', background: 'rgba(76, 175, 80, 0.1)', borderRadius: '10px' }}><CheckCircle size={16} style={{ verticalAlign: 'middle', marginRight: '8px' }} /> ORDER SERVED</div>}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {orders.length === 0 && <div style={{ gridColumn: '1/-1', textAlign: 'center', opacity: 0.3, padding: '100px 0' }}><Clock size={60} style={{ margin: '0 auto 20px' }} /><p style={{ fontSize: '1.2rem' }}>No Active Orders Right Now</p></div>}
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'billing' && (
                        <motion.div key="billing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            <h3 className="gold-text" style={{ marginBottom: '20px' }}>Active Tables</h3>
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
                                    <div key={sale.id} className="glass-card" style={{ padding: '15px', display: 'flex', justifyContent: 'space-between' }}>
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
                                <section><h3 className="gold-text" style={{ marginBottom: '15px' }}>Scan Any QR</h3><QRScanner onScanSuccess={(txt) => alert(`Scanned: ${txt}`)} /></section>
                                <section><QRManager /></section>
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
                                                <div key={item.id} className="glass-card" style={{ display: 'flex', padding: '15px', gap: '15px', alignItems: 'center' }}>
                                                    <img src={item.image} style={{ width: '60px', height: '60px', borderRadius: '10px', objectFit: 'cover' }} alt="" />
                                                    <div style={{ flex: 1 }}>
                                                        <h5 style={{ fontSize: '0.9rem', opacity: item.isAvailable ? 1 : 0.5 }}>{item.name} {!item.isAvailable && '(Out of Stock)'}</h5>
                                                        <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{item.subCategory || 'General'}</p>
                                                        <p className="gold-text" style={{ fontSize: '0.8rem' }}>₹{item.price}</p>
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '8px' }}>
                                                        <button onClick={() => toggleAvailability(item.id)} style={{ background: item.isAvailable ? 'rgba(76, 175, 80, 0.1)' : 'rgba(255, 77, 77, 0.1)', border: 'none', color: item.isAvailable ? '#4caf50' : '#ff4d4d', padding: '6px', borderRadius: '8px', cursor: 'pointer' }}>
                                                            {item.isAvailable ? <CheckCircle size={16} /> : <X size={16} />}
                                                        </button>
                                                        <button onClick={() => startEditing(item)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'var(--primary)', padding: '6px', borderRadius: '8px', cursor: 'pointer' }}>
                                                            <ClipboardList size={16} />
                                                        </button>
                                                        <button onClick={() => deleteMenuItem(item.id)} style={{ background: 'rgba(255, 77, 77, 0.05)', border: 'none', color: '#ff4d4d', padding: '6px', borderRadius: '8px', cursor: 'pointer' }}>
                                                            <Trash2 size={16} />
                                                        </button>
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
                                <h3 className="gold-text" style={{ marginBottom: '15px' }}>Daily Expenses</h3>
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
                                    <button
                                        onClick={() => {
                                            if (!expenseForm.amount) return alert('Enter amount');
                                            addExpense({
                                                id: Date.now(),
                                                ...expenseForm,
                                                amount: parseFloat(expenseForm.amount)
                                            });
                                            setExpenseForm({ item: 'vegitable', amount: '', paidBy: '', date: new Date().toISOString().split('T')[0] });
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
                                    <div key={exp.id} className="glass-card" style={{ padding: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
                                            <button onClick={() => deleteExpense(exp.id)} style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer', marginTop: '5px' }}>Remove</button>
                                        </div>
                                    </div>
                                ))}
                                {expenses.length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '20px' }}>No expenses recorded yet.</p>}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Settle Modal */}
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
                    <button onClick={() => setActiveTab('menu')} style={{ background: 'none', border: 'none', color: activeTab === 'menu' ? 'var(--primary)' : 'var(--text-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer', transition: 'var(--transition)' }}><Utensils size={24} /><span style={{ fontSize: '0.7rem', fontWeight: 600 }}>Menu</span></button>
                    <button onClick={() => setActiveTab('expenses')} style={{ background: 'none', border: 'none', color: activeTab === 'expenses' ? 'var(--primary)' : 'var(--text-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer', transition: 'var(--transition)' }}><Receipt size={24} /><span style={{ fontSize: '0.7rem', fontWeight: 600 }}>Exp.</span></button>
                    <button onClick={() => setActiveTab('qr')} style={{ background: 'none', border: 'none', color: activeTab === 'qr' ? 'var(--primary)' : 'var(--text-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer', transition: 'var(--transition)' }}><QrCode size={24} /><span style={{ fontSize: '0.7rem', fontWeight: 600 }}>QR</span></button>
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
                                        <input type="text" value={newItemForm.image} onChange={(e) => setNewItemForm({ ...newItemForm, image: e.target.value })} style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: '12px', color: 'white' }} placeholder="https://images.unsplash.com/..." />
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
                                            if (editingItem) {
                                                const updatedMenu = menuItems.map(item =>
                                                    item.id === editingItem.id ? { ...newItemForm, price: parseInt(newItemForm.price) } : item
                                                );
                                                saveMenu(updatedMenu);
                                            } else {
                                                const newItem = {
                                                    id: Date.now(),
                                                    ...newItemForm,
                                                    price: parseInt(newItemForm.price)
                                                };
                                                saveMenu([...menuItems, newItem]);
                                            }
                                            setIsAddModalOpen(false);
                                            setEditingItem(null);
                                            setNewItemForm({ name: '', price: '', category: 'RESTAURANT', subCategory: '', image: '', description: '', isAvailable: true });
                                        } else {
                                            alert("Please fill in Name, Price and Category");
                                        }
                                    }} className="btn-primary" style={{ marginTop: '10px', padding: '18px' }}>{editingItem ? 'Update Item' : 'Save Item to Menu'}</button>
                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>

            </div>
        </div>
    );
};

export default AdminDashboard;
