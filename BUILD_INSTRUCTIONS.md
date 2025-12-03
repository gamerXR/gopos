# GoPos APK Build Instructions

## ✅ Phase 1 Complete: Environment Stabilized

### Fixed Issues:
1. **React Version Conflict Resolved**
   - Upgraded React from 18.2.0 → 19.1.0
   - Upgraded React Native from 0.74.5 → 0.81.0
   - Upgraded React DOM from 18.2.0 → 19.1.0
   - All versions now compatible with Expo SDK 54

2. **Build Configuration Updated**
   - Removed deprecated `enableBundleCompression` from android/app/build.gradle
   - React Native 0.81 no longer supports this property

3. **URL Configuration Standardized**
   - All URLs now use: `https://resto-orders-21.preview.emergentagent.com`
   - Frontend .env updated
   - Backend API URL: `https://resto-orders-21.preview.emergentagent.com/api`

### Current Status:
- ✅ Web preview working correctly
- ✅ Metro bundler running on port 3000
- ✅ No React errors
- ✅ All dependencies installed
- ✅ Backend connected to MongoDB Atlas

---

## 🚀 Phase 2: Building APK with EAS

### Prerequisites:
- Expo account: **mhk2913**
- EAS CLI already installed (v16.28.0)
- Project ID: `5db1bef7-dfa4-4b66-b4de-a385efef27c4`

### Build Steps:

#### 1. Login to EAS
```bash
cd /app/frontend
eas login
```
- Username: `mhk2913`
- Password: `haizkia1311`

#### 2. Choose Build Profile

**For Testing/Preview APK (Recommended):**
```bash
eas build --platform android --profile preview-apk
```

**For Production APK:**
```bash
eas build --platform android --profile production-apk
```

#### 3. Monitor Build
- Build takes ~10-20 minutes
- You'll get a link to track progress
- Download link provided when complete
- Or visit: https://expo.dev/accounts/mhk2913/projects/gopos/builds

---

## 📱 APK Configuration

### App Details:
- **Name:** GoPos
- **Package:** com.gopos.app
- **Version:** 1.0.0
- **Bundle ID (iOS):** com.gopos.app

### Backend Configuration:
- **API URL:** https://resto-orders-21.preview.emergentagent.com/api
- **Backend URL:** https://resto-orders-21.preview.emergentagent.com

### Permissions:
- Camera (for QR scanning)
- Storage (Read/Write)
- Bluetooth (for SunMi printer)
- Internet

### Build Profiles (eas.json):
1. **development** - Dev client with debugging
2. **preview** - Internal distribution, release build
3. **production** - Final production build
4. **preview-apk** - Standalone APK for testing ✅ Recommended
5. **production-apk** - Production APK

---

## 🔧 Local Gradle Build (Alternative)

If you want to build locally instead of EAS:

### Requirements:
1. Install Android SDK
2. Set JAVA_HOME:
   ```bash
   export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
   ```

3. Create `local.properties` in `/app/frontend/android/`:
   ```
   sdk.dir=/path/to/your/android/sdk
   ```

4. Run build:
   ```bash
   cd /app/frontend/android
   ./gradlew assembleDebug      # For debug APK
   ./gradlew assembleRelease    # For production APK
   ```

APK location: `android/app/build/outputs/apk/`

---

## 📊 Current Package Versions

```json
{
  "expo": "54.0.25",
  "react": "19.1.0",
  "react-dom": "19.1.0",
  "react-native": "0.81.0",
  "expo-router": "5.1.4"
}
```

---

## 🎯 Post-Build Testing

After getting your APK:

1. **Install on Android device/tablet**
2. **Test all features:**
   - Login (super_admin: 6737165617/448613, client: 8889999/123456)
   - POS functionality (add items, create orders)
   - Modifiers system
   - Sales reports (Day Closing, Sales Details)
   - Returns & refunds
   - Print receipts (if SunMi printer available)

3. **Verify backend connection:**
   - App should connect to: https://resto-orders-21.preview.emergentagent.com/api
   - Test in different network conditions

---

## ⚠️ Important Notes

1. **Backend URL is hardcoded in APK**
   - The URL from `app.config.js` is baked into the APK
   - To change it, you need to rebuild the APK

2. **Signing Configuration**
   - Currently using debug keystore for signing
   - For Play Store, generate a production keystore

3. **Build Duration**
   - EAS build: 10-20 minutes
   - Local build: 3-5 minutes (after SDK setup)

4. **Environment Variables**
   - .env file is NOT included in APK
   - URLs from app.config.js are used instead

---

## 🆘 Troubleshooting

### EAS Build Fails
- Check build logs at: https://expo.dev
- Verify all dependencies in package.json
- Ensure app.config.js is valid JavaScript

### APK Won't Install
- Enable "Install from Unknown Sources" on Android
- Check if old version needs uninstalling first

### Backend Connection Issues
- Verify backend URL is accessible from internet
- Check CORS configuration
- Test API endpoints with Postman/curl

### Local Build Issues
- Ensure ANDROID_HOME is set
- Check gradle.properties configuration
- Run `./gradlew clean` first

---

## 📚 Additional Resources

- [Expo Build Documentation](https://docs.expo.dev/build/introduction/)
- [EAS Build Configuration](https://docs.expo.dev/build/eas-json/)
- [React Native 0.81 Release Notes](https://reactnative.dev/blog/2025/08/12/react-native-0.81)
- [Expo SDK 54 Changelog](https://expo.dev/changelog/sdk-54)

---

## ✅ Ready for GitHub

All configurations are stable and ready to commit:
- Dependencies resolved
- URLs standardized
- Build configuration updated
- No breaking errors

**Next Steps:**
1. Commit changes to GitHub
2. Clone on local machine (if needed)
3. Login to EAS
4. Build APK

---

*Build configuration verified on: December 3, 2025*
*Environment: Expo SDK 54, React 19.1.0, React Native 0.81.0*
