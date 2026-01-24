import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, SafeAreaView } from 'react-native';
import { styled } from 'nativewind';
import { useRouter } from 'expo-router';
import { Shield, Lock } from 'lucide-react-native';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTextInput = styled(TextInput);
const StyledTouchableOpacity = styled(TouchableOpacity);

export default function AdminLogin() {
    const router = useRouter();
    const [otp, setOtp] = useState('');
    const FIXED_OTP = '130289';

    const handleLogin = () => {
        if (otp === FIXED_OTP) {
            router.replace('/admin/dashboard');
        } else {
            Alert.alert('Access Denied', 'Invalid Access PIN');
        }
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
                    <StyledView className="flex-row items-center bg-white/5 border border-white/10 rounded-xl p-4 mb-4">
                        <Lock size={20} color="#666" style={{ marginRight: 10 }} />
                        <StyledTextInput
                            value={otp}
                            onChangeText={setOtp}
                            secureTextEntry
                            keyboardType="numeric"
                            placeholder="Enter 6-digit PIN"
                            placeholderTextColor="#666"
                            maxLength={6}
                            className="flex-1 text-white text-lg tracking-widest"
                        />
                    </StyledView>

                    <StyledTouchableOpacity
                        className="bg-yellow-500 w-full p-4 rounded-xl items-center"
                        onPress={handleLogin}
                    >
                        <StyledText className="text-black font-bold text-lg">Access Dashboard</StyledText>
                    </StyledTouchableOpacity>

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
