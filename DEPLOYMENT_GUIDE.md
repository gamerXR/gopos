# 🚀 GoPos Deployment Guide - GitHub & EAS Build

## Part 1: Commit & Push to GitHub

### Step 1: Create GitHub Repository (If not exists)

1. Go to https://github.com
2. Click "New repository" (green button)
3. Repository name: `gopos-app` (or any name you prefer)
4. Keep it **Private** (recommended for production apps)
5. **DO NOT** initialize with README, .gitignore, or license
6. Click "Create repository"

---

### Step 2: Configure Git (If needed)

If this is your first time using git on this machine:

```bash
git config --global user.name "mhk2913"
git config --global user.email "your-email@example.com"
```

---

### Step 3: Stage Your Changes

```bash
cd /app

# Add all changes
git add .

# Check what will be committed
git status
```

**Expected output:**
- Modified: frontend/yarn.lock
- Added: frontend/android/gradle/wrapper/gradle-wrapper.jar
- Plus documentation files

---

### Step 4: Commit Changes

```bash
git commit -m "Phase 1: Stabilize React Native dependencies for APK build

- Upgrade React 18.2.0 → 19.1.0 (required for Expo SDK 54)
- Upgrade React Native 0.74.5 → 0.81.0
- Upgrade React DOM 18.2.0 → 19.1.0
- Remove deprecated enableBundleCompression from Gradle
- Standardize all URLs to resto-orders-21.preview.emergentagent.com
- Add comprehensive build documentation

Fixes:
- Resolves '(0, react_1.use) is not a function' error
- Removes Gradle deprecated property warning
- Ensures consistent environment URLs

Ready for: EAS Build to generate production APK"
```

---

### Step 5: Add Remote & Push

Replace `YOUR_USERNAME` and `YOUR_REPO` with your actual GitHub username and repository name:

```bash
# Add remote
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git

# Verify remote
git remote -v

# Push to GitHub
git push -u origin main
```

**If you need to authenticate:**
- GitHub username: your username
- Password: Use **Personal Access Token** (not your GitHub password)
  - Create token at: https://github.com/settings/tokens
  - Select scopes: `repo` (full control of private repositories)

---

### Step 6: Verify on GitHub

1. Go to your repository URL
2. Check that all files are uploaded
3. Verify frontend/package.json shows React 19.1.0

---

## Part 2: Build APK with EAS

### Prerequisites Check ✅

Before starting, verify:
- [x] Code pushed to GitHub
- [x] Expo account ready (mhk2913)
- [x] EAS CLI installed (already done)

---

### Step 1: Navigate to Frontend Directory

```bash
cd /app/frontend
```

---

### Step 2: Login to EAS

**IMPORTANT:** This requires interactive terminal input.

```bash
eas login
```

**When prompted:**
- Email or username: `mhk2913`
- Password: `haizkia1311`

**Expected output:**
```
✔ Logged in as mhk2913
```

---

### Step 3: Verify Project Configuration

Check if you're connected to the right project:

```bash
eas whoami
eas project:info
```

**Expected output:**
- Username: mhk2913
- Project ID: 5db1bef7-dfa4-4b66-b4de-a385efef27c4
- Project name: gopos

---

### Step 4: Start the Build

**For Preview/Testing APK (Recommended):**

```bash
eas build --platform android --profile preview-apk
```

**For Production APK:**

```bash
eas build --platform android --profile production-apk
```

---

### Step 5: Monitor Build Progress

After running the build command, you'll see:

```
✔ Build started
Build ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
Build URL: https://expo.dev/accounts/mhk2913/projects/gopos/builds/xxxxx
```

**Monitor options:**
1. **In Terminal:** Build progress shows in real-time
2. **Web Dashboard:** Click the Build URL to watch in browser
3. **Email:** You'll get an email when build completes

**Typical timeline:**
- ⏱️ Queuing: 0-5 minutes
- ⏱️ Building: 10-20 minutes
- ⏱️ Total: ~15-25 minutes

---

### Step 6: Build Output

When build completes, you'll see:

```
✔ Build finished
Download URL: https://expo.dev/artifacts/eas/xxxxx.apk
```

**To download:**

**Option A - Terminal:**
```bash
# Download directly
wget -O gopos.apk "https://expo.dev/artifacts/eas/xxxxx.apk"
```

**Option B - Browser:**
1. Click the download URL
2. Save as `gopos.apk`

**Option C - Dashboard:**
1. Go to https://expo.dev/accounts/mhk2913/projects/gopos/builds
2. Find your build
3. Click "Download" button

---

### Step 7: Install APK on Android Device

**Method 1 - Direct Transfer:**
1. Connect Android device to computer via USB
2. Copy `gopos.apk` to device
3. Open file manager on device
4. Tap the APK file
5. Allow "Install from Unknown Sources" if prompted
6. Tap "Install"

**Method 2 - Cloud Transfer:**
1. Upload APK to Google Drive / Dropbox
2. Open link on Android device
3. Download and install

**Method 3 - ADB (Advanced):**
```bash
adb install gopos.apk
```

---

## 📱 Post-Installation Testing

### Test Credentials:

**Super Admin:**
- Phone: `6737165617`
- Password: `448613`

**Client (Staff):**
- Phone: `8889999`
- Password: `123456`

### Features to Test:

1. **Login System**
   - [x] Super admin login
   - [x] Client login
   - [x] Invalid credentials rejection

2. **POS Dashboard**
   - [x] View categories
   - [x] View items
   - [x] Add items to cart
   - [x] Create order (cash payment)
   - [x] Create order (QR payment)

