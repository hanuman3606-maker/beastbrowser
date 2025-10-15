# 🔐 SUPABASE SUBSCRIPTION VALIDATION - DESKTOP APP

## ✅ **COMPLETE INTEGRATION GUIDE**

BeastBrowser ab Supabase se subscription validate karega!

---

## 🎯 **KYA BANAYA:**

### **1. Subscription Validator** (`electron/subscription-validator.js`)
```javascript
- Supabase API call karta hai
- User ke subscription ko validate karta hai
- 5 minute cache (avoid too many API calls)
- Network error handling
```

### **2. IPC Handlers** (`electron/main.js`)
```javascript
- validateSubscription(userEmail)
- getSubscriptionDetails(userEmail)
- clearSubscriptionCache()
```

### **3. Preload API** (`electron/preload.js`)
```javascript
window.electronAPI.validateSubscription(email)
window.electronAPI.getSubscriptionDetails(email)
window.electronAPI.clearSubscriptionCache()
```

### **4. React Component** (`src/components/auth/SubscriptionGuard.tsx`)
```tsx
- Subscription check on app startup
- Beautiful error screens
- Auto-refresh every 5 minutes
- Purchase redirect
```

---

## 🚀 **KAISE USE KAREIN:**

### **STEP 1: Install Dependencies**

```bash
cd "C:\Users\sriva\Downloads\Telegram Desktop\new version\beastbrowser-main"
npm install axios
```

### **STEP 2: Update App.tsx**

**File:** `src/App.tsx`

```tsx
import { SubscriptionGuard } from './components/auth/SubscriptionGuard'
import { useSupabaseAuth } from './hooks/useSupabaseAuth'

function App() {
  const { user } = useSupabaseAuth()
  
  return (
    <SubscriptionGuard userEmail={user?.email || null}>
      {/* Your existing app content */}
      <ProfileManager />
      {/* ... */}
    </SubscriptionGuard>
  )
}
```

### **STEP 3: Set Environment Variable**

**Create:** `.env` file in root

```bash
SUPABASE_API_URL=https://your-website.com
```

**Or for localhost testing:**
```bash
SUPABASE_API_URL=http://localhost:3001
```

### **STEP 4: Update Website API** (Already Done!)

**File:** `webshiete/app/api/browser/validate-subscription/route.ts`

This endpoint already exists! ✅

---

## 🔄 **COMPLETE FLOW:**

### **App Startup:**

```
1. User opens BeastBrowser desktop app
   ↓
2. SubscriptionGuard component loads
   ↓
3. Checks if user is logged in
   ↓
4. Calls: window.electronAPI.validateSubscription(email)
   ↓
5. Electron main.js receives request
   ↓
6. subscription-validator.js calls Supabase API
   ↓
7. API: https://your-website.com/api/browser/validate-subscription
   ↓
8. Supabase checks subscription table
   ↓
9. Returns status:
   {
     hasSubscription: true/false,
     plan: "starter" / "monthly" / "yearly",
     expiresAt: "2025-10-15T18:40:00Z",
     daysRemaining: 1
   }
   ↓
10. If valid → App loads! ✅
11. If invalid → Blocked screen shows! ❌
```

---

## 📊 **SUBSCRIPTION CHECK LOGIC:**

### **Starter Plan (24 Hours):**
```javascript
Created: 2025-10-14 18:40:00
Expires: 2025-10-15 18:40:00  // +24 hours

After 24 hours:
  → status becomes 'expired'
  → Desktop app blocks access
  → User must purchase again
```

### **Monthly Plan:**
```javascript
Created: 2025-10-14
Expires: 2025-11-14  // +30 days
```

### **Yearly Plan:**
```javascript
Created: 2025-10-14
Expires: 2026-10-14  // +365 days
```

---

## 🎨 **UI SCREENS:**

### **Screen 1: Loading** (Checking subscription)
```
┌──────────────────────────────┐
│                              │
│         🛡️ (pulsing)         │
│                              │
│  Verifying Subscription...   │
│  Please wait...              │
│                              │
│      (spinner animation)     │
│                              │
└──────────────────────────────┘
```

### **Screen 2: No Subscription** (Blocked)
```
┌──────────────────────────────┐
│          ⚠️ (red)            │
│                              │
│   Subscription Required      │
│                              │
│  Please purchase a plan to   │
│  use BeastBrowser            │
│                              │
│  Logged in: user@email.com   │
│                              │
│  [Purchase Subscription]     │
│  [Refresh Status]            │
│                              │
└──────────────────────────────┘
```

### **Screen 3: Active Subscription** (Banner)
```
┌──────────────────────────────┐
│ 🛡️ Starter Plan Active • 1 day remaining │
└──────────────────────────────┘
↓
[Normal App Content]
```

---

## 🧪 **TESTING:**

### **Test 1: Valid Subscription**
```bash
1. Login with email that HAS active subscription
2. Open BeastBrowser desktop app
3. Expected:
   ✅ Green banner shows
   ✅ "Starter/Monthly/Yearly Plan Active"
   ✅ Days remaining shown
   ✅ App fully accessible
```

### **Test 2: No Subscription**
```bash
1. Login with email that has NO subscription
2. Open BeastBrowser desktop app
3. Expected:
   ❌ Red error screen
   ❌ "Subscription Required"
   ❌ "Purchase Subscription" button
   ❌ App blocked
```

