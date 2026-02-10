import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, FlatList, Modal, Alert, ActivityIndicator, SafeAreaView, ScrollView, Linking } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { styled } from 'nativewind';
import io from 'socket.io-client';
import * as Location from 'expo-location';
import { ShoppingCart, Star, Clock, Bell, Share2, Plus, Minus, ArrowRight, X, Utensils } from 'lucide-react-native';
import { API_URL } from '../../constants/Config';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTextInput = styled(TextInput);
const StyledTouchableOpacity = styled(TouchableOpacity);

// Connect to backend
const socket = io(API_URL);

socket.on('connect', () => console.log('✅ Customer Socket Connected'));
socket.on('connect_error', (err) => console.error('❌ Customer Socket Error:', err));

const ACTIONS = [
    { id: 'HUT', label: 'THE HUT', icon: <Utensils size={28} color="#d4af37" />, color: '#d4af37', desc: 'Private Dining' },
    { id: 'CAFE', label: 'CAFE', icon: <Clock size={28} color="#ff4d4d" />, color: '#ff4d4d', desc: 'Quick Bites' },
    { id: 'RESTAURANT', label: 'RESTAURANT', icon: <Star size={28} color="#8b0000" />, color: '#8b0000', desc: 'Fine Dining' },
    { id: 'GYM', label: 'GYM DIET', icon: <Star size={28} color="#22c55e" />, color: '#22c55e', desc: 'Fitness Meals' },
    { id: 'SERVICE', label: 'SERVICE BELL', icon: <Bell size={28} color="#ffd700" />, color: '#ffd700', desc: 'Instant Help' },
    { id: 'RATE', label: 'RATING', icon: <Star size={28} color="#fbbf24" />, color: '#fbbf24', desc: 'Review Us' },
];

