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
    adaptiveIcon: {
      foregroundImage: "https://customer-assets.emergentagent.com/job_gopos-app/artifacts/lsx46vaz_gopos%20green%202.jpg",
      backgroundColor: "#FFFFFF"
    },
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
      projectId: "3b2e9503-ffcd-46a7-9b1c-e16bb818b17d"
    },
    // Backend URL for APK builds - MUST be set via environment variables
    backendUrl: process.env.EXPO_PUBLIC_BACKEND_URL,
    apiUrl: process.env.EXPO_PUBLIC_API_URL
  }
};