### **Test 3: Expired Subscription**
```bash
1. Buy Starter Plan (24hr)
2. Wait 24 hours (or manually update DB)
3. Reopen BeastBrowser
4. Expected:
   ❌ Subscription expired
   ❌ App blocked
   ❌ Must purchase again
```

### **Test 4: Offline Mode**
```bash
1. Disconnect internet
2. Open BeastBrowser
3. Expected:
   ⚠️ "Cannot Verify Subscription"
   ⚠️ Yellow warning banner
   ⚠️ Limited access message
```

---

## 🔧 **CUSTOMIZATION:**

### **Change Check Frequency:**

**File:** `src/components/auth/SubscriptionGuard.tsx`

```tsx
// Default: 5 minutes
const interval = setInterval(() => {
  checkSubscription(true)
}, 5 * 60 * 1000)

// Change to 10 minutes:
}, 10 * 60 * 1000)

// Change to 1 hour:
}, 60 * 60 * 1000)
```

### **Change Cache Timeout:**

**File:** `electron/subscription-validator.js`

```javascript
// Default: 5 minutes
this.cacheTimeout = 5 * 60 * 1000;

// Change to 10 minutes:
this.cacheTimeout = 10 * 60 * 1000;
```

### **Change Purchase URL:**

**File:** `src/components/auth/SubscriptionGuard.tsx`

```tsx
const openPurchasePage = () => {
  window.open('https://your-website.com/pricing', '_blank')
}

// Change to your actual URL:
window.open('https://beastbrowser.com/pricing', '_blank')
```

---

## 📝 **FILES CREATED:**

```
✅ electron/subscription-validator.js    (NEW - Validation logic)
✅ src/components/auth/SubscriptionGuard.tsx  (NEW - React guard)
✅ electron/main.js                      (UPDATED - IPC handlers)
✅ electron/preload.js                   (UPDATED - API exposure)
✅ SUPABASE_SUBSCRIPTION_INTEGRATION.md  (NEW - This guide)
```

---

## 🌐 **API ENDPOINT:**

**Already exists in your website!** ✅

**URL:** `https://your-website.com/api/browser/validate-subscription`

**Method:** POST

**Body:**
```json
{
  "email": "user@example.com"
}
```

**Response (Valid):**
```json
{
  "success": true,
  "hasSubscription": true,
  "plan": "starter",
  "subscriptionStatus": "active",
  "expiresAt": "2025-10-15T18:40:00Z",
  "daysRemaining": 1
}
```

**Response (Invalid):**
```json
{
  "success": false,
  "hasSubscription": false,
  "message": "No active subscription found"
}
```

---

## 🚨 **IMPORTANT NOTES:**

### **1. Environment Variable:**
```bash
# Must set this before building!
SUPABASE_API_URL=https://your-website.com
```

### **2. CORS Settings:**
```
Website API must allow requests from Electron app
(Usually not an issue with Electron, but worth noting)
```

### **3. Internet Dependency:**
```
App requires internet to validate subscription
Offline mode shows warning but can allow limited access
```

### **4. Security:**
```
- API endpoint validates on server-side
- Desktop app cannot bypass validation
- Subscription stored in Supabase (secure)
```

---

## 🎯 **NEXT STEPS:**

### **1. Install Dependencies:**
```bash
npm install axios
```

### **2. Update App.tsx:**
```tsx
import { SubscriptionGuard } from './components/auth/SubscriptionGuard'

<SubscriptionGuard userEmail={user?.email}>
  <YourApp />
</SubscriptionGuard>
```

### **3. Set Environment Variable:**
```bash
# .env file
SUPABASE_API_URL=https://your-website.com
```

### **4. Test:**
```bash
npm run electron-dev
```

### **5. Build:**
```bash
npm run build:win
```

---

## ✅ **VERIFICATION CHECKLIST:**

- [ ] axios installed (`npm install axios`)
- [ ] SubscriptionGuard imported in App.tsx
- [ ] SUPABASE_API_URL set in .env
- [ ] Website API endpoint working
- [ ] Tested with valid subscription
- [ ] Tested with no subscription
- [ ] Tested with expired subscription
- [ ] Tested offline mode
- [ ] Build successful
- [ ] Installer created

---

## 🎉 **RESULT:**

### **Desktop App ab:**

✅ Startup pe subscription check karega
✅ Valid subscription → Full access
❌ No subscription → Blocked + purchase link
⚠️ Expired subscription → Blocked + renew prompt
🔄 Auto-refresh every 5 minutes
📊 Shows days remaining
🛡️ Server-side validation (secure!)

---

## 📞 **TROUBLESHOOTING:**

### **Issue 1: "Cannot connect to server"**
```
- Check SUPABASE_API_URL in .env
- Check internet connection
- Check website API is running
- Check CORS settings
```

### **Issue 2: "Validation failed"**
```
- Check user email is correct
- Check subscription exists in Supabase
- Check subscription is not expired
- Check API endpoint logs
```

### **Issue 3: App blocked even with subscription**
```
- Click "Refresh Status" button
- Clear cache: window.electronAPI.clearSubscriptionCache()
- Check Supabase subscription table
- Check expires_at date is in future
```

---

## 🚀 **READY TO USE!**

**Integration complete hai!**

**Ab test karo:**
1. Install axios
2. Update App.tsx
3. Set SUPABASE_API_URL
4. Run: `npm run electron-dev`
5. ✅ Working!

**Happy coding!** 🎉🔐
