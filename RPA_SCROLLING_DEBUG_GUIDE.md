# 🐛 RPA SCROLLING DEBUG GUIDE

## ✅ What's Already Working:
- ✅ RPA Extension loading code exists (chrome139-runtime.js line 368-373)
- ✅ Script injection code is correct (main.js createRPAScriptExtension)
- ✅ URL matching logic REMOVED (script runs on all pages)
- ✅ IIFE wrapper REMOVED (timers work now)

---

## 🔍 STEP-BY-STEP DEBUGGING:

### STEP 1: Check if Extension is Being Created

```bash
# Open this folder:
C:\Users\sriva\AppData\Local\BeastBrowser\ChromeProfiles\[PROFILE_ID]\BeastRPAExtension

# Should contain:
- manifest.json
- rpa-script.js
```

**Check files exist:**
```powershell
dir "$env:USERPROFILE\AppData\Local\BeastBrowser\ChromeProfiles\" /s /b | findstr "BeastRPAExtension"
```

---

### STEP 2: Verify Extension Files Content

Open: `BeastRPAExtension\manifest.json`
```json
{
  "manifest_version": 3,
  "name": "Beast Browser RPA Automation",
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["rpa-script.js"],
      "run_at": "document_idle",
      "world": "MAIN"
    }
  ]
}
```

Open: `BeastRPAExtension\rpa-script.js`
```javascript
// Should contain your scroll script
// WITHOUT any IIFE wrapper
// WITHOUT any URL checking
```

---

### STEP 3: Test with ULTRA SIMPLE Script

1. **Go to RPA tab**
2. **Click "New Script"**
3. **Name:** `Test Alert`
4. **Code:** Copy from `TEST_RPA_SCRIPT.js` file:

```javascript
console.log('==========================================');
console.log('✅ TEST SCRIPT LOADED!');
console.log('==========================================');

alert('🎉 RPA Extension is WORKING!');

console.log('📍 Current URL:', window.location.href);
console.log('📏 Page height:', document.body.scrollHeight);

document.body.style.backgroundColor = 'lightgreen';
console.log('✅ Changed background to GREEN');

setTimeout(function() {
    console.log('🚀 Starting SCROLL test...');
    window.scrollTo(0, 500);
    console.log('📍 Scrolled to 500px');
    
    setTimeout(function() {
        window.scrollTo(0, 0);
        console.log('📍 Scrolled back to top');
    }, 2000);
}, 2000);

console.log('✅ ALL TESTS INITIATED!');
```

4. **Save script**
5. **Go to Profiles tab**
6. **Select ANY profile**
7. **Set Starting URL:** `https://example.com`
8. **Click "Execute RPA"**
9. **Select "Test Alert" script**
10. **Click "Run Script"**

---

### STEP 4: Watch Console Output

When profile opens, **immediately press F12**:

#### ✅ **Expected Console Output:**
```
🤖 Beast RPA Extension Loaded
📍 Current URL: https://example.com
🎯 Script Name: Test Alert
🚀 Starting RPA automation...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
==========================================
✅ TEST SCRIPT LOADED!
==========================================
[ALERT POPUP appears]
📍 Current URL: https://example.com
📏 Page height: 1234
✅ Changed background to GREEN
✅ ALL TESTS INITIATED!
🚀 Starting SCROLL test...
📍 Scrolled to 500px
📍 Scrolled back to top
```

#### ❌ **If You See NOTHING:**
Extension is NOT loading!

---

## 🔧 TROUBLESHOOTING:

### Problem 1: Extension NOT Loading

**Symptoms:**
- No console logs
- No alert popup
- Extension folder doesn't exist

**Solutions:**
1. **Delete old extension:**
```powershell
Remove-Item "$env:USERPROFILE\AppData\Local\BeastBrowser\ChromeProfiles\*\BeastRPAExtension" -Recurse -Force
```

2. **Restart app:**
```bash
npm run electron-dev
```

3. **Try again with "Test Alert" script**

---

### Problem 2: Extension Loads but Script Doesn't Run

**Symptoms:**
- See "🤖 Beast RPA Extension Loaded" in console
- BUT no "TEST SCRIPT LOADED" message
- No alert

**Solution:**
Script content is empty or broken!

1. **Check localStorage:**
```javascript
// In app DevTools (Ctrl+Shift+I)
localStorage.getItem('antidetect_rpa_scripts')
```

2. **Should show array with your scripts**
3. **Check if scriptContent field has actual code**

---

### Problem 3: Script Runs but Scroll Doesn't Work

**Symptoms:**
- Console shows all logs
- Alert appears
- Background turns green
- BUT page doesn't scroll

**Solutions:**

1. **Try different URL:**
   - Some sites block programmatic scrolling
   - Try: `https://example.com`, `https://wikipedia.org`, `https://github.com`

2. **Check if page is scrollable:**
```javascript
console.log('Body height:', document.body.scrollHeight);
console.log('Window height:', window.innerHeight);
console.log('Can scroll?', document.body.scrollHeight > window.innerHeight);
```

3. **Force scroll with multiple methods:**
```javascript
// Try all at once
document.documentElement.scrollTop = 500;
document.body.scrollTop = 500;
window.scrollTo(0, 500);
window.scrollBy(0, 500);
```

---

### Problem 4: Profile Already Running Error

**Symptoms:**
- Error: "Profile already running"
- Script doesn't update

**Solution:**
1. **Go to Profiles tab**
2. **Find your profile**
3. **Click "Close"**
4. **Wait 2 seconds**
5. **Try Execute RPA again**

---

## 🎯 GUARANTEED WORKING SCRIPT:

Use this **SUPER SIMPLE** scroll script:

```javascript
// Wait 1 second for page to load
setTimeout(function() {
    console.log('🚀 SCROLL TEST STARTING!');
    
    // Scroll down 500px
    window.scrollTo(0, 500);
    console.log('✅ Scrolled to 500px');
    
}, 1000);
```

If this **doesn't work**, then problem is NOT with script - it's with:
1. Extension not loading
2. Page blocking scripts
3. Page not scrollable

---

## 🔍 ELECTRON LOGS:

Check Electron console for extension loading:

```
✅ RPA extension created at: C:\Users\...\BeastRPAExtension
✅ Script will execute when profile opens
✅ RPA EXTENSION FOUND AND WILL BE LOADED: C:\Users\...\BeastRPAExtension
✅ Loading 3 extension(s)
```

If you DON'T see "RPA EXTENSION FOUND", extension wasn't created!

---

## 🎯 FINAL CHECKLIST:

- [ ] Extension folder exists in profile directory
- [ ] manifest.json and rpa-script.js files exist
- [ ] rpa-script.js contains your code (not empty)
- [ ] Profile is CLOSED before running RPA
- [ ] Starting URL is set in profile
- [ ] Console shows "Beast RPA Extension Loaded"
- [ ] Console shows your script logs
- [ ] Alert popup appears (if using test script)
- [ ] Page background changes color (if using test script)
- [ ] Page actually scrolls

---

## 📞 QUICK FIX:

```bash
# 1. Stop app
# 2. Clear all RPA extensions
Remove-Item "$env:USERPROFILE\AppData\Local\BeastBrowser\ChromeProfiles\*\BeastRPAExtension" -Recurse -Force

# 3. Restart app
npm run electron-dev

# 4. Create new "Test Alert" script with TEST_RPA_SCRIPT.js code
# 5. Run on closed profile with Starting URL = https://example.com
# 6. Press F12 immediately when browser opens
# 7. Watch console - should see alert and logs
```

---

**If NONE of this works, screenshot ka console aur Electron logs bhejo!** 📸
