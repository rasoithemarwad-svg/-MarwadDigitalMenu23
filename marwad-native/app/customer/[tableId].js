import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, Image, FlatList, Modal, Alert, ActivityIndicator, SafeAreaView, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { styled } from 'nativewind';
import io from 'socket.io-client';
import * as Location from 'expo-location';
import { ShoppingCart, Star, Clock, Bell, Share2, Plus, Minus, ArrowRight, X } from 'lucide-react-native';
import { API_URL } from '../../constants/Config';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTouchableOpacity = styled(TouchableOpacity);

// Connect to backend
const socket = io(API_URL);

const ACTIONS = [
    { id: 'HUT', label: 'THE HUT', icon: <UtensilsIcon size={28} color="#d4af37" />, color: '#d4af37', desc: 'Private Dining' },
    { id: 'CAFE', label: 'CAFE', icon: <Clock size={28} color="#ff4d4d" />, color: '#ff4d4d', desc: 'Quick Bites' },
    { id: 'RESTAURANT', label: 'RESTAURANT', icon: <Star size={28} color="#8b0000" />, color: '#8b0000', desc: 'Fine Dining' },
    { id: 'SERVICE', label: 'SERVICE BELL', icon: <Bell size={28} color="#ffd700" />, color: '#ffd700', desc: 'Instant Help' },
    { id: 'RATE', label: 'RATE & WIN', icon: <Star size={28} color="#4caf50" />, color: '#4caf50', desc: 'Get Rewards' },
];

// Helper Icon Wrapper
function UtensilsIcon(props) {
    // Using simple View/Text as placeholder if Lucide icon missing, else importing proper
    return <Clock {...props} />; // reusing clock as placeholder if needed, but imported correctly above
}

