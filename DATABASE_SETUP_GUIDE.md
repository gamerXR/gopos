# 🗄️ GoPos Database & Deployment Setup Guide

## ✅ Current Status

### Database (MongoDB Atlas): **WORKING** ✓
- **Connection String:** `gopos.dacnaps.mongodb.net/gopos_db`
- **Users Created:** 3 users exist in database
- **Super Admin:** Phone: `6737165617`, Password: `448613`
- **Staff Demo:** Phone: `8889999`, Password: `123456`
- **Client:** Phone: `8885555`

### Backend API: **NEEDS DEPLOYMENT URL**
- Currently configured: `https://resto-orders-21.preview.emergentagent.com`
- MongoDB connection: ✅ Working
- Auto-initialization: ✅ Creates users on startup

---

## 🔧 The Problem

Your **APK is hardcoded** to connect to:
```
https://resto-orders-21.preview.emergentagent.com/api
```

But your **actual deployed backend** might be at a different URL.

---

## 🎯 Solution Options

### Option 1: Use the Preview URL (Easiest)

**If your backend is deployed at the preview URL:**

1. **Verify backend is accessible:**
   ```bash
   curl https://resto-orders-21.preview.emergentagent.com/api/
   ```
   Should return: `{"message":"F&B POS API"}`

2. **Test login endpoint:**
   ```bash
   curl -X POST https://resto-orders-21.preview.emergentagent.com/api/login \
   -H "Content-Type: application/json" \
   -d '{"phone":"6737165617","password":"448613"}'
   ```
   Should return a JWT token

3. **If working:** Your APK should work! Just install and login.

---

### Option 2: Update Backend URL & Rebuild APK

**If you have a different deployment URL:**

1. **Update `frontend/.env`:**
   ```bash
   EXPO_PUBLIC_BACKEND_URL=https://YOUR-ACTUAL-DOMAIN.com
   EXPO_PUBLIC_API_URL=https://YOUR-ACTUAL-DOMAIN.com/api
   ```

2. **Update `frontend/app.config.js` line 51-52:**
   ```javascript
   backendUrl: 'https://YOUR-ACTUAL-DOMAIN.com',
   apiUrl: 'https://YOUR-ACTUAL-DOMAIN.com/api'
   ```

3. **Rebuild APK:**
   ```bash
   cd /app/frontend
   eas build --platform android --profile preview-apk --clear-cache
   ```

4. **Install new APK** on your device

---

### Option 3: Deploy Backend to Emergent (Native Deployment)

**If using Emergent's native deployment:**

1. **Check your deployment URL:**
   - Go to Emergent dashboard
   - Find your deployed backend URL
   - Should be something like: `https://YOUR-PROJECT.preview.emergentagent.com`

2. **Update frontend to use that URL** (see Option 2 steps)

3. **Rebuild APK**

---

## 🧪 Testing Deployed Backend

### Test 1: Backend Health
```bash
curl https://YOUR-BACKEND-URL/api/
```
**Expected:** `{"message":"F&B POS API"}`

### Test 2: MongoDB Connection
Check backend logs for:
```
✅ Successfully connected to MongoDB: gopos_db
```

### Test 3: Login
```bash
curl -X POST https://YOUR-BACKEND-URL/api/login \
-H "Content-Type: application/json" \
-d '{"phone":"6737165617","password":"448613"}'
```
**Expected:** JSON with token

### Test 4: Categories (with token)
```bash
curl https://YOUR-BACKEND-URL/api/categories \
-H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## 📱 APK Configuration Details

### Current APK Settings:
- **Backend URL:** `https://resto-orders-21.preview.emergentagent.com`
- **API Endpoint:** `https://resto-orders-21.preview.emergentagent.com/api`
- **Package Name:** `com.gopos.app`
- **Version:** 1.0.0

### Login Credentials:
```
Super Admin:
  Phone: 6737165617
  Password: 448613

Staff Demo:
  Phone: 8889999
  Password: 123456
```

