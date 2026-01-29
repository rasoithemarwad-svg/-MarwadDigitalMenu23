
import React, { useState, useEffect } from 'react';
import { Text, View, StyleSheet, Button, Dimensions, TouchableOpacity } from 'react-native';
import { CameraView, useCameraPermissions } from "expo-camera";
import { styled } from 'nativewind';
import { X } from 'lucide-react-native';

const StyledView = styled(View);
const StyledTouchableOpacity = styled(TouchableOpacity);

export default function Scanner({ onScan, onClose }) {
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);
    const hasPermission = permission?.granted;

    useEffect(() => {
        if (!permission) {
            requestPermission();
        }
    }, [permission]);

    const handleBarCodeScanned = ({ type, data }) => {
        setScanned(true);
        if (onScan) {
            onScan(data);
        }
    };

    if (hasPermission === null) {
        return <Text className="text-white text-center mt-20">Requesting for camera permission</Text>;
    }
    if (hasPermission === false) {
        return <Text className="text-white text-center mt-20">No access to camera</Text>;
    }

    return (
        <View style={styles.container}>
            <CameraView
                onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                barcodeScannerSettings={{
                    barcodeTypes: ["qr", "pdf417"],
                }}
                style={StyleSheet.absoluteFillObject}
            />

            <View className="absolute top-10 right-4">
                <StyledTouchableOpacity onPress={onClose} className="bg-black/50 p-2 rounded-full">
                    <X color="white" size={30} />
                </StyledTouchableOpacity>
            </View>

            <View className="absolute bottom-10 w-full items-center">
                <Text className="text-white bg-black/50 px-4 py-2 rounded-xl">Point camera at a QR code</Text>
            </View>

            {scanned && (
                <View className="absolute bottom-24 w-full items-center">
                    <Button title={'Tap to Scan Again'} onPress={() => setScanned(false)} color="yellow" />
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'black',
        justifyContent: 'center',
        alignItems: 'center',
    },
});
