const APP_TYPE = process.env.APP_TYPE || 'admin';

export default {
    "expo": {
        "name": APP_TYPE === 'delivery' ? "Marwad Delivery" : (APP_TYPE === 'staff' ? "Marwad Staff" : "Marwad Admin"),
        "slug": "marwad-native",
        "version": "1.0.0",
        "orientation": "portrait",
        "icon": APP_TYPE === 'delivery' ? "./assets/icon-delivery.png" : "./assets/icon.png",
        "userInterfaceStyle": "light",
        "newArchEnabled": true,
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
            "eas": {
                "projectId": "30a6377a-bda8-45c9-b605-0bd282000c3e"
            }
        }
    }
};
