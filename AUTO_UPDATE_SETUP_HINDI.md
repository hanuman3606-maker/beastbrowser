# 🚀 BeastBrowser - Auto-Update System (Complete Guide)

## ✅ Ab Kya Kaam Kar Raha Hai?

**GOOD NEWS:** Tumhara software ab **AUTO-UPDATE** ke liye completely ready hai! 🎉

### 🎯 Kya Features Kaam Kar Rahe Hain:

1. ✅ **Automatic Update Check** - App launch hone par check karega
2. ✅ **Update Notification** - Nayi version milne par dialog show hoga
3. ✅ **Download Progress** - Download ki progress dikhegi
4. ✅ **One-Click Install** - User "Restart Now" click karke update ho jayega
5. ✅ **GitHub Integration** - GitHub releases se automatic update aayega

---

## 📦 Ab Build Kaise Karein?

### Option 1: Ek Command Se (EASIEST) 🎯
```bash
quick-build.bat
```
Bas double-click karo, sab kuch automatic ho jayega!

### Option 2: Manual Commands
```bash
# Step 1: React app build karo
npm run build

# Step 2: Windows installer banao
npm run build:win
```

### Output Kahaan Milega?
```
build-output/
  ├── BeastBrowser-Setup-2.0.3.exe    ← Main installer
  └── latest.yml                       ← Update file (IMPORTANT!)
```

---

## 🚀 GitHub Pe Release Kaise Karein?

### Method 1: Automatic Release Script (RECOMMENDED) ✨
```bash
release.bat
```

Ye script **automatically** ye sab karega:
1. Version update karega
2. Build create karega  
3. Git commit + tag banega
4. GitHub pe push hoga
5. GitHub Actions automatic release bana dega!

### Method 2: Manual Steps

#### Step 1: Version Badhao
`package.json` me version change karo:
```json
{
  "version": "2.0.4"  ← Yahan badho
}
```

#### Step 2: Build Karo
```bash
npm run build:win
```

#### Step 3: Git Tag Banao
```bash
git add .
git commit -m "Release v2.0.4"
git tag v2.0.4
git push origin main
git push origin v2.0.4
```

#### Step 4: GitHub Release Create Karo

1. Browser me jao: https://github.com/rohitmen394/beastbrowser/releases
2. Click: **"Draft a new release"**
3. **Tag:** `v2.0.4` select karo
4. **Title:** `BeastBrowser v2.0.4`
5. **Upload files:**
   - `build-output/BeastBrowser-Setup-2.0.4.exe`
   - `build-output/latest.yml` ← YE ZARURI HAI!
6. Click: **"Publish release"**

**Done!** ✅

---

## 🔄 User Ko Kaise Update Dikhega?

### User Experience (Step-by-Step):

1. **User BeastBrowser kholta hai**
   ```
   🚀 BeastBrowser opening...
   ```

2. **Background me check hota hai** (0-24 hours random delay)
   ```
   🔍 Checking for updates...
   ```

3. **Agar nayi version hai:**
   ```
   ╔═══════════════════════════════╗
   ║  🚀 Update Available!          ║
   ║                                ║
   ║  A new version (v2.0.4) is    ║
   ║  available!                    ║
   ║                                ║
   ║  Would you like to download    ║
   ║  it now?                       ║
   ║                                ║
   ║  [Download]     [Later]        ║
   ╚═══════════════════════════════╝
   ```

4. **User "Download" click kare:**
   ```
   📥 Downloading update...
   ▓▓▓▓▓▓▓▓░░░░░░░░ 45%
   ```

5. **Download complete hone par:**
   ```
   ╔═══════════════════════════════╗
   ║  ✅ Update Ready!              ║
   ║                                ║
   ║  Update downloaded             ║
   ║  successfully!                 ║
   ║                                ║
   ║  The application will restart  ║
   ║  to install the update.        ║
   ║                                ║
   ║  [Restart Now]     [Later]     ║
   ╚═══════════════════════════════╝
   ```

6. **"Restart Now" click kare:**
   - App band hoga
   - Update install hoga
   - App automatically dobara khulega
   - ✅ **Updated version ready!**

---

## 🎯 Complete Release Workflow

```
┌─────────────────────────────────────────────┐
│  1. Code Changes + Testing                  │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│  2. Update Version in package.json          │
│     2.0.3 → 2.0.4                           │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│  3. Run: release.bat (or manual)            │
│     - Builds app                             │
│     - Creates installer                      │
│     - Git commit + tag                       │
│     - Push to GitHub                         │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│  4. GitHub Actions Triggers                 │
│     - Automatic build on tag push           │
│     - Creates GitHub Release                │
│     - Uploads .exe and .yml                 │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│  5. Release Published on GitHub             │
│     https://github.com/rohitmen394/         │
│     beastbrowser/releases                   │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│  6. Users Get Auto-Update Notification!    │
│     🎉 All users will be notified!          │
└─────────────────────────────────────────────┘
```

