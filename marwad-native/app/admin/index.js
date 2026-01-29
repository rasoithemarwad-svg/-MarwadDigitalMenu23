import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, SafeAreaView } from 'react-native';
import { styled } from 'nativewind';
import { useRouter } from 'expo-router';
import { Shield, Lock, Eye, EyeOff } from 'lucide-react-native';
import io from 'socket.io-client';
import { API_URL } from '../../constants/Config';

console.log('🔌 Connecting to API:', API_URL);
const socket = io(API_URL);

socket.on('connect', () => console.log('✅ Socket Connected:', socket.id));
socket.on('connect_error', (err) => console.error('❌ Socket Connection Error:', err));

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTextInput = styled(TextInput);
const StyledTouchableOpacity = styled(TouchableOpacity);

export default function AdminLogin() {
    const router = useRouter();
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    React.useEffect(() => {
        socket.on('login-success', (userData) => {
            setLoading(false);
            // In a real app we'd use AsyncStorage, but for now we can pass as params or use a global store
            router.replace({
                pathname: '/admin/dashboard',
                params: { role: userData.role, username: userData.username }
            });
        });

        socket.on('login-error', (error) => {
            setLoading(false);
            Alert.alert('Login Failed', error);
        });

        // NEW: Handle connection errors
        socket.on('connect_error', (err) => {
            setLoading(false);
            Alert.alert('Connection Error', 'Cannot reach server.\nCheck Wi-Fi or Firewall.\n' + err.message);
        });

        return () => {
            socket.off('login-success');
            socket.off('login-error');
            socket.off('connect_error');
        };
    }, []);

    const handleLogin = () => {
        if (!password) return Alert.alert('Error', 'Please enter your password');
        setLoading(true);
        socket.emit('login', { username: 'THEMARWADRASOI', password });
    };

    return (
        <SafeAreaView className="flex-1 bg-black justify-center items-center">
            <StyledView className="w-full max-w-sm p-6 items-center">

                <StyledView className="bg-yellow-500/10 p-6 rounded-full mb-8">
                    <Shield size={48} color="#d4af37" />
                </StyledView>

                <StyledText className="text-white text-3xl font-bold mb-2">Admin Access</StyledText>
                <StyledText className="text-gray-400 text-sm mb-10">Enter your secure PIN to continue</StyledText>

                <StyledView className="w-full space-y-4">
                    {/* Username (Pre-filled) */}
                    <StyledView className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-4 mb-4 items-center">
                        <StyledText className="text-gray-500 text-[10px] tracking-[2px] uppercase mb-1">Username</StyledText>
                        <StyledText className="text-yellow-500 text-lg font-bold">THEMARWADRASOI</StyledText>
                    </StyledView>

                    {/* Password Input */}
                    <StyledView className="flex-row items-center bg-white/5 border border-white/10 rounded-xl p-4 mb-6">
                        <Lock size={20} color="#666" style={{ marginRight: 10 }} />
                        <StyledTextInput
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry={!showPassword}
                            placeholder="Enter Password"
                            placeholderTextColor="#666"
                            className="flex-1 text-white text-lg"
                        />
                        <StyledTouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                            {showPassword ? <EyeOff size={20} color="#666" /> : <Eye size={20} color="#666" />}
                        </StyledTouchableOpacity>
                    </StyledView>

                    <StyledTouchableOpacity
                        className={`w-full p-4 rounded-xl items-center ${loading ? 'bg-yellow-500/50' : 'bg-yellow-500'}`}
                        onPress={handleLogin}
                        disabled={loading}
                    >
                        <StyledText className="text-black font-bold text-lg">{loading ? 'Verifying...' : 'Unlock Dashboard'}</StyledText>
                    </StyledTouchableOpacity>

                    {/* Debug Connection Status */}
                    <StyledText className="text-gray-500 text-center text-xs mt-2">
                        Server: {socket.connected ? '🟢 Connected' : '🔴 Disconnected'} ({API_URL})
                    </StyledText>

                    <StyledTouchableOpacity
                        className="mt-6"
                        onPress={() => router.back()}
                    >
                        <StyledText className="text-gray-500 text-sm">Cancel & Return Home</StyledText>
                    </StyledTouchableOpacity>
                </StyledView>

            </StyledView>
        </SafeAreaView>
    );
}
