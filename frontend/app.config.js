const IS_DEV = process.env.EXPO_NO_DEV_CLIENT !== "1";

export default {
  name: "GoPos",
  slug: "gopos",
  version: "1.0.0",
  orientation: "portrait",
  icon: "https://customer-assets.emergentagent.com/job_gopos-app/artifacts/lsx46vaz_gopos%20green%202.jpg",
  scheme: "gopos",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
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
    "expo-router",
    ...(IS_DEV ? ["expo-dev-launcher", "expo-dev-client"] : [])
  ],
  experiments: {
    typedRoutes: true
  }
};
