# 🚀 GoPos - Deployment in 5 Minutes

## 🎯 Quick Overview

**What you'll do:**
1. ✅ Commit code to GitHub (2 minutes)
2. ✅ Build APK with EAS (15-20 minutes)
3. ✅ Install on Android device (1 minute)

**Total time:** ~20-25 minutes

---

## 📋 Part 1: GitHub (2 minutes)

### Option A: Use Quick Start Script (Easiest)

```bash
cd /app
bash QUICK_START.sh
```

Follow the prompts! ✨

### Option B: Manual Commands

```bash
cd /app

# Stage changes
git add .

# Commit
git commit -m "Phase 1: Stabilize dependencies for APK build"

# Add remote (replace with your GitHub URL)
git remote add origin https://github.com/YOUR_USERNAME/gopos-app.git

# Push
git push -u origin main
```

**Need to create GitHub repo?** 
→ Go to https://github.com/new

---

## 📋 Part 2: EAS Build (15-20 minutes)

### Step 1: Login to EAS

```bash
cd /app/frontend
eas login
```

**Credentials:**
- Username: `mhk2913`
- Password: `haizkia1311`

### Step 2: Start Build

```bash
eas build --platform android --profile preview-apk
```

### Step 3: Wait & Download

- ⏱️ Wait 15-20 minutes
- 📥 Download APK from provided link
- ✅ Done!

---

## 📋 Part 3: Install APK (1 minute)

1. Transfer APK to Android device
2. Tap to install
3. Allow "Unknown Sources" if prompted
4. Launch GoPos app
5. Login with: `8889999` / `123456`

---

## 🔍 Need More Details?

📚 **Full Documentation:**
- `/app/DEPLOYMENT_GUIDE.md` - Complete step-by-step guide
- `/app/BUILD_INSTRUCTIONS.md` - Build configuration details
- `/app/COMMIT_SUMMARY.md` - What changed in this release

---

## 🆘 Quick Troubleshooting

### "Not logged in to EAS"
```bash
eas login
```

### "Build failed"
- Check logs at build URL
- Try: `eas build --platform android --profile preview-apk --clear-cache`

### "APK won't install"
- Enable "Unknown Sources" in Android settings
- Uninstall old version first

---

## 📞 Support

**Documentation:** All guides in `/app/` folder
**Expo Docs:** https://docs.expo.dev/build/introduction/

---

**✅ Ready? Run `bash QUICK_START.sh` to begin!**
