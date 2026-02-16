import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, FlatList, Alert, SafeAreaView, Linking } from 'react-native';
import { styled } from 'nativewind';
import { useRouter, Stack } from 'expo-router';
import io from 'socket.io-client';
import { Package, MapPin, Phone, User, CheckCircle, Navigation } from 'lucide-react-native';
import { API_URL } from '../../constants/Config';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTouchableOpacity = styled(TouchableOpacity);

const socket = io(API_URL);

export default function DeliveryDashboard() {
    const router = useRouter();
    const [deliveryOrders, setDeliveryOrders] = useState([]);
    const [deliveryPersonName, setDeliveryPersonName] = useState('');

    useEffect(() => {
        // Init socket listeners
        socket.on('connect', () => console.log('Delivery Connected'));

        socket.on('connect_error', (err) => {
            Alert.alert("Network Error", "Cannot reach server. " + err.message);
        });

        // Fetch only delivery orders (table_id='DELIVERY')
        socket.emit('get-orders');

        socket.on('orders-updated', (orders) => {
            const filteredOrders = orders.filter(
                o => o.tableId && o.tableId.toLowerCase() === 'delivery' && o.status !== 'cancelled' && o.status !== 'completed'
            );
            setDeliveryOrders(filteredOrders);
        });

        return () => {
            socket.off('orders-updated');
        };
    }, []);

    // Auto-launch Navigation for new orders
    const prevOrdersRef = React.useRef([]);
    useEffect(() => {
        if (deliveryOrders.length > prevOrdersRef.current.length) {
            // Find the new order (difference between arrays)
            const newOrder = deliveryOrders.find(o => !prevOrdersRef.current.some(po => po._id === o._id));

            // Only auto-launch if we found a new order and it has location data
            if (newOrder && newOrder.deliveryDetails) {
                console.log("New Delivery Order! Launching Navigation...", newOrder._id);
                // Small delay to ensure UI updates first
                setTimeout(() => {
                    openMap(newOrder.deliveryDetails);
                }, 1000);
            }
        }
        prevOrdersRef.current = deliveryOrders;
    }, [deliveryOrders]);

    const markAsDelivered = (orderId) => {
        Alert.alert("Confirm Delivery", "Mark this order as delivered?", [
            { text: "Cancel", style: "cancel" },
            { text: "Delivered", onPress: () => socket.emit('update-order-status', { id: orderId, status: 'completed' }) }
        ]);
    };

    const openMap = (details) => {
        const lat = details?.location?.lat || details?.location?.latitude;
        const lng = details?.location?.lng || details?.location?.longitude;

        if (lat && lng) {
            const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
            Linking.openURL(url);
        } else if (details?.address) {
            const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(details.address)}`;
            Linking.openURL(url);
        } else {
            Alert.alert("Error", "No location or address available");
        }
    };

    const callCustomer = (phone) => {
        if (phone) {
            Linking.openURL(`tel:${phone}`);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-neutral-900">
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View className="p-4 border-b border-white/10">
                <StyledText className="text-yellow-500 font-black text-2xl tracking-widest">MARWAD DELIVERY</StyledText>
                <StyledText className="text-gray-500 text-xs font-bold">Active Deliveries</StyledText>
            </View>

            {/* Delivery Orders List */}
            <FlatList
                data={deliveryOrders}
                keyExtractor={item => item._id}
                contentContainerStyle={{ padding: 16 }}
                ListEmptyComponent={
                    <StyledView className="flex-1 justify-center items-center mt-20">
                        <Package size={64} color="#666" />
                        <StyledText className="text-gray-500 mt-4 text-center">No active delivery orders</StyledText>
                    </StyledView>
                }
                renderItem={({ item }) => (
                    <StyledView className="bg-white/5 mb-4 p-5 rounded-2xl border border-white/10">
                        {/* Order Header */}
                        <View className="flex-row justify-between items-center mb-4">
                            <StyledView>
                                <StyledText className="text-white font-bold text-lg">Order #{item._id.slice(-6)}</StyledText>
                                <StyledText className="text-yellow-500 text-xs font-bold">{item.status.toUpperCase()}</StyledText>
                            </StyledView>
                            <StyledView className="bg-green-500/10 px-3 py-1 rounded-full">
                                <StyledText className="text-green-500 font-bold text-xl">₹{item.total}</StyledText>
                            </StyledView>
                        </View>

                        {/* Customer Details */}
                        {item.deliveryDetails && (
                            <StyledView className="bg-black/30 p-4 rounded-xl mb-4">
                                <View className="flex-row items-center mb-2">
                                    <User size={16} color="#9ca3af" />
                                    <StyledText className="text-gray-300 ml-2 font-bold">{item.deliveryDetails.name}</StyledText>
                                </View>
                                <View className="flex-row items-center mb-2">
                                    <Phone size={16} color="#9ca3af" />
                                    <StyledText className="text-gray-400 ml-2">{item.deliveryDetails.phone}</StyledText>
                                    <StyledTouchableOpacity onPress={() => callCustomer(item.deliveryDetails.phone)} className="ml-auto bg-green-600 px-3 py-1 rounded-lg">
                                        <StyledText className="text-white text-xs font-bold">CALL</StyledText>
                                    </StyledTouchableOpacity>
                                </View>
                                <View className="flex-row items-start">
                                    <MapPin size={16} color="#9ca3af" className="mt-1" />
                                    <StyledText className="text-gray-400 ml-2 flex-1">{item.deliveryDetails.address}</StyledText>
                                </View>
                            </StyledView>
                        )}

                        {/* Items */}
                        <StyledView className="mb-4">
                            <StyledText className="text-gray-500 text-xs font-bold mb-2 uppercase">Items</StyledText>
                            {item.items.map((foodItem, idx) => (
                                <View key={idx} className="flex-row justify-between py-1">
                                    <StyledText className="text-gray-300">{foodItem.qty} x {foodItem.name}</StyledText>
                                    <StyledText className="text-gray-400">₹{foodItem.price * foodItem.qty}</StyledText>
                                </View>
                            ))}
                        </StyledView>

                        {/* Action Buttons */}
                        <View className="flex-row gap-2">
                            <StyledTouchableOpacity
                                onPress={() => openMap(item.deliveryDetails)}
                                className="flex-1 bg-blue-600 p-4 rounded-xl flex-row justify-center items-center"
                            >
                                <Navigation size={18} color="white" />
                                <StyledText className="text-white font-bold ml-2">NAVIGATE</StyledText>
                            </StyledTouchableOpacity>
                            <StyledTouchableOpacity
                                onPress={() => markAsDelivered(item._id)}
                                className="flex-1 bg-green-600 p-4 rounded-xl flex-row justify-center items-center"
                            >
                                <CheckCircle size={18} color="white" />
                                <StyledText className="text-white font-bold ml-2">DELIVERED</StyledText>
                            </StyledTouchableOpacity>
                        </View>
                    </StyledView>
                )}
            />
        </SafeAreaView>
    );
}
