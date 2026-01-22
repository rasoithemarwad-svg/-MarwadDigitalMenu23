import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Utensils, Star, Plus, Minus, Check, Clock, Bell, ChevronRight } from 'lucide-react';
import { io } from 'socket.io-client';

const socket = io(); // Connects to the same host that served this page

const MENU_DATA = [
    { id: 1, name: 'Marwad Special Dal Bati', price: 350, category: 'RESTAURANT', image: 'https://images.unsplash.com/photo-1546549032-9571cd6b27df?w=500&q=80', description: 'Traditional Rajasthani dal with baked bati and ghee.' },
    { id: 2, name: 'Paneer Tikka Masala', price: 280, category: 'RESTAURANT', image: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=500&q=80', description: 'Grilled paneer cubes in rich tomato gravy.' },
    { id: 3, name: 'Club Sandwich', price: 180, category: 'CAFE', image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=500&q=80', description: 'Triple decker sandwich with fresh veggies.' },
    { id: 4, name: 'Masala Fries', price: 120, category: 'CAFE', image: 'https://images.unsplash.com/photo-1630384066252-1911ca992f16?w=500&q=80', description: 'Crispy fries with marwad spices.' },
    { id: 5, name: 'Special Garlic Naan', price: 60, category: 'RESTAURANT', image: 'https://images.unsplash.com/photo-1601050690597-df056fb04791?w=500&q=80', description: 'Soft leavened bread with garlic.' },
    { id: 6, name: 'Cold Coffee with Ice Cream', price: 150, category: 'CAFE', image: 'https://images.unsplash.com/photo-1517701550927-30cf4bb1dba5?w=500&q=80', description: 'Rich creamy cold coffee.' },
    { id: 7, name: 'Hut Special Thali', price: 450, category: 'HUT', image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=500&q=80', description: 'Exclusive premium Rajasthani meal.' },
    { id: 8, name: 'Smoked Junglee Maas', price: 550, category: 'HUT', image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=500&q=80', description: 'Smoked spicy meat speciality.' },
];

const ACTIONS = [
    { id: 'HUT', label: 'THE HUT', icon: <Utensils size={32} />, color: '#d4af37', desc: 'Private Dining' },
    { id: 'CAFE', label: 'CAFE', icon: <Clock size={32} />, color: '#ff4d4d', desc: 'Quick Bites' },
    { id: 'RESTAURANT', label: 'RESTAURANT', icon: <Star size={32} />, color: '#8b0000', desc: 'Fine Dining' },
    { id: 'SERVICE', label: 'SERVICE BELL', icon: <Bell size={32} />, color: '#ffd700', desc: 'Instant Help' },
    { id: 'RATE', label: 'RATE & WIN', icon: <Star size={32} />, color: '#4caf50', desc: 'Get Rewards' },
];

const CustomerView = () => {
    const { tableId } = useParams();
    const [view, setView] = useState('landing'); // 'landing' or 'menu'
    const [activeCategory, setActiveCategory] = useState('All');
    const [cart, setCart] = useState([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [orderPlaced, setOrderPlaced] = useState(false);

    const filteredMenu = activeCategory === 'All'
        ? MENU_DATA
        : MENU_DATA.filter(item => item.category === activeCategory);

    const addToCart = (item) => {
        setCart(prev => {
            const existing = prev.find(i => i.id === item.id);
            if (existing) {
                return prev.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i);
            }
            return [...prev, { ...item, qty: 1 }];
        });
    };

    const removeFromCart = (itemId) => {
        setCart(prev => {
            const existing = prev.find(i => i.id === itemId);
            if (existing && existing.qty > 1) {
                return prev.map(i => i.id === itemId ? { ...i, qty: i.qty - 1 } : i);
            }
            return prev.filter(i => i.id !== itemId);
        });
    };

    const cartTotal = cart.reduce((acc, item) => acc + (item.price * item.qty), 0);

    const placeOrder = () => {
        const order = {
            tableId,
            items: cart,
            total: cartTotal,
            status: 'pending',
            timestamp: new Date().toISOString()
        };

        const orders = JSON.parse(localStorage.getItem('marwad_orders') || '[]');
        localStorage.setItem('marwad_orders', JSON.stringify([...orders, order]));

        setOrderPlaced(true);
        setCart([]);
        setTimeout(() => {
            setOrderPlaced(false);
            setIsCartOpen(false);
            setView('landing'); // Return to landing after order
        }, 3000);
    };

    const handleAction = (id) => {
        if (id === 'SERVICE') {
            socket.emit('service-call', { tableId: tableId });
            alert("Service bell rung! Waiter is on the way to Table #" + tableId);
            return;
        }
        if (id === 'RATE') {
            alert("Thank you for choosing to rate us! You could win exciting vouchers.");
            window.open('https://maps.app.goo.gl/wqDfq7TFw8Vq61Xv7?g_st=aw', '_blank');
            return;
        }
        setActiveCategory(id);
        setView('menu');
    };

    return (
        <div className="app-container">
            <div className="mobile-frame">
                <div className="customer-page" style={{ paddingBottom: '100px', minHeight: '100vh', position: 'relative' }}>

                    <AnimatePresence mode="wait">
                        {view === 'landing' ? (
                            <motion.div
                                key="landing"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                style={{ padding: '30px 20px' }}
                            >
                                <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                                    <h1 className="gold-text" style={{ fontSize: '2.5rem', marginBottom: '10px' }}>MARWAD</h1>
                                    <p style={{ color: 'var(--text-secondary)', letterSpacing: '2px' }}>DIGITAL MENU SYSTEM</p>
                                    <div style={{ marginTop: '15px', display: 'inline-block', padding: '5px 15px', borderRadius: '20px', background: 'var(--glass)', fontSize: '0.8rem' }}>
                                        TABLE NUMBER: <span style={{ color: 'var(--primary)', fontWeight: 800 }}>{tableId}</span>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                    {ACTIONS.map(action => (
                                        <motion.button
                                            key={action.id}
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => handleAction(action.id)}
                                            className="glass-card"
                                            style={{
                                                padding: '30px 15px',
                                                border: 'none',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '15px',
                                                textAlign: 'center',
                                                borderBottom: `4px solid ${action.color}`
                                            }}
                                        >
                                            <div style={{ color: action.color }}>{action.icon}</div>
                                            <div>
                                                <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'white' }}>{action.label}</div>
                                                <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '4px' }}>{action.desc}</div>
                                            </div>
                                        </motion.button>
                                    ))}
                                </div>

                                <div className="glass-card" style={{ marginTop: '40px', padding: '20px', textAlign: 'center' }}>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Welcome to the Royal Taste of Marwad. Select an option to proceed.</p>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="menu"
                                initial={{ opacity: 0, x: 50 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -50 }}
                            >
                                {/* Header with Back Button */}
                                <header style={{ padding: '20px', position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg-dark)', borderBottom: '1px solid var(--glass-border)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                        <motion.button
                                            whileTap={{ scale: 0.8 }}
                                            onClick={() => setView('landing')}
                                            style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}
                                        >
                                            <ChevronRight size={24} style={{ transform: 'rotate(180deg)' }} />
                                        </motion.button>
                                        <div>
                                            <h1 className="gold-text" style={{ fontSize: '1.2rem' }}>{activeCategory} MENU</h1>
                                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.7rem' }}>Table #{tableId}</p>
                                        </div>
                                    </div>
                                </header>

                                <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                    {filteredMenu.map(item => (
                                        <motion.div
                                            layout
                                            key={item.id}
                                            className="glass-card"
                                            style={{ display: 'flex', flexDirection: 'column' }}
                                        >
                                            <div style={{ height: '120px', overflow: 'hidden', position: 'relative' }}>
                                                <img src={item.image} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            </div>
                                            <div style={{ padding: '12px' }}>
                                                <h3 style={{ fontSize: '0.8rem', marginBottom: '8px', height: '32px', overflow: 'hidden' }}>{item.name}</h3>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '0.9rem' }}>₹{item.price}</span>
                                                    <motion.button
                                                        whileTap={{ scale: 0.8 }}
                                                        onClick={() => addToCart(item)}
                                                        style={{ width: '28px', height: '28px', borderRadius: '50%', border: 'none', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                    >
                                                        <Plus size={16} color="black" />
                                                    </motion.button>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Floating Cart Button */}
                    {cart.length > 0 && (
                        <motion.div
                            initial={{ y: 100 }}
                            animate={{ y: 0 }}
                            style={{ position: 'absolute', bottom: '20px', left: '20px', right: '20px', zIndex: 100 }}
                        >
                            <button
                                className="btn-primary"
                                onClick={() => setIsCartOpen(true)}
                                style={{ width: '100%', padding: '15px', borderRadius: '20px', boxShadow: '0 10px 30px rgba(212, 175, 55, 0.3)' }}
                            >
                                <ShoppingCart size={20} />
                                <span>View Cart • {cart.length}</span>
                                <span style={{ marginLeft: 'auto', fontWeight: 800 }}>₹{cartTotal}</span>
                            </button>
                        </motion.div>
                    )}

                    {/* Cart Tray */}
                    <AnimatePresence>
                        {isCartOpen && (
                            <>
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    onClick={() => setIsCartOpen(false)}
                                    style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 101 }}
                                />
                                <motion.div
                                    initial={{ y: '100%' }}
                                    animate={{ y: 0 }}
                                    exit={{ y: '100%' }}
                                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                                    style={{
                                        position: 'absolute', bottom: 0, left: 0, right: 0,
                                        background: 'var(--bg-card)', borderTopLeftRadius: '30px', borderTopRightRadius: '30px',
                                        zIndex: 102, padding: '30px 20px', maxHeight: '80vh', overflowY: 'auto'
                                    }}
                                >
                                    <div style={{ width: '40px', height: '4px', background: 'var(--glass-border)', borderRadius: '2px', margin: '0 auto 20px' }} />

                                    <h2 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.2rem' }}>
                                        <ShoppingCart className="gold-text" size={20} /> Your Selection
                                    </h2>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '30px' }}>
                                        {cart.map(item => (
                                            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div>
                                                    <h4 style={{ fontSize: '0.9rem' }}>{item.name}</h4>
                                                    <p style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '0.8rem' }}>₹{item.price}</p>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--glass)', padding: '5px 10px', borderRadius: '12px' }}>
                                                    <Minus size={14} onClick={() => removeFromCart(item.id)} style={{ cursor: 'pointer' }} />
                                                    <span style={{ fontWeight: 800, minWidth: '20px', textAlign: 'center', fontSize: '0.9rem' }}>{item.qty}</span>
                                                    <Plus size={14} onClick={() => addToCart(item)} style={{ cursor: 'pointer' }} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="glass-card" style={{ padding: '20px', marginBottom: '20px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '0.9rem' }}>
                                            <span style={{ color: 'var(--text-secondary)' }}>Item Total</span>
                                            <span>₹{cartTotal}</span>
                                        </div>
                                        <div style={{ height: '1px', background: 'var(--glass-border)', margin: '10px 0' }} />
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.1rem' }}>
                                            <span>Grand Total</span>
                                            <span className="gold-text">₹{cartTotal}</span>
                                        </div>
                                    </div>

                                    <button
                                        className="btn-primary"
                                        disabled={orderPlaced}
                                        onClick={placeOrder}
                                        style={{ width: '100%', padding: '18px', borderRadius: '15px', fontSize: '1rem' }}
                                    >
                                        {orderPlaced ? (
                                            <>
                                                <Check size={20} />
                                                <span>Order Sent Successfully!</span>
                                            </>
                                        ) : (
                                            <span>Place Order Now</span>
                                        )}
                                    </button>
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};

export default CustomerView;
