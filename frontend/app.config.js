module.exports = {
  name: "GoPos",
  slug: "gopos",
  version: "1.0.0",
  orientation: "portrait",
  icon: "https://customer-assets.emergentagent.com/job_gopos-app/artifacts/lsx46vaz_gopos%20green%202.jpg",
  scheme: "gopos",
  userInterfaceStyle: "automatic",
  newArchEnabled: false,
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.gopos.app"
  },
  android: {
    package: "com.gopos.app",
    adaptiveIcon: {
      foregroundImage: "https://customer-assets.emergentagent.com/job_gopos-app/artifacts/lsx46vaz_gopos%20green%202.jpg",
      backgroundColor: "#FFFFFF"
    },
    edgeToEdgeEnabled: true,
    permissions: [
      "CAMERA",
      "READ_EXTERNAL_STORAGE",
      "WRITE_EXTERNAL_STORAGE",
      "BLUETOOTH",
      "BLUETOOTH_ADMIN",
      "BLUETOOTH_CONNECT",
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
      projectId: "5db1bef7-dfa4-4b66-b4de-a385efef27c4"
    },
    // Backend URL for APK builds - this ensures the URL is baked into the APK
    backendUrl: process.env.EXPO_PUBLIC_BACKEND_URL || 'https://resto-orders-21.preview.emergentagent.com',
    apiUrl: process.env.EXPO_PUBLIC_API_URL || 'https://resto-orders-21.preview.emergentagent.com/api'
  }
};
