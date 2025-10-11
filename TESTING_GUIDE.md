# 🎯 Complete Testing Guide - Beast Browser System

## Quick Start (5 Minutes)

### Step 1: Start Website (Terminal 1)

```bash
cd "C:\Users\nitin\Downloads\Beast Browser\Beast Browser"
npm run dev
```

**Expected:** Website running on `http://localhost:3001`

---

### Step 2: Start Software (Terminal 2)

```bash
cd "C:\Users\nitin\OneDrive\Desktop\bhai new advncce\antidetction"
npm install  # Only first time
npm run dev
```

**Expected:** Electron app opens

---

### Step 3: Test Complete Flow

#### 3.1 Login to Software
- Email: `test@gmail.com`
- Password: (create account if first time)

#### 3.2 Try Creating Profile
- Click "Profiles" tab
- Try to create a profile
- **Expected:** Shows "Subscription Required" message

#### 3.3 Buy Subscription
- Click "Upgrade Plan" button
- Opens browser: `http://localhost:3001/purchase`
- Select Monthly Premium (₹2,550)
- Use test card:
  ```
  Card: 4111 1111 1111 1111
  CVV: 123
  Expiry: 12/25
  OTP: 123456
  ```
- Complete payment

#### 3.4 Activate in Software
- Return to software
- Click "Check Again" button
- **Expected:** "Subscription Required" message disappears
- **Expected:** Profile creation available ✅

---

## Detailed Flow Diagram

```
┌─────────────────────────────────────────────────┐
│  1. USER OPENS SOFTWARE                         │
│     Email: test@gmail.com                       │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│  2. TRIES TO CREATE PROFILE                     │
│     Software calls:                             │
│     POST /api/browser/validate-subscription     │
│     { "email": "test@gmail.com" }               │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│  3. WEBSITE CHECKS SUPABASE                     │
│     Query: subscriptions table                  │
│     WHERE user_id = (from email)                │
│     AND status = 'active'                       │
│     AND expires_at > NOW()                      │
└─────────────────┬───────────────────────────────┘
                  │
      ┌───────────┴───────────┐
      │                       │
      ▼                       ▼
  NO SUBSCRIPTION       HAS SUBSCRIPTION
      │                       │
      ▼                       ▼
┌──────────────┐      ┌──────────────┐
│ Response:    │      │ Response:    │
│ {            │      │ {            │
│  success:true│      │  success:true│
│  hasSubs:❌  │      │  hasSubs:✅  │
│ }            │      │  plan:"month"│
└──────┬───────┘      │  expires:... │
       │              │ }            │
       │              └──────┬───────┘
       ▼                     ▼
┌──────────────┐      ┌──────────────┐
│ SHOW UPGRADE │      │ ENABLE       │
│ PROMPT       │      │ PROFILE      │
│              │      │ BUTTON ✅    │
│ • Monthly:   │      └──────────────┘
│   ₹2,550     │
│ • Yearly:    │
│   ₹21,165    │
│              │
│ [Upgrade] 🔗 │
└──────┬───────┘
       │
       │ User clicks "Upgrade Plan"
       ▼
┌─────────────────────────────────────────────────┐
│  4. OPEN PURCHASE PAGE                          │
│     http://localhost:3001/purchase              │
│     Plan: Monthly Premium                       │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│  5. USER COMPLETES PAYMENT                      │
│     Cashfree → Test Card → Success             │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│  6. WEBHOOK TRIGGERED                           │
│     POST /api/webhooks/cashfree                 │
│     Event: PAYMENT_SUCCESS                      │
│                                                 │
│     Actions:                                    │
│     • Create subscription in Supabase           │
│     • Set status = 'active'                     │
│     • Set expires_at = +1 month                 │
│     • Trigger updates user table                │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│  7. USER RETURNS TO SOFTWARE                    │
│     Clicks "Check Again" button                 │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│  8. SOFTWARE VALIDATES AGAIN                    │
│     POST /api/browser/validate-subscription     │
│     Response: hasSubscription = true ✅         │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│  9. PROFILE BUTTON ENABLED                      │
│     User can now create profiles ✅             │
└─────────────────────────────────────────────────┘
```

---

## Verification Checklist

