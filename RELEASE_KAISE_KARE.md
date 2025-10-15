# 🚀 Release Kaise Karein - Simple Hindi Guide

## ✅ Good News: Sab Kuch Ready Hai!

Tumhara app **auto-update system** ke saath already configured hai. Users ko automatic notification milega jab new version aayega.

---

## 🎯 Ek Command Mein Release

### Sabse Easy Tarika:

```powershell
npm run release
```

**Ye command automatically karega:**
1. ✅ Version number badhayega (2.0.3 → 2.0.4)
2. ✅ App build karega (ungoogled-chromium ke saath)
3. ✅ GitHub pe release create karega
4. ✅ Installer upload karega
5. ✅ Auto-update file (`latest.yml`) upload karega

**Bas 5 minutes mein ho jayega!** ⚡

---

## 📱 Users Ko Kya Dikhega

### Jab Tum New Version Release Karoge:

**1. App Khulega:**
```
App checking for updates in background...
```

**2. Notification Aayega:**
```
┌──────────────────────────────┐
│  🔔 Update Available          │
│                               │
│  Version 2.0.4 is available!  │
│                               │
│  [ Download ]   [ Later ]    │
└──────────────────────────────┘
```

**3. Download Hoga:**
```
Downloading... 45% (125 MB / 280 MB)
Progress bar dikhega
```

**4. Install Ka Option:**
```
┌──────────────────────────────┐
│  ✅ Update Ready              │
│                               │
│  Click to install and restart │
│                               │
│  [ Restart Now ]  [ Later ]  │
└──────────────────────────────┘
```

**5. Auto-Install:**
- App restart hoga
- Update install ho jayega
- Naya version ready! ✅

---

## 🔧 Pehli Baar Setup (One-Time Only)

### GitHub CLI Install Karo:

```powershell
# Install GitHub CLI
winget install --id GitHub.cli

# Login karo
gh auth login
```

**Bas ek baar karna hai!** Phir sirf `npm run release` chalao.

---

## 📝 Daily Workflow

### Jab Bug Fix Ya Feature Add Karo:

```powershell
# 1. Code likho aur test karo
# 2. Build-output folder delete karo (agar hai)
Remove-Item -Path "build-output" -Recurse -Force

# 3. Release karo
npm run release
```

**Done! ✅** Users ko automatic update mil jayega.

---

## 🎯 Version Types

```powershell
# Bug fix: 2.0.3 → 2.0.4
npm run release

# New feature: 2.0.3 → 2.1.0
npm run release minor

# Big changes: 2.0.3 → 3.0.0
npm run release major
```

---

## ⚠️ Important Checklist

**Release Karne Se Pehle:**
- [ ] BeastBrowser.exe band karo (Task Manager check karo)
- [ ] `build-output` folder delete karo
- [ ] Code test kar liya?
- [ ] GitHub login check karo: `gh auth status`

**Release Ke Baad:**
- [ ] GitHub pe check karo: https://github.com/rohitmen394/beastbrowser/releases
- [ ] Download link test karo
- [ ] Purane version se update test karo

---

## 🚨 Agar Problem Aaye

### Build Fail Ho Raha Hai?

```powershell
# 1. Sab BeastBrowser.exe band karo
Get-Process BeastBrowser -ErrorAction SilentlyContinue | Stop-Process

# 2. Build folder delete karo
Remove-Item -Path "build-output" -Recurse -Force

# 3. Phir se try karo
npm run release
```

### GitHub Upload Nahi Ho Raha?

```powershell
# GitHub login refresh karo
gh auth refresh

# Status check karo
gh auth status
```

---

## 📦 Files Jo Upload Hongi

GitHub release mein ye files automatically upload hongi:

1. **BeastBrowser-Setup-2.0.4.exe** (~350 MB)
   - Main installer
   - Users ye download karenge

2. **latest.yml** (Important! ⚠️)
   - Auto-update configuration
   - Iske bina auto-update kaam nahi karega

---

## 🎉 Example: First Release

```powershell
# Terminal mein type karo:
PS> npm run release

# Output dikhega:
🚀 Starting BeastBrowser Release Process

📦 Current version: v2.0.3
📦 New version: v2.0.4

⚠️  This will:
   1. Update version to v2.0.4
   2. Commit and tag the release
   3. Build for Windows
   4. Create GitHub release and upload artifacts

Press Ctrl+C to cancel, or wait 5 seconds to continue...

# 5 seconds wait...

📝 Step 1: Updating version...
✅ Updated package.json to v2.0.4

📝 Step 2: Committing changes...
✅ Committed

🏷️  Step 3: Creating git tag...
✅ Tag created: v2.0.4

⬆️  Step 4: Pushing to GitHub...
✅ Pushed to main
✅ Pushed tag v2.0.4

🔨 Step 5: Building and publishing...
This may take several minutes...

  • electron-builder  version=24.13.3
  • packaging       platform=win32 arch=x64
  ✅ Packaged successfully
  • uploading       file=BeastBrowser-Setup-2.0.4.exe
  • uploaded        file=BeastBrowser-Setup-2.0.4.exe
  • uploaded        file=latest.yml

✅ Release completed successfully!

🎉 Version v2.0.4 has been released!
📦 View release: https://github.com/rohitmen394/beastbrowser/releases/tag/v2.0.4
```

---

## 🌟 Pro Tips

### Tip 1: Test Build Pehle
```powershell
# Quick test build (bina release ke)
npm run build:win

# Check karo sab sahi hai
.\build-output\win-unpacked\BeastBrowser.exe
```

### Tip 2: Changelog Likho
Release notes mein ye likho:
```markdown
## What's New in v2.0.4

🐛 Bug Fixes:
- Fixed proxy connection issue
- Resolved timezone detection bug

✨ Improvements:
- Faster browser launch
- Better error messages
```

### Tip 3: Users Ko Batao
- Social media pe announce karo
- Email bhejo (agar list hai)
- App ke andar notification dikhao

---

## 📊 Summary

### Tum Kya Karoge:
```
Code likho → Test karo → npm run release
```

### System Kya Karega:
```
Build → GitHub Upload → Users ko Notify → Auto Update
```

### Users Kya Karenge:
```
Notification dekhe → Download → Install → Done!
```

---

## ✅ Final Checklist

**Pehli Baar (One-time setup):**
- [ ] GitHub CLI install: `winget install --id GitHub.cli`
- [ ] GitHub login: `gh auth login`
- [ ] Test build: `npm run build:win`

**Har Release Pe:**
- [ ] BeastBrowser.exe band karo
- [ ] Build folder delete: `Remove-Item build-output -Recurse -Force`
- [ ] Release command: `npm run release`
- [ ] GitHub pe verify karo
- [ ] Test download link

---

## 🚀 Ready to Release?

```powershell
# Bas ye command chalao:
npm run release

# Baaki sab automatic! 🎉
```

**Detailed guide:** `GITHUB_RELEASE_AUTO_UPDATE.md` (English mein)

---

**Status:** ✅ **SAB KUCH READY HAI - BAS RELEASE KARO!**
