import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, FlatList, Modal, TextInput, Alert, Image, Switch, SafeAreaView } from 'react-native';
import { styled } from 'nativewind';
import { useRouter } from 'expo-router';
import io from 'socket.io-client';
import { Bell, CheckCircle, Clock, Receipt, Utensils, RefreshCcw, LogOut, ChevronRight, Plus, X, Trash2, LineChart } from 'lucide-react-native';
import { API_URL } from '../../constants/Config';
import { useLocalSearchParams } from 'expo-router';
import { scheduleLocalNotification } from '../../utils/NotificationHelper';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledTextInput = styled(TextInput);

const socket = io(API_URL);

export default function AdminDashboard() {
    const router = useRouter();
    const { role, username } = useLocalSearchParams();
    const [activeTab, setActiveTab] = useState('orders'); // orders, menu, sales
    const [orders, setOrders] = useState([]);
    const [menuItems, setMenuItems] = useState([]);
    const [salesHistory, setSalesHistory] = useState([]);
    const [isKitchenOpen, setIsKitchenOpen] = useState(true);
    const [serviceAlerts, setServiceAlerts] = useState([]);

    // Menu Editing State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [itemForm, setItemForm] = useState({ name: '', price: '', category: 'RESTAURANT', description: '', isAvailable: true });

    useEffect(() => {
        fetchData();

        socket.on('orders-updated', (updatedOrders) => {
            setOrders(updatedOrders);
        });

        socket.on('menu-updated', (updatedMenu) => {
            setMenuItems(updatedMenu);
        });

        socket.on('sales-updated', (updatedSales) => {
            setSalesHistory(updatedSales);
        });

        socket.on('new-order-alert', (order) => {
            scheduleLocalNotification("New Order Received!", `Table #${order.tableId} - ₹${order.total}`);
            Alert.alert("New Order", `Table #${order.tableId} - ₹${order.total}`);
            socket.emit('get-orders');
        });

        socket.on('kitchen-status-updated', (status) => setIsKitchenOpen(status));

        socket.on('new-service-alert', (alert) => {
            scheduleLocalNotification("Service Bell Rung!", `Table #${alert.tableId} is calling for help!`);
            setServiceAlerts(prev => [alert, ...prev]);
            Alert.alert("Service Called", `Table #${alert.tableId} needs help!`);
        });

        return () => {
            socket.off('orders-updated');
            socket.off('menu-updated');
            socket.off('sales-updated');
            socket.off('new-order-alert');
            socket.off('kitchen-status-updated');
            socket.off('new-service-alert');
        };
    }, []);

    const fetchData = () => {
        socket.emit('get-menu');
        socket.emit('get-orders');
        socket.emit('get-sales');
    }

    const updateOrderStatus = (id, status) => {
        socket.emit('update-order-status', { id, status });
    };

    const toggleKitchen = () => {
        socket.emit('toggle-kitchen-status', !isKitchenOpen);
    };

    // Menu Functions
    const handleSaveItem = () => {
        socket.emit('update-menu-item', editingItem ? { ...editingItem, ...itemForm } : itemForm);
        setIsEditModalOpen(false);
        setItemForm({ name: '', price: '', category: 'RESTAURANT', description: '', isAvailable: true });
        setEditingItem(null);
    };

    const deleteItem = (id) => {
        if (role !== 'ADMIN') {
            return Alert.alert('Access Denied', 'Managers are not allowed to delete menu items.');
        }
        socket.emit('delete-menu-item', id);
    };

    const settleBill = (tableId) => {
        const tableOrders = orders.filter(o => o.tableId === tableId && o.status !== 'cancelled');
        if (tableOrders.length === 0) return;

        const total = tableOrders.reduce((acc, o) => acc + o.total, 0);
        const allItems = tableOrders.flatMap(o => o.items);

        Alert.alert(
            "Settle Bill",
            `Settle Table #${tableId} for ₹${total}?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Settle Now",
                    onPress: () => {
                        socket.emit('save-sale', {
                            tableId,
                            items: allItems.map(i => ({ name: i.name, qty: i.qty, price: i.price })),
                            total,
                            settledAt: new Date().toISOString()
                        });
                        Alert.alert("Success", `Table #${tableId} settled!`);
                    }
                }
            ]
        );
    };

    const renderOrderCard = ({ item }) => (
        <StyledView className="bg-white/5 border-l-4 border-yellow-500 rounded-lg mb-4 p-4">
            <View className="flex-row justify-between mb-2">
                <StyledText className="text-white font-bold text-lg">Table #{item.tableId}</StyledText>
                <StyledText className={`font-bold ${item.status === 'completed' ? 'text-green-500' : 'text-yellow-500'}`}>
                    {item.status.toUpperCase()}
                </StyledText>
            </View>

            <View className="mb-4">
                {item.items.map((food, i) => (
                    <StyledText key={i} className="text-gray-300 text-sm">
                        {food.qty}x {food.name}
                    </StyledText>
                ))}
            </View>

            <View className="flex-row justify-between items-center pt-2 border-t border-white/10">
                <StyledText className="text-white font-bold text-lg">₹{item.total}</StyledText>

                {item.status === 'pending' && (
                    <StyledTouchableOpacity onPress={() => updateOrderStatus(item._id, 'preparing')} className="bg-blue-600 px-4 py-2 rounded">
                        <StyledText className="text-white font-bold">Start Preparing</StyledText>
                    </StyledTouchableOpacity>
                )}

                {item.status === 'preparing' && (
                    <StyledTouchableOpacity onPress={() => updateOrderStatus(item._id, 'completed')} className="bg-green-600 px-4 py-2 rounded">
                        <StyledText className="text-white font-bold">Mark Done</StyledText>
                    </StyledTouchableOpacity>
                )}

                {item.status === 'completed' && (
                    <View className="flex-row items-center">
                        <CheckCircle size={16} color="#4caf50" />
                        <StyledText className="text-green-500 ml-2 font-bold">Served</StyledText>
                    </View>
                )}
            </View>
        </StyledView>
    );

    return (
        <SafeAreaView className="flex-1 bg-neutral-900">

            {/* Top Bar */}
            <View className="flex-row justify-between items-center p-4 border-b border-white/10">
                <View>
                    <StyledText className="text-yellow-500 font-bold text-xl">Admin Panel</StyledText>
                    <StyledText className="text-gray-500 text-xs">{role === 'ADMIN' ? 'Full Admin' : 'Manager'} • {username}</StyledText>
                </View>
                <View className="flex-row gap-4">
                    <StyledTouchableOpacity onPress={toggleKitchen} className={`p-2 rounded-lg border ${isKitchenOpen ? 'bg-green-900/50 border-green-500' : 'bg-red-900/50 border-red-500'}`}>
                        <Utensils size={20} color={isKitchenOpen ? '#4caf50' : '#f44336'} />
                    </StyledTouchableOpacity>
                    <StyledTouchableOpacity onPress={() => {
                        socket.emit('toggle-kitchen-status', false);
                        router.replace('/');
                    }} className="p-2 bg-white/10 rounded-lg">
                        <LogOut size={20} color="white" />
                    </StyledTouchableOpacity>
                </View>
            </View>

            {/* Tab Bar */}
            <View className="flex-row p-2 bg-neutral-800">
                {['orders', 'menu', role === 'ADMIN' ? 'sales' : null].filter(Boolean).map(tab => (
                    <StyledTouchableOpacity
                        key={tab}
                        onPress={() => setActiveTab(tab)}
                        className={`flex-1 py-3 items-center rounded-lg ${activeTab === tab ? 'bg-yellow-500' : 'bg-transparent'}`}
                    >
                        <StyledText className={`font-bold uppercase ${activeTab === tab ? 'text-black' : 'text-gray-400'}`}>{tab}</StyledText>
                    </StyledTouchableOpacity>
                ))}
            </View>

            {/* Content Area */}
            <View className="flex-1 p-4">

                {activeTab === 'orders' && (
                    <FlatList
                        data={orders.filter(o => o.status !== 'completed' && o.status !== 'cancelled')}
                        renderItem={renderOrderCard}
                        keyExtractor={(item) => item._id || item.timestamp}
                        ListEmptyComponent={
                            <View className="items-center mt-10">
                                <Clock size={48} color="#333" />
                                <StyledText className="text-gray-500 text-center mt-4">No active kitchen orders</StyledText>
                            </View>
                        }
                    />
                )}

                {activeTab === 'menu' && (
                    <View className="flex-1">
                        <StyledTouchableOpacity
                            className="bg-yellow-500 p-3 rounded-lg mb-4 flex-row justify-center items-center"
                            onPress={() => {
                                setEditingItem(null);
                                setItemForm({ name: '', price: '', category: 'RESTAURANT', description: '', isAvailable: true });
                                setIsEditModalOpen(true);
                            }}
                        >
                            <Plus size={20} color="black" />
                            <StyledText className="text-black font-bold ml-2">Add New Item</StyledText>
                        </StyledTouchableOpacity>

                        <FlatList
                            data={menuItems}
                            keyExtractor={item => item._id}
                            renderItem={({ item }) => (
                                <StyledView className="flex-row bg-white/5 p-3 rounded-lg mb-2 items-center">
                                    <Image source={{ uri: item.image || 'https://via.placeholder.com/50' }} style={{ width: 50, height: 50, borderRadius: 8 }} />
                                    <View className="flex-1 ml-3">
                                        <StyledText className="text-white font-bold">{item.name}</StyledText>
                                        <StyledText className="text-yellow-500 font-bold">₹{item.price}</StyledText>
                                    </View>
                                    {role === 'ADMIN' && (
                                        <StyledTouchableOpacity onPress={() => deleteItem(item._id)} className="p-2 bg-red-500/10 rounded-lg">
                                            <Trash2 size={18} color="#ff4d4d" />
                                        </StyledTouchableOpacity>
                                    )}
                                </StyledView>
                            )}
                        />
                    </View>
                )}

                {activeTab === 'sales' && (
                    <ScrollView className="flex-1">
                        <StyledView className="bg-yellow-500/10 p-4 rounded-2xl mb-6 items-center">
                            <StyledText className="text-gray-500 text-xs uppercase mb-1">Today's Revenue</StyledText>
                            <StyledText className="text-yellow-500 text-3xl font-black">
                                ₹{salesHistory.filter(s => new Date(s.settledAt).toDateString() === new Date().toDateString()).reduce((acc, s) => acc + s.total, 0)}
                            </StyledText>
                        </StyledView>

                        {/* Active Tables for Settlement */}
                        <StyledText className="text-white font-bold text-lg mb-4">Active Tables</StyledText>
                        {Object.entries(orders.reduce((groups, order) => {
                            if (order.status !== 'cancelled') {
                                if (!groups[order.tableId]) groups[order.tableId] = [];
                                groups[order.tableId].push(order);
                            }
                            return groups;
                        }, {})).map(([tid, torders]) => (
                            <StyledTouchableOpacity
                                key={tid}
                                onPress={() => settleBill(tid)}
                                className="bg-white/5 border-l-4 border-yellow-500 p-4 rounded-xl mb-3 flex-row justify-between items-center"
                            >
                                <View>
                                    <StyledText className="text-white font-bold text-lg">Table #{tid}</StyledText>
                                    <StyledText className="text-gray-500 text-xs">{torders.length} orders pending bill</StyledText>
                                </View>
                                <View className="items-end">
                                    <StyledText className="text-yellow-500 font-black text-lg">₹{torders.reduce((acc, o) => acc + o.total, 0)}</StyledText>
                                    <StyledText className="text-yellow-500/50 text-[10px]">TAP TO SETTLE</StyledText>
                                </View>
                            </StyledTouchableOpacity>
                        ))}

                        {/* Recent History */}
                        <StyledText className="text-white font-bold text-lg mt-6 mb-4">Recent Sales</StyledText>
                        {salesHistory.slice(0, 10).map((sale) => (
                            <StyledView key={sale._id} className="bg-white/5 p-3 rounded-xl mb-2 flex-row justify-between items-center opacity-70">
                                <View>
                                    <StyledText className="text-white font-medium">Table #{sale.tableId}</StyledText>
                                    <StyledText className="text-gray-500 text-[10px]">{new Date(sale.settledAt).toLocaleTimeString()}</StyledText>
                                </View>
                                <StyledText className="text-green-500 font-bold">+₹{sale.total}</StyledText>
                            </StyledView>
                        ))}
                    </ScrollView>
                )}

            </View>

            {/* Edit Item Modal */}
            <Modal visible={isEditModalOpen} animationType="slide" transparent={true}>
                <StyledView className="flex-1 bg-black/90 justify-center p-6">
                    <StyledView className="bg-neutral-800 p-6 rounded-2xl border border-white/10">
                        <StyledText className="text-yellow-500 text-xl font-bold mb-4">{editingItem ? 'Edit Item' : 'New Menu Item'}</StyledText>

                        <StyledTextInput
                            placeholder="Item Name" placeholderTextColor="#666"
                            value={itemForm.name} onChangeText={t => setItemForm({ ...itemForm, name: t })}
                            className="bg-white/5 text-white p-3 rounded-lg mb-3 border border-white/10"
                        />

                        <StyledTextInput
                            placeholder="Price" placeholderTextColor="#666"
                            value={itemForm.price} onChangeText={t => setItemForm({ ...itemForm, price: t })}
                            keyboardType="numeric"
                            className="bg-white/5 text-white p-3 rounded-lg mb-3 border border-white/10"
                        />

                        <StyledView className="flex-row justify-end space-x-4 mt-4">
                            <StyledTouchableOpacity onPress={() => setIsEditModalOpen(false)} className="p-3">
                                <StyledText className="text-gray-400">Cancel</StyledText>
                            </StyledTouchableOpacity>
                            <StyledTouchableOpacity onPress={handleSaveItem} className="bg-yellow-500 p-3 rounded-lg">
                                <StyledText className="text-black font-bold">Save Item</StyledText>
                            </StyledTouchableOpacity>
                        </StyledView>
                    </StyledView>
                </StyledView>
            </Modal>

        </SafeAreaView>
    );
}
