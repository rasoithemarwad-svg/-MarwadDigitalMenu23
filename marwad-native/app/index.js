import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, Modal, SafeAreaView, ScrollView } from 'react-native';
import { styled } from 'nativewind';
import { useRouter } from 'expo-router';
import { Shield, Utensils, ChefHat } from 'lucide-react-native';
import Constants from 'expo-constants';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledTextInput = styled(TextInput);

export default function AppHome() {
    const router = useRouter();
    const [tableInput, setTableInput] = useState('');
    const [isTableModalOpen, setIsTableModalOpen] = useState(false);

    // Auto-redirect for Delivery APK
    useEffect(() => {
        const checkAppType = () => {
            const appType =
                Constants.expoConfig?.extra?.appType ||
                Constants.manifest?.extra?.appType ||
                process.env.EXPO_PUBLIC_APP_TYPE;

            if (appType === 'delivery') {
                // Delivery APK should go directly to delivery dashboard
                router.replace('/delivery/dashboard');
            }
        };

        checkAppType();
        // Retry after small delay to ensure router is ready
        setTimeout(checkAppType, 500);
    }, []);

    const handleCustomerEnter = () => {
        if (tableInput.trim()) {
            setIsTableModalOpen(false);
            // Navigate to dynamic route (will create later)
            router.push(`/customer/${tableInput}`);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-neutral-900">
            <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>

                {/* Header */}
                <StyledView className="mb-12 items-center">
                    <StyledText className="text-5xl font-extrabold text-white tracking-widest text-center">
                        THE MARWAD {'\n'}
                        <StyledText className="text-red-500 font-bold">रसोई</StyledText>
                    </StyledText>
                    <StyledText className="text-gray-400 text-xs tracking-[4px] mt-2 uppercase">App Home</StyledText>
                </StyledView>

                {/* Action Buttons Grid */}
                <StyledView className="w-full max-w-sm space-y-5">

                    {/* Admin Button */}
                    <StyledTouchableOpacity
                        className="flex-row items-center p-6 bg-white/5 rounded-2xl border border-white/10"
                        onPress={() => router.push('/admin')}
                        activeOpacity={0.7}
                    >
                        <StyledView className="p-4 bg-yellow-500/10 rounded-xl mr-5">
                            <Shield size={32} color="#D4AF37" />
                        </StyledView>
                        <StyledView>
                            <StyledText className="text-white text-xl font-semibold">Admin Dashboard</StyledText>
                            <StyledText className="text-gray-400 text-sm">Manage orders & menu</StyledText>
                        </StyledView>
                    </StyledTouchableOpacity>

                    {/* Customer Button */}
                    <StyledTouchableOpacity
                        className="flex-row items-center p-6 bg-white/5 rounded-2xl border border-white/10"
                        onPress={() => setIsTableModalOpen(true)}
                        activeOpacity={0.7}
                    >
                        <StyledView className="p-4 bg-red-500/10 rounded-xl mr-5">
                            <Utensils size={32} color="#ff4d4d" />
                        </StyledView>
                        <StyledView>
                            <StyledText className="text-white text-xl font-semibold">Customer View</StyledText>
                            <StyledText className="text-gray-400 text-sm">View menu as customer</StyledText>
                        </StyledView>
                    </StyledTouchableOpacity>

                    {/* Kitchen Display */}
                    <StyledTouchableOpacity
                        className="flex-row items-center p-6 bg-white/5 rounded-2xl border border-white/10"
                        onPress={() => router.push('/admin')}
                        activeOpacity={0.7}
                    >
                        <StyledView className="p-4 bg-green-500/10 rounded-xl mr-5">
                            <ChefHat size={32} color="#4caf50" />
                        </StyledView>
                        <StyledView>
                            <StyledText className="text-white text-xl font-semibold">Kitchen Display</StyledText>
                            <StyledText className="text-gray-400 text-sm">For kitchen staff</StyledText>
                        </StyledView>
                    </StyledTouchableOpacity>

                </StyledView>

                <StyledText className="absolute bottom-5 text-gray-600 text-xs">
                    v1.0.0 ({Constants.expoConfig?.extra?.appType || Constants.manifest?.extra?.appType || process.env.EXPO_PUBLIC_APP_TYPE || 'unknown'})
                </StyledText>

                {/* Modal for Table Input */}
                <Modal
                    visible={isTableModalOpen}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setIsTableModalOpen(false)}
                >
                    <StyledView className="flex-1 justify-center items-center bg-black/80 p-5">
                        <StyledView className="bg-neutral-800 w-full max-w-xs p-6 rounded-3xl border border-white/10">
                            <StyledText className="text-yellow-500 text-xl font-bold text-center mb-6">Enter Table Number</StyledText>

                            <StyledTextInput
                                value={tableInput}
                                onChangeText={setTableInput}
                                placeholder="e.g. 5, HUT, DELIVERY"
                                placeholderTextColor="#666"
                                className="w-full bg-white/5 text-white p-4 rounded-xl border border-white/10 mb-6 text-center text-lg"
                            />

                            <StyledView className="flex-row space-x-4">
                                <StyledTouchableOpacity
                                    className="flex-1 bg-white/10 p-4 rounded-xl"
                                    onPress={() => setIsTableModalOpen(false)}
                                >
                                    <StyledText className="text-white text-center font-bold">Cancel</StyledText>
                                </StyledTouchableOpacity>
                                <StyledTouchableOpacity
                                    className="flex-1 bg-red-600 p-4 rounded-xl"
                                    onPress={handleCustomerEnter}
                                >
                                    <StyledText className="text-white text-center font-bold">Go</StyledText>
                                </StyledTouchableOpacity>
                            </StyledView>

                        </StyledView>
                    </StyledView>
                </Modal>

            </ScrollView>
        </SafeAreaView>
    );
}