---

## 🔒 MongoDB Atlas Details

### Connection String:
```
mongodb+srv://gopos_admin:haizkia13@gopos.dacnaps.mongodb.net/gopos_db?retryWrites=true&w=majority&appName=gopos
```

### Database Name: `gopos_db`

### Collections:
- `users` - User accounts (3 users)
- `categories` - Item categories
- `items` - Menu items
- `modifiers` - Item modifiers
- `orders` - Sales orders
- Client-specific collections (dynamically created)

---

## 🚨 Troubleshooting

### Issue: Can't login on APK

**Check 1:** Verify backend URL
```bash
curl https://resto-orders-21.preview.emergentagent.com/api/
```

**Check 2:** Check backend logs
```bash
# If using Emergent deployment, check deployment logs
# Look for MongoDB connection success
```

**Check 3:** Test from Postman/Browser
Open: `https://resto-orders-21.preview.emergentagent.com/api/`

**Solution:** If URL doesn't work, update APK with correct URL (Option 2)

---

### Issue: Backend not responding

**Possible causes:**
1. Backend not deployed
2. Wrong URL in APK
3. CORS issue
4. MongoDB connection failed

**Solution:**
1. Deploy backend to correct URL
2. Verify MongoDB Atlas connection
3. Rebuild APK with correct URL

---

### Issue: Database empty after deployment

**This shouldn't happen!** Backend auto-creates users on startup.

**If it does:**
Run this Python script on your backend server:
```python
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import bcrypt
from datetime import datetime

async def create_users():
    mongo_url = "YOUR_MONGO_URL_HERE"
    client = AsyncIOMotorClient(mongo_url)
    db = client['gopos_db']
    
    # Check if super admin exists
    existing = await db.users.find_one({"phone": "6737165617"})
    if not existing:
        super_admin = {
            "phone": "6737165617",
            "password": bcrypt.hashpw("448613".encode(), bcrypt.gensalt()).decode(),
            "role": "super_admin",
            "name": "Super Admin",
            "company_name": "Super Admin",
            "created_at": datetime.utcnow()
        }
        await db.users.insert_one(super_admin)
        print("✅ Super admin created")
    
    # Check if staff exists
    existing = await db.users.find_one({"phone": "8889999"})
    if not existing:
        staff = {
            "phone": "8889999",
            "password": bcrypt.hashpw("123456".encode(), bcrypt.gensalt()).decode(),
            "role": "staff",
            "name": "Staff User",
            "company_name": "Demo Company",
            "created_at": datetime.utcnow()
        }
        await db.users.insert_one(staff)
        print("✅ Staff user created")
    
    client.close()

asyncio.run(create_users())
```

---

## ✅ Quick Checklist

**Before installing APK:**
- [ ] Backend deployed and accessible
- [ ] MongoDB Atlas connected
- [ ] Test backend URL in browser/Postman
- [ ] Verify users exist in database
- [ ] APK built with correct backend URL

**After installing APK:**
- [ ] App opens successfully
- [ ] Login page loads
- [ ] Can login with: 6737165617 / 448613
- [ ] Dashboard loads with categories
- [ ] Can create orders

---

## 🆘 Need Help?

1. **Check what URL your APK is using:**
   - It's hardcoded in `app.config.js` during build
   - Current: `https://resto-orders-21.preview.emergentagent.com/api`

2. **Verify that URL works:**
   ```bash
   curl https://resto-orders-21.preview.emergentagent.com/api/
   ```

3. **If URL doesn't work:**
   - Find your actual deployment URL
   - Update `app.config.js`
   - Rebuild APK

4. **Database is fine!** 
   - MongoDB Atlas is working
   - Users already exist
   - Problem is APK → Backend connection

---

**Next Step: Tell me your actual deployed backend URL, and I'll help you configure the APK correctly!**
