# 🎯 SMOOTH SCROLLING SCRIPTS - Complete Guide

## 📦 Two Versions Available

### 1. **ULTIMATE VERSION** (`SMOOTH_SCROLL_SCRIPT.js`)
**Features:**
- ✅ Human-like behavior with random pauses
- ✅ Configurable speed, cycles, pauses
- ✅ Detailed console logging
- ✅ Multiple scrolling patterns
- ✅ Error handling
- ✅ Best for realistic automation

**Best For:** Long-running automation, realistic human behavior

### 2. **SIMPLE VERSION** (`SIMPLE_SCROLL_SCRIPT.js`)
**Features:**
- ✅ Clean, minimal code
- ✅ Fast execution
- ✅ Easy to understand
- ✅ Smooth easing animation
- ✅ 5 random scrolls

**Best For:** Quick testing, simple use cases

---

## 🚀 How to Use

### Step 1: Open RPA Dashboard
1. Launch Beast Browser
2. Go to **RPA tab**
3. Click **"Create New Script"**

### Step 2: Fill Script Details

**For Ultimate Version:**
```
Name: Smooth Scroll Ultimate
Description: Human-like scrolling with random pauses
Website URL: (leave empty to run on all sites)
Execution Time: 5 minutes
Script Type: JavaScript
Category: Automation
```

**For Simple Version:**
```
Name: Simple Smooth Scroll
Description: Quick smooth scrolling sequence
Website URL: (leave empty)
Execution Time: 2 minutes
Script Type: JavaScript
Category: Automation
```

### Step 3: Copy Script
1. Open `SMOOTH_SCROLL_SCRIPT.js` (Ultimate) or `SIMPLE_SCROLL_SCRIPT.js` (Simple)
2. **Select All** (Ctrl+A)
3. **Copy** (Ctrl+C)
4. **Paste** into "Script Content" field in RPA Dashboard

### Step 4: Save & Assign
1. Click **"Save Script"**
2. Select a profile
3. Click **"Assign Script"** or **"Execute RPA"**

### Step 5: Launch & Watch
1. Profile will launch
2. Open **DevTools** (F12)
3. Go to **Console** tab
4. Watch the magic! 🎉

---

## 🎬 What Each Script Does

### Ultimate Version Sequence:

```
🚀 Start (wait 3 seconds)
   ↓
🔄 Cycle 1:
   ⬇️ Scroll to bottom (smooth)
   ⏸️ Pause 1.5s
   ⬆️ Scroll to top (smooth)
   ⏸️ Pause 1.5s
   🎯 Scroll to middle (smooth)
   ⏸️ Pause 1.5s
   🎲 Random scroll #1
   🎲 Random scroll #2
   🎲 Random scroll #3
   🎲 Random scroll #4
   🎲 Random scroll #5
   ↓
🔄 Cycle 2: (repeat)
   ↓
🔄 Cycle 3: (repeat)
   ↓
🏁 Final: Scroll back to top
   ↓
✅ Complete!
```

### Simple Version Sequence:

```
🚀 Start (wait 3 seconds)
   ↓
⬇️ Bottom
   ↓
⬆️ Top
   ↓
🎯 Middle
   ↓
🎲 Random #1
🎲 Random #2
🎲 Random #3
🎲 Random #4
🎲 Random #5
   ↓
⬆️ Top
   ↓
✅ Complete!
```

---

## ⚙️ Customization (Ultimate Version)

### Edit Configuration:

Open the script and find this section:
```javascript
const config = {
  initialDelay: 3000,        // ← Change wait time before start
  scrollSpeed: 2,            // ← Change speed (1-10, lower = slower)
  pauseAtEnd: 1500,          // ← Change pause at top/bottom
  randomPauses: true,        // ← Enable/disable random pauses
  randomPauseChance: 0.02,   // ← 2% chance (0.01 = 1%, 0.05 = 5%)
  randomPauseMin: 500,       // ← Min random pause duration
  randomPauseMax: 2000,      // ← Max random pause duration
  cycles: 3                  // ← Number of complete cycles (1-10)
};
```

### Examples:

**Super Fast Scrolling:**
```javascript
scrollSpeed: 10,
pauseAtEnd: 500,
cycles: 1
```

**Super Slow & Human-like:**
```javascript
scrollSpeed: 1,
pauseAtEnd: 3000,
randomPauseChance: 0.05,  // More pauses
cycles: 5
```

**Quick Test:**
```javascript
initialDelay: 1000,  // 1 second
scrollSpeed: 5,
cycles: 1
```

---

## 📊 Console Output Examples

