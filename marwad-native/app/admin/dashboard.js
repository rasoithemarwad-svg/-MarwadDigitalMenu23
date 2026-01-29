import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, FlatList, Modal, TextInput, Alert, Image, Switch, SafeAreaView, Linking } from 'react-native';
import { styled } from 'nativewind';
import { useRouter, useLocalSearchParams } from 'expo-router';
import io from 'socket.io-client';
import {
    Bell, CheckCircle, Clock, Receipt, Utensils, RefreshCcw, LogOut, ChevronRight, Plus, X, Trash2, LineChart,
    QrCode, ClipboardList, Wallet, Settings, List, Edit, Download
} from 'lucide-react-native';
// import QRCode from 'react-native-qrcode-svg'; // Removed for build stability
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { API_URL, WEB_URL } from '../../constants/Config';
import { scheduleLocalNotification } from '../../utils/NotificationHelper';
import Scanner from '../components/Scanner';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledTextInput = styled(TextInput);

const socket = io(API_URL);

export default function AdminDashboard() {
    const router = useRouter();
    const { role, username } = useLocalSearchParams();
    const [activeTab, setActiveTab] = useState('orders');

    // DATA STATE
    const [orders, setOrders] = useState([]);
    const [menuItems, setMenuItems] = useState([]);
    const [salesHistory, setSalesHistory] = useState([]);
    const [expenses, setExpenses] = useState([]);
    const [settings, setSettings] = useState({ deliveryRange: '5000' });
    const [isKitchenOpen, setIsKitchenOpen] = useState(true);
    const [serviceAlerts, setServiceAlerts] = useState([]);

    // FORMS & MODALS
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [itemForm, setItemForm] = useState({
        name: '', price: '', category: 'RESTAURANT', subCategory: '', image: '', description: '', isAvailable: true
    });

    const [expenseForm, setExpenseForm] = useState({
        item: 'Vegetable', amount: '', paidBy: '', description: '', paymentMode: 'CASH', date: new Date().toISOString()
    });

    const [quickBillCart, setQuickBillCart] = useState([]);
    const [quickBillItem, setQuickBillItem] = useState({ name: '', price: '', qty: '1' });
    const [reportPeriod, setReportPeriod] = useState('month'); // 'today', 'month', 'all'
    const [isScannerOpen, setIsScannerOpen] = useState(false);

    const handleScan = (data) => {
        setIsScannerOpen(false);
        try {
            if (data.includes('/customer/')) {
                const parts = data.split('/customer/');
                if (parts.length > 1) {
                    const tableId = parts[1];
                    Alert.alert("Scanned", `Redirecting to Table #${tableId}`, [
                        { text: "Go", onPress: () => router.push(`/customer/${tableId}`) }
                    ]);
                    return;
                }
            }
            Alert.alert("Scanned", `Code: ${data}`);
        } catch (e) {
            Alert.alert("Error", "Invalid QR Code");
        }
    };

    useEffect(() => {
        fetchData();

        socket.on('orders-updated', setOrders);
        socket.on('menu-updated', setMenuItems);
        socket.on('sales-updated', setSalesHistory);
        socket.on('expenses-updated', setExpenses);
        socket.on('settings-updated', (newSettings) => {
            setSettings(prev => ({ ...prev, ...newSettings }));
        });
        socket.on('kitchen-status-updated', setIsKitchenOpen);

        socket.on('connect', () => {
            // Optional: Toast or subtle indicator
            console.log("Connected to server");
        });

        socket.on('connect_error', (err) => {
            Alert.alert("Connection Error", "Cannot connect to server. Check internet or server status.\n" + err.message);
        });

        socket.on('new-order-alert', (order) => {
            scheduleLocalNotification("New Order Received!", `Table #${order.tableId} - ₹${order.total}`);
            Alert.alert("New Order", `Table #${order.tableId} - ₹${order.total}`);
            socket.emit('get-orders');
        });

        socket.on('new-service-alert', (alert) => {
            scheduleLocalNotification("Service Bell Rung!", `Table #${alert.tableId} is calling for help!`);
            setServiceAlerts(prev => [alert, ...prev]);
            Alert.alert("Service Called", `Table #${alert.tableId} needs help!`);
        });

        return () => {
            socket.off('orders-updated');
            socket.off('menu-updated');
            socket.off('sales-updated');
            socket.off('expenses-updated');
            socket.off('settings-updated');
            socket.off('kitchen-status-updated');
            socket.off('new-order-alert');
            socket.off('new-service-alert');
        };
    }, []);

    const fetchData = () => {
        socket.emit('get-menu');
        socket.emit('get-orders');
        socket.emit('get-sales');
        socket.emit('get-expenses');
        socket.emit('get-settings');
    }

    // --- ACTIONS ---

    const updateOrderStatus = (id, status) => socket.emit('update-order-status', { id, status });
    const toggleKitchen = () => socket.emit('toggle-kitchen-status', !isKitchenOpen);

    const saveSettings = () => {
        socket.emit('update-settings', settings);
        Alert.alert("Success", "Settings saved successfully!");
    };

    const handleSaveItem = () => {
        socket.emit('update-menu-item', editingItem ? { ...editingItem, ...itemForm } : itemForm);
        setIsEditModalOpen(false);
        resetItemForm();
    };

    const resetItemForm = () => {
        setEditingItem(null);
        setItemForm({ name: '', price: '', category: 'RESTAURANT', subCategory: '', image: '', description: '', isAvailable: true });
    };

    const deleteItem = (id) => {
        if (role !== 'ADMIN' && role !== 'OWNER') return Alert.alert('Access Denied', 'Managers cannot delete items.');
        Alert.alert("Confirm Delete", "Are you sure?", [
            { text: "Cancel", style: "cancel" },
            { text: "Delete", onPress: () => socket.emit('delete-menu-item', id), style: 'destructive' }
        ]);
    };

    const startEditItem = (item) => {
        setEditingItem(item);
        setItemForm({
            name: item.name, price: String(item.price), category: item.category || 'RESTAURANT',
            subCategory: item.subCategory || '', image: item.image || '', description: item.description || '',
            isAvailable: item.isAvailable
        });
        setIsEditModalOpen(true);
    };

    // BILLING & SALES
    const settleBill = (tableId) => {
        const tableOrders = orders.filter(o => o.tableId === tableId && o.status !== 'cancelled');
        if (tableOrders.length === 0) return;
        const total = tableOrders.reduce((acc, o) => acc + o.total, 0);
        const allItems = tableOrders.flatMap(o => o.items);

        Alert.alert("Settle Bill", `Total: ₹${total}\nChoose Payment Mode`, [
            { text: "Cancel", style: "cancel" },
            { text: "ONLINE", onPress: () => processSettlement(tableId, allItems, total, 'ONLINE') },
            { text: "CASH", onPress: () => processSettlement(tableId, allItems, total, 'CASH') }
        ]);
    };

    const processSettlement = (tableId, items, total, mode) => {
        socket.emit('save-sale', {
            tableId, items: items.map(i => ({ name: i.name, qty: i.qty, price: i.price })),
            total, paymentMode: mode, settledAt: new Date().toISOString()
        });
        Alert.alert("Success", `Table #${tableId} settled via ${mode}!`);
    };

    // QUICK BILL
    const addToQuickCart = () => {
        if (!quickBillItem.name || !quickBillItem.price) return Alert.alert("Error", "Name and Price required");
        const newItem = {
            id: Date.now(),
            name: quickBillItem.name,
            price: parseFloat(quickBillItem.price),
            qty: parseInt(quickBillItem.qty) || 1,
            total: parseFloat(quickBillItem.price) * (parseInt(quickBillItem.qty) || 1)
        };
        setQuickBillCart([...quickBillCart, newItem]);
        setQuickBillItem({ name: '', price: '', qty: '1' });
    };

    const settleQuickBill = (mode) => {
        if (quickBillCart.length === 0) return;
        const total = quickBillCart.reduce((acc, i) => acc + i.total, 0);
        socket.emit('save-sale', {
            tableId: 'WALK-IN', items: quickBillCart, total, paymentMode: mode, settledAt: new Date().toISOString(), isWalkIn: true
        });
        setQuickBillCart([]);
        Alert.alert("Success", `Quick Bill settled via ${mode}!`);
    };

    // EXPENSES
    const saveExpense = () => {
        if (!expenseForm.amount || !expenseForm.paidBy) return Alert.alert("Error", "Amount and Paid By required");
        socket.emit('add-expense', { ...expenseForm, amount: parseFloat(expenseForm.amount) });
        setExpenseForm({ item: 'Vegetable', amount: '', paidBy: '', description: '', paymentMode: 'CASH', date: new Date().toISOString() });
        Alert.alert("Saved", "Expense recorded!");
    };

    // HELPERS
    const generateQRCodeLink = (tableId) => `${API_URL}/customer/${tableId}`;

    const getFinancials = (period = reportPeriod) => {
        const now = new Date();
        let startOfPeriod;

        if (period === 'today') {
            startOfPeriod = new Date(now.setHours(0, 0, 0, 0));
        } else if (period === 'month') {
            startOfPeriod = new Date(now.getFullYear(), now.getMonth(), 1);
        } else {
            startOfPeriod = new Date(0); // All time
        }

        const fSales = salesHistory.filter(s => new Date(s.settledAt) >= startOfPeriod);
        const fExp = expenses.filter(e => new Date(e.date) >= startOfPeriod);
        const totalSales = fSales.reduce((acc, s) => acc + s.total, 0);
        const totalExp = fExp.reduce((acc, e) => acc + e.amount, 0);

        return { totalSales, totalExp, profit: totalSales - totalExp, sales: fSales, expenses: fExp };
    };

    const exportRecords = async () => {
        try {
            const { sales, expenses: exp } = getFinancials();

            // Create CSV content
            let csv = 'SALES RECORDS\n\n';
            csv += 'Date,Table ID,Total,Payment Mode,Items\n';
            sales.forEach(s => {
                const date = new Date(s.settledAt).toLocaleDateString();
                const items = s.items.map(i => `${i.qty}x ${i.name}`).join('; ');
                csv += `"${date}","${s.tableId}","${s.total}","${s.paymentMode}","${items}"\n`;
            });

            csv += '\n\nEXPENSE RECORDS\n\n';
            csv += 'Date,Item,Amount,Paid By,Payment Mode,Description\n';
            exp.forEach(e => {
                const date = new Date(e.date).toLocaleDateString();
                csv += `"${date}","${e.item}","${e.amount}","${e.paidBy}","${e.paymentMode}","${e.description || ''}"\n`;
            });

            // Save file
            const filename = `marwad_report_${reportPeriod}_${Date.now()}.csv`;
            const fileUri = FileSystem.documentDirectory + filename;

            await FileSystem.writeAsStringAsync(fileUri, csv, { encoding: FileSystem.EncodingType.UTF8 });

            // Share file
            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(fileUri);
            } else {
                Alert.alert('Success', `Report saved to ${fileUri}`);
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to export records: ' + error.message);
        }
    };

    const clearAllHistory = () => {
        Alert.alert("DANGER: WIPE DATA", "Are you sure? This will delete ALL history and cannot be undone.", [
            { text: "CANCEL", style: "cancel" },
            { text: "YES, WIPE ALL", style: 'destructive', onPress: () => socket.emit('clear-history') }
        ]);
    };

    // RENDERERS
    const renderTab = (id, label, Icon) => (
        <StyledTouchableOpacity
            onPress={() => setActiveTab(id)}
            className={`mr-2 px-4 py-3 rounded-xl flex-row items-center ${activeTab === id ? 'bg-yellow-500' : 'bg-neutral-800'}`}
        >
            <Icon size={16} color={activeTab === id ? 'black' : '#9ca3af'} />
            <StyledText className={`ml-2 font-bold ${activeTab === id ? 'text-black' : 'text-gray-400'}`}>{label}</StyledText>
        </StyledTouchableOpacity>
    );

    return (
        <SafeAreaView className="flex-1 bg-neutral-900">
            {/* Header */}
            <View className="p-4 border-b border-white/10 flex-row justify-between items-center">
                <View>
                    <StyledText className="text-yellow-500 font-black text-xl tracking-widest">MARWAD RASOI</StyledText>
                    <StyledText className="text-gray-500 text-xs font-bold">{role} • {username}</StyledText>
                </View>
                <View className="flex-row items-center gap-3">
                    <StyledTouchableOpacity
                        onPress={toggleKitchen}
                        className={`px-3 py-1 rounded-full border ${isKitchenOpen ? 'border-green-500 bg-green-900/20' : 'border-red-500 bg-red-900/20'}`}
                    >
                        <StyledText className={`${isKitchenOpen ? 'text-green-500' : 'text-red-500'} font-bold text-xs`}>
                            {isKitchenOpen ? 'KITCHEN OPEN' : 'CLOSED'}
                        </StyledText>
                    </StyledTouchableOpacity>
                    <StyledTouchableOpacity onPress={() => router.replace('/')} className="p-2 bg-red-500/10 rounded-full border border-red-500/50">
                        <LogOut size={16} color="#f87171" />
                    </StyledTouchableOpacity>
                </View>
            </View>

            {/* Service Alerts Overlay */}
            {serviceAlerts.length > 0 && (
                <View className="absolute top-20 right-4 z-50 w-64">
                    {Object.values(serviceAlerts.reduce((acc, alert) => ({ ...acc, [alert.tableId]: alert }), {})).map((alert, index) => (
                        <StyledView key={alert.tableId} className="bg-red-600 p-3 rounded-lg mb-2 shadow-lg flex-row justify-between items-center">
                            <View>
                                <StyledText className="text-white font-bold">🔔 Table #{alert.tableId}</StyledText>
                                <StyledText className="text-white/80 text-xs">Service Requested</StyledText>
                            </View>
                            <StyledTouchableOpacity
                                onPress={() => setServiceAlerts(prev => prev.filter(a => a.tableId !== alert.tableId))}
                                className="bg-black/20 p-2 rounded-full"
                            >
                                <X size={16} color="white" />
                            </StyledTouchableOpacity>
                        </StyledView>
                    ))}
                </View>
            )}

            {/* Scrollable Tabs */}
            <View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="p-2" contentContainerStyle={{ paddingRight: 20 }}>
                    {renderTab('orders', 'Orders', Bell)}
                    {renderTab('billing', 'Billing', Receipt)}
                    {renderTab('quick_bill', 'Quick Bill', Plus)}
                    {renderTab('menu', 'Menu', Utensils)}
                    {renderTab('expenses', 'Exp.', Wallet)}
                    {(role === 'ADMIN' || role === 'OWNER') && renderTab('reports', 'Reports', LineChart)}
                    {(role === 'ADMIN' || role === 'OWNER') && renderTab('qr', 'QR', QrCode)}
                    {(role === 'ADMIN' || role === 'OWNER') && renderTab('system', 'System', Settings)}
                </ScrollView>
            </View>

            {/* Main Content */}
            <View className="flex-1 p-4">
                {activeTab === 'orders' && (
                    <FlatList
                        data={orders.filter(o => o.status !== 'completed' && o.status !== 'cancelled')}
                        keyExtractor={item => item._id}
                        ListEmptyComponent={<StyledText className="text-gray-500 text-center mt-10">No active kitchen orders</StyledText>}
                        renderItem={({ item }) => (
                            <StyledView className="bg-white/5 mb-4 p-4 rounded-xl border-l-4 border-yellow-500">
                                <View className="flex-row justify-between mb-2">
                                    <View>
                                        <StyledText className="text-white font-bold text-lg">Table #{item.tableId}</StyledText>
                                        {/* Show Customer Info for Delivery */}
                                        {item.tableId === 'delivery' && item.deliveryDetails && (
                                            <View className="mt-1">
                                                <StyledText className="text-yellow-500 font-bold text-xs">{item.deliveryDetails.name}</StyledText>
                                                <StyledTouchableOpacity onPress={() => Linking.openURL(`tel:${item.deliveryDetails.phone}`)}>
                                                    <StyledText className="text-blue-400 font-bold text-xs decoration-underline">{item.deliveryDetails.phone}</StyledText>
                                                </StyledTouchableOpacity>
                                                <StyledText className="text-gray-400 text-xs w-48" numberOfLines={2}>{item.deliveryDetails.address}</StyledText>
                                                {/* Map Button */}
                                                <StyledTouchableOpacity
                                                    onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.deliveryDetails.address)}`)}
                                                    className="bg-blue-600/20 border border-blue-500 mt-2 py-1 px-2 rounded w-24 items-center"
                                                >
                                                    <StyledText className="text-blue-400 text-[10px] font-bold">VIEW MAP 🗺️</StyledText>
                                                </StyledTouchableOpacity>
                                            </View>
                                        )}
                                    </View>
                                    <StyledText className="text-yellow-500 font-bold">{item.status.toUpperCase()}</StyledText>
                                </View>
                                {item.items.map((f, i) => (
                                    <StyledText key={i} className="text-gray-300 ml-2">• {f.qty} x {f.name}</StyledText>
                                ))}
                                <View className="flex-row justify-end mt-3 gap-2">
                                    {item.status === 'pending' && (
                                        <StyledTouchableOpacity onPress={() => updateOrderStatus(item._id, 'preparing')} className="bg-blue-600 px-3 py-2 rounded-lg">
                                            <StyledText className="text-white font-bold">Prepare</StyledText>
                                        </StyledTouchableOpacity>
                                    )}
                                    {item.status === 'preparing' && (
                                        <StyledTouchableOpacity onPress={() => updateOrderStatus(item._id, 'completed')} className="bg-green-600 px-3 py-2 rounded-lg">
                                            <StyledText className="text-white font-bold">Done</StyledText>
                                        </StyledTouchableOpacity>
                                    )}
                                </View>
                            </StyledView>
                        )}
                    />
                )}

                {activeTab === 'billing' && (
                    <ScrollView>
                        <StyledText className="text-gray-400 mb-4 uppercase text-xs font-bold">Active Tables</StyledText>
                        {Object.entries(orders.reduce((groups, order) => {
                            if (order.status !== 'cancelled') {
                                if (!groups[order.tableId]) groups[order.tableId] = [];
                                groups[order.tableId].push(order);
                            }
                            return groups;
                        }, {})).map(([tid, torders]) => {
                            const total = torders.reduce((acc, o) => acc + o.total, 0);
                            return (
                                <StyledTouchableOpacity key={tid} onPress={() => settleBill(tid)} className="bg-white/5 p-4 rounded-xl mb-3 flex-row justify-between items-center border border-white/10">
                                    <View>
                                        <StyledText className="text-white font-bold text-xl">Table {tid}</StyledText>
                                        <StyledText className="text-gray-500">{torders.length} orders</StyledText>
                                    </View>
                                    <View className="items-end">
                                        <StyledText className="text-yellow-500 font-black text-2xl">₹{total}</StyledText>
                                        <StyledText className="text-green-500 text-xs font-bold">TAP TO PAY</StyledText>
                                    </View>
                                </StyledTouchableOpacity>
                            );
                        })}
                    </ScrollView>
                )}

                {activeTab === 'quick_bill' && (
                    <ScrollView>
                        <StyledView className="bg-white/5 p-4 rounded-xl mb-4">
                            <StyledText className="text-white font-bold mb-2">Add Manual Item</StyledText>
                            <StyledTextInput placeholder="Item Name" placeholderTextColor="#666" value={quickBillItem.name}
                                onChangeText={t => setQuickBillItem({ ...quickBillItem, name: t })}
                                className="bg-white/5 text-white p-3 rounded-lg mb-2 border border-white/10" />
                            <View className="flex-row gap-2">
                                <StyledTextInput placeholder="Price" placeholderTextColor="#666" keyboardType="numeric" value={quickBillItem.price}
                                    onChangeText={t => setQuickBillItem({ ...quickBillItem, price: t })}
                                    className="flex-1 bg-white/5 text-white p-3 rounded-lg border border-white/10" />
                                <StyledTextInput placeholder="Qty" placeholderTextColor="#666" keyboardType="numeric" value={quickBillItem.qty}
                                    onChangeText={t => setQuickBillItem({ ...quickBillItem, qty: t })}
                                    className="w-20 bg-white/5 text-white p-3 rounded-lg border border-white/10" />
                            </View>
                            <StyledTouchableOpacity onPress={addToQuickCart} className="bg-yellow-500 mt-3 p-3 rounded-lg items-center">
                                <StyledText className="text-black font-bold">ADD TO CART</StyledText>
                            </StyledTouchableOpacity>
                        </StyledView>

                        {quickBillCart.length > 0 && (
                            <StyledView className="bg-neutral-800 p-4 rounded-xl">
                                {quickBillCart.map((item, idx) => (
                                    <View key={idx} className="flex-row justify-between py-2 border-b border-white/5">
                                        <StyledText className="text-white">{item.name} x{item.qty}</StyledText>
                                        <StyledText className="text-white font-bold">₹{item.total}</StyledText>
                                    </View>
                                ))}
                                <View className="mt-4 pt-4 border-t border-white/10 flex-row justify-between items-center">
                                    <StyledText className="text-yellow-500 font-black text-xl">Total: ₹{quickBillCart.reduce((sum, i) => sum + i.total, 0)}</StyledText>
                                    <View className="flex-row gap-2">
                                        <StyledTouchableOpacity onPress={() => settleQuickBill('CASH')} className="bg-green-600 px-4 py-2 rounded-lg"><StyledText className="text-white font-bold">CASH</StyledText></StyledTouchableOpacity>
                                        <StyledTouchableOpacity onPress={() => settleQuickBill('ONLINE')} className="bg-blue-600 px-4 py-2 rounded-lg"><StyledText className="text-white font-bold">ONLINE</StyledText></StyledTouchableOpacity>
                                    </View>
                                </View>
                            </StyledView>
                        )}
                    </ScrollView>
                )}

                {activeTab === 'menu' && (
                    <View className="flex-1">
                        <StyledTouchableOpacity onPress={() => { resetItemForm(); setIsEditModalOpen(true); }} className="bg-yellow-500 p-3 rounded-lg mb-4 flex-row justify-center items-center">
                            <Plus size={20} color="black" />
                            <StyledText className="text-black font-bold ml-2">Add New Item</StyledText>
                        </StyledTouchableOpacity>
                        <FlatList
                            data={menuItems} keyExtractor={item => item._id}
                            renderItem={({ item }) => (
                                <StyledView className="flex-row bg-white/5 p-3 rounded-lg mb-2 items-center">
                                    <Image source={{ uri: item.image || 'https://via.placeholder.com/50' }} style={{ width: 50, height: 50, borderRadius: 8 }} />
                                    <View className="flex-1 ml-3 px-2">
                                        <StyledText className="text-white font-bold text-lg">{item.name}</StyledText>
                                        <StyledText className="text-gray-400 text-xs">{item.category} • {item.subCategory}</StyledText>
                                        <StyledText className="text-yellow-500 font-bold">₹{item.price}</StyledText>
                                    </View>
                                    <View className="flex-row gap-2 items-center">
                                        <View className="items-end mr-2">
                                            <StyledText className={`text-[10px] font-bold ${item.isAvailable ? 'text-green-500' : 'text-red-500'}`}>
                                                {item.isAvailable ? 'IN STOCK' : 'SOLD OUT'}
                                            </StyledText>
                                            <Switch
                                                value={item.isAvailable}
                                                onValueChange={() => socket.emit('update-menu-item', { ...item, isAvailable: !item.isAvailable })}
                                                trackColor={{ false: "#767577", true: "#eab308" }}
                                                thumbColor={item.isAvailable ? "#f5dd4b" : "#f4f3f4"}
                                                style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                                            />
                                        </View>
                                        <StyledTouchableOpacity onPress={() => startEditItem(item)} className="p-2 bg-blue-500/10 rounded-lg">
                                            <Edit size={18} color="#3b82f6" />
                                        </StyledTouchableOpacity>
                                        <StyledTouchableOpacity onPress={() => deleteItem(item._id)} className="p-2 bg-red-500/10 rounded-lg">
                                            <Trash2 size={18} color="#ef4444" />
                                        </StyledTouchableOpacity>
                                    </View>
                                </StyledView>
                            )}
                        />
                    </View>
                )}

                {activeTab === 'expenses' && (
                    <ScrollView>
                        <StyledView className="bg-white/5 p-4 rounded-xl mb-6">
                            <StyledText className="text-yellow-500 font-bold mb-4">Add Daily Expense</StyledText>
                            <StyledTextInput placeholder="Item (e.g. Vegetables)" placeholderTextColor="#666" value={expenseForm.item} onChangeText={t => setExpenseForm({ ...expenseForm, item: t })} className="bg-black/50 text-white p-3 rounded-lg mb-3 border border-white/10" />
                            <StyledTextInput placeholder="Amount" placeholderTextColor="#666" keyboardType="numeric" value={expenseForm.amount} onChangeText={t => setExpenseForm({ ...expenseForm, amount: t })} className="bg-black/50 text-white p-3 rounded-lg mb-3 border border-white/10" />
                            <StyledTextInput placeholder="Paid By (Name)" placeholderTextColor="#666" value={expenseForm.paidBy} onChangeText={t => setExpenseForm({ ...expenseForm, paidBy: t })} className="bg-black/50 text-white p-3 rounded-lg mb-3 border border-white/10" />
                            <StyledTouchableOpacity onPress={saveExpense} className="bg-red-500 p-4 rounded-lg items-center"><StyledText className="text-white font-bold">SAVE EXPENSE</StyledText></StyledTouchableOpacity>
                        </StyledView>
                    </ScrollView>
                )}

                {activeTab === 'reports' && (
                    <ScrollView>
                        <StyledText className="text-gray-400 text-xs mb-2 uppercase font-bold">Period</StyledText>
                        <View className="flex-row gap-2 mb-4">
                            {[{ id: 'today', label: 'Today' }, { id: 'month', label: 'This Month' }, { id: 'all', label: 'All Time' }].map(p => (
                                <StyledTouchableOpacity
                                    key={p.id}
                                    onPress={() => setReportPeriod(p.id)}
                                    className={`px-4 py-2 rounded-lg border ${reportPeriod === p.id ? 'bg-yellow-500 border-yellow-500' : 'bg-white/5 border-white/10'}`}
                                >
                                    <StyledText className={`font-bold text-xs ${reportPeriod === p.id ? 'text-black' : 'text-gray-400'}`}>
                                        {p.label}
                                    </StyledText>
                                </StyledTouchableOpacity>
                            ))}
                        </View>

                        <StyledView className="flex-row gap-2 mb-4">
                            <StyledView className="bg-white/5 p-4 rounded-xl flex-1 items-center">
                                <StyledText className="text-gray-400 text-xs mb-1">Profit</StyledText>
                                <StyledText className="text-green-500 text-xl font-bold">₹{getFinancials().profit}</StyledText>
                            </StyledView>
                            <StyledView className="bg-white/5 p-4 rounded-xl flex-1 items-center">
                                <StyledText className="text-gray-400 text-xs mb-1">Sales</StyledText>
                                <StyledText className="text-yellow-500 text-xl font-bold">₹{getFinancials().totalSales}</StyledText>
                            </StyledView>
                        </StyledView>
                        <StyledText className="text-white font-bold mb-2">Detailed Breakdown</StyledText>
                        <StyledView className="bg-white/5 p-4 rounded-xl mb-4">
                            <View className="flex-row justify-between mb-2"><StyledText className="text-gray-400">Total Sales</StyledText><StyledText className="text-green-500 font-bold">+₹{getFinancials().totalSales}</StyledText></View>
                            <View className="flex-row justify-between"><StyledText className="text-gray-400">Expenses</StyledText><StyledText className="text-red-500 font-bold">-₹{getFinancials().totalExp}</StyledText></View>
                        </StyledView>

                        <StyledTouchableOpacity onPress={exportRecords} className="bg-green-600/20 border border-green-500 p-4 rounded-xl items-center flex-row justify-center mb-4">
                            <Download size={20} color="#22c55e" />
                            <StyledText className="text-green-500 font-bold ml-2">DOWNLOAD RECORDS (CSV)</StyledText>
                        </StyledTouchableOpacity>

                        <StyledTouchableOpacity onPress={clearAllHistory} className="bg-red-900/50 border border-red-500 p-4 rounded-xl items-center flex-row justify-center">
                            <Trash2 size={20} color="#f87171" />
                            <StyledText className="text-red-500 font-bold ml-2">RESET COMPLETE HISTORY</StyledText>
                        </StyledTouchableOpacity>
                    </ScrollView>
                )}



                // ... inside render ...

                {activeTab === 'qr' && (
                    <ScrollView>
                        <StyledText className="text-yellow-500 font-bold text-center mb-6">Scan to Order / Print</StyledText>

                        <StyledTouchableOpacity
                            onPress={() => setIsScannerOpen(true)}
                            className="bg-yellow-500 mx-auto p-4 rounded-full mb-8 items-center justify-center w-64"
                        >
                            <StyledText className="text-black font-black text-lg">📷 OPEN SCANNER</StyledText>
                        </StyledTouchableOpacity>

                        <View className="flex-row flex-wrap justify-center gap-4">
                            <StyledTouchableOpacity className="bg-white p-4 rounded-xl items-center justify-center mb-4">
                                <Image
                                    source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(WEB_URL + '/customer/delivery')}` }}
                                    style={{ width: 120, height: 120 }}
                                />
                                <StyledText className="text-black font-bold mt-2 text-center">DELIVERY</StyledText>
                            </StyledTouchableOpacity>
                            <StyledTouchableOpacity className="bg-white p-4 rounded-xl items-center justify-center mb-4">
                                <Image
                                    source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(WEB_URL + '/customer/testing')}` }}
                                    style={{ width: 120, height: 120 }}
                                />
                                <StyledText className="text-black font-bold mt-2 text-center">TESTING</StyledText>
                                <StyledText className="text-black/50 text-[10px] text-center">(NO LOC)</StyledText>
                            </StyledTouchableOpacity>
                        </View>

                        <StyledText className="text-white font-bold mb-4 ml-4">Table QR Grid (1-20)</StyledText>
                        <View className="flex-row flex-wrap justify-center gap-4 pb-10">
                            {Array.from({ length: 20 }, (_, i) => i + 1).map(num => (
                                <StyledTouchableOpacity key={num} className="bg-white p-2 rounded-xl items-center justify-center">
                                    <Image
                                        source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(generateQRCodeLink(num))}` }}
                                        style={{ width: 80, height: 80 }}
                                    />
                                    <StyledText className="text-black font-bold mt-1 text-xs">Table {num}</StyledText>
                                </StyledTouchableOpacity>
                            ))}
                        </View>
                    </ScrollView>
                )}

                {activeTab === 'system' && (
                    <View className="p-4 bg-white/5 rounded-xl">
                        <StyledText className="text-white font-bold text-lg mb-4">System Controls</StyledText>

                        {(role === 'ADMIN' || role === 'OWNER') && (
                            <View className="mb-6">
                                <StyledText className="text-gray-400 text-xs mb-2 uppercase font-bold">Delivery Settings</StyledText>

                                <View className="mb-3">
                                    <StyledText className="text-gray-500 text-[10px] mb-1">Delivery Radius (Meters)</StyledText>
                                    <StyledTextInput
                                        value={String(settings.deliveryRange || 5000)}
                                        onChangeText={t => setSettings({ ...settings, deliveryRange: t })}
                                        keyboardType="numeric"
                                        className="bg-black/50 text-white p-3 rounded-lg border border-white/10"
                                        placeholder="5000"
                                    />
                                </View>

                                <View className="flex-row gap-2 mb-3">
                                    <View className="flex-1">
                                        <StyledText className="text-gray-500 text-[10px] mb-1">Kitchen Latitude</StyledText>
                                        <StyledTextInput
                                            value={String(settings.restaurantLat || '26.909919')}
                                            onChangeText={t => setSettings({ ...settings, restaurantLat: t })}
                                            keyboardType="numeric"
                                            className="bg-black/50 text-white p-3 rounded-lg border border-white/10"
                                            placeholder="26.90..."
                                        />
                                    </View>
                                    <View className="flex-1">
                                        <StyledText className="text-gray-500 text-[10px] mb-1">Kitchen Longitude</StyledText>
                                        <StyledTextInput
                                            value={String(settings.restaurantLng || '75.722024')}
                                            onChangeText={t => setSettings({ ...settings, restaurantLng: t })}
                                            keyboardType="numeric"
                                            className="bg-black/50 text-white p-3 rounded-lg border border-white/10"
                                            placeholder="75.72..."
                                        />
                                    </View>
                                </View>

                                <StyledTouchableOpacity onPress={saveSettings} className="bg-yellow-500 p-3 rounded-lg items-center mt-2">
                                    <StyledText className="text-black font-bold">SAVE SYSTEM SETTINGS</StyledText>
                                </StyledTouchableOpacity>
                            </View>
                        )}

                        {(role === 'ADMIN' || role === 'OWNER') && (
                            <View className="flex-row justify-between items-center mb-6">
                                <StyledText className="text-gray-300">Unordered List Support</StyledText>
                                <Switch value={true} trackColor={{ false: "#767577", true: "#eab308" }} />
                            </View>
                        )}

                        <StyledTouchableOpacity onPress={() => { router.replace('/'); }} className="bg-red-500/20 border border-red-500 p-4 rounded-xl flex-row items-center justify-center">
                            <LogOut size={20} color="#f87171" />
                            <StyledText className="text-red-400 font-bold ml-2">LOGOUT</StyledText>
                        </StyledTouchableOpacity>
                    </View>
                )}
            </View>

            {/* Edit Item Modal */}
            <Modal visible={isEditModalOpen} animationType="slide" transparent={true}>
                <View className="flex-1 bg-black/90 justify-center p-4">
                    <View className="bg-neutral-800 p-6 rounded-2xl border border-white/10 max-h-[90%] w-full">
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <StyledText className="text-yellow-500 text-xl font-bold mb-6 text-center">
                                {editingItem ? 'Edit Menu Item' : 'Add New Item'}
                            </StyledText>

                            <StyledText className="text-gray-400 text-xs font-bold mb-1 ml-1 uppercase">Item Name</StyledText>
                            <StyledTextInput
                                placeholder="E.g. Paneer Butter Masala"
                                placeholderTextColor="#666"
                                value={itemForm.name}
                                onChangeText={t => setItemForm({ ...itemForm, name: t })}
                                className="bg-white/5 text-white p-4 rounded-xl mb-4 border border-white/10 font-bold"
                            />

                            <View className="flex-row gap-4 mb-4">
                                <View className="flex-1">
                                    <StyledText className="text-gray-400 text-xs font-bold mb-1 ml-1 uppercase">Price (₹)</StyledText>
                                    <StyledTextInput
                                        placeholder="0"
                                        placeholderTextColor="#666"
                                        keyboardType="numeric"
                                        value={itemForm.price}
                                        onChangeText={t => setItemForm({ ...itemForm, price: t })}
                                        className="bg-white/5 text-white p-4 rounded-xl border border-white/10 font-bold"
                                    />
                                </View>
                                <View className="flex-1">
                                    <StyledText className="text-gray-400 text-xs font-bold mb-1 ml-1 uppercase">Sub-Category</StyledText>
                                    <StyledTextInput
                                        placeholder="E.g. Main Course"
                                        placeholderTextColor="#666"
                                        value={itemForm.subCategory}
                                        onChangeText={t => setItemForm({ ...itemForm, subCategory: t })}
                                        className="bg-white/5 text-white p-4 rounded-xl border border-white/10 font-bold"
                                    />
                                </View>
                            </View>

                            <StyledText className="text-gray-400 text-xs font-bold mb-2 ml-1 uppercase">Category</StyledText>
                            <View className="flex-row flex-wrap gap-2 mb-4">
                                {['RESTAURANT', 'CAFE', 'HUT', 'GYM DIET'].map(cat => (
                                    <StyledTouchableOpacity
                                        key={cat}
                                        onPress={() => setItemForm({ ...itemForm, category: cat })}
                                        className={`px-4 py-2 rounded-lg border ${itemForm.category === cat ? 'bg-yellow-500 border-yellow-500' : 'bg-white/5 border-white/10'}`}
                                    >
                                        <StyledText className={`font-bold text-xs ${itemForm.category === cat ? 'text-black' : 'text-gray-400'}`}>
                                            {cat}
                                        </StyledText>
                                    </StyledTouchableOpacity>
                                ))}
                            </View>

                            <StyledText className="text-gray-400 text-xs font-bold mb-1 ml-1 uppercase">Image URL (Optional)</StyledText>
                            <StyledTextInput
                                placeholder="https://..."
                                placeholderTextColor="#666"
                                value={itemForm.image}
                                onChangeText={t => setItemForm({ ...itemForm, image: t })}
                                className="bg-white/5 text-white p-4 rounded-xl mb-4 border border-white/10 text-xs"
                            />

                            <StyledText className="text-gray-400 text-xs font-bold mb-1 ml-1 uppercase">Description (Optional)</StyledText>
                            <StyledTextInput
                                placeholder="Short description..."
                                placeholderTextColor="#666"
                                multiline
                                numberOfLines={3}
                                value={itemForm.description}
                                onChangeText={t => setItemForm({ ...itemForm, description: t })}
                                className="bg-white/5 text-white p-4 rounded-xl mb-6 border border-white/10 text-xs min-h-[80px]"
                                style={{ textAlignVertical: 'top' }}
                            />

                            <View className="flex-row gap-4 pt-2">
                                <StyledTouchableOpacity onPress={() => setIsEditModalOpen(false)} className="flex-1 p-4 rounded-xl bg-white/5 border border-white/10 items-center">
                                    <StyledText className="text-gray-400 font-bold">CANCEL</StyledText>
                                </StyledTouchableOpacity>
                                <StyledTouchableOpacity onPress={handleSaveItem} className="flex-1 p-4 rounded-xl bg-yellow-500 items-center">
                                    <StyledText className="text-black font-black">SAVE ITEM</StyledText>
                                </StyledTouchableOpacity>
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
            {/* Scanner Modal */}
            <Modal visible={isScannerOpen} animationType="slide">
                <Scanner onScan={handleScan} onClose={() => setIsScannerOpen(false)} />
            </Modal>
        </SafeAreaView>
    );
}