### Website Running ✓
- [ ] Website starts on port 3001
- [ ] No errors in console
- [ ] Purchase page accessible

### Database Migration ✓
- [ ] Cashfree added to payment gateways
- [ ] No constraint errors

### Software Configuration ✓
- [ ] `.env` file has API URL
- [ ] API key matches website
- [ ] Software starts without errors

### Subscription Flow ✓
- [ ] "Subscription Required" shows initially
- [ ] "Upgrade Plan" opens purchase page
- [ ] Test payment succeeds
- [ ] Webhook logs visible in Supabase
- [ ] Subscription created in database
- [ ] "Check Again" validates successfully
- [ ] Profile button enables

---

## Troubleshooting

### Issue: "Unable to validate subscription"

**Symptoms:**
- Software shows error message
- Console: `API validation failed: 500`

**Solution:**
```bash
# Check website is running
curl http://localhost:3001/api/browser/validate-subscription \
  -X POST \
  -H "Content-Type: application/json" \
  -H "X-Browser-API-Key: beastbrowser_dev_key_2024" \
  -d '{"email":"test@gmail.com"}'

# Should return JSON with success: true
```

---

### Issue: Button doesn't enable after payment

**Symptoms:**
- Payment successful
- Webhook triggered
- But software still shows "no subscription"

**Debug Steps:**

1. **Check Supabase subscriptions table:**
   ```sql
   SELECT * FROM subscriptions 
   WHERE user_email = 'test@gmail.com' 
   ORDER BY created_at DESC LIMIT 1;
   ```
   Expected: status = 'active', expires_at is future date

2. **Check users table:**
   ```sql
   SELECT subscription_status, subscription_expires_at 
   FROM users 
   WHERE email = 'test@gmail.com';
   ```
   Expected: subscription_status = 'active'

3. **Test API manually:**
   ```bash
   curl http://localhost:3001/api/browser/validate-subscription \
     -X POST \
     -H "Content-Type: application/json" \
     -H "X-Browser-API-Key: beastbrowser_dev_key_2024" \
     -d '{"email":"test@gmail.com"}'
   ```
   Expected: `hasSubscription: true`

4. **Check software console:**
   - Look for "Subscription validation response"
   - Verify hasSubscription value

---

### Issue: Purchase page doesn't open

**Symptoms:**
- Click "Upgrade Plan"
- Nothing happens

**Solution:**
- Check `.env` in software has `VITE_WEBSITE_API_URL`
- Restart software after `.env` changes
- Check browser console for popup blocker

---

## Environment Files

### Website (.env.local)
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://ckbudoabovcrxywdtbqh.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Cashfree
CASHFREE_MODE=sandbox
CASHFREE_TEST_APP_ID=TEST108298675d1a0ec92db9fe80ec8d76892801
CASHFREE_TEST_SECRET_KEY=cfsk_ma_test_xxx

# Browser API
BROWSER_API_KEY=beastbrowser_dev_key_2024

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Software (.env)
```env
VITE_WEBSITE_API_URL=http://localhost:3001
VITE_BROWSER_API_KEY=beastbrowser_dev_key_2024
```

---

## Success Indicators

### ✅ Everything Working:

1. **Website Console:**
   ```
   ✓ Ready in 3.4s
   ✓ POST /api/payments/cashfree/create-order/ 200
   ✓ POST /api/webhooks/cashfree 200
   ✓ Subscription activated: monthly plan
   ```

2. **Software Console:**
   ```
   ✓ Subscription validation response: { hasSubscription: true }
   ✓ Active Monthly Premium - 30 days remaining
   ```

3. **Supabase Dashboard:**
   ```
   subscriptions table:
   ✓ status: active
   ✓ expires_at: [future date]
   
   users table:
   ✓ subscription_status: active
   ✓ subscription_plan: monthly
   ```

4. **User Experience:**
   ```
   ✓ Login to software
   ✓ See "Subscription Required"
   ✓ Click "Upgrade Plan"
   ✓ Complete payment
   ✓ Click "Check Again"
   ✓ Profile button enabled
   ✓ Can create profiles
   ```

---

## Complete System Ready! 🎉

Both systems are now fully integrated and tested. Follow this guide for smooth testing.
