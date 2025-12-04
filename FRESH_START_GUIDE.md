# 🚀 Fresh Start Guide - Clone & Build APK

## Complete Step-by-Step Instructions for Windows

---

## Step 1: Remove Old Folder & Clone Fresh

Open **PowerShell** or **Command Prompt**:

```powershell
# Navigate to Development folder
cd C:\Development

# Remove old folder (if exists)
Remove-Item -Recurse -Force gopos

# Clone fresh from GitHub
git clone https://github.com/YOUR_USERNAME/gopos.git

# Navigate to frontend folder
cd gopos\frontend
```

**Replace `YOUR_USERNAME` with your actual GitHub username!**

---

## Step 2: Create `.env` File (CRITICAL!)

The `.env` file is **NOT** in GitHub (for security), so you must create it manually:

```powershell
# Make sure you're in frontend folder
cd C:\Development\gopos\frontend

# Create .env file with correct backend URLs
@"
EXPO_TUNNEL_SUBDOMAIN=fb-point-of-sale-deployed
EXPO_PACKAGER_HOSTNAME=https://pos-foodbev.preview.emergentagent.com
EXPO_PACKAGER_PROXY_URL=https://gopos-app.ngrok.io
EXPO_PUBLIC_BACKEND_URL=https://pos-foodbev.emergent.host
EXPO_PUBLIC_API_URL=https://pos-foodbev.emergent.host/api
EXPO_USE_FAST_RESOLVER=1
"@ | Out-File -FilePath .env -Encoding utf8
```

**Verify the file was created:**
```powershell
cat .env
```

You should see the URLs displayed.

---

## Step 3: Install Dependencies

```powershell
# Make sure you're in frontend folder
cd C:\Development\gopos\frontend

# Install dependencies with yarn
yarn install
```

**Wait ~2-5 minutes** for all packages to install.

---

## Step 4: Login to EAS

```powershell
# Login to Expo EAS
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

## Step 5: Verify EAS Configuration

```powershell
# Check you're logged in
eas whoami

# Check project info
eas project:info
```

**Expected:**
- Username: `mhk2913`
- Project ID: `3b2e9503-ffcd-46a7-9b1c-e16bb818b17d`

---

## Step 6: Build APK

```powershell
# Build Android APK
eas build --platform android --profile preview-apk --clear-cache
```

**What happens:**
1. EAS uploads your code to cloud
2. Reads `.env` file (backend URLs)
3. Builds APK in ~15-20 minutes
4. Provides download link

**Wait patiently** ⏳ (~15-20 minutes)

---

## Step 7: Download & Install APK

### Option A: Direct Download
1. Click the download link provided in terminal
2. Download `build-xxxxxxxx.apk`
3. Save to your device

### Option B: From EAS Dashboard
1. Go to: https://expo.dev/accounts/mhk2913/projects/gopos/builds
2. Find your latest build
3. Click "Download" button

### Install on Android Device:
1. **Transfer APK** to your Android device
2. **Uninstall old GoPos app** (if exists)
   - Settings → Apps → GoPos → Uninstall
3. **Open APK file** on device
4. **Allow "Install from Unknown Sources"** (if prompted)
5. **Tap "Install"**

---

## Step 8: Test the App

1. **Open GoPos app**
2. **Should see login screen** (not crash!)
3. **Login with:**
   - Phone: `6737165617`
   - Password: `448613`
4. **Should login successfully** and see dashboard

### Test Features:
- ✅ View categories & items
- ✅ Create an order
- ✅ Check sales reports
- ✅ Test modifiers
- ✅ Test returns

---

## 🎯 Complete Command Summary

```powershell
# 1. Clean start
cd C:\Development
Remove-Item -Recurse -Force gopos
git clone https://github.com/YOUR_USERNAME/gopos.git
cd gopos\frontend

# 2. Create .env
@"
EXPO_PUBLIC_BACKEND_URL=https://pos-foodbev.emergent.host
EXPO_PUBLIC_API_URL=https://pos-foodbev.emergent.host/api
EXPO_USE_FAST_RESOLVER=1
"@ | Out-File -FilePath .env -Encoding utf8

# 3. Install & Build
yarn install
eas login
eas build --platform android --profile preview-apk --clear-cache

# 4. Wait, download, install, test!
```

---

## ✅ Verification Checklist

Before building, verify:
- [ ] Cloned latest code from GitHub
- [ ] Created `.env` file with correct URLs
- [ ] Ran `yarn install` successfully
- [ ] Logged into EAS (`eas whoami` shows `mhk2913`)
- [ ] Backend is deployed at `https://pos-foodbev.emergent.host`

After installing APK:
- [ ] App opens without crashing
- [ ] Login screen appears
- [ ] Can login with test credentials
- [ ] Dashboard loads with categories
- [ ] Can create orders

---

## 🚨 Common Issues & Solutions

### Issue 1: `.env` file not found during build
**Solution:** Make sure you created it in `C:\Development\gopos\frontend\.env`

### Issue 2: App still crashes
**Solution:** 
1. Make sure backend is running at `https://pos-foodbev.emergent.host`
2. Test: `curl https://pos-foodbev.emergent.host/health`
3. Should return: `{"status":"healthy"}`

### Issue 3: Login fails
**Solution:**
1. Check backend URL in app
2. Verify MongoDB has users (should have 3 users)
3. Try login: `6737165617` / `448613`

### Issue 4: `eas login` fails
**Solution:** 
1. Check credentials: `mhk2913` / `haizkia1311`
2. Try: `eas logout` then `eas login` again

---

## 📁 File Structure After Clone

```
C:\Development\gopos\
├── frontend/
│   ├── .env                    ← CREATE THIS MANUALLY!
│   ├── app/
│   ├── assets/
│   │   ├── icon.png            ← New GoPos icon
│   │   └── adaptive-icon.png   ← New adaptive icon
│   ├── context/
│   ├── app.config.js           ← Updated with fallbacks
│   ├── package.json
│   └── yarn.lock
└── backend/
    ├── server.py               ← Has /health endpoint
    └── .env                    ← Not needed for APK build
```

---

## 🎯 What's Different from Last Time

### Fixes Applied:
1. ✅ **Fallback URLs** added (app won't crash without .env)
2. ✅ **Health endpoint** added at `/health`
3. ✅ **New app icon** (GoPos logo)
4. ✅ **Consistent backend URLs** (all point to `pos-foodbev.emergent.host`)

### Why It Will Work Now:
- Even if `.env` is missing, app uses fallback URLs
- No more crash on startup
- Backend is properly deployed with health checks
- All environment variables are consistent

---

## 📞 Need Help?

If you encounter issues:
1. Check this guide first
2. Verify backend is accessible: `curl https://pos-foodbev.emergent.host/api/`
3. Check `.env` file exists and has correct URLs
4. Review EAS build logs at: https://expo.dev

---

**✅ You're ready! Follow these steps and your APK will work perfectly!** 🎉

*Last updated: December 4, 2025*
