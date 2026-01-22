import React, { useState, useEffect } from 'react';
import { QrCode, Download, ShoppingCart, TrendingUp, UtensilsCrossed } from 'lucide-react';
import QRCode from 'qrcode';
import { collection, onSnapshot, query, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import MenuManager from './MenuManager';
import './AdminPanel.css';
import './AdminPanel-orders.css';
import './AdminPanel-combined-bill.css';

const AdminPanel = () => {
    const [activeTab, setActiveTab] = useState('qr-codes');
    const [qrCodes, setQrCodes] = useState(() => {
        const codes = [];
        // Tables 1-20
        for (let i = 1; i <= 20; i++) {
            codes.push({
                id: i,
                tableNumber: `Table ${i}`,
                qrDataUrl: null
            });
        }
        // Delivery
        codes.push({
            id: 21,
            tableNumber: 'Delivery',
            qrDataUrl: null
        });
        // Testing
        codes.push({
            id: 22,
            tableNumber: 'Testing',
            qrDataUrl: null
        });
        return codes;
    });

    // Auto-generate all QR codes on mount
    useEffect(() => {
        const generateAllQRCodes = async () => {
            const updatedCodes = await Promise.all(
                qrCodes.map(async (qr) => {
                    // Use local IP for mobile access
                    const baseUrl = 'http://192.168.1.40:5173';
                    const url = `${baseUrl}/?table=${qr.tableNumber}`;
                    try {
                        const qrDataUrl = await QRCode.toDataURL(url, {
                            width: 200,
                            margin: 2,
                            color: {
                                dark: '#1a1a1a',
                                light: '#ffffff'
                            }
                        });
                        return { ...qr, qrDataUrl };
                    } catch (err) {
                        console.error('Error generating QR code:', err);
                        return qr;
                    }
                })
            );
            setQrCodes(updatedCodes);
        };

        generateAllQRCodes();
    }, []);

    const generateQR = async (index, tableNumber) => {
        if (!tableNumber) return;

        const url = `${window.location.origin}/?table=${tableNumber}`;
        try {
            const qrDataUrl = await QRCode.toDataURL(url, {
                width: 200,
                margin: 2,
                color: {
                    dark: '#1a1a1a',
                    light: '#ffffff'
                }
            });

            const newQrCodes = [...qrCodes];
            newQrCodes[index] = {
                ...newQrCodes[index],
                tableNumber,
                qrDataUrl
            };
            setQrCodes(newQrCodes);
        } catch (err) {
            console.error('Error generating QR code:', err);
        }
    };

    const handleTableNumberChange = (index, value) => {
        const newQrCodes = [...qrCodes];
        newQrCodes[index].tableNumber = value;
        setQrCodes(newQrCodes);
    };

    const downloadQR = (qrDataUrl, tableNumber) => {
        const link = document.createElement('a');
        link.href = qrDataUrl;
        link.download = `table-${tableNumber}-qr.png`;
        link.click();
    };

    const tabs = [
        { id: 'active-orders', label: 'Active Orders', icon: ShoppingCart },
        { id: 'sales', label: 'Sales', icon: TrendingUp },
        { id: 'menu', label: 'Menu', icon: UtensilsCrossed },
        { id: 'qr-codes', label: 'QR Codes', icon: QrCode }
    ];

    return (
        <div className="admin-container">
            <div className="admin-header">
                <h1 className="admin-title">MARWAD ADMIN</h1>
                <p className="admin-subtitle">Management System</p>
            </div>

            <div className="admin-tabs">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            <Icon size={20} />
                            <span>{tab.label}</span>
                        </button>
                    );
                })}
            </div>

            <div className="admin-content">
                {activeTab === 'active-orders' && (
                    <ActiveOrdersTab />
                )}

                {activeTab === 'sales' && (
                    <div className="tab-content">
                        <h2 className="content-title">Sales Reports</h2>
                        <div className="empty-state">
                            <TrendingUp size={48} />
                            <p>Sales data will appear here</p>
                        </div>
                    </div>
                )}

                {activeTab === 'menu' && (
                    <div className="tab-content">
                        <h2 className="content-title">Menu Management</h2>
                        <MenuManager />
                    </div>
                )}

                {activeTab === 'qr-codes' && (
                    <div className="tab-content">
                        <h2 className="content-title">QR Code Generator</h2>
                        <div className="qr-grid">
                            {qrCodes.map((qr) => (
                                <div key={qr.id} className="qr-card">
                                    <div className="qr-card-header">
                                        <QrCode size={20} className="qr-icon" />
                                        <span className="table-label">{qr.tableNumber}</span>
                                    </div>

                                    {qr.qrDataUrl && (
                                        <div className="qr-preview">
                                            <img src={qr.qrDataUrl} alt={`QR for ${qr.tableNumber}`} />
                                            <button
                                                className="download-btn"
                                                onClick={() => downloadQR(qr.qrDataUrl, qr.tableNumber)}
                                            >
                                                <Download size={16} />
                                                Download
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// Active Orders Tab Component - Combined Bill System
const ActiveOrdersTab = () => {
    const [orders, setOrders] = useState([]);
    const [groupedOrders, setGroupedOrders] = useState({});

    useEffect(() => {
        const q = query(collection(db, 'orders'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const activeOrders = [];
            snapshot.forEach((doc) => {
                activeOrders.push({ id: doc.id, ...doc.data() });
            });
            setOrders(activeOrders);

            // Group orders by table number
            const grouped = activeOrders.reduce((acc, order) => {
                const table = order.tableNumber;
                if (!acc[table]) {
                    acc[table] = [];
                }
                acc[table].push(order);
                return acc;
            }, {});

            setGroupedOrders(grouped);
        });

        return () => unsubscribe();
    }, []);

    const clearTableBill = async (tableNumber) => {
        if (window.confirm(`Clear entire bill for ${tableNumber}?`)) {
            const ordersToDelete = orders.filter(order => order.tableNumber === tableNumber);

            try {
                // Delete all orders for this table from Firestore
                const deletePromises = ordersToDelete.map(order =>
                    deleteDoc(doc(db, 'orders', order.id))
                );
                await Promise.all(deletePromises);
            } catch (error) {
                console.error("Error clearing bill: ", error);
                alert("Failed to clear bill. Please try again.");
            }
        }
    };

    const getTableTotal = (tableOrders) => {
        return tableOrders.reduce((sum, order) => sum + order.total, 0);
    };

    const getAllItems = (tableOrders) => {
        const itemsMap = {};

        tableOrders.forEach(order => {
            order.items.forEach(item => {
                const key = `${item.id}-${item.name}`;
                if (itemsMap[key]) {
                    itemsMap[key].quantity += item.quantity;
                } else {
                    itemsMap[key] = { ...item };
                }
            });
        });

        return Object.values(itemsMap);
    };

    return (
        <div className="tab-content">
            <h2 className="content-title">Active Orders - Combined Bills</h2>
            {Object.keys(groupedOrders).length === 0 ? (
                <div className="empty-state">
                    <ShoppingCart size={48} />
                    <p>No active orders at the moment</p>
                </div>
            ) : (
                <div className="orders-grid">
                    {Object.entries(groupedOrders).map(([tableNumber, tableOrders]) => {
                        const allItems = getAllItems(tableOrders);
                        const tableTotal = getTableTotal(tableOrders);
                        const orderCount = tableOrders.length;

                        // Sort orders by timestamp
                        const sortedOrders = [...tableOrders].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

                        return (
                            <div key={tableNumber} className="order-card table-bill-card">
                                <div className="order-header">
                                    <div>
                                        <h3>{tableNumber}</h3>
                                        <span className="order-count">{orderCount} order{orderCount > 1 ? 's' : ''}</span>
                                    </div>
                                    <span className="order-time">
                                        Latest: {new Date(sortedOrders[sortedOrders.length - 1].timestamp).toLocaleTimeString()}
                                    </span>
                                </div>

                                <div className="order-items">
                                    <div className="items-header">
                                        <strong>Combined Items:</strong>
                                    </div>
                                    {allItems.map((item, index) => (
                                        <div key={index} className="order-item">
                                            <span>{item.quantity}x {item.name}</span>
                                            <span>₹{item.price * item.quantity}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="order-history">
                                    <details>
                                        <summary>View Order Timeline ({orderCount} order{orderCount > 1 ? 's' : ''})</summary>
                                        <div className="history-list">
                                            {sortedOrders.map((order) => (
                                                <div key={order.id} className="history-item">
                                                    <div className="history-header">
                                                        <span>{new Date(order.timestamp).toLocaleTimeString()}</span>
                                                    </div>
                                                    <div className="history-items">
                                                        {order.items.map((item, i) => (
                                                            <div key={i} className="history-item-detail">
                                                                {item.quantity}x {item.name} - ₹{item.price * item.quantity}
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <div className="history-total">₹{order.total}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </details>
                                </div>

                                <div className="order-footer">
                                    <div className="order-total">
                                        <strong>Total Bill:</strong>
                                        <strong className="total-highlight">₹{tableTotal}</strong>
                                    </div>
                                    <button
                                        className="complete-order-btn clear-bill-btn"
                                        onClick={() => clearTableBill(tableNumber)}
                                    >
                                        Clear Bill
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default AdminPanel;