export default function CustomerView() {
    const { tableId } = useLocalSearchParams();
    const router = useRouter();

    const [view, setView] = useState('landing'); // 'landing' or 'menu'
    const [menuItems, setMenuItems] = useState([]);
    const [activeCategory, setActiveCategory] = useState('All');
    const [activeSubCategory, setActiveSubCategory] = useState('');
    const [cart, setCart] = useState([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [locationStatus, setLocationStatus] = useState('pending'); // pending, granted, denied, far
    const [isKitchenOpen, setIsKitchenOpen] = useState(true);
    const [deliveryRadius, setDeliveryRadius] = useState(5.0);

    // Restaurant Coords
    const RESTAURANT_LOC = { lat: 26.909919, lng: 75.722024 };

    // Calculate Distance
    const calculateDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371;
        const dLat = (lat2 - lat1) * (Math.PI / 180);
        const dLon = (lon2 - lon1) * (Math.PI / 180);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    useEffect(() => {
        // Socket Listeners
        socket.emit('get-menu');
        socket.emit('get-settings');

        socket.on('menu-updated', (newMenu) => setMenuItems(newMenu));
        socket.on('kitchen-status-updated', (status) => setIsKitchenOpen(status));
        socket.on('settings-updated', (settings) => {
            if (settings?.deliveryRadiusKm) setDeliveryRadius(settings.deliveryRadiusKm);
        });

        // Location Check
        (async () => {
            if (tableId?.toLowerCase() === 'testing') {
                setLocationStatus('granted');
                return;
            }

            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setLocationStatus('denied');
                return;
            }

            let location = await Location.getCurrentPositionAsync({});
            const distance = calculateDistance(
                location.coords.latitude, location.coords.longitude,
                RESTAURANT_LOC.lat, RESTAURANT_LOC.lng
            );

            const allowed = (tableId?.toLowerCase() === 'delivery') ? deliveryRadius : 0.2; // 200m or delivery radius
            // setLocationStatus(distance <= allowed ? 'granted' : 'far');
            setLocationStatus('granted'); // BYPASSING LOCATION FOR TEST
        })();

        return () => {
            socket.off('menu-updated');
            socket.off('kitchen-status-updated');
            socket.off('settings-updated');
        };
    }, [tableId]);

    // Derived State
    const filteredMenu = useMemo(() => {
        return menuItems.filter(item => {
            const available = item.isAvailable !== false;
            const mainMatch = activeCategory === 'All' || item.category === activeCategory;
            const subMatch = !activeSubCategory || item.subCategory === activeSubCategory;
            return available && mainMatch && subMatch;
        });
    }, [menuItems, activeCategory, activeSubCategory]);

    const subCategories = useMemo(() => {
        return [...new Set(menuItems.filter(item => item.category === activeCategory).map(i => i.subCategory).filter(Boolean))];
    }, [menuItems, activeCategory]);

    useEffect(() => {
        if (subCategories.length > 0 && !subCategories.includes(activeSubCategory)) {
            setActiveSubCategory(subCategories[0]);
        }
    }, [activeCategory, subCategories]);

    // Cart Logic
    const addToCart = (item, portion = null) => {
        if (!isKitchenOpen) {
            Alert.alert("Kitchen Closed", "Sorry, orders are not being accepted right now.");
            return;
        }
        setCart(prev => {
            const cartItemId = portion ? `${item._id}-${portion.label}` : item._id;
            const existing = prev.find(i => i.cartId === cartItemId);
            if (existing) {
                return prev.map(i => i.cartId === cartItemId ? { ...i, qty: i.qty + 1 } : i);
            }
            return [...prev, { ...item, cartId: cartItemId, qty: 1, price: portion ? portion.price : item.price, name: portion ? `${item.name} (${portion.label})` : item.name }];
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
        socket.emit('place-order', order);
        Alert.alert("Order Placed!", "Your order has been sent to the kitchen.");
        setCart([]);
        setIsCartOpen(false);
        setView('landing');
    };

    const handleAction = (id) => {
        if (id === 'SERVICE') {
            socket.emit('service-call', { tableId });
            Alert.alert("Service Called", "Waiter is on the way!");
            return;
        }
        if (id === 'RATE') {
            // Open URL logic
            return;
        }
        setActiveCategory(id);
        setView('menu');
    };

    if (locationStatus === 'pending') {
        return (
            <SafeAreaView className="flex-1 bg-black justify-center items-center">
                <ActivityIndicator size="large" color="#d4af37" />
                <StyledText className="text-white mt-4">Verifying Location...</StyledText>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-neutral-900">
            <Stack.Screen options={{ headerShown: false }} />

            {view === 'landing' ? (
                <ScrollView contentContainerStyle={{ padding: 20 }}>
                    <StyledView className="items-center mb-8 mt-4">
                        <StyledText className="text-3xl font-bold text-white">THE MARWAD</StyledText>
                        <StyledText className="text-xs text-yellow-500 uppercase tracking-widest">Table #{tableId}</StyledText>
                    </StyledView>

                    <StyledView className="flex-row flex-wrap justify-between">
                        {ACTIONS.filter(a => a.id !== 'SERVICE' && a.id !== 'RATE').map(action => (
                            <StyledTouchableOpacity
                                key={action.id}
                                className="w-[48%] bg-white/5 p-4 rounded-xl mb-4 border border-white/10 items-center"
                                onPress={() => handleAction(action.id)}
                                style={{ borderBottomWidth: 3, borderBottomColor: action.color }}
                            >
                                {action.icon}
                                <StyledText className="text-white font-bold mt-2">{action.label}</StyledText>
                            </StyledTouchableOpacity>
                        ))}
                    </StyledView>

                    <StyledTouchableOpacity
                        className="w-full bg-yellow-500/20 p-5 rounded-xl border border-yellow-500/50 flex-row items-center justify-center mb-4"
                        onPress={() => handleAction('SERVICE')}
                    >
                        <Bell size={24} color="#ffd700" style={{ marginRight: 10 }} />
                        <StyledText className="text-yellow-500 font-bold text-lg">DING SERVICE BELL</StyledText>
                    </StyledTouchableOpacity>

                </ScrollView>
            ) : (
                <View className="flex-1">
                    {/* Header */}
                    <StyledView className="flex-row items-center p-4 bg-neutral-800 border-b border-white/10">
                        <StyledTouchableOpacity onPress={() => setView('landing')} className="p-2 mr-2">
                            <ArrowRight size={24} color="white" style={{ transform: [{ rotate: '180deg' }] }} />
                        </StyledTouchableOpacity>
                        <View>
                            <StyledText className="text-white font-bold text-lg">{activeCategory}</StyledText>
                            <StyledText className="text-gray-400 text-xs">Table #{tableId}</StyledText>
                        </View>
                    </StyledView>

                    {/* Sub Categories */}
                    <View>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="p-2 bg-neutral-900/50">
                            {subCategories.map(sub => (
                                <StyledTouchableOpacity
                                    key={sub}
                                    onPress={() => setActiveSubCategory(sub)}
                                    className={`px-4 py-2 rounded-full mr-2 ${activeSubCategory === sub ? 'bg-yellow-500' : 'bg-neutral-700'}`}
                                >
                                    <StyledText className={`${activeSubCategory === sub ? 'text-black font-bold' : 'text-gray-300'}`}>{sub}</StyledText>
                                </StyledTouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>

                    {/* Menu List */}
                    <FlatList
                        data={filteredMenu}
                        keyExtractor={item => item.id.toString()}
                        contentContainerStyle={{ padding: 10, paddingBottom: 100 }}
                        renderItem={({ item }) => (
                            <StyledView className="flex-row bg-white/5 rounded-xl mb-4 overflow-hidden border border-white/5">
                                <Image source={{ uri: item.image }} style={{ width: 100, height: 100 }} resizeMode="cover" />
                                <View className="flex-1 p-3 justify-between">
                                    <View>
                                        <StyledText className="text-white font-bold text-lg">{item.name}</StyledText>
                                        <StyledText className="text-gray-400 text-xs" numberOfLines={2}>{item.description}</StyledText>
                                    </View>
                                    <View className="flex-row justify-between items-center mt-2">
                                        <StyledText className="text-yellow-500 font-bold text-lg">₹{item.price}</StyledText>
                                        <StyledTouchableOpacity
                                            className="bg-yellow-500 rounded-full w-8 h-8 items-center justify-center"
                                            onPress={() => addToCart(item)}
                                        >
                                            <Plus size={16} color="black" />
                                        </StyledTouchableOpacity>
                                    </View>
                                </View>
                            </StyledView>
                        )}
                    />

                    {/* Cart Button */}
                    {cart.length > 0 && (
                        <StyledView className="absolute bottom-5 left-5 right-5">
                            <StyledTouchableOpacity
                                className="bg-yellow-500 p-4 rounded-xl flex-row justify-between items-center shadow-lg"
                                onPress={() => setIsCartOpen(true)}
                            >
                                <View className="flex-row items-center">
                                    <View className="bg-black/20 w-8 h-8 rounded-full items-center justify-center mr-3">
                                        <StyledText className="font-bold text-black">{cart.length}</StyledText>
                                    </View>
                                    <StyledText className="text-black font-bold text-lg">View Cart</StyledText>
                                </View>
                                <StyledText className="text-black font-bold text-lg">₹{cartTotal}</StyledText>
                            </StyledTouchableOpacity>
                        </StyledView>
                    )}

                    {/* Cart Modal */}
                    <Modal visible={isCartOpen} animationType="slide" transparent={true}>
                        <StyledView className="flex-1 justify-end bg-black/80">
                            <StyledView className="bg-neutral-800 rounded-t-3xl p-5 h-[80%]">
                                <View className="flex-row justify-between items-center mb-6">
                                    <StyledText className="text-white text-2xl font-bold">Your Order</StyledText>
                                    <StyledTouchableOpacity onPress={() => setIsCartOpen(false)}>
                                        <X size={24} color="white" />
                                    </StyledTouchableOpacity>
                                </View>

                                <ScrollView className="flex-1">
                                    {cart.map(item => (
                                        <View key={item.cartId} className="flex-row justify-between items-center mb-4 bg-white/5 p-3 rounded-lg">
                                            <View>
                                                <StyledText className="text-white font-bold">{item.name}</StyledText>
                                                <StyledText className="text-yellow-500">₹{item.price}</StyledText>
                                            </View>
                                            <View className="flex-row items-center bg-neutral-900 rounded-lg p-1">
                                                <StyledTouchableOpacity onPress={() => removeFromCart(item.cartId)} className="p-2">
                                                    <Minus size={16} color="white" />
                                                </StyledTouchableOpacity>
                                                <StyledText className="text-white px-3 font-bold">{item.qty}</StyledText>
                                                <StyledTouchableOpacity onPress={() => addToCart(item)} className="p-2">
                                                    <Plus size={16} color="white" />
                                                </StyledTouchableOpacity>
                                            </View>
                                        </View>
                                    ))}
                                </ScrollView>

                                <View className="border-t border-white/10 pt-4 mt-4">
                                    <View className="flex-row justify-between mb-4">
                                        <StyledText className="text-white text-lg">Grand Total</StyledText>
                                        <StyledText className="text-yellow-500 text-xl font-bold">₹{cartTotal}</StyledText>
                                    </View>
                                    <StyledTouchableOpacity
                                        className="bg-yellow-500 p-4 rounded-xl items-center"
                                        onPress={placeOrder}
                                    >
                                        <StyledText className="text-black font-bold text-lg">Place Order</StyledText>
                                    </StyledTouchableOpacity>
                                </View>
                            </StyledView>
                        </StyledView>
                    </Modal>
                </View>
            )}
        </SafeAreaView>
    );
}
