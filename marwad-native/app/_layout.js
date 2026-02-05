import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { NativeWindStyleSheet } from "nativewind";
import { registerForPushNotificationsAsync } from '../utils/NotificationHelper';
import ErrorBoundary from './components/ErrorBoundary';

NativeWindStyleSheet.setOutput({
    default: "native",
});

export default function Layout() {
    useEffect(() => {
        registerForPushNotificationsAsync();
    }, []);

    return (
        <ErrorBoundary>
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#1a1a1a' } }}>
                <Stack.Screen name="index" />
            </Stack>
        </ErrorBoundary>
    );
}
