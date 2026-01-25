import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Utensils, Star, Plus, Minus, Check, Clock, Bell, ChevronRight, X } from 'lucide-react';
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
    const navigate = useNavigate();

    const [view, setView] = useState('landing'); // 'landing' or 'menu'
    const [menuItems, setMenuItems] = useState([]);
    const [activeCategory, setActiveCategory] = useState('All');
    const [activeSubCategory, setActiveSubCategory] = useState('');
    const [cart, setCart] = useState([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [orderPlaced, setOrderPlaced] = useState(false);
    const [isKitchenOpen, setIsKitchenOpen] = useState(true);
    const [deliveryRadius, setDeliveryRadius] = useState(5.0); // Default, updated from server
    const [restaurantCoords, setRestaurantCoords] = useState({
        lat: 26.909919, // Fallback
        lng: 75.722024
    });

    // --- BACKGROUND MUSIC STATE ---
    const [isMusicPlaying, setIsMusicPlaying] = useState(false);
    const [isMusicLoading, setIsMusicLoading] = useState(false);
    const [musicVolume, setMusicVolume] = useState(0.5);
    const [currentTrackIndex, setCurrentTrackIndex] = useState(Math.floor(Math.random() * 5));
    const [songRequest, setSongRequest] = useState('');
    const [isRequesting, setIsRequesting] = useState(false);
    const audioRef = React.useRef(null);

    const ROMANTIC_TRACKS = [
        { title: "Sweet Piano", url: "https://p.nomics.world/romantic/track1.mp3" }, // Fallback to a stable set if chosic fails
        { title: "Lush Guitar", url: "https://cdn.pixabay.com/audio/2022/02/22/audio_d0c6ff1adb.mp3" },
        { title: "Evening Waltz", url: "https://cdn.pixabay.com/audio/2022/03/15/audio_c8c8a1e8a1.mp3" },
        { title: "Moonlit Night", url: "https://cdn.pixabay.com/audio/2022/08/02/audio_8b2c4c4e7a.mp3" }
    ];

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = musicVolume;
        }
    }, [musicVolume]);

    const toggleMusic = () => {
        if (!audioRef.current) return;

        if (isMusicPlaying) {
            audioRef.current.pause();
            setIsMusicPlaying(false);
        } else {
            setIsMusicLoading(true);

            // ATTEMPT 1: Direct Play
            audioRef.current.play()
                .then(() => {
                    audioRef.current.muted = false;
                    setIsMusicPlaying(true);
                    setIsMusicLoading(false);
                })
                .catch(e => {
                    console.error("Play blocked, trying Muted Play...", e);
                    // ATTEMPT 2: Muted Play (Always allowed by browsers)
                    audioRef.current.muted = true;
                    audioRef.current.play()
                        .then(() => {
                            setIsMusicPlaying(true);
                            setIsMusicLoading(false);
                            showAlert("Unmute Music", "Tap the volume bar or anywhere on screen to hear the music!");

                            // Try to unmute on the very next click anywhere
                            const unmute = () => {
                                if (audioRef.current) audioRef.current.muted = false;
                                document.removeEventListener('click', unmute);
                            };
                            document.addEventListener('click', unmute);
                        })
                        .catch(err => {
                            console.error("Total audio block:", err);
                            setIsMusicLoading(false);
                            showAlert("Music Blocked", "Please tap anywhere on the menu first, then hit Start Music again!");
                        });
                });
        }
    };

    const handleMusicEnd = () => {
        const nextIndex = (currentTrackIndex + 1) % ROMANTIC_TRACKS.length;
        setCurrentTrackIndex(nextIndex);
    };

    const handleSongRequest = () => {
        if (!songRequest.trim()) return showAlert("Request Error", "Please enter a song name.");

        setIsRequesting(true);
        socket.emit('song-request', {
            tableId,
            songName: songRequest
        });

        setTimeout(() => {
            setIsRequesting(false);
            setSongRequest('');
            showAlert("Request Sent", "Your song request has been sent to THE MARWAD RASOI! 🎵");
        }, 1500);
    };
    // ------------------------------

    // Custom Alert State
    const [customAlert, setCustomAlert] = useState({ show: false, title: '', message: '' });

    const showAlert = (title, message) => {
        setCustomAlert({ show: true, title, message });
    };
    useEffect(() => {
        socket.emit('get-menu'); // existing
        socket.emit('get-settings'); // Fetch settings

        socket.on('menu-updated', (newMenu) => setMenuItems(newMenu));
        socket.on('kitchen-status-updated', (status) => setIsKitchenOpen(status));
        socket.on('settings-updated', (settings) => {
            if (settings) {
                if (settings.deliveryRadiusKm) setDeliveryRadius(settings.deliveryRadiusKm);
                if (settings.restaurantLocation) setRestaurantCoords(settings.restaurantLocation);
            }
        });

        socket.on('song-request-accepted', (data) => {
            if (data.tableId === tableId) {
                showAlert("Coming Up! 🎵", `The Chef has accepted your request! Your song "${data.songName}" will play on THE MARWAD speakers soon.`);
            }
        });

        return () => {
            socket.off('menu-updated');
            socket.off('kitchen-status-updated');
            socket.off('settings-updated');
        };
    }, []);

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

    const cartTotal = cart.reduce((acc, item) => acc + (item.price * item.qty), 0);

    const placeOrder = () => {
        const order = {
            tableId,
            items: cart.map(i => ({
                name: i.name,
                price: i.price,
                qty: i.qty,
                category: i.category,
                portion: i.cartId.includes('-') ? i.cartId.split('-')[1] : null
            })),
            total: cartTotal,
        };

        // Emit real-time order to backend
        socket.emit('place-order', order);

        setOrderPlaced(true);
        setCart([]);
        setTimeout(() => {
            setOrderPlaced(false);
            setIsCartOpen(false);
            setView('landing');
        }, 3000);
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

                                            {/* MUSIC CONTROLLER */}
                                            <audio
                                                ref={audioRef}
                                                src={ROMANTIC_TRACKS[currentTrackIndex].url}
                                                onEnded={handleMusicEnd}
                                                autoPlay={false}
                                                onError={(e) => {
                                                    console.error("Audio Load Error:", e);
                                                    setIsMusicLoading(false);
                                                    setIsMusicPlaying(false);
                                                }}
                                            />
                                            <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
                                                <motion.button
                                                    whileTap={{ scale: 0.9 }}
                                                    onClick={toggleMusic}
                                                    disabled={isMusicLoading}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '10px',
                                                        padding: '10px 20px',
                                                        borderRadius: '30px',
                                                        background: isMusicPlaying ? 'rgba(76, 175, 80, 0.2)' : 'rgba(212, 175, 55, 0.1)',
                                                        border: `1px solid ${isMusicPlaying ? '#4caf50' : 'var(--primary)'}`,
                                                        color: isMusicPlaying ? '#4caf50' : 'var(--primary)',
                                                        fontSize: '0.8rem',
                                                        fontWeight: 800,
                                                        cursor: isMusicLoading ? 'wait' : 'pointer',
                                                        opacity: isMusicLoading ? 0.7 : 1
                                                    }}
                                                >
                                                    {isMusicLoading ? (
                                                        <>
                                                            <div className="spinner-small"></div>
                                                            TUNING IN...
                                                        </>
                                                    ) : isMusicPlaying ? (
                                                        <>
                                                            <div className="pulse-music" style={{ width: '8px', height: '8px', background: '#4caf50', borderRadius: '50%' }}></div>
                                                            🎶 MUSIC PLAYING (STOP)
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Bell size={14} />
                                                            🎵 START ROMANTIC MUSIC
                                                        </>
                                                    )}
                                                </motion.button>

                                                {isMusicPlaying && (
                                                    <div style={{ width: '150px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>VOL</span>
                                                        <input
                                                            type="range"
                                                            min="0" max="1" step="0.01"
                                                            value={musicVolume}
                                                            onChange={(e) => setMusicVolume(parseFloat(e.target.value))}
                                                            style={{ flex: 1, accentColor: 'var(--primary)', height: '4px' }}
                                                        />
                                                    </div>
                                                )}

                                                {/* SONG REQUEST SECTION */}
                                                <div style={{
                                                    marginTop: '30px',
                                                    width: '100%',
                                                    padding: '20px',
                                                    background: 'rgba(255,255,255,0.03)',
                                                    borderRadius: '20px',
                                                    border: '1px solid rgba(255,255,255,0.05)',
                                                    textAlign: 'center'
                                                }}>
                                                    <h4 style={{ fontSize: '0.9rem', marginBottom: '15px', color: 'var(--text-secondary)' }}>WANNA REQUEST A SONG?</h4>
                                                    <div style={{ display: 'flex', gap: '10px' }}>
                                                        <input
                                                            type="text"
                                                            value={songRequest}
                                                            onChange={(e) => setSongRequest(e.target.value)}
                                                            placeholder="Enter Song Name..."
                                                            style={{
                                                                flex: 1,
                                                                padding: '12px',
                                                                background: 'rgba(0,0,0,0.3)',
                                                                border: '1px solid var(--glass-border)',
                                                                borderRadius: '12px',
                                                                color: 'white',
                                                                fontSize: '0.85rem'
                                                            }}
                                                        />
                                                        <motion.button
                                                            whileTap={{ scale: 0.9 }}
                                                            onClick={handleSongRequest}
                                                            disabled={isRequesting}
                                                            style={{
                                                                padding: '12px 20px',
                                                                background: 'var(--primary)',
                                                                color: 'black',
                                                                border: 'none',
                                                                borderRadius: '12px',
                                                                fontWeight: 800,
                                                                fontSize: '0.8rem',
                                                                cursor: 'pointer'
                                                            }}
                                                        >
                                                            {isRequesting ? '...' : 'SEND'}
                                                        </motion.button>
                                                    </div>
                                                </div>
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
                                                ? ACTIONS.filter(a => ['CAFE', 'RESTAURANT', 'RATE'].includes(a.id))
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
                                                    <div style={{ padding: '12px' }}>
                                                        <h3 style={{ fontSize: '1rem', marginBottom: '8px', height: '40px', overflow: 'hidden', fontWeight: 700 }}>{item.name}</h3>

                                                        {item.portions ? (
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
                                                        <span>ORDER SENT TO KITCHEN!</span>
                                                    </>
                                                ) : (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        <ShoppingCart size={20} />
                                                        <span style={{ fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px' }}>PLACE ORDER NOW (₹{cartTotal})</span>
                                                    </div>
                                                )}
                                            </button>
                                        </motion.div>
                                    </>
                                )}
                            </AnimatePresence>
                        </>
                    )} {/* End of Location Restricted Content */}

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
