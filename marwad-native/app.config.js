const APP_TYPE = process.env.APP_TYPE || 'admin';

export default {
    "expo": {
        "name": APP_TYPE === 'delivery' ? "Marwad Delivery" : (APP_TYPE === 'staff' ? "Marwad Staff" : "Marwad Admin"),
        "slug": "marwad-native",
        "version": "1.0.0",
        "orientation": "portrait",
        "icon": APP_TYPE === 'delivery' ? "./assets/icon-delivery.png" : "./assets/icon.png",
        "userInterfaceStyle": "light",
        "newArchEnabled": false,
        "splash": {
            "image": "./assets/splash-icon.png",
            "resizeMode": "contain",
            "backgroundColor": "#ffffff"
        },
        "ios": {
            "supportsTablet": true,
            "bundleIdentifier": `com.marwad.${APP_TYPE}`
        },
        "android": {
            "adaptiveIcon": {
                "foregroundImage": APP_TYPE === 'delivery' ? "./assets/icon-delivery.png" : "./assets/adaptive-icon.png",
                "backgroundColor": "#ffffff"
            },
            "package": `com.marwad.${APP_TYPE || 'admin'}`.toLowerCase(),
            "edgeToEdgeEnabled": true
        },
        "web": {
            "favicon": "./assets/favicon.png"
        },
        "extra": {
            "appType": APP_TYPE,
            "eas": {
                "projectId": "b53c5e4a-14e0-45ec-a76d-df87799681fc"
            }
        },
        "plugins": [
            [
                "expo-camera",
                {
                    "cameraPermission": "Allow $(PRODUCT_NAME) to access your camera to scan QR codes."
                }
            ],
            [
                "expo-location",
                {
                    "locationAlwaysAndWhenInUsePermission": "Allow $(PRODUCT_NAME) to access your location for delivery tracking."
                }
            ],
            [
                "expo-build-properties",
                {
                    "android": {
                        "usesCleartextTraffic": true
                    }
                }
            ]
        ]
    }
};
