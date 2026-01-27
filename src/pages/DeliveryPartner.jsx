import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Phone, Navigation, CheckCircle, Clock, RefreshCcw, ChevronLeft, LogOut } from 'lucide-react';
import { socket } from '../socket';

// const socket = io(window.location.origin);

const DeliveryPartner = () => {
    const [deliveryOrders, setDeliveryOrders] = useState([]);
    const [partnerLocation, setPartnerLocation] = useState(null);
    const [socketConnected, setSocketConnected] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [loginForm, setLoginForm] = useState({ username: 'THEMARWADRASOI', password: '' });
    const [loginError, setLoginError] = useState('');

    useEffect(() => {
        // Socket.IO Connection Handlers
        socket.on('connect', () => {
            console.log('✅ Delivery Partner Socket connected:', socket.id);
            setSocketConnected(true);
        });

        socket.on('connect_error', (error) => {
            console.error('❌ Delivery Partner Socket connection error:', error);
            setSocketConnected(false);
        });

        // Check if already connected
        if (socket.connected) {
            setSocketConnected(true);
        }

        // Login event handlers
        socket.on('login-success', (userData) => {
            if (userData.role === 'DELIVERY') {
                setCurrentUser(userData);
                localStorage.setItem('marwad_user', JSON.stringify(userData));
            } else {
                setLoginError('This login is for delivery partners only');
            }
        });

        socket.on('login-error', (error) => {
            setLoginError(error);
        });

        // Load session if exists
        const savedUser = localStorage.getItem('marwad_user');
        if (savedUser) {
            try {
                const parsedUser = JSON.parse(savedUser);
                if (parsedUser.role === 'DELIVERY') {
                    setCurrentUser(parsedUser);
                } else {
                    localStorage.removeItem('marwad_user');
                }
            } catch (e) {
                localStorage.removeItem('marwad_user');
            }
        }

        socket.emit('get-orders');
        socket.on('orders-updated', (orders) => {
            const activeDeliveries = orders.filter(
                o => o.isDelivery && o.status === 'out_for_delivery'
            );
            setDeliveryOrders(activeDeliveries);
        });

        // Track delivery partner location
        const watchId = navigator.geolocation.watchPosition(
            (pos) => setPartnerLocation({
                lat: pos.coords.latitude,
                lng: pos.coords.longitude
            }),
            (err) => console.error('Location tracking error:', err),
            { enableHighAccuracy: true }
        );

        return () => {
            if (watchId) navigator.geolocation.clearWatch(watchId);
            socket.off('orders-updated');
            socket.off('connect');
            socket.off('connect_error');
            socket.off('login-success');
            socket.off('login-error');
        };
    }, []);

    const markDelivered = (orderId) => {
        socket.emit('update-order-status', { id: orderId, status: 'delivered' });
    };

    const handleLogin = (e) => {
        e.preventDefault();
        setLoginError('');
        socket.emit('login', loginForm);
    };

    const handleLogout = () => {
        setCurrentUser(null);
        localStorage.removeItem('marwad_user');
    };

    // Login Screen
    if (!currentUser) {
        return (
            <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="glass-card" style={{ width: '100%', maxWidth: '400px', padding: '40px 30px' }}>
                    <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                        <h2 className="gold-text" style={{ fontSize: '1.8rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '4px' }}>🚚 DELIVERY PARTNER</h2>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '5px' }}>Authentication Required</p>
                    </div>

                    <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div style={{ textAlign: 'center', background: 'rgba(212, 175, 55, 0.05)', padding: '15px', borderRadius: '12px', border: '1px solid rgba(212, 175, 55, 0.1)' }}>
                            <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '5px' }}>Username</p>
                            <p className="gold-text" style={{ fontSize: '1.1rem', fontWeight: 800 }}>THEMARWADRASOI</p>
                        </div>

                        <div>
                            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px', display: 'block' }}>Enter Delivery Partner Password</label>
                            <input
                                type="password"
                                value={loginForm.password}
                                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                                style={{ width: '100%', padding: '15px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: '12px', color: 'white', fontSize: '1.1rem', textAlign: 'center' }}
                                placeholder="••••••"
                                autoFocus
                                required
                            />
                        </div>

                        {!socketConnected && (
                            <div style={{ padding: '10px', borderRadius: '8px', background: 'rgba(255, 152, 0, 0.1)', border: '1px solid rgba(255, 152, 0, 0.3)' }}>
                                <p style={{ color: '#ff9800', fontSize: '0.75rem', textAlign: 'center' }}>
                                    ⏳ Connecting to server...
                                </p>
                            </div>
                        )}

                        {loginError && (
                            <div style={{ padding: '10px', borderRadius: '8px', background: 'rgba(255, 59, 48, 0.1)', border: '1px solid rgba(255, 59, 48, 0.2)' }}>
                                <p style={{ color: '#ff3b30', fontSize: '0.75rem', textAlign: 'center' }}>
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
                            {socketConnected ? 'LOGIN' : 'CONNECTING...'}
                        </button>

                        <div style={{ marginTop: '10px', textAlign: 'center' }}>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.65rem', fontStyle: 'italic' }}>
                                Use your delivery partner password (123123) to access the delivery interface.
                            </p>
                        </div>
                    </form>
                </motion.div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', background: '#0a0a0a', paddingBottom: '40px' }}>
            {/* Header */}
            <div style={{
                background: 'var(--bg-card)',
                padding: '20px',
                borderBottom: '1px solid var(--glass-border)',
                position: 'sticky',
                top: 0,
                zIndex: 100
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '10px' }}>
                    <a href="/" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>
                        <ChevronLeft size={24} />
                    </a>
                    <div style={{ flex: 1 }}>
                        <h1 className="gold-text" style={{ fontSize: '1.4rem', marginBottom: '5px' }}>🚚 Delivery Partner</h1>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            {socketConnected ? '✅ Connected' : '⏳ Connecting...'}
                        </p>
                    </div>
                    <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={handleLogout}
                        className="glass-card"
                        style={{
                            padding: '10px',
                            borderRadius: '12px',
                            border: '1px solid rgba(255,59,48,0.2)',
                            color: '#ff3b30',
                            background: 'rgba(255,59,48,0.05)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}>
                        <LogOut size={18} />
                        <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>Logout</span>
                    </motion.button>
                </div>

                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px',
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: '12px'
                }}>
                    <span style={{ fontSize: '0.85rem' }}>Active Deliveries: <strong className="gold-text">{deliveryOrders.length}</strong></span>
                    {partnerLocation && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            📍 GPS: Active
                        </span>
                    )}
                </div>
            </div>

            {/* Content */}
            <div style={{ padding: '20px' }}>
                {deliveryOrders.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '80px 20px' }}>
                        <Clock size={60} style={{ margin: '0 auto 20px', opacity: 0.3 }} />
                        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
                            No active deliveries right now
                        </p>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '10px' }}>
                            Orders marked "Out for Delivery" will appear here
                        </p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {deliveryOrders.map(order => (
                            <motion.div
                                key={order._id}
                                className="glass-card"
                                style={{ padding: '0', overflow: 'hidden', border: '2px solid rgba(255, 152, 0, 0.3)' }}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                            >
                                {/* Order Header */}
                                <div style={{
                                    background: 'rgba(255, 152, 0, 0.2)',
                                    padding: '15px 20px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}>
                                    <div>
                                        <h3 style={{ fontSize: '1rem', marginBottom: '5px' }}>
                                            Order #{order._id.slice(-6).toUpperCase()}
                                        </h3>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                            {new Date(order.timestamp).toLocaleTimeString()}
                                        </p>
                                    </div>
                                    <span className="gold-text" style={{ fontWeight: 900, fontSize: '1.3rem' }}>₹{order.total}</span>
                                </div>

                                {/* Customer Details */}
                                <div style={{ padding: '20px' }}>
                                    <div style={{
                                        background: 'rgba(255,255,255,0.05)',
                                        padding: '15px',
                                        borderRadius: '12px',
                                        marginBottom: '15px'
                                    }}>
                                        <h4 style={{ fontSize: '0.9rem', marginBottom: '12px', color: 'var(--primary)' }}>
                                            📍 Customer Details
                                        </h4>
                                        <div style={{ fontSize: '0.9rem', lineHeight: 1.8 }}>
                                            <p><strong>Name:</strong> {order.deliveryDetails.customerName}</p>
                                            <p style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <Phone size={14} />
                                                <a href={`tel:${order.deliveryDetails.customerPhone}`} style={{ color: 'var(--primary)', textDecoration: 'none' }}>
                                                    {order.deliveryDetails.customerPhone}
                                                </a>
                                            </p>
                                            <p><strong>Address:</strong> {order.deliveryDetails.deliveryAddress}</p>
                                            {order.deliveryDetails.distance && (
                                                <p><strong>Distance:</strong> {order.deliveryDetails.distance.toFixed(2)} km from restaurant</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Order Items */}
                                    <div style={{ marginBottom: '15px' }}>
                                        <h4 style={{ fontSize: '0.85rem', marginBottom: '8px', opacity: 0.7 }}>Order Items:</h4>
                                        {order.items.map((item, idx) => (
                                            <div key={idx} style={{
                                                fontSize: '0.85rem',
                                                padding: '6px 0',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                borderBottom: idx < order.items.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none'
                                            }}>
                                                <span>{item.qty}x {item.name}</span>
                                                <span style={{ opacity: 0.7 }}>₹{item.price * item.qty}</span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Action Buttons */}
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        {order.deliveryDetails.location && (
                                            <a
                                                href={`https://www.google.com/maps/dir/?api=1&destination=${order.deliveryDetails.location.lat},${order.deliveryDetails.location.lng}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="btn-primary"
                                                style={{
                                                    flex: 1,
                                                    textAlign: 'center',
                                                    padding: '14px',
                                                    textDecoration: 'none',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '8px'
                                                }}
                                            >
                                                <Navigation size={18} />
                                                Get Directions
                                            </a>
                                        )}
                                        <button
                                            onClick={() => markDelivered(order._id)}
                                            style={{
                                                flex: 1,
                                                padding: '14px',
                                                background: '#4caf50',
                                                border: 'none',
                                                borderRadius: '12px',
                                                color: 'white',
                                                fontWeight: 800,
                                                cursor: 'pointer',
                                                fontSize: '0.9rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '8px'
                                            }}
                                        >
                                            <CheckCircle size={18} />
                                            Mark Delivered
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default DeliveryPartner;
