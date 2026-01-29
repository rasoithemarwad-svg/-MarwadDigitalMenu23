import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Utensils, Star, Plus, Minus, Check, Clock, Bell, ChevronRight, X } from 'lucide-react';
import { socket } from '../socket';

// const socket = io(window.location.origin); // Connects to the same host serving the app

// Menu data will be fetched from the backend via Socket.io

const ACTIONS = [
    { id: 'HUT', label: 'THE HUT', icon: <Utensils size={32} />, color: '#d4af37', desc: 'Private Dining' },
    { id: 'CAFE', label: 'CAFE', icon: <Clock size={32} />, color: '#ff4d4d', desc: 'Quick Bites' },
    { id: 'RESTAURANT', label: 'RESTAURANT', icon: <Star size={32} />, color: '#8b0000', desc: 'Fine Dining' },
    { id: 'GYM', label: 'GYM DIET', icon: <Star size={32} />, color: '#4caf50', desc: 'Fitness Meals' },
    { id: 'SERVICE', label: 'SERVICE BELL', icon: <Bell size={32} />, color: '#ffd700', desc: 'Instant Help' },
    { id: 'RATE', label: 'RATE & WIN', icon: <Star size={32} />, color: '#4caf50', desc: 'Get Rewards' },
];

const CustomerView = () => {
    const { tableId } = useParams();
    const navigate = useNavigate();

    const [view, setView] = useState('landing'); // 'landing' or 'menu'
    const [menuItems, setMenuItems] = useState([]);
    const [activeCategory, setActiveCategory] = useState('All');
    const [activeSubCategory, setActiveSubCategory] = useState('');
    const [cart, setCart] = useState([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [orderPlaced, setOrderPlaced] = useState(false);
    const [isKitchenOpen, setIsKitchenOpen] = useState(true);
    const [socketConnected, setSocketConnected] = useState(false);
    const [deliveryModal, setDeliveryModal] = useState(false);
    const [deliveryForm, setDeliveryForm] = useState({
        name: '',
        phone: '',
        address: '',
        location: null
    });
    const [deliveryRadius, setDeliveryRadius] = useState(5.0); // Default, updated from server
    const [restaurantCoords, setRestaurantCoords] = useState({
        lat: 26.909919, // Fallback
        lng: 75.722024
    });
    const [gpsStatus, setGpsStatus] = useState('idle'); // 'idle', 'capturing', 'success', 'error', 'manual_fallback'
    const [gpsError, setGpsError] = useState('');
    const [networkStatus, setNetworkStatus] = useState('online'); // 'online', 'offline', 'slow'
    const [isSubmittingOrder, setIsSubmittingOrder] = useState(false); // Loading state for order submission
    const [waitingForApproval, setWaitingForApproval] = useState(false); // Waiting for admin approval
    const [orderStatusMessage, setOrderStatusMessage] = useState(''); // Success or rejection message
    const [discount, setDiscount] = useState({ amount: 0, reason: '' });
    const [isFirstTimeCustomer, setIsFirstTimeCustomer] = useState(false);




    // ------------------------------

    // Custom Alert State
    const [customAlert, setCustomAlert] = useState({ show: false, title: '', message: '' });

    const showAlert = (title, message) => {
        setCustomAlert({ show: true, title, message });
    };
    useEffect(() => {
        // Socket.IO Connection Handlers
        socket.on('connect', () => {
            console.log('✅ Customer Socket connected:', socket.id);
            setSocketConnected(true);
        });

        socket.on('connect_error', (error) => {
            console.error('❌ Customer Socket connection error:', error);
            setSocketConnected(false);
        });

        socket.on('disconnect', (reason) => {
            console.log('⚠️ Customer Socket disconnected:', reason);
            setSocketConnected(false);
        });

        // Check if already connected
        if (socket.connected) {
            setSocketConnected(true);
        }

        socket.emit('get-menu'); // existing
        socket.emit('get-settings'); // Fetch settings

        socket.on('menu-updated', (newMenu) => setMenuItems(newMenu));
        socket.on('kitchen-status-updated', (status) => setIsKitchenOpen(status));
        socket.on('settings-updated', (settings) => {
            if (settings) {
                if (settings.deliveryRange) setDeliveryRadius(parseFloat(settings.deliveryRange));
                else if (settings.deliveryRadiusKm) setDeliveryRadius(parseFloat(settings.deliveryRadiusKm));

                if (settings.restaurantLat && settings.restaurantLng) {
                    setRestaurantCoords({
                        lat: parseFloat(settings.restaurantLat),
                        lng: parseFloat(settings.restaurantLng)
                    });
                } else if (settings.restaurantLocation) {
                    setRestaurantCoords(settings.restaurantLocation);
                }
            }
        });

        // Order Approval Events
        socket.on('customer-eligibility-result', ({ isFirstTime }) => {
            console.log("Discount Eligiblity:", isFirstTime);
            setIsFirstTimeCustomer(isFirstTime);
        });

        socket.on('order-approved', (data) => {
            if (data.tableId === tableId) {
                console.log('✅ Order approved:', data);
                setWaitingForApproval(false);
                setOrderStatusMessage(data.message);
                setOrderPlaced(true);

                setTimeout(() => {
                    setOrderPlaced(false);
                    setOrderStatusMessage('');
                    setIsCartOpen(false);
                    setView('landing');
                }, 4000);
            }
        });

        socket.on('order-rejected', (data) => {
            if (data.tableId === tableId) {
                console.log('❌ Order rejected:', data);
                setWaitingForApproval(false);
                setOrderStatusMessage('');
                showAlert('Order Not Accepted', data.message);
                // Cart is NOT cleared so customer can modify and resubmit
            }
        });



        return () => {
            socket.off('menu-updated');
            socket.off('kitchen-status-updated');
            socket.off('settings-updated');
            socket.off('order-approved');
            socket.off('order-rejected');
            socket.off('connect');
            socket.off('connect_error');
            socket.off('disconnect');
        };
    }, []);

    // Network status monitoring
    useEffect(() => {
        const handleOnline = () => setNetworkStatus('online');
        const handleOffline = () => setNetworkStatus('offline');

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Check initial status
        setNetworkStatus(navigator.onLine ? 'online' : 'offline');

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Check eligibility when phone changes
    useEffect(() => {
        if (deliveryForm.phone && deliveryForm.phone.length === 10) {
            const timer = setTimeout(() => {
                socket.emit('check-customer-eligibility', deliveryForm.phone);
            }, 500); // Debounce
            return () => clearTimeout(timer);
        } else {
            setIsFirstTimeCustomer(false);
        }
    }, [deliveryForm.phone, socket]);

    const cartTotal = cart.reduce((acc, item) => acc + (item.price * item.qty), 0);

    // Calculate Discount
    useEffect(() => {
        let newDiscount = { amount: 0, reason: '' };

        let volumeDiscount = 0;
        let volumeReason = '';

        if (cartTotal > 2500) {
            volumeDiscount = cartTotal * 0.20;
            volumeReason = 'Volume Discount (20%)';
        } else if (cartTotal > 1000) {
            volumeDiscount = cartTotal * 0.15;
            volumeReason = 'Volume Discount (15%)';
        }

        let firstTimeDiscount = 0;
        if (isFirstTimeCustomer) {
            firstTimeDiscount = cartTotal * 0.10;
        }

        // Apply best discount
        if (volumeDiscount >= firstTimeDiscount && volumeDiscount > 0) {
            newDiscount = { amount: Math.floor(volumeDiscount), reason: volumeReason };
        } else if (firstTimeDiscount > volumeDiscount) {
            newDiscount = { amount: Math.floor(firstTimeDiscount), reason: 'First Order Discount (10%)' };
        }

        setDiscount(newDiscount);
    }, [cartTotal, isFirstTimeCustomer]);

    // --- LOCATION RESTRICTION LOGIC ---
    const [locationAccess, setLocationAccess] = useState('pending'); // 'pending', 'granted', 'denied', 'far', 'testing'

    const RESTAURANT_LOCATION = {
        lat: 26.909919,
        lng: 75.722024
    };

    const calculateDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371; // Radius of the earth in km
        const dLat = deg2rad(lat2 - lat1);
        const dLon = deg2rad(lon2 - lon1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c; // Distance in km
    };

    // Enhanced GPS capture with timeout and manual fallback
    useEffect(() => {
        if (deliveryModal && tableId === 'delivery') {
            setGpsStatus('capturing');
            setGpsError('');

            let timeoutId;
            let captureCompleted = false;

            // Set 10-second timeout for GPS
            timeoutId = setTimeout(() => {
                if (!captureCompleted) {
                    setGpsStatus('error');
                    setGpsError('GPS timeout. You can still proceed with manual address.');
                    console.warn('GPS capture timed out after 10 seconds');
                }
            }, 10000);

            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    captureCompleted = true;
                    clearTimeout(timeoutId);
                    setGpsStatus('success');
                    setDeliveryForm(prev => ({
                        ...prev,
                        location: {
                            lat: pos.coords.latitude,
                            lng: pos.coords.longitude
                        }
                    }));
                },
                (err) => {
                    captureCompleted = true;
                    clearTimeout(timeoutId);
                    setGpsStatus('error');

                    // User-friendly error messages
                    let errorMsg = 'Could not get your location. ';
                    switch (err.code) {
                        case 1: // PERMISSION_DENIED
                            errorMsg += 'Please enable location permission in your browser settings.';
                            break;
                        case 2: // POSITION_UNAVAILABLE
                            errorMsg += 'Location unavailable. Please try again or enter address manually.';
                            break;
                        case 3: // TIMEOUT
                            errorMsg += 'Location request timed out. Please try again.';
                            break;
                        default:
                            errorMsg += 'Please enter your address manually.';
                    }

                    setGpsError(errorMsg);
                    console.error('GPS error:', err);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 9000, // 9 seconds (1 second before our manual timeout)
                    maximumAge: 0  // Don't use cached location
                }
            );

            return () => {
                if (timeoutId) clearTimeout(timeoutId);
            };
        }
    }, [deliveryModal, tableId]);

    const deg2rad = (deg) => {
        return deg * (Math.PI / 180);
    };

    useEffect(() => {
        // ... (testing check) ...
        if (tableId && tableId.toLowerCase() === 'testing') {
            setLocationAccess('testing');
            return;
        }

        if (!navigator.geolocation) {
            setLocationAccess('denied');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const userLat = position.coords.latitude;
                const userLng = position.coords.longitude;
                const distance = calculateDistance(
                    userLat, userLng,
                    restaurantCoords.lat, restaurantCoords.lng
                );

                console.log(`User Distance: ${distance.toFixed(3)} km`);

                // DYNAMIC RADIUS CHECK
                // If table is 'delivery', use the Admin-set radius. Otherwise, strict 0.2km (200m).
                const allowedDistance = (tableId && tableId.toLowerCase() === 'delivery')
                    ? deliveryRadius
                    : 0.2;

                if (distance <= allowedDistance) {
                    setLocationAccess('granted');
                } else {
                    setLocationAccess('far');
                }
            },
            (error) => {
                console.error("Location Error:", error);
                setLocationAccess('denied');
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    }, [tableId, deliveryRadius]); // Re-run if radius changes
    // ----------------------------------

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
            const cartItemId = portion ? `${item._id}-${portion.label}` : item._id;
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


    const placeOrder = () => {
        if (tableId === 'delivery') {
            // Show delivery modal for delivery orders
            setDeliveryModal(true);
        } else {
            // Regular dine-in order
            submitOrder();
        }
    };

    const submitOrder = () => {
        // Check network status
        if (networkStatus === 'offline' || !socketConnected) {
            showAlert('Connection Error', 'Please check your internet connection and try again');
            return;
        }

        setIsSubmittingOrder(true); // Show loading state

        const order = {
            tableId,
            items: cart.map(i => ({
                name: i.name,
                price: i.price,
                qty: i.qty,
                category: i.category,
                portion: i.cartId.includes('-') ? i.cartId.split('-')[1] : null
            })),
            total: Math.max(0, cartTotal - discount.amount),
            subtotal: cartTotal,
            discount: discount.amount,
            // Table orders don't need approval - instant confirmation
        };

        socket.emit('place-order', order);

        // Table orders: Show success immediately (no approval needed)
        setOrderPlaced(true);
        setCart([]);
        setIsSubmittingOrder(false);
        setIsCartOpen(false);

        setTimeout(() => {
            setOrderPlaced(false);
            setView('landing');
        }, 3000);
    };

    const submitDeliveryOrder = () => {
        // Check network status first
        if (networkStatus === 'offline' || !socketConnected) {
            showAlert('Connection Error', 'Please check your internet connection and try again');
            return;
        }

        setIsSubmittingOrder(true); // Show loading state

        // Enhanced validation
        if (!deliveryForm.name || !deliveryForm.phone || !deliveryForm.address) {
            showAlert('Missing Info', 'Please fill all delivery details');
            return;
        }

        // Validate name (min 2 characters)
        if (deliveryForm.name.trim().length < 2) {
            setIsSubmittingOrder(false);
            showAlert('Invalid Name', 'Please enter a valid name (minimum 2 characters)');
            return;
        }

        // Validate phone number (exactly 10 digits)
        const phoneRegex = /^[6-9]\d{9}$/;
        if (!phoneRegex.test(deliveryForm.phone)) {
            setIsSubmittingOrder(false);
            showAlert('Invalid Phone', 'Please enter a valid 10-digit mobile number');
            return;
        }

        // Validate address (minimum 10 characters)
        if (deliveryForm.address.trim().length < 10) {
            setIsSubmittingOrder(false);
            showAlert('Invalid Address', 'Please enter a complete address (minimum 10 characters)');
            return;
        }

        // Allow submission even if GPS failed (manual address fallback)
        if (!deliveryForm.location && gpsStatus !== 'error') {
            setIsSubmittingOrder(false);
            showAlert('Location Required', 'Please wait for GPS location to be captured or enter address manually');
            return;
        }

        if (cart.length === 0) {
            setIsSubmittingOrder(false);
            showAlert('Empty Cart', 'Please add items to your cart before ordering');
            return;
        }

        const finalTotal = Math.max(0, cartTotal - discount.amount);
        if (finalTotal === 0 && cartTotal > 0) {
            // This might happen if discount >= total, which is fine, but good to know
        } else if (finalTotal <= 0 && cartTotal === 0) {
            setIsSubmittingOrder(false);
            showAlert('Invalid Order', 'Order total cannot be zero');
            return;
        }

        // Calculate distance from restaurant (Safe check)
        const distance = deliveryForm.location ? calculateDistance(
            deliveryForm.location.lat,
            deliveryForm.location.lng,
            restaurantCoords.lat,
            restaurantCoords.lng
        ) : 0;

        const order = {
            tableId: 'delivery',
            items: cart.map(i => ({
                name: i.name,
                price: i.price,
                qty: i.qty,
                category: i.category
            })),
            total: Math.max(0, cartTotal - discount.amount),
            subtotal: cartTotal,
            discount: discount.amount,
            status: 'pending_approval', // NEW: Delivery orders also need approval
            isDelivery: true,
            deliveryDetails: {
                customerName: deliveryForm.name.trim(),
                customerPhone: deliveryForm.phone.trim(),
                deliveryAddress: deliveryForm.address.trim(),
                location: deliveryForm.location,
                distance: distance,
                gpsAvailable: !!deliveryForm.location
            }
        };

        socket.emit('place-order', order);

        // Don't show success yet - wait for admin approval
        setCart([]);
        setDeliveryModal(false);
        setIsSubmittingOrder(false);
        setWaitingForApproval(true); // Show waiting message

        // Reset delivery form and GPS status
        setDeliveryForm({ name: '', phone: '', address: '', location: null });
        setGpsStatus('idle');
        setGpsError('');

        // Order confirmation will come from 'order-approved' event
    };

    const handleAction = (id) => {
        if (id === 'SERVICE') {
            socket.emit('service-call', { tableId: tableId });
            showAlert("Request Received", "Thank you for your request from THE MARWAD RASOI");
            return;
        }
        if (id === 'RATE') {
            showAlert("Rate & Win", "Thank you for choosing to rate us! You could win exciting vouchers.");
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

                    {/* LOCATION BLOCKING UI */}
                    {locationAccess === 'pending' && (
                        <div style={{ height: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '20px' }}>
                            <div className="spinner"></div> {/* Ensure you have a spinner CSS or use text */}
                            <p style={{ marginTop: '20px', color: 'var(--text-secondary)' }}>Verifying your location...</p>
                            <p style={{ fontSize: '0.8rem', opacity: 0.7 }}>Please allow location access to continue.</p>
                        </div>
                    )}

                    {locationAccess === 'denied' && (
                        <div style={{ height: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '20px' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '20px' }}>📍❌</div>
                            <h2 style={{ color: '#ff4d4d' }}>Location Access Required</h2>
                            <p style={{ color: 'var(--text-secondary)', marginTop: '10px' }}>
                                We validte your location to ensure you are at the restaurant.
                                <br />
                                <strong>Please enable location rights for this site in your browser settings.</strong>
                            </p>
                            <button onClick={() => window.location.reload()} className="btn-primary" style={{ marginTop: '20px', padding: '10px 20px', borderRadius: '10px' }}>
                                Retry
                            </button>
                        </div>
                    )}

                    {locationAccess === 'far' && (
                        <div style={{ height: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '20px' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '20px' }}>🚫🏃</div>
                            <h2 style={{ color: '#ff4d4d' }}>You are too far away!</h2>
                            <p style={{ color: 'var(--text-secondary)', marginTop: '10px' }}>
                                This menu is only accessible within <strong>{tableId === 'delivery' ? deliveryRadius + ' km' : '200 meters'}</strong> of The Marwad Rasoi.
                            </p>
                        </div>
                    )}

                    {/* MAIN APP CONTENT (Only show if granted or testing) */}
                    {(locationAccess === 'granted' || locationAccess === 'testing') && (
                        <>
                            <AnimatePresence mode="wait">

                                {view === 'landing' ? (
                                    <motion.div
                                        key="landing"
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -20 }}
                                        style={{ padding: '30px 20px', position: 'relative' }}
                                    >


                                        <div style={{ textAlign: 'center', marginBottom: '40px', marginTop: '30px' }}>
                                            <div style={{ fontSize: '2.4rem', fontWeight: 900, lineHeight: 1.1 }}>
                                                <span style={{ color: 'white', display: 'block' }}>THE MARWAD</span>
                                                <span style={{ color: '#ff4d4d', fontFamily: "'Hind', sans-serif" }}>रसोई</span>
                                            </div>
                                            <p style={{ color: 'var(--text-secondary)', letterSpacing: '4px', marginTop: '10px', fontSize: '0.7rem', opacity: 0.8 }}>DIGITAL MENU SYSTEM</p>
                                            <div style={{ marginTop: '15px', display: 'inline-block', padding: '5px 15px', borderRadius: '20px', background: 'var(--glass)', fontSize: '0.8rem' }}>
                                                TABLE NUMBER: <span style={{ color: 'var(--primary)', fontWeight: 800 }}>{tableId}</span>
                                            </div>


                                            <style>{`
                                                @keyframes musicPulse {
                                                    0% { transform: scale(1); opacity: 1; }
                                                    50% { transform: scale(1.5); opacity: 0.5; }
                                                    100% { transform: scale(1); opacity: 1; }
                                                }
                                                .pulse-music { animation: musicPulse 1s infinite; }
                                                .spinner-small {
                                                    width: 14px; height: 14px; border: 2px solid rgba(212,175,55,0.3);
                                                    border-top: 2px solid var(--primary); border-radius: 50%;
                                                    animation: spin 1s linear infinite;
                                                }
                                                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                                            `}</style>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                            {(tableId === 'delivery'
                                                ? ACTIONS.filter(a => ['CAFE', 'RESTAURANT', 'GYM', 'RATE'].includes(a.id))
                                                : ACTIONS
                                            ).map(action => (
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

                                        <div className="glass-card" style={{ marginTop: '40px', padding: '25px', textAlign: 'center', border: '1px solid var(--primary)', background: 'rgba(212, 175, 55, 0.05)' }}>
                                            {!isKitchenOpen && tableId?.toLowerCase() !== 'testing' ? (
                                                <div style={{ color: '#ff3b30', fontWeight: 800, fontSize: '1rem', letterSpacing: '1px' }}>
                                                    ⚠️ KITCHEN IS CURRENTLY CLOSED
                                                    <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '5px', fontWeight: 400 }}>Orders cannot be placed right now.</p>
                                                </div>
                                            ) : (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    <p style={{ fontSize: '1.1rem', color: 'white', fontWeight: 800 }}>READY TO ORDER? 🍲</p>
                                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                                                        Tap any category above to browse our menu and add items to your cart.
                                                    </p>
                                                </div>
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
                                            dragDirectionLock
                                            dragElastic={0.2}
                                            dragConstraints={{ left: 0, right: 0 }}
                                            onDragEnd={(e, { offset, velocity }) => {
                                                const swipe = offset.x;
                                                const threshold = 30; // Lowered threshold
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
                                            style={{
                                                padding: '20px',
                                                display: 'grid',
                                                gridTemplateColumns: '1fr 1fr',
                                                gap: '15px',
                                                touchAction: 'pan-y' // Crucial for mobile scroll compatibility
                                            }}
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
                                                    <div style={{ padding: '12px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                                        <h3 style={{ fontSize: '1rem', marginBottom: '8px', height: '40px', overflow: 'hidden', fontWeight: 700 }}>{item.name}</h3>

                                                        {item.portions && item.portions.length > 0 ? (
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                                {item.portions.map(p => (
                                                                    <div key={p.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '8px 10px', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                                                                        <span style={{ fontSize: '0.85rem', fontWeight: 800 }}>{p.label} <span style={{ color: 'var(--primary)' }}>₹{p.price}</span></span>
                                                                        <motion.button
                                                                            whileTap={{ scale: 0.8 }}
                                                                            onClick={() => (isKitchenOpen || tableId?.toLowerCase() === 'testing') ? addToCart(item, p) : showAlert('Kitchen Closed', 'Sorry, orders are not being accepted right now.')}
                                                                            style={{ padding: '6px 12px', borderRadius: '15px', border: 'none', background: isKitchenOpen ? 'var(--primary)' : '#555', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: isKitchenOpen ? 'pointer' : 'not-allowed', gap: '5px' }}
                                                                        >
                                                                            <Plus size={12} color="black" />
                                                                            <span style={{ fontSize: '0.7rem', fontWeight: 900, color: 'black' }}>ADD</span>
                                                                        </motion.button>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                    <span style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '1.2rem' }}>₹{item.price}</span>
                                                                </div>
                                                                <motion.button
                                                                    whileTap={{ scale: 0.95 }}
                                                                    onClick={() => (isKitchenOpen || tableId?.toLowerCase() === 'testing') ? addToCart(item) : showAlert('Kitchen Closed', 'Sorry, orders are not being accepted right now.')}
                                                                    style={{ width: '100%', padding: '10px', borderRadius: '12px', border: 'none', background: isKitchenOpen ? 'var(--primary)' : '#555', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: isKitchenOpen ? 'pointer' : 'not-allowed', gap: '8px', boxShadow: isKitchenOpen ? '0 4px 15px rgba(212, 175, 55, 0.2)' : 'none' }}
                                                                >
                                                                    <Plus size={16} color="black" />
                                                                    <span style={{ fontSize: '0.9rem', fontWeight: 900, color: 'black' }}>ADD TO ORDER</span>
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

                                                {discount.amount > 0 && (
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '0.9rem', color: '#4caf50' }}>
                                                        <span>{discount.reason}</span>
                                                        <span>- ₹{discount.amount}</span>
                                                    </div>
                                                )}

                                                <div style={{ height: '1px', background: 'var(--glass-border)', margin: '10px 0' }} />
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.1rem' }}>
                                                    <span>Grand Total</span>
                                                    <span className="gold-text">₹{Math.max(0, cartTotal - discount.amount)}</span>
                                                </div>
                                            </div>

                                            <button
                                                className="btn-primary"
                                                disabled={orderPlaced || isSubmittingOrder}
                                                onClick={placeOrder}
                                                style={{ width: '100%', padding: '18px', borderRadius: '15px', fontSize: '1rem', opacity: isSubmittingOrder ? 0.7 : 1 }}
                                            >
                                                {orderPlaced ? (
                                                    <>
                                                        <Check size={20} />
                                                        <span>ORDER SENT TO KITCHEN!</span>
                                                    </>
                                                ) : isSubmittingOrder ? (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'center' }}>
                                                        <div style={{ border: '3px solid black', borderTop: '3px solid transparent', borderRadius: '50%', width: '20px', height: '20px', animation: 'spin 1s linear infinite' }} />
                                                        <span style={{ fontWeight: 900 }}>SENDING ORDER...</span>
                                                    </div>
                                                ) : (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        <ShoppingCart size={20} />
                                                        <span style={{ fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px' }}>PLACE ORDER NOW (₹{Math.max(0, cartTotal - discount.amount)})</span>
                                                    </div>
                                                )}
                                            </button>
                                        </motion.div>
                                    </>
                                )}
                            </AnimatePresence>
                        </>
                    )} {/* End of Location Restricted Content */}

                    {/* Delivery Address Modal */}
                    <AnimatePresence>
                        {deliveryModal && (
                            <div style={{ position: 'fixed', inset: 0, zIndex: 1001, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    onClick={() => setDeliveryModal(false)}
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
                                        boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                                        maxHeight: '90vh',
                                        overflowY: 'auto'
                                    }}
                                >
                                    <button
                                        onClick={() => setDeliveryModal(false)}
                                        style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                                    >
                                        <X size={20} />
                                    </button>

                                    <div style={{ marginBottom: '25px', textAlign: 'center' }}>
                                        <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>📍</div>
                                        <h3 className="gold-text" style={{ fontSize: '1.4rem', marginBottom: '8px' }}>Delivery Details</h3>
                                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                            Please provide your delivery information
                                        </p>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
                                                Full Name *
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="Enter your name"
                                                value={deliveryForm.name}
                                                onChange={(e) => setDeliveryForm({ ...deliveryForm, name: e.target.value })}
                                                style={{
                                                    width: '100%',
                                                    padding: '12px',
                                                    background: 'rgba(255,255,255,0.05)',
                                                    border: '1px solid var(--glass-border)',
                                                    borderRadius: '12px',
                                                    color: 'white',
                                                    fontSize: '1rem'
                                                }}
                                            />
                                        </div>

                                        <div>
                                            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
                                                Contact Number *
                                            </label>
                                            <input
                                                type="tel"
                                                placeholder="Enter your phone number"
                                                value={deliveryForm.phone}
                                                onChange={(e) => setDeliveryForm({ ...deliveryForm, phone: e.target.value })}
                                                style={{
                                                    width: '100%',
                                                    padding: '12px',
                                                    background: 'rgba(255,255,255,0.05)',
                                                    border: '1px solid var(--glass-border)',
                                                    borderRadius: '12px',
                                                    color: 'white',
                                                    fontSize: '1rem'
                                                }}
                                            />
                                        </div>

                                        <div>
                                            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
                                                Delivery Address *
                                            </label>
                                            <textarea
                                                placeholder="House No, Street Name, Landmark..."
                                                value={deliveryForm.address}
                                                onChange={(e) => setDeliveryForm({ ...deliveryForm, address: e.target.value })}
                                                rows={3}
                                                style={{
                                                    width: '100%',
                                                    padding: '12px',
                                                    background: 'rgba(255,255,255,0.05)',
                                                    border: '1px solid var(--glass-border)',
                                                    borderRadius: '12px',
                                                    color: 'white',
                                                    fontSize: '1rem',
                                                    resize: 'vertical',
                                                    fontFamily: 'inherit'
                                                }}
                                            />
                                        </div>

                                        <div style={{
                                            padding: '12px',
                                            background: deliveryForm.location ? 'rgba(76, 175, 80, 0.1)' : 'rgba(255, 152, 0, 0.1)',
                                            border: `1px solid ${deliveryForm.location ? 'rgba(76, 175, 80, 0.3)' : 'rgba(255, 152, 0, 0.3)'}`,
                                            borderRadius: '12px',
                                            textAlign: 'center'
                                        }}>
                                            <p style={{ fontSize: '0.85rem', color: deliveryForm.location ? '#4caf50' : '#ff9800' }}>
                                                {deliveryForm.location
                                                    ? '✅ GPS Location Captured'
                                                    : '⏳ Capturing your location...'}
                                            </p>
                                            {deliveryForm.location && (
                                                <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                                    Lat: {deliveryForm.location.lat.toFixed(6)}, Lng: {deliveryForm.location.lng.toFixed(6)}
                                                </p>
                                            )}
                                        </div>

                                        <button
                                            onClick={submitDeliveryOrder}
                                            disabled={!deliveryForm.location}
                                            className="btn-primary"
                                            style={{
                                                width: '100%',
                                                padding: '15px',
                                                borderRadius: '12px',
                                                fontWeight: 800,
                                                fontSize: '1rem',
                                                opacity: deliveryForm.location ? 1 : 0.5,
                                                cursor: deliveryForm.location ? 'pointer' : 'not-allowed'
                                            }}
                                        >
                                            Confirm Delivery Order (₹{cartTotal})
                                        </button>
                                    </div>
                                </motion.div>
                            </div>
                        )}
                    </AnimatePresence>

                    {/* Waiting for Approval Modal */}
                    <AnimatePresence>
                        {waitingForApproval && (
                            <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
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
                                        border: '2px solid rgba(255, 152, 0, 0.3)',
                                        boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
                                    }}
                                >
                                    <div style={{ marginBottom: '20px' }}>
                                        <div className="spinner" style={{ width: '50px', height: '50px', margin: '0 auto 20px', border: '4px solid rgba(212, 175, 55, 0.3)', borderTop: '4px solid var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                                    </div>

                                    <h3 className="gold-text" style={{ fontSize: '1.5rem', marginBottom: '15px' }}>⏳ Waiting for Approval</h3>
                                    <p style={{ color: 'white', lineHeight: 1.6, fontSize: '1rem', marginBottom: '10px' }}>
                                        Your order has been sent to the admin.
                                    </p>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                        Please wait while we review your order...
                                    </p>
                                </motion.div>
                            </div>
                        )}
                    </AnimatePresence>

                    {/* Order Success Modal (After Approval) */}
                    <AnimatePresence>
                        {orderPlaced && orderStatusMessage && (
                            <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(8px)' }}
                                />
                                <motion.div
                                    initial={{ scale: 0.5, opacity: 0, rotate: -10 }}
                                    animate={{ scale: 1, opacity: 1, rotate: 0 }}
                                    exit={{ scale: 0.5, opacity: 0 }}
                                    transition={{ type: 'spring', damping: 15, stiffness: 200 }}
                                    className="glass-card"
                                    style={{
                                        position: 'relative',
                                        width: '100%',
                                        maxWidth: '350px',
                                        padding: '50px 30px',
                                        textAlign: 'center',
                                        border: '2px solid var(--primary)',
                                        boxShadow: '0 20px 60px rgba(212, 175, 55, 0.4)',
                                        background: 'rgba(0, 10, 0, 0.95)'
                                    }}
                                >
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                                        style={{ marginBottom: '25px', display: 'inline-flex', padding: '20px', borderRadius: '50%', background: 'rgba(76, 175, 80, 0.2)', color: '#4caf50' }}
                                    >
                                        <Check size={48} strokeWidth={3} />
                                    </motion.div>

                                    <h2 className="gold-text" style={{ fontSize: '1.8rem', marginBottom: '15px', fontWeight: 900 }}>ORDER CONFIRMED!</h2>
                                    <p style={{ color: '#4caf50', fontSize: '1.1rem', fontWeight: 700, marginBottom: '15px' }}>
                                        {orderStatusMessage}
                                    </p>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                                        Your order is being prepared.<br />
                                        Please wait at your table.
                                    </p>

                                    <div style={{ marginTop: '30px', padding: '15px', background: 'rgba(212, 175, 55, 0.1)', borderRadius: '12px', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
                                        <p style={{ color: 'var(--primary)', fontSize: '0.8rem', fontWeight: 800, letterSpacing: '1px' }}>
                                            - THE MARWAD RASOI -
                                        </p>
                                    </div>
                                </motion.div>
                            </div>
                        )}
                    </AnimatePresence>

                    {/* Custom Alert Modal */}
                    <AnimatePresence>
                        {customAlert.show && (
                            <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
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
                                        maxWidth: '320px',
                                        padding: '40px 30px',
                                        textAlign: 'center',
                                        border: '1px solid var(--glass-border)',
                                        boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
                                    }}
                                >
                                    <button
                                        onClick={() => setCustomAlert({ ...customAlert, show: false })}
                                        style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                                    >
                                        <X size={20} />
                                    </button>

                                    <div style={{ marginBottom: '20px', display: 'inline-flex', padding: '15px', borderRadius: '50%', background: 'rgba(212, 175, 55, 0.1)', color: 'var(--primary)' }}>
                                        <Bell size={32} />
                                    </div>

                                    <h3 className="gold-text" style={{ fontSize: '1.4rem', marginBottom: '15px' }}>{customAlert.title}</h3>
                                    <p style={{ color: 'white', lineHeight: 1.6, fontSize: '1rem', marginBottom: '30px' }}>{customAlert.message}</p>

                                    <button
                                        onClick={() => setCustomAlert({ ...customAlert, show: false })}
                                        className="btn-primary"
                                        style={{ width: '100%', padding: '15px', borderRadius: '12px', fontWeight: 800, fontSize: '1rem' }}
                                    >
                                        UNDERSTOOD
                                    </button>
                                </motion.div>
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};

export default CustomerView;
