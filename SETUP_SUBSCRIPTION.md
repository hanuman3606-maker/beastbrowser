# 🚀 QUICK SETUP - SUBSCRIPTION VALIDATION

## ✅ **3 SIMPLE STEPS**

---

## **STEP 1: Install axios**

```bash
cd "C:\Users\sriva\Downloads\Telegram Desktop\new version\beastbrowser-main"
npm install axios
```

---

## **STEP 2: Create .env file**

**Create:** `.env` in root folder

**Add this line:**
```
SUPABASE_API_URL=http://localhost:3001
```

**For production (after deploying website):**
```
SUPABASE_API_URL=https://your-website.com
```

---

## **STEP 3: Update App.tsx**

**File:** `src/App.tsx`

**Find:**
```tsx
function App() {
  return (
    <AuthProvider>
      <div className="App">
        {/* Your content */}
      </div>
    </AuthProvider>
  )
}
```

**Replace with:**
```tsx
import { SubscriptionGuard } from './components/auth/SubscriptionGuard'
import { useSupabaseAuth } from './hooks/useSupabaseAuth'

function App() {
  const { user } = useSupabaseAuth()
  
  return (
    <AuthProvider>
      <SubscriptionGuard userEmail={user?.email || null}>
        <div className="App">
          {/* Your content */}
        </div>
      </SubscriptionGuard>
    </AuthProvider>
  )
}
```

---

## **THAT'S IT!** ✅

### **Test Now:**

```bash
npm run electron-dev
```

### **Expected:**

1. ✅ App starts
2. ✅ Checks subscription via Supabase
3. ✅ If valid → App loads
4. ❌ If invalid → Shows "Purchase Subscription" screen

---

## 🧪 **TESTING:**

### **Test Case 1: Valid Subscription**
```
1. Login with email that has active subscription in Supabase
2. App loads normally ✅
3. Green banner: "Plan Active • X days remaining"
```

### **Test Case 2: No Subscription**
```
1. Login with email WITHOUT subscription
2. Red error screen appears ❌
3. "Purchase Subscription" button shown
4. App blocked
```

### **Test Case 3: Expired Subscription (24hr plan)**
```
1. Starter Plan purchased (24 hours)
2. After 24 hours → App blocks access
3. Must purchase again
```

---

## 📁 **FILES CHECKLIST:**

```
✅ electron/subscription-validator.js     (Created)
✅ src/components/auth/SubscriptionGuard.tsx  (Created)
✅ electron/main.js                       (Updated - IPC handlers)
✅ electron/preload.js                    (Updated - API methods)
✅ .env                                   (YOU CREATE THIS!)
✅ src/App.tsx                            (YOU UPDATE THIS!)
```

---

## 🎯 **QUICK REFERENCE:**

### **Check subscription manually:**
```tsx
// In any component:
const status = await window.electronAPI.validateSubscription('user@example.com')
console.log(status)
```

### **Clear cache:**
```tsx
await window.electronAPI.clearSubscriptionCache()
```

### **Get details:**
```tsx
const details = await window.electronAPI.getSubscriptionDetails('user@example.com')
console.log(details)
```

---

## 🚀 **BUILD FOR PRODUCTION:**

### **Before building:**

1. Update `.env`:
```
SUPABASE_API_URL=https://your-actual-website.com
```

2. Build:
```bash
npm run build:win
```

3. Test installer:
```
build-output/BeastBrowser-Setup-2.0.3.exe
```

---

## ✅ **DONE!**

**Ab tumhara app:**
- ✅ Supabase se subscription validate karega
- ✅ 1-day plan ko 24hr baad expire karega
- ✅ Monthly/Yearly plans ko sahi time pe expire karega
- ✅ Beautiful UI dikhayega
- ✅ Secure server-side validation!

**Test karo aur enjoy!** 🎉
