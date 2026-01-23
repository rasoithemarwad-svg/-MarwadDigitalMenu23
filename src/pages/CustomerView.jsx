import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Utensils, Star, Plus, Minus, Check, Clock, Bell, ChevronRight } from 'lucide-react';
import { io } from 'socket.io-client';

const socket = io(); // Connects to the same host that served this page

// Menu data will be fetched from the backend via Socket.io

const ACTIONS = [
    { id: 'HUT', label: 'THE HUT', icon: <Utensils size={32} />, color: '#d4af37', desc: 'Private Dining' },
    { id: 'CAFE', label: 'CAFE', icon: <Clock size={32} />, color: '#ff4d4d', desc: 'Quick Bites' },
    { id: 'RESTAURANT', label: 'RESTAURANT', icon: <Star size={32} />, color: '#8b0000', desc: 'Fine Dining' },
    { id: 'SERVICE', label: 'SERVICE BELL', icon: <Bell size={32} />, color: '#ffd700', desc: 'Instant Help' },
    { id: 'RATE', label: 'RATE & WIN', icon: <Star size={32} />, color: '#4caf50', desc: 'Get Rewards' },
];

const CustomerView = () => {
    const { tableId } = useParams();

    useEffect(() => {
        // Request initial menu
        socket.emit('get-menu');

        // Listen for global menu updates
        socket.on('menu-updated', (newMenu) => {
            setMenuItems(newMenu);
        });

        socket.on('kitchen-status-updated', (status) => {
            setIsKitchenOpen(status);
        });

        return () => {
            socket.off('menu-updated');
            socket.off('kitchen-status-updated');
        };
    }, []);
    const [view, setView] = useState('landing'); // 'landing' or 'menu'
    const [menuItems, setMenuItems] = useState([]);
    const [activeCategory, setActiveCategory] = useState('All');
    const [activeSubCategory, setActiveSubCategory] = useState('');
    const [cart, setCart] = useState([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [orderPlaced, setOrderPlaced] = useState(false);
    const [isKitchenOpen, setIsKitchenOpen] = useState(true);

    // Filter available items by main category and sub-category
    const filteredMenu = menuItems.filter(item => {
        const available = item.isAvailable !== false;
        const mainMatch = activeCategory === 'All' || item.category === activeCategory;
        const subMatch = !activeSubCategory || item.subCategory === activeSubCategory;
        return available && mainMatch && subMatch;
    });

    // Get unique sub-categories for the current main category
    const subCategories = [...new Set(
        menuItems
            .filter(item => item.category === activeCategory)
            .map(item => item.subCategory)
            .filter(Boolean)
    )];

    // Effect to set first sub-category as default when category changes
    useEffect(() => {
        if (subCategories.length > 0 && !subCategories.includes(activeSubCategory)) {
            setActiveSubCategory(subCategories[0]);
        }
    }, [activeCategory, menuItems.length]);

    const addToCart = (item, portion = null) => {
        setCart(prev => {
            const cartItemId = portion ? `${item.id}-${portion.label}` : item.id;
            const cartItemName = portion ? `${item.name} (${portion.label})` : item.name;
            const cartItemPrice = portion ? portion.price : item.price;

            const existing = prev.find(i => i.cartId === cartItemId);
            if (existing) {
                return prev.map(i => i.cartId === cartItemId ? { ...i, qty: i.qty + 1 } : i);
            }
            return [...prev, { ...item, cartId: cartItemId, name: cartItemName, price: cartItemPrice, qty: 1 }];
        });
    };

    const removeFromCart = (cartId) => {
        setCart(prev => {
            const existing = prev.find(i => i.cartId === cartId);
            if (existing && existing.qty > 1) {
                return prev.map(i => i.cartId === cartId ? { ...i, qty: i.qty - 1 } : i);
            }
            return prev.filter(i => i.cartId !== cartId);
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

        // Emit real-time order to backend
        socket.emit('place-order', order);

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
        const firstSub = menuItems.find(item => item.category === id)?.subCategory || '';
        setActiveSubCategory(firstSub);
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
                                                <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'white' }}>{action.label}</div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>{action.desc}</div>
                                            </div>
                                        </motion.button>
                                    ))}
                                </div>

                                <div className="glass-card" style={{ marginTop: '40px', padding: '20px', textAlign: 'center' }}>
                                    {!isKitchenOpen ? (
                                        <div style={{ color: '#ff3b30', fontWeight: 800, fontSize: '1rem', letterSpacing: '1px' }}>
                                            ⚠️ KITCHEN IS CURRENTLY CLOSED
                                            <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '5px', fontWeight: 400 }}>Orders cannot be placed right now.</p>
                                        </div>
                                    ) : (
                                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Welcome to the Royal Taste of Marwad. Select an option to proceed.</p>
                                    )}
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

                                    {/* Sub-Category Filter Bar */}
                                    {subCategories.length > 1 && (
                                        <div className="no-scrollbar" style={{ display: 'flex', gap: '10px', overflowX: 'auto', padding: '15px 0 5px', color: 'white' }}>
                                            {subCategories.map(sub => (
                                                <button
                                                    key={sub}
                                                    onClick={() => setActiveSubCategory(sub)}
                                                    style={{
                                                        padding: '8px 16px',
                                                        borderRadius: '20px',
                                                        border: 'none',
                                                        background: activeSubCategory === sub ? 'var(--primary)' : 'var(--glass)',
                                                        color: activeSubCategory === sub ? 'black' : 'white',
                                                        fontSize: '0.75rem',
                                                        fontWeight: 800,
                                                        whiteSpace: 'nowrap',
                                                        flexShrink: 0,
                                                        transition: 'var(--transition)'
                                                    }}
                                                >
                                                    {sub.toUpperCase()}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </header>

                                <motion.div
                                    drag="x"
                                    dragConstraints={{ left: 0, right: 0 }}
                                    onDragEnd={(e, { offset, velocity }) => {
                                        const swipe = offset.x;
                                        const threshold = 50;
                                        if (swipe < -threshold) {
                                            // Swipe Left -> Next SubCategory
                                            const currentIndex = subCategories.indexOf(activeSubCategory);
                                            if (currentIndex < subCategories.length - 1) {
                                                setActiveSubCategory(subCategories[currentIndex + 1]);
                                            }
                                        } else if (swipe > threshold) {
                                            // Swipe Right -> Prev SubCategory
                                            const currentIndex = subCategories.indexOf(activeSubCategory);
                                            if (currentIndex > 0) {
                                                setActiveSubCategory(subCategories[currentIndex - 1]);
                                            }
                                        }
                                    }}
                                    style={{ padding: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}
                                >
                                    {filteredMenu.map(item => (
                                        <motion.div
                                            key={item.id}
                                            className="glass-card"
                                            style={{ display: 'flex', flexDirection: 'column' }}
                                        >
                                            <div style={{ height: '120px', overflow: 'hidden', position: 'relative' }}>
                                                <img src={item.image} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            </div>
                                            <div style={{ padding: '12px' }}>
                                                <h3 style={{ fontSize: '1rem', marginBottom: '8px', height: '40px', overflow: 'hidden', fontWeight: 700 }}>{item.name}</h3>

                                                {item.portions ? (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                        {item.portions.map(p => (
                                                            <div key={p.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--glass)', padding: '5px 8px', borderRadius: '8px' }}>
                                                                <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{p.label} <span style={{ color: 'var(--primary)' }}>₹{p.price}</span></span>
                                                                <motion.button
                                                                    whileTap={{ scale: 0.8 }}
                                                                    onClick={() => isKitchenOpen ? addToCart(item, p) : alert('Kitchen is closed!')}
                                                                    style={{ width: '24px', height: '24px', borderRadius: '50%', border: 'none', background: isKitchenOpen ? 'var(--primary)' : '#555', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: isKitchenOpen ? 'pointer' : 'not-allowed' }}
                                                                >
                                                                    <Plus size={14} color={isKitchenOpen ? "black" : "#aaa"} />
                                                                </motion.button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <span style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '1.1rem' }}>₹{item.price}</span>
                                                        <motion.button
                                                            whileTap={{ scale: 0.8 }}
                                                            onClick={() => isKitchenOpen ? addToCart(item) : alert('Kitchen is closed!')}
                                                            style={{ width: '28px', height: '28px', borderRadius: '50%', border: 'none', background: isKitchenOpen ? 'var(--primary)' : '#555', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: isKitchenOpen ? 'pointer' : 'not-allowed' }}
                                                        >
                                                            <Plus size={16} color={isKitchenOpen ? "black" : "#aaa"} />
                                                        </motion.button>
                                                    </div>
                                                )}
                                            </div>
                                        </motion.div>
                                    ))}
                                </motion.div>
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
                                                    <Minus size={14} onClick={() => removeFromCart(item.cartId)} style={{ cursor: 'pointer' }} />
                                                    <span style={{ fontWeight: 800, minWidth: '20px', textAlign: 'center', fontSize: '0.9rem' }}>{item.qty}</span>
                                                    <Plus size={14} onClick={() => addToCart(item, item.portions?.find(p => item.name.includes(p.label)))} style={{ cursor: 'pointer' }} />
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