3. **Modifier System**
   - [x] Add modifier to category
   - [x] Apply modifier to item
   - [x] View modifier cost in cart

4. **Sales Reports**
   - [x] Day Closing report
   - [x] Sales Details (filtered by date)
   - [x] View transaction history
   - [x] Expand order details

5. **Returns & Refunds**
   - [x] Return individual item
   - [x] Refund entire order
   - [x] Reprint receipt

6. **Backend Connection**
   - [x] Verify API calls work
   - [x] Test in WiFi and mobile data
   - [x] Check data sync with MongoDB

---

## 🔧 Build Configuration Details

### APK Settings (from app.config.js):

- **App Name:** GoPos
- **Package:** com.gopos.app
- **Version:** 1.0.0
- **Orientation:** Portrait
- **Backend URL:** https://resto-orders-21.preview.emergentagent.com/api

### Build Profiles (from eas.json):

| Profile | Type | Use Case |
|---------|------|----------|
| development | Dev Client | Local development with debugging |
| preview | Internal AAB | Testing before Play Store |
| preview-apk | Internal APK | **✅ Best for testing/distribution** |
| production | Production AAB | Google Play Store submission |
| production-apk | Production APK | **Production standalone APK** |

---

## 🆘 Troubleshooting

### Issue: EAS Login Fails

**Problem:** "Authentication failed" or "Invalid credentials"

**Solution:**
1. Double-check username: `mhk2913`
2. Double-check password: `haizkia1311`
3. Try: `eas logout` then `eas login` again
4. Verify account at: https://expo.dev

---

### Issue: Build Fails

**Problem:** Build fails during compilation

**Solution:**
1. Check build logs at the Build URL
2. Common issues:
   - Package.json syntax error → Validate JSON
   - Missing dependencies → Run `yarn install`
   - Invalid app.config.js → Check for syntax errors
3. Retry build: `eas build --platform android --profile preview-apk --clear-cache`

---

### Issue: APK Won't Install

**Problem:** "App not installed" error

**Solution:**
1. Enable "Install from Unknown Sources" on Android
2. Uninstall old version first: Settings → Apps → GoPos → Uninstall
3. Check device has enough storage (at least 100MB free)
4. Try downloading APK again (file might be corrupted)

---

### Issue: App Crashes on Startup

**Problem:** App opens then immediately closes

**Solution:**
1. Check device Android version (minimum: Android 5.0 / API 21)
2. Clear app data: Settings → Apps → GoPos → Clear Data
3. Reinstall the APK
4. Check logs: `adb logcat | grep GoPos`

---

### Issue: Backend Connection Fails

**Problem:** App shows "Network Error" or "Unable to connect"

**Solution:**
1. Verify backend is running: https://resto-orders-21.preview.emergentagent.com/api
2. Test with curl:
   ```bash
   curl -X POST https://resto-orders-21.preview.emergentagent.com/api/login \
   -H "Content-Type: application/json" \
   -d '{"phone":"8889999","password":"123456"}'
   ```
3. Check device internet connection
4. Verify CORS settings in backend
5. Check if backend URL changed (need to rebuild APK)

---

### Issue: "Not Authorized for Project" Error

**Problem:** EAS says you don't have access to project

**Solution:**
1. Verify project ID in app.config.js: `5db1bef7-dfa4-4b66-b4de-a385efef27c4`
2. Check if logged in: `eas whoami`
3. Verify project ownership at: https://expo.dev/accounts/mhk2913/projects

---

## 📊 Build Logs & Monitoring

### View Build Logs:

**During Build:**
```bash
# Terminal shows live logs
eas build:view
```

**After Build:**
1. Go to: https://expo.dev/accounts/mhk2913/projects/gopos/builds
2. Click on your build
3. View "Build Logs" tab

### Common Log Sections:
- **Install dependencies** - Downloading packages
- **Pre-build** - Running pre-build scripts
- **Gradle build** - Compiling Android app
- **Upload artifacts** - Uploading APK

---

## 🎯 Build Success Checklist

After successful build, verify:

- [x] APK downloaded successfully
- [x] File size reasonable (~30-80 MB)
- [x] APK installs on Android device
- [x] App launches without crash
- [x] Login works with test credentials
- [x] Backend API responds correctly
- [x] All major features functional

---

## 🔄 Rebuilding APK (Future Updates)

When you need to rebuild (after code changes):

```bash
# 1. Make your code changes
# 2. Test locally first
cd /app/frontend
yarn start

# 3. Commit to GitHub
git add .
git commit -m "Your update description"
git push

# 4. Bump version in app.config.js
# Change: version: "1.0.0" → "1.0.1"

# 5. Build new APK
eas build --platform android --profile preview-apk

# 6. Uninstall old app from device
# 7. Install new APK
```

---

## 📞 Support Resources

- **Expo Documentation:** https://docs.expo.dev
- **EAS Build Docs:** https://docs.expo.dev/build/introduction/
- **React Native Docs:** https://reactnative.dev
- **Expo Discord:** https://chat.expo.dev
- **Stack Overflow:** Tag with `expo`, `react-native`, `eas-build`

---

## ✅ Quick Command Reference

```bash
# GitHub
git add .
git commit -m "message"
git push

# EAS
eas login
eas whoami
eas build --platform android --profile preview-apk
eas build:list
eas build:view [BUILD_ID]

# Android
adb devices
adb install gopos.apk
adb logcat
adb uninstall com.gopos.app
```

---

**🎉 You're all set! Follow these steps and you'll have your APK ready for testing.**

*Guide created: December 3, 2025*
*Environment: Expo SDK 54, React Native 0.81*
