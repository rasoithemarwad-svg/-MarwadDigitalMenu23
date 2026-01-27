const APP_TYPE = process.env.APP_TYPE || 'admin';

export default {
    "expo": {
        "name": APP_TYPE === 'delivery' ? "Marwad Delivery" : "Marwad Admin",
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
            "bundleIdentifier": APP_TYPE === 'delivery' ? "com.marwad.delivery" : "com.marwad.admin"
        },
        "android": {
            "adaptiveIcon": {
                "foregroundImage": APP_TYPE === 'delivery' ? "./assets/icon-delivery.png" : "./assets/adaptive-icon.png",
                "backgroundColor": "#ffffff"
            },
            "package": APP_TYPE === 'delivery' ? "com.marwad.delivery" : "com.marwad.admin",
            "edgeToEdgeEnabled": true
        },
        "web": {
            "favicon": "./assets/favicon.png"
        }
    }
};