export default function CustomerView() {
    const { tableId } = useLocalSearchParams();
    const router = useRouter();

    const [view, setView] = useState('landing'); // 'landing' or 'menu'
    const [menuItems, setMenuItems] = useState([]);
    const [activeCategory, setActiveCategory] = useState('All');
    const [activeSubCategory, setActiveSubCategory] = useState('');
    const [cart, setCart] = useState([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    // SAFEFGUARD: Default to 'granted' after a timeout if location fails, but start as 'pending'
    const [locationStatus, setLocationStatus] = useState('pending');
    const [isKitchenOpen, setIsKitchenOpen] = useState(true);
    const [deliveryRadius, setDeliveryRadius] = useState(5.0);
    const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
    const [deliveryForm, setDeliveryForm] = useState({ name: '', phone: '', address: '' });

    // Restaurant Coords
    const [restaurantLoc, setRestaurantLoc] = useState({ lat: 26.909919, lng: 75.722024 });

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
        // 1. Force Location Grant after 3 seconds (Fallback to prevent blank screen)
        const safetyTimer = setTimeout(() => {
            setLocationStatus(prev => prev === 'pending' ? 'granted' : prev);
        }, 3000);

        // 2. Socket Listeners
        console.log("Customer View Mounted, ID:", tableId);
        socket.emit('get-menu');
        socket.emit('get-settings');

        const handleMenuUpdate = (newMenu) => setMenuItems(newMenu || []);
        const handleKitchenUpdate = (status) => setIsKitchenOpen(status);
        const handleSettingsUpdate = (settings) => {
            if (settings?.deliveryRadiusKm) setDeliveryRadius(parseFloat(settings.deliveryRadiusKm));
            else if (settings?.deliveryRange) setDeliveryRadius(parseFloat(settings.deliveryRange));

            if (settings?.restaurantLat && settings?.restaurantLng) {
                setRestaurantLoc({
                    lat: parseFloat(settings.restaurantLat),
                    lng: parseFloat(settings.restaurantLng)
                });
            }
        };

        socket.on('menu-updated', handleMenuUpdate);
        socket.on('kitchen-status-updated', handleKitchenUpdate);
        socket.on('settings-updated', handleSettingsUpdate);

        // 3. Location Check
        (async () => {
            try {
                if (tableId?.toLowerCase() === 'testing' || tableId?.toLowerCase() === 'delivery') {
                    setLocationStatus('granted');
                    return;
                }

                let { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    // Alert.alert("Location Required", "Please enable location to order from tables.");
                    // On deny, we might still want to show the menu but maybe block ordering? 
                    // For now, let's allow it to prevent getting stuck.
                    setLocationStatus('granted');
                    return;
                }

                let location = await Location.getCurrentPositionAsync({});
                const distance = calculateDistance(
                    location.coords.latitude, location.coords.longitude,
                    restaurantLoc.lat, restaurantLoc.lng
                );

                // const allowed = (tableId?.toLowerCase() === 'delivery') ? deliveryRadius : 0.2; // 200m or delivery radius
                // If checking distance:
                // if (distance > allowed) { setLocationStatus('far'); } else { setLocationStatus('granted'); }

                // Forcing granted to ensure UI loads for now
                setLocationStatus('granted');
            } catch (error) {
                console.error("Location Error:", error);
                setLocationStatus('granted'); // Fail open
            }
        })();

        return () => {
            clearTimeout(safetyTimer);
            socket.off('menu-updated', handleMenuUpdate);
            socket.off('kitchen-status-updated', handleKitchenUpdate);
            socket.off('settings-updated', handleSettingsUpdate);
        };
    }, [tableId]);

    // Derived State
    const filteredMenu = useMemo(() => {
        return menuItems.filter(item => {
            const available = item.isAvailable !== false;
            const mainMatch = activeCategory === 'All' || item.category === activeCategory;
            const subMatch = !activeSubCategory || item.subCategory === activeSubCategory;
            // Exclude HUT items for delivery orders
            const isDelivery = tableId?.toLowerCase() === 'delivery';
            const notHut = !(isDelivery && item.category === 'HUT');
            return available && mainMatch && subMatch && notHut;
        });
    }, [menuItems, activeCategory, activeSubCategory, tableId]);

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
        if (tableId === 'delivery') {
            setIsDeliveryModalOpen(true);
            setIsCartOpen(false);
            return;
        }
        submitOrder();
    };

    const submitDeliveryOrder = () => {
        if (!deliveryForm.name || !deliveryForm.phone || !deliveryForm.address) {
            Alert.alert("Missing Details", "Please fill all fields.");
            return;
        }
        submitOrder({
            customerName: deliveryForm.name,
            customerPhone: deliveryForm.phone,
            deliveryAddress: deliveryForm.address
        });
        setIsDeliveryModalOpen(false);
    };

    const submitOrder = (deliveryDetails = null) => {
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
            deliveryDetails,
            isDelivery: tableId === 'delivery'
        };
        socket.emit('place-order', order);
        setCart([]);
        setIsCartOpen(false);
        Alert.alert("Order Placed", "Your order has been sent to the kitchen!");
        setView('landing');
    };


    const handleAction = (id) => {
        if (id === 'SERVICE') {
            socket.emit('service-call', { tableId });
            Alert.alert("Service Called", "Waiter is on the way!");
            return;
        }
        if (id === 'RATE') {
            // Open Google Review for The Marwad Rasoi
            const googleReviewUrl = 'https://maps.app.goo.gl/YzdytBUJ11v73N8q8';
            Linking.openURL(googleReviewUrl).catch(err => {
                Alert.alert('Error', 'Could not open review page');
            });
            return;
        }
        setActiveCategory(id);
        setView('menu');
    };

    if (locationStatus === 'pending') {
        return (
            <View style={{ flex: 1, backgroundColor: '#1a1a1a', justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#eab308" />
                <Text style={{ color: 'white', marginTop: 20, fontSize: 16 }}>Loading Menu...</Text>
                <Text style={{ color: '#666', marginTop: 10, fontSize: 12 }}>Table: {tableId}</Text>
            </View>
        );
    }

    if (locationStatus === 'denied' || locationStatus === 'far') {
        return (
            <View style={{ flex: 1, backgroundColor: '#1a1a1a', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                <Text style={{ color: 'red', fontSize: 20, fontWeight: 'bold', marginBottom: 10 }}>Location Check Failed</Text>
                <Text style={{ color: 'white', textAlign: 'center' }}>
                    {locationStatus === 'denied' ? 'Please enable location services.' : 'You are too far from the restaurant.'}
                </Text>
            </View>
        );
    }

    return (
        <StyledView className="flex-1 bg-neutral-900">
            <Stack.Screen options={{ headerShown: false }} />

            {view === 'landing' ? (
                <ScrollView contentContainerStyle={{ padding: 20 }}>
                    <StyledView className="items-center mb-8 mt-4">
                        <StyledText className="text-3xl font-bold text-white">THE MARWAD</StyledText>
                        <StyledText className="text-xs text-yellow-500 uppercase tracking-widest">Table #{tableId}</StyledText>
                    </StyledView>

                    <StyledView className="flex-row flex-wrap justify-between">
                        {ACTIONS.filter(a => {
                            const isDelivery = tableId?.toLowerCase() === 'delivery';

                            // Always filter out SERVICE (shown separately below)
                            if (a.id === 'SERVICE') return false;

                            // Filter out HUT for delivery orders
                            if (a.id === 'HUT') return false;
                            if (isDelivery && a.id === 'HUT') return false;

                            return true;
                        }).map(action => (
                            <StyledTouchableOpacity
                                key={action.id}
                                className="w-[48%] bg-white/5 p-4 rounded-xl mb-4 border border-white/10 items-center"
                                onPress={() => handleAction(action.id)}
                                style={{ borderBottomWidth: 3, borderBottomColor: action.color }}
                            >
                                <View>{action.icon}</View>
                                <StyledText className="text-white font-bold mt-2">{action.label}</StyledText>
                            </StyledTouchableOpacity>
                        ))}
                    </StyledView>

                    {/* Show Service Bell only for non-delivery orders */}
                    {tableId?.toLowerCase() !== 'delivery' && (
                        <StyledTouchableOpacity
                            className="w-full bg-yellow-500/20 p-5 rounded-xl border border-yellow-500/50 flex-row items-center justify-center mb-4"
                            onPress={() => handleAction('SERVICE')}
                        >
                            <Bell size={24} color="#ffd700" style={{ marginRight: 10 }} />
                            <StyledText className="text-yellow-500 font-bold text-lg">DING SERVICE BELL</StyledText>
                        </StyledTouchableOpacity>
                    )}

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

                    {/* Main Category Tabs */}
                    <View className="bg-neutral-800 border-b border-white/5">
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="p-3">
                            {ACTIONS.filter(a => {
                                if (a.id === 'SERVICE' || a.id === 'RATE') return false;
                                if (tableId?.toLowerCase() === 'delivery' && a.id === 'HUT') return false;
                                return true;
                            }).map(cat => (
                                <StyledTouchableOpacity
                                    key={cat.id}
                                    onPress={() => { setActiveCategory(cat.id); setActiveSubCategory(''); }}
                                    className={`mr-4 pb-2 border-b-2 ${activeCategory === cat.id ? 'border-yellow-500' : 'border-transparent'}`}
                                >
                                    <StyledText className={`${activeCategory === cat.id ? 'text-yellow-500 font-bold' : 'text-gray-400 font-bold'}`}>
                                        {cat.label}
                                    </StyledText>
                                </StyledTouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>

                    {/* Sub Categories */}
                    {subCategories.length > 0 && (
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
                    )}

                    {/* Menu List */}
                    <FlatList
                        data={filteredMenu}
                        keyExtractor={item => item._id || item.id || Math.random().toString()}
                        contentContainerStyle={{ padding: 10, paddingBottom: 100 }}
                        ListEmptyComponent={
                            <View className="p-10 items-center">
                                <Text className="text-white text-lg font-bold">No Menu Items Found</Text>
                                <Text className="text-gray-500 text-sm mt-2">Socket: {socket.connected ? 'Connected' : 'Disconnected'}</Text>
                                <Text className="text-gray-500 text-xs">{API_URL}</Text>
                            </View>
                        }
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

                    {/* Delivery Modal */}
                    <Modal visible={isDeliveryModalOpen} animationType="slide" transparent={true}>
                        <StyledView className="flex-1 justify-end bg-black/80">
                            <StyledView className="bg-neutral-800 rounded-t-3xl p-5 h-[70%]">
                                <StyledText className="text-white text-2xl font-bold mb-4">Delivery Details</StyledText>
                                <StyledTextInput placeholder="Name" placeholderTextColor="#999" value={deliveryForm.name} onChangeText={t => setDeliveryForm({ ...deliveryForm, name: t })} className="bg-white/10 text-white p-4 rounded-xl mb-3" />
                                <StyledTextInput placeholder="Phone" placeholderTextColor="#999" keyboardType="phone-pad" value={deliveryForm.phone} onChangeText={t => setDeliveryForm({ ...deliveryForm, phone: t })} className="bg-white/10 text-white p-4 rounded-xl mb-3" />
                                <StyledTextInput placeholder="Address" placeholderTextColor="#999" multiline value={deliveryForm.address} onChangeText={t => setDeliveryForm({ ...deliveryForm, address: t })} className="bg-white/10 text-white p-4 rounded-xl mb-6 h-24" style={{ textAlignVertical: 'top' }} />

                                <StyledTouchableOpacity onPress={submitDeliveryOrder} className="bg-yellow-500 p-4 rounded-xl items-center mb-3">
                                    <StyledText className="text-black font-bold text-lg">CONFIRM ORDER</StyledText>
                                </StyledTouchableOpacity>

                                <StyledTouchableOpacity onPress={() => setIsDeliveryModalOpen(false)} className="bg-red-500/20 p-4 rounded-xl items-center">
                                    <StyledText className="text-red-500 font-bold">CANCEL</StyledText>
                                </StyledTouchableOpacity>
                            </StyledView>
                        </StyledView>
                    </Modal>
                </View>
            )}
        </StyledView>
    );
}
