import { Stack } from 'expo-router';
import { NativeWindStyleSheet } from "nativewind";

NativeWindStyleSheet.setOutput({
    default: "native",
});

export default function Layout() {
    return (
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#1a1a1a' } }}>
            <Stack.Screen name="index" />
        </Stack>
    );
}
