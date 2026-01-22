import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, CheckCircle, Clock, Timer, User, RefreshCcw, QrCode, ClipboardList, ScanLine, Receipt, BarChart3, Calendar, ChevronRight, BellRing, X } from 'lucide-react';
import { io } from 'socket.io-client';
import QRManager from '../components/QRManager';
import QRScanner from '../components/QRScanner';

const socket = io(); // Connects to the same host that served this page

const AdminDashboard = () => {
    const [activeTab, setActiveTab] = useState('orders'); // 'orders', 'billing', 'sales', 'qr'
    const [orders, setOrders] = useState([]);
    const [salesHistory, setSalesHistory] = useState([]);
    const [serviceAlerts, setServiceAlerts] = useState([]);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [selectedTableBill, setSelectedTableBill] = useState(null);
    const prevAlertsCount = useRef(0);

    const fetchData = () => {
        setIsRefreshing(true);
        const savedOrders = JSON.parse(localStorage.getItem('marwad_orders') || '[]');
        const savedHistory = JSON.parse(localStorage.getItem('marwad_sales_history') || '[]');
        const savedAlerts = JSON.parse(localStorage.getItem('marwad_service_alerts') || '[]');

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

    const playNotificationSound = () => {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audio.play().catch(e => console.log("Sound play blocked by browser"));
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 10000); // Poll orders less frequently

        // Socket listener for real-time service alerts
        socket.on('new-service-alert', (newAlert) => {
            setServiceAlerts(prev => {
                // Check if alert already exists (prevent duplicates)
                if (prev.find(a => a.id === newAlert.id)) return prev;
                playNotificationSound();
                return [newAlert, ...prev];
            });
        });

        return () => {
            clearInterval(interval);
            socket.off('new-service-alert');
        };
    }, []);

    const updateStatus = (index, newStatus) => {
        const updated = [...orders];
        updated[index].status = newStatus;
        localStorage.setItem('marwad_orders', JSON.stringify(updated));
        setOrders(updated);
    };

    const clearAlert = (alertId) => {
        setServiceAlerts(prev => prev.filter(a => a.id !== alertId));
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

    return (
        <div className="app-container">
            <div className="mobile-frame">
                <div style={{ minHeight: '100vh', background: '#0a0a0a', padding: '20px', paddingBottom: '90px' }}>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                        <div>
                            <h1 className="gold-text" style={{ fontSize: '1.4rem' }}>Marwad Admin</h1>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>Automated Kitchen System</p>
                        </div>
                        <motion.button whileTap={{ scale: 0.9 }} onClick={fetchData} className="glass-card" style={{ padding: '10px', borderRadius: '12px', border: 'none' }}>
                            <RefreshCcw size={18} className={isRefreshing ? 'spin' : ''} style={{ color: 'var(--primary)' }} />
                        </motion.button>
                    </div>

                    <style>{`
            @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            .spin { animation: spin 1s linear infinite; }
            .pulse { animation: pulse 2s infinite; }
            @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
          `}</style>

                    {/* Real-time Service Alerts Overlay */}
                    <AnimatePresence>
                        {serviceAlerts.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}
                            >
                                {serviceAlerts.map(alert => (
                                    <div key={alert.id} className="pulse" style={{ background: '#ff4d4d', color: 'white', padding: '12px 20px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 15px rgba(255, 77, 77, 0.4)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <BellRing size={20} />
                                            <span style={{ fontWeight: 800 }}>TABLE #{alert.tableId} CALLING!</span>
                                        </div>
                                        <button onClick={() => clearAlert(alert.id)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', borderRadius: '50%', p: '4px', cursor: 'pointer' }}>
                                            <X size={16} />
                                        </button>
                                    </div>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <AnimatePresence mode="wait">
                        {activeTab === 'orders' && (
                            <motion.div key="orders" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '25px' }}>
                                    <div className="glass-card" style={{ padding: '15px' }}>
                                        <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Pending KOT</p>
                                        <h2 style={{ fontSize: '1.2rem', marginTop: '5px' }}>{orders.filter(o => o.status === 'pending').length}</h2>
                                    </div>
                                    <div className="glass-card" style={{ padding: '15px' }}>
                                        <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Today's Sale</p>
                                        <h2 className="gold-text" style={{ fontSize: '1.2rem', marginTop: '5px' }}>₹{todaysRevenue}</h2>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    {orders.map((order, idx) => (
                                        <div key={idx} className="glass-card" style={{ borderLeft: `4px solid ${getStatusColor(order.status)}` }}>
                                            <div style={{ padding: '15px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between' }}>
                                                <div>
                                                    <h4 style={{ fontSize: '0.95rem' }}>Table #{order.tableId}</h4>
                                                    <span style={{ fontSize: '0.65rem', color: getStatusColor(order.status), fontWeight: 700 }}>{order.status.toUpperCase()}</span>
                                                </div>
                                                <span style={{ fontWeight: 800 }}>₹{order.total}</span>
                                            </div>
                                            <div style={{ padding: '15px' }}>
                                                {order.items.map((it, i) => (<div key={i} style={{ fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}><span>{it.qty}x {it.name}</span></div>))}
                                                <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
                                                    {order.status === 'pending' && <button onClick={() => updateStatus(idx, 'preparing')} className="btn-primary" style={{ flex: 1, padding: '8px', fontSize: '0.75rem' }}>Prepare</button>}
                                                    {order.status === 'preparing' && <button onClick={() => updateStatus(idx, 'completed')} className="btn-primary" style={{ flex: 1, padding: '8px', fontSize: '0.75rem', background: '#4caf50' }}>Serve</button>}
                                                    {order.status === 'completed' && <div style={{ flex: 1, textAlign: 'center', color: '#4caf50', fontSize: '0.8rem' }}><CheckCircle size={14} style={{ verticalAlign: 'middle', marginRight: '5px' }} /> Served</div>}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {orders.length === 0 && <div style={{ textAlign: 'center', opacity: 0.3, padding: '50px 0' }}><Clock size={40} style={{ margin: '0 auto 10px' }} /><p>No Active Orders</p></div>}
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
                                <div className="glass-card" style={{ padding: '20px', marginBottom: '25px', textAlign: 'center' }}>
                                    <BarChart3 size={32} color="var(--primary)" style={{ margin: '0 auto 10px' }} />
                                    <h2 className="gold-text" style={{ fontSize: '1.8rem' }}>₹{salesHistory.reduce((acc, s) => acc + s.total, 0)}</h2>
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

                    {/* Navigation */}
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'var(--bg-card)', borderTop: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-around', padding: '10px 0', borderBottomLeftRadius: '40px', borderBottomRightRadius: '40px' }}>
                        <button onClick={() => setActiveTab('orders')} style={{ background: 'none', border: 'none', color: activeTab === 'orders' ? 'var(--primary)' : 'var(--text-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', cursor: 'pointer' }}><ClipboardList size={22} /><span style={{ fontSize: '0.6rem' }}>Orders</span></button>
                        <button onClick={() => setActiveTab('billing')} style={{ background: 'none', border: 'none', color: activeTab === 'billing' ? 'var(--primary)' : 'var(--text-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', cursor: 'pointer' }}><Receipt size={22} /><span style={{ fontSize: '0.6rem' }}>Billing</span></button>
                        <button onClick={() => setActiveTab('sales')} style={{ background: 'none', border: 'none', color: activeTab === 'sales' ? 'var(--primary)' : 'var(--text-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', cursor: 'pointer' }}><BarChart3 size={22} /><span style={{ fontSize: '0.6rem' }}>Sales</span></button>
                        <button onClick={() => setActiveTab('qr')} style={{ background: 'none', border: 'none', color: activeTab === 'qr' ? 'var(--primary)' : 'var(--text-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', cursor: 'pointer' }}><QrCode size={22} /><span style={{ fontSize: '0.6rem' }}>QR</span></button>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
