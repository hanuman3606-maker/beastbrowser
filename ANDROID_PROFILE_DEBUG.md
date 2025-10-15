# 🐛 Android Profile Launch Bug - Debug Guide

## Problem

**Android/iOS profile create kar rahe ho but Chromium browser launch ho raha hai instead of Playwright!**

```
Expected: Android profile → Playwright browser ✅
Actual: Android profile → Chromium browser ❌
```

---

## Added Debug Logging

**File:** `main.js` - `openAntiBrowser()` function

Ab jab profile launch karoge, terminal me **detailed logs** dikhenge:

```
🔍 ============ openAntiBrowser DEBUG ============
🔍 profile.id: abc-123
🔍 profile.name: Test Android
🔍 profile.platform (RAW): ???
🔍 profile.platform type: ???
🔍 Full profile object: {...}
🔍 platform (processed): ???
🔍 platform === "android": false/true
🔍 platform === "ios": false/true
🔍 isMobilePlatform: false/true
✅ Playwright Mobile Launch selected OR Chrome 139 Launch selected
```

---

## 🚀 HOW TO DEBUG:

### Step 1: Restart App
```bash
npm run electron-dev
```

### Step 2: Create Android Profile
1. Click "Create Profile"
2. Name: "Test Android"
3. Platform: **Android** (important!)
4. Click "Create"

### Step 3: Launch Profile
1. Click "Launch" on the Android profile
2. **IMMEDIATELY check terminal logs**
3. Look for the DEBUG section

### Step 4: Share Logs

**Copy these lines from terminal:**
```
🔍 profile.platform (RAW): ???
🔍 platform (processed): ???
🔍 isMobilePlatform: ???
✅ [Which browser was selected]
```

---

## Possible Issues

### Issue 1: Platform Not Saved ❌
```
🔍 profile.platform (RAW): undefined
🔍 platform (processed): ""
🔍 isMobilePlatform: false
✅ Chrome 139 Launch selected
```

**Cause:** Profile create hote time platform field save nahi hua!

**Fix:** Profile creation code check karna hoga.

### Issue 2: Wrong Platform Value ❌
```
🔍 profile.platform (RAW): "Android" (capital A!)
🔍 platform (processed): "android"
🔍 isMobilePlatform: true
✅ Playwright Mobile Launch selected
```

**But still opens Chromium?** → Playwright launch failing, falling back to Chrome.

### Issue 3: Platform Correct but Chromium Opens ❌
```
🔍 profile.platform (RAW): "android"
🔍 platform (processed): "android"
🔍 isMobilePlatform: true
✅ Playwright Mobile Launch selected
```

**But Chromium opens?** → Playwright has error, check for error logs after this.

---

## Expected Correct Flow

### For Android Profile:
```
🔍 ============ openAntiBrowser DEBUG ============
🔍 profile.id: android-profile-123
🔍 profile.name: My Android
🔍 profile.platform (RAW): "android"
🔍 profile.platform type: string
🔍 platform (processed): "android"
🔍 platform === "android": true
🔍 platform === "ios": false
🔍 isMobilePlatform: true
✅ Playwright Mobile Launch selected for profile: android-profile-123 (ANDROID)
```

Then should see Playwright launch logs.

### For iOS Profile:
```
🔍 profile.platform (RAW): "ios"
🔍 platform (processed): "ios"
🔍 platform === "android": false
🔍 platform === "ios": true
🔍 isMobilePlatform: true
✅ Playwright Mobile Launch selected for profile: ios-profile-123 (IOS)
```

### For Windows Profile:
```
🔍 profile.platform (RAW): "windows"
🔍 platform (processed): "windows"
🔍 isMobilePlatform: false
✅ Chrome 139 Launch selected for profile: win-profile-123 (platform: windows)
```

---

## Quick Test Commands

### Test Profile Creation:
```javascript
// In browser DevTools console:
localStorage.getItem('profiles') // Check if profiles saved
```

### Test Platform Value:
After creating Android profile, check what platform value is stored.

---

## What to Check

### 1. Profile Creation UI
```
File: src/components/profiles/ProfileManager.tsx

Check:
- Is platform dropdown working?
- Is selected platform being passed to createProfile()?
- Console log before createProfile() call
```

### 2. Storage Service
```
File: src/services/beastBrowserService.ts

Check:
- createProfile() receives platform parameter?
- Platform is in request body?
```

### 3. Electron Storage
```
File: electron/main.js

Check:
- storage-set handler saves profile with platform?
- storage-get handler returns platform field?
```

---

## Temporary Workaround

If platform not saving, manually set it:

```javascript
// In openAntiBrowser function, before platform check:
if (!profile.platform && profile.name.toLowerCase().includes('android')) {
  profile.platform = 'android';
  console.log('⚠️ Manually set platform to android');
}
if (!profile.platform && profile.name.toLowerCase().includes('ios')) {
  profile.platform = 'ios';
  console.log('⚠️ Manually set platform to ios');
}
```

---

## Next Steps

1. ✅ **Debug logs added** - Restart app
2. ⏳ **Create Android profile** - Check terminal
3. ⏳ **Share logs** - So we can see what's wrong
4. ⏳ **Fix based on logs** - Will add proper fix

---

## Common Scenarios

### Scenario A: Platform is undefined
```
Problem: Profile creation not saving platform
Fix: Check profile creation form/service
```

### Scenario B: Platform is wrong case
```
Problem: "Android" vs "android"
Fix: Already handled with .toLowerCase()
```

### Scenario C: Platform correct but Playwright fails
```
Problem: Playwright error during launch
Fix: Check Playwright error logs
```

---

## Files Involved

| File | Responsibility |
|------|----------------|
| `src/components/profiles/ProfileManager.tsx` | Profile creation UI |
| `src/services/beastBrowserService.ts` | API calls |
| `electron/main.js` | Storage + Launch logic |
| `electron/playwright-mobile-launcher.js` | Playwright launch |

---

## Restart Required

```bash
npm run electron-dev
```

**NOT `npm run build`** - that doesn't apply Electron changes!

---

**AB RESTART KARO AUR ANDROID PROFILE LAUNCH KARKE LOGS SHARE KARO!** 🚀

Then we'll see exactly what's wrong! 🔍
