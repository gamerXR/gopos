module.exports = {
  name: "GoPos",
  slug: "gopos",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  scheme: "gopos",
  userInterfaceStyle: "automatic",
  newArchEnabled: false,
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.gopos.app"
  },
  android: {
    package: "com.gopos.app",
    versionCode: 3,
    icon: "./assets/icon.png",
    adaptiveIcon: {
      foregroundImage: "./assets/icon.png",
      backgroundColor: "#FFFFFF"
    },
    permissions: [
      "CAMERA",
      "READ_EXTERNAL_STORAGE",
      "WRITE_EXTERNAL_STORAGE",
      "BLUETOOTH",
      "BLUETOOTH_ADMIN",
      "BLUETOOTH_CONNECT",
      "BLUETOOTH_SCAN",
      "ACCESS_FINE_LOCATION",
      "ACCESS_COARSE_LOCATION",
      "INTERNET"
    ]
  },
  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/images/favicon.png"
  },
  splash: {
    image: "./assets/images/splash-image.png",
    resizeMode: "contain",
    backgroundColor: "#4CAF50"
  },
  plugins: [
    "expo-router"
  ],
  experiments: {
    typedRoutes: true
  },
  extra: {
    eas: {
      projectId: "3b2e9503-ffcd-46a7-9b1c-e16bb818b17d"
    },
    // Backend URL for APK builds - with production fallback
    backendUrl: process.env.EXPO_PUBLIC_BACKEND_URL || 'https://pos-foodbev.emergent.host',
    apiUrl: process.env.EXPO_PUBLIC_API_URL || 'https://pos-foodbev.emergent.host/api'
  }
};
