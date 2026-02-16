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

    // Safe Navigation Logic
    const rootNavigationState = router.useRootNavigationState();
    const [isNavigationReady, setIsNavigationReady] = useState(false);

    useEffect(() => {
        if (rootNavigationState?.key) {
            setIsNavigationReady(true);
        }
    }, [rootNavigationState]);

    // Auto-redirect for Delivery APK
    useEffect(() => {
        if (!isNavigationReady) return;

        const checkAppType = () => {
            const appType =
                Constants.expoConfig?.extra?.appType ||
                Constants.manifest?.extra?.appType ||
                process.env.EXPO_PUBLIC_APP_TYPE;

            console.log("App Type Detected:", appType);

            if (appType === 'delivery') {
                // Delivery APK should go directly to delivery dashboard
                // Use setTimeout to allow render cycle to complete
                setTimeout(() => {
                    router.replace('/delivery/dashboard');
                }, 100);
            }
        };

        checkAppType();
    }, [isNavigationReady]);

    const handleCustomerEnter = () => {
        if (tableInput.trim()) {
            setIsTableModalOpen(false);
            // Navigate to dynamic route (will create later)
            router.push(`/customer/${tableInput}`);
        }
    };

    // SAFE MODE DEBUG: If not delivery, show simple text first to test native crash
    if (Constants.expoConfig?.extra?.appType !== 'delivery' && process.env.EXPO_PUBLIC_APP_TYPE !== 'delivery') {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: 'black', justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ color: 'white', fontSize: 24, fontWeight: 'bold' }}>Admin Safe Mode</Text>
                <Text style={{ color: 'gray', marginTop: 10 }}>If you see this, native layer is OK.</Text>

                <TouchableOpacity
                    style={{ marginTop: 20, backgroundColor: '#D4AF37', padding: 15, borderRadius: 10 }}
                    onPress={() => router.push('/admin')}
                >
                    <Text style={{ fontWeight: 'bold' }}>Go to Dashboard</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-neutral-900">
            {/* Original UI hidden for debug */}
        </SafeAreaView>
    );
}
