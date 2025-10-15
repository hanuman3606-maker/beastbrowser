# 🚀 FIX NOW - Copy Paste These Commands

## Step 1: Open PowerShell
```
Press Windows + X
Click "Windows PowerShell" or "Terminal"
```

## Step 2: Navigate to Project
```powershell
cd "c:\Users\sriva\Downloads\Telegram Desktop\new version\beastbrowser-main"
```

## Step 3: Clear Cache
```powershell
.\clear-cache.ps1
```

## Step 4: Restart App
```powershell
npm run electron-dev
```

---

## What Should Happen:

### In Electron Terminal:
```
🔧 Creating version spoof extension for Chrome 115
📝 Generating extension with TARGET_VERSION = 115
✅ VERSION SPOOF EXTENSION LOADED
```

### In Browser Console (F12):
```
🔧 VERSION SPOOF EXTENSION ACTIVE
🎯 Target Chrome version: 115
✅ TARGET_VERSION is valid: 115
✅ Chrome brand found with version: 115
```

### On Test Page:
```
✅ ALL TESTS PASSED!
```

---

## If PowerShell Script Blocked:

```powershell
# Run this first to allow scripts:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Then run:
.\clear-cache.ps1
```

---

## Alternative - Manual Cache Clear:

```powershell
# Delete extension caches:
Remove-Item -Path "$env:USERPROFILE\BeastBrowser\ChromeProfiles\*\BeastVersionSpoofExtension" -Recurse -Force -ErrorAction SilentlyContinue

# Check if deleted:
Get-ChildItem "$env:USERPROFILE\BeastBrowser\ChromeProfiles" -Recurse -Filter "BeastVersionSpoofExtension"

# Should show nothing
```

---

## Nuclear Option - If Nothing Works:

```powershell
# Delete ALL profiles (fresh start):
Remove-Item -Path "$env:USERPROFILE\BeastBrowser" -Recurse -Force

# Restart app:
npm run electron-dev

# Create new profile
# Launch
# Should work!
```

---

## Quick Test:

After restart, run in browser console (F12):
```javascript
console.log('Brands:', navigator.userAgentData?.brands);
// Should show: [{brand: "Chromium", version: "115"}, ...]
//                                           ↑ NOT EMPTY!
```

---

**Just Do:**
1. ✅ `.\clear-cache.ps1`
2. ✅ `npm run electron-dev`
3. ✅ Launch profile
4. ✅ Check console
5. ✅ Reload test page

**That's it!** 🎉
