import 'react-native-gesture-handler';
import 'react-native-reanimated';
import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
// import { NativeWindStyleSheet } from "nativewind";
import { registerForPushNotificationsAsync } from '../utils/NotificationHelper';
import ErrorBoundary from './components/ErrorBoundary';

// NativeWindStyleSheet.setOutput({
//     default: "native",
// });

export default function Layout() {
    useEffect(() => {
        // SAFE MODE GUARD: Only run notifications for Delivery app where it's known to work
        // or if explicitly enabled. Admin package might be missing google-services.json
        const appType = process.env.EXPO_PUBLIC_APP_TYPE || 'unknown';
        if (appType === 'delivery') {
            try {
                registerForPushNotificationsAsync().catch(err => console.error("Notification Init Error:", err));
            } catch (e) {
                console.error("Critical Notification Error:", e);
            }
        }
    }, []);

    try {
        return (
            <ErrorBoundary>
                <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#1a1a1a' } }}>
                    <Stack.Screen name="index" />
                </Stack>
            </ErrorBoundary>
        );
    } catch (renderError) {
        console.error("Root Layout Render Error:", renderError);
        return null;
    }
}