---

## 🧪 Testing Auto-Update

### Local Testing (Before Release):

1. **Current version check karo:**
   ```bash
   node -p "require('./package.json').version"
   ```

2. **Purana version install karo**
   - Install karke open karo

3. **Nayi release GitHub pe publish karo**

4. **Purane version me check karo:**
   - App open karo
   - Wait karo (ya force check karo)
   - Update notification aana chahiye!

### Force Check (Manual):
Development mode me console me type karo:
```javascript
require('electron').remote.autoUpdater.checkForUpdates()
```

---

## 📁 Important Files

### Auto-Update System:
- `electron/auto-updater.js` - Update logic
- `electron/main.js` - Auto-updater initialization
- `.github/workflows/release.yml` - GitHub Actions workflow

### Build Configuration:
- `package.json` - Version + GitHub repo
- `electron-builder` config in package.json

### Scripts:
- `release.bat` - Complete release automation
- `quick-build.bat` - Just build (no release)

---

## ⚠️ IMPORTANT Configuration

### 1. GitHub Repository URL
`package.json` me ye hona chahiye:
```json
{
  "repository": {
    "type": "git",
    "url": "https://github.com/rohitmen394/beastbrowser.git"
  },
  "publish": [
    {
      "provider": "github",
      "owner": "rohitmen394",
      "repo": "beastbrowser"
    }
  ]
}
```

### 2. Version Format
- Semantic versioning use karo: `MAJOR.MINOR.PATCH`
- Examples: `2.0.3`, `2.0.4`, `2.1.0`, `3.0.0`
- Git tag bhi same: `v2.0.4`

### 3. Release Assets
Har GitHub release me **DONO files** zaruri hain:
- ✅ `BeastBrowser-Setup-{version}.exe`
- ✅ `latest.yml` ← **YE BAHUT ZARURI HAI!**

Agar `latest.yml` nahi upload kiya to **auto-update nahi chalega**!

---

## 🐛 Problems & Solutions

### Problem 1: "Update check failed"
**Solution:**
- GitHub repository URL check karo in package.json
- Internet connection check karo
- GitHub releases exist karte hain ya nahi check karo

### Problem 2: "No updates available" (but GitHub has new version)
**Solution:**
- `latest.yml` file GitHub release me hai ya nahi check karo
- Version number format check karo (must be semantic)
- Git tag format check karo (`v2.0.4` format me)

### Problem 3: Update download fails
**Solution:**
- .exe file size check karo (GitHub me properly upload hua hai?)
- Internet connection stable hai?
- Firewall/Antivirus block kar raha hai?

### Problem 4: GitHub Actions build fail
**Solution:**
- Node modules properly install ho rahe hain?
- Build command locally test karo
- GitHub Actions logs check karo

---

## 📊 Release Checklist

Before releasing new version:

- [ ] ✅ All features tested locally
- [ ] ✅ RPA scripts working (scroll test kiya?)
- [ ] ✅ Profile creation working
- [ ] ✅ Proxy working (HTTP/HTTPS/SOCKS5)
- [ ] ✅ Version number updated in package.json
- [ ] ✅ Changelog ready (what's new?)
- [ ] ✅ Build tested locally
- [ ] ✅ Installer working properly
- [ ] ✅ Git committed and tagged
- [ ] ✅ Pushed to GitHub
- [ ] ✅ GitHub release created
- [ ] ✅ Both .exe and .yml uploaded
- [ ] ✅ Release published (not draft)
- [ ] ✅ Auto-update tested on old version

---

## 🎉 Success!

**CONGRATULATIONS!** 🎊

Tumhara BeastBrowser ab:
- ✅ Professionally builds
- ✅ Automatically releases on GitHub
- ✅ Users ko automatic update notifications milenge
- ✅ One-click update system

**Ab jab bhi tum GitHub pe nayi version release karoge, saare users ko notification aayega!** 🚀

---

## 📞 Quick Commands Reference

```bash
# Development
npm run electron-dev

# Quick build (local testing)
quick-build.bat

# Complete release (automatic)
release.bat

# Manual build
npm run build:win

# Check version
node -p "require('./package.json').version"

# Create tag
git tag v2.0.4
git push origin v2.0.4
```

---

**Built with ❤️ - Auto-Update System Ready!** 🎉