### Ultimate Version:
```
🎯 SMOOTH SCROLL: Initializing...
📍 URL: https://example.com
⏰ SMOOTH SCROLL: Starting in 3 seconds...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 SMOOTH SCROLL: Starting automation...
📏 Page height: 15000px
👁️ Viewport: 900px
📊 Max scroll: 14100px
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔄 ===== CYCLE 1/3 =====
⬇️ SCROLLING TO BOTTOM
📜 Scrolling from 0 to 14100 (14100px)
⏸️ PAUSE: Random pause for 1234ms
✅ Reached bottom
⬆️ SCROLLING TO TOP
📜 Scrolling from 14100 to 0 (14100px)
✅ Reached top
🎯 SCROLLING TO MIDDLE
📜 Scrolling from 0 to 7050 (7050px)
✅ Reached middle
🎲 Doing 4 random scrolls...
🎲 SCROLLING TO RANDOM POSITION: 3456px (24%)
✅ Reached random position
...
✅ Cycle 1 complete!

🔄 ===== CYCLE 2/3 =====
...

🏁 FINAL: Scrolling back to top...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ SMOOTH SCROLL: Automation complete!
📊 Total cycles completed: 3
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Simple Version:
```
🚀 Starting smooth scroll...
⏰ Starting in 3 seconds...
⬇️ Scrolling to bottom...
⬆️ Scrolling to top...
🎯 Scrolling to middle...
🎲 Random scroll 1: 3452px
🎲 Random scroll 2: 8901px
🎲 Random scroll 3: 1234px
🎲 Random scroll 4: 11234px
🎲 Random scroll 5: 5678px
⬆️ Back to top...
✅ Complete!
```

---

## 🐛 Troubleshooting

### Script Not Running?

1. **Check Console Logs:**
   - F12 → Console tab
   - Look for `🎯 SMOOTH SCROLL: Initializing...`
   - If missing, script didn't load

2. **Check URL Matching:**
   - Leave "Website URL" **empty** to run on all pages
   - Or specify exact domain (e.g., `example.com`)

3. **Profile Not Loading Extension:**
   - **Close profile** completely
   - **Relaunch** profile
   - Extension loads fresh

4. **JavaScript Errors:**
   - Check Console for red errors
   - Copy error and debug

### Script Stops Suddenly?

- **User Interaction:** Scripts stop if you scroll manually (by design)
- **Page Changes:** If page navigates, script stops
- **Console Errors:** Check for red errors

### Too Fast/Too Slow?

**Ultimate Version:**
```javascript
// Slower:
scrollSpeed: 1,

// Faster:
scrollSpeed: 10,
```

**Simple Version:**
```javascript
// Change this line:
const duration = Math.abs(distance) / 2; // ← Increase divisor for slower (4, 5, etc.)
```

---

## 💡 Tips & Best Practices

### 1. **Start with Simple Version**
- Test first with simple version
- Once working, upgrade to ultimate

### 2. **Leave URL Empty**
- Works on any website
- No URL matching issues

### 3. **Watch Console First**
- Always have DevTools open
- Verify script is running
- Debug issues easily

### 4. **Test on Different Sites**
- Some sites have infinite scroll
- Some have fixed heights
- Adjust config accordingly

### 5. **Use Realistic Settings**
- Slower scroll = more human-like
- Random pauses = looks natural
- Multiple cycles = thorough testing

---

## 📋 Quick Reference

### File Locations:
- **Ultimate:** `SMOOTH_SCROLL_SCRIPT.js`
- **Simple:** `SIMPLE_SCROLL_SCRIPT.js`
- **This Guide:** `SCROLLING_SCRIPTS_GUIDE.md`

### Key Configuration (Ultimate):
| Setting | Default | Range | Purpose |
|---------|---------|-------|---------|
| `scrollSpeed` | 2 | 1-10 | Pixels per frame |
| `pauseAtEnd` | 1500ms | 500-5000 | Pause at top/bottom |
| `cycles` | 3 | 1-10 | Complete sequences |
| `randomPauseChance` | 0.02 | 0-0.1 | % chance of pause |

### Typical Use Times:
- **Simple:** ~30 seconds
- **Ultimate (1 cycle):** ~1-2 minutes
- **Ultimate (3 cycles):** ~3-5 minutes
- **Ultimate (5 cycles):** ~5-8 minutes

---

## 🎯 Summary

### Choose Ultimate If:
- ✅ Need human-like behavior
- ✅ Want detailed logging
- ✅ Need customization
- ✅ Long automation sessions

### Choose Simple If:
- ✅ Quick testing needed
- ✅ Want minimal code
- ✅ Short automation
- ✅ Just need basics

**Both scripts work perfectly!** Pick based on your needs. 🚀

---

## ✅ Ready to Go!

1. Copy script from `.js` file
2. Paste in RPA Dashboard
3. Assign to profile
4. Launch & watch
5. Enjoy smooth scrolling! 🎉

**Happy Automating!** 🤖✨
