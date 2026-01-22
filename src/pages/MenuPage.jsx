import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ShoppingCart, X, Plus, Minus, Send } from 'lucide-react';
import { collection, addDoc, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { menuData } from '../data/menuData';
import './MenuPage.css';

const MenuPage = ({ category, title }) => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [tableNumber, setTableNumber] = useState('');
    const [menuItems, setMenuItems] = useState([]);
    const [cart, setCart] = useState([]);
    const [showCart, setShowCart] = useState(false);

    // Load cart from localStorage on mount
    useEffect(() => {
        const savedCart = localStorage.getItem('customerCart');
        if (savedCart) {
            setCart(JSON.parse(savedCart));
        }
    }, []);

    // Save cart to localStorage whenever it changes
    useEffect(() => {
        if (cart.length > 0) {
            localStorage.setItem('customerCart', JSON.stringify(cart));
        }
    }, [cart]);

    useEffect(() => {
        const table = searchParams.get('table') || 'unknown';
        setTableNumber(table);
    }, [searchParams]);

    // Fetch items from Firestore filtered by category
    useEffect(() => {
        // q is the query to fetch items from Firestore
        const q = query(collection(db, 'menuItems'), where('category', '==', category));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (!snapshot.empty) {
                const items = [];
                snapshot.forEach((doc) => {
                    items.push({ id: doc.id, ...doc.data() });
                });
                setMenuItems(items);
            } else {
                // Fallback to local data if Firestore is empty
                console.log('Firestore empty, using local fallback for:', category);
                setMenuItems(menuData[category] || []);
            }
        }, (error) => {
            console.error("Firebase error, using local fallback:", error);
            setMenuItems(menuData[category] || []);
        });

        return () => unsubscribe();
    }, [category]);

    const handleBack = () => {
        navigate(`/?table=${tableNumber}`);
    };

    const addToCart = (item) => {
        const existingItem = cart.find(cartItem => cartItem.id === item.id);
        if (existingItem) {
            setCart(cart.map(cartItem =>
                cartItem.id === item.id
                    ? { ...cartItem, quantity: cartItem.quantity + 1 }
                    : cartItem
            ));
        } else {
            setCart([...cart, { ...item, quantity: 1 }]);
        }
    };

    const updateQuantity = (itemId, change) => {
        setCart(cart.map(item => {
            if (item.id === itemId) {
                const newQuantity = item.quantity + change;
                return newQuantity > 0 ? { ...item, quantity: newQuantity } : item;
            }
            return item;
        }).filter(item => item.quantity > 0));
    };

    const removeFromCart = (itemId) => {
        setCart(cart.filter(item => item.id !== itemId));
    };

    const getTotalPrice = () => {
        return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    };

    const getTotalItems = () => {
        return cart.reduce((total, item) => total + item.quantity, 0);
    };

    const submitOrder = async () => {
        if (cart.length === 0) return;

        try {
            await addDoc(collection(db, 'orders'), {
                tableNumber: tableNumber,
                items: cart,
                total: getTotalPrice(),
                timestamp: new Date().toISOString(),
                status: 'pending',
                createdAt: new Date()
            });

            // Clear cart from both state and localStorage
            setCart([]);
            localStorage.removeItem('customerCart');
            setShowCart(false);
            alert('Order placed successfully! Your order has been sent to the kitchen.');
        } catch (error) {
            console.error("Error submitting order: ", error);
            alert("Failed to place order. Please try again.");
        }
    };

    return (
        <div className="menu-page-container">
            <header className="menu-page-header">
                <button className="back-button" onClick={handleBack}>
                    <ArrowLeft size={24} />
                </button>
                <div className="header-content">
                    <h1 className="menu-page-title">{title}</h1>
                    {tableNumber && tableNumber !== 'unknown' && (
                        <p className="table-badge">{tableNumber}</p>
                    )}
                </div>
                <button className="cart-button" onClick={() => setShowCart(true)}>
                    <ShoppingCart size={24} />
                    {getTotalItems() > 0 && <span className="cart-count">{getTotalItems()}</span>}
                </button>
            </header>

            <div className="menu-items-container">
                {menuItems.length === 0 ? (
                    <div className="empty-menu">
                        <p>No items available in {title}</p>
                        <p className="empty-subtitle">Items will appear here once added by Admin</p>
                    </div>
                ) : (
                    <div className="menu-items-grid">
                        {menuItems.map((item) => (
                            <div key={item.id} className="menu-item-card">
                                {item.image && (
                                    <div className="item-image">
                                        <img src={item.image} alt={item.name} />
                                    </div>
                                )}
                                <div className="item-details">
                                    <h3 className="item-name">{item.name}</h3>
                                    {item.description && (
                                        <p className="item-description">{item.description}</p>
                                    )}
                                    <div className="item-footer">
                                        <span className="item-price">₹{item.price}</span>
                                        {item.inStock ? (
                                            <button
                                                className="add-button"
                                                onClick={() => addToCart(item)}
                                            >
                                                Add
                                            </button>
                                        ) : (
                                            <span className="out-of-stock">Out of Stock</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {showCart && (
                <div className="cart-modal-overlay" onClick={() => setShowCart(false)}>
                    <div className="cart-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="cart-header">
                            <h2>Your Order</h2>
                            <button className="close-button" onClick={() => setShowCart(false)}>
                                <X size={24} />
                            </button>
                        </div>

                        <div className="cart-content">
                            {cart.length === 0 ? (
                                <div className="empty-cart">
                                    <ShoppingCart size={48} />
                                    <p>Your cart is empty</p>
                                </div>
                            ) : (
                                <>
                                    <div className="cart-items">
                                        {cart.map((item) => (
                                            <div key={item.id} className="cart-item">
                                                <div className="cart-item-info">
                                                    <h4>{item.name}</h4>
                                                    <p className="cart-item-price">₹{item.price}</p>
                                                </div>
                                                <div className="cart-item-controls">
                                                    <button
                                                        className="qty-button"
                                                        onClick={() => updateQuantity(item.id, -1)}
                                                    >
                                                        <Minus size={16} />
                                                    </button>
                                                    <span className="quantity">{item.quantity}</span>
                                                    <button
                                                        className="qty-button"
                                                        onClick={() => updateQuantity(item.id, 1)}
                                                    >
                                                        <Plus size={16} />
                                                    </button>
                                                    <button
                                                        className="remove-button"
                                                        onClick={() => removeFromCart(item.id)}
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="cart-footer">
                                        <div className="cart-total">
                                            <span>Total:</span>
                                            <span className="total-amount">₹{getTotalPrice()}</span>
                                        </div>
                                        <button className="submit-order-button" onClick={submitOrder}>
                                            <Send size={20} />
                                            Place Order
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MenuPage;
