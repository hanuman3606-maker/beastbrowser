# 🚀 GitHub Release + Auto-Update Guide

## Overview
Tumhara app **electron-updater** se ready hai. Jab tum GitHub pe new version release karoge, existing users ko **automatic notification** milega aur wo **one-click update** kar sakte hain.

---

## ✅ What's Already Working

| Feature | Status | Description |
|---------|--------|-------------|
| Auto-Updater | ✅ | Configured in `electron/auto-updater.js` |
| GitHub Publish | ✅ | `package.json` configured |
| Update Dialog | ✅ | Shows "Update Available" notification |
| Download Progress | ✅ | Shows percentage during download |
| Auto Install | ✅ | "Restart Now" button to install |
| Release Script | ✅ | `npm run release` automates everything |

---

## 🔄 Complete Release Workflow

### Method 1: Automatic (Recommended)

#### Step 1: Setup GitHub Token
```powershell
# Install GitHub CLI (one-time)
winget install --id GitHub.cli

# Login to GitHub
gh auth login

# Verify authentication
gh auth status
```

#### Step 2: Release New Version
```powershell
# Patch version: 2.0.3 → 2.0.4 (bug fixes)
npm run release

# Minor version: 2.0.3 → 2.1.0 (new features)
npm run release minor

# Major version: 2.0.3 → 3.0.0 (breaking changes)
npm run release major
```

**Ye script automatically karega:**
1. ✅ Version increment in package.json
2. ✅ Git commit + tag creation
3. ✅ Push to GitHub
4. ✅ Build Windows installer (.exe)
5. ✅ Create GitHub release
6. ✅ Upload installer to release
7. ✅ Publish `latest.yml` (for auto-updates)

---

### Method 2: Manual Release

#### Step 1: Update Version
Edit `package.json`:
```json
{
  "version": "2.0.4"  // Increment this
}
```

#### Step 2: Build
```powershell
# Close any running BeastBrowser instances
# Delete old build
Remove-Item -Path "build-output" -Recurse -Force

# Build for Windows
npm run build:win
```

#### Step 3: Create GitHub Release
```powershell
# Via GitHub CLI
gh release create v2.0.4 `
  --title "BeastBrowser v2.0.4" `
  --notes "🐛 Bug fixes`n✨ New features`n⚡ Performance improvements" `
  build-output/BeastBrowser-Setup-2.0.4.exe `
  build-output/latest.yml

# OR via GitHub Web UI
# 1. Go to: https://github.com/rohitmen394/beastbrowser/releases/new
# 2. Tag: v2.0.4
# 3. Title: BeastBrowser v2.0.4
# 4. Upload: BeastBrowser-Setup-2.0.4.exe
# 5. Upload: latest.yml (IMPORTANT for auto-updates!)
# 6. Click "Publish release"
```

---

## 📱 User Experience (Existing Users)

### When New Version is Released:

#### 1️⃣ **App Launch Pe (0-24 hours random delay)**
```
Console log:
🔍 Checking for updates...
✅ Update available: v2.0.4
```

#### 2️⃣ **Update Notification Dialog**
```
┌───────────────────────────────────┐
│  🔔 Update Available               │
│                                    │
│  A new version (v2.0.4) is        │
│  available!                        │
│                                    │
│  Would you like to download       │
│  it now?                           │
│                                    │
│  [ Download ]    [ Later ]        │
└───────────────────────────────────┘
```

#### 3️⃣ **Download Progress**
```
Progress bar + text:
Downloaded 45% (125 MB / 280 MB)
```

#### 4️⃣ **Install Prompt**
```
┌───────────────────────────────────┐
│  ✅ Update Ready                   │
│                                    │
│  Update downloaded successfully!   │
│                                    │
│  The application will restart to   │
│  install the update.               │
│                                    │
│  [ Restart Now ]    [ Later ]     │
└───────────────────────────────────┘
```

#### 5️⃣ **Auto-Install & Restart**
- App closes
- Update installs in background
- App restarts with new version ✅

---

## 🔧 Important Files for Auto-Update

### Must Upload to GitHub Release:

1. **BeastBrowser-Setup-{version}.exe**
   - Main installer file
   - Users download this for fresh installs

2. **latest.yml** ⚠️ **CRITICAL**
   - Auto-update configuration file
   - Contains version info and download URL
   - **Without this, auto-update won't work!**

### latest.yml Example:
```yaml
version: 2.0.4
files:
  - url: BeastBrowser-Setup-2.0.4.exe
    sha512: abc123...
    size: 367891456
path: BeastBrowser-Setup-2.0.4.exe
sha512: abc123...
releaseDate: '2025-01-15T12:00:00.000Z'
```

---

## 🎯 Quick Release Checklist

Before releasing:
- [ ] Close all BeastBrowser instances
- [ ] Delete `build-output` folder
- [ ] Test ungoogled-chromium is bundled
- [ ] Version number updated in package.json
- [ ] GitHub token configured (`gh auth status`)

Release steps:
- [ ] Run `npm run release` (automatic) OR
- [ ] Build manually + create GitHub release
- [ ] Upload `.exe` + `latest.yml` to GitHub release
- [ ] Publish the release (make it public)
- [ ] Test auto-update with old version

Post-release:
- [ ] Verify release is live on GitHub
- [ ] Test download link works
- [ ] Test auto-update from previous version
- [ ] Update README/documentation if needed

---

## 🐛 Troubleshooting

### Auto-Update Not Working?

**Problem:** Users not getting update notification

**Solutions:**
1. ✅ **Check latest.yml is uploaded** to GitHub release
2. ✅ **Verify release is published** (not draft)
3. ✅ **Check GitHub repo in package.json:**
   ```json
   {
     "repository": {
       "type": "git",
       "url": "https://github.com/rohitmen394/beastbrowser.git"
     },
     "build": {
       "publish": [{
         "provider": "github",
         "owner": "rohitmen394",
         "repo": "beastbrowser"
       }]
     }
   }
   ```
4. ✅ **Test manually:**
   ```javascript
   // In DevTools Console (on old version)
   require('electron').ipcRenderer.send('check-for-updates')
   ```

### Build Fails?

**Problem:** Build process errors

**Solutions:**
1. ✅ Close BeastBrowser.exe processes
2. ✅ Delete build-output folder
3. ✅ Check disk space (need ~1 GB)
4. ✅ Verify ungoogled-chromium folder exists
5. ✅ Run `npm install` again

### GitHub Release Fails?

**Problem:** Can't create release

**Solutions:**
1. ✅ Run `gh auth status` - check login
2. ✅ Run `gh auth refresh` - refresh token
3. ✅ Check repo name matches package.json
4. ✅ Verify you have write access to repo

---

## 📊 Version Numbering (Semantic Versioning)

```
MAJOR.MINOR.PATCH
  2  . 0  . 3

MAJOR: Breaking changes (3.0.0)
MINOR: New features (2.1.0)
PATCH: Bug fixes (2.0.4)
```

**Examples:**
- Bug fix: `2.0.3` → `2.0.4`
- New feature: `2.0.4` → `2.1.0`
- Breaking change: `2.1.0` → `3.0.0`

---

## 🚀 Production Workflow Example

### Scenario: Bug Fix Release

```powershell
# 1. Fix the bug in code
# 2. Test thoroughly

# 3. Release (automatic)
npm run release

# Output:
# 🚀 Starting BeastBrowser Release Process
# 📦 Current version: v2.0.3
# 📦 New version: v2.0.4
# ⚠️  This will:
#    1. Update version to v2.0.4
#    2. Commit and tag the release
#    3. Build for Windows, macOS, and Linux
#    4. Create GitHub release and upload artifacts
# Press Ctrl+C to cancel, or wait 5 seconds to continue...
#
# ✅ Release completed successfully!
# 🎉 Version v2.0.4 has been released!
# 📦 View release: https://github.com/rohitmen394/beastbrowser/releases/tag/v2.0.4
```

### Scenario: Feature Release

```powershell
# 1. Develop new feature
# 2. Test thoroughly

# 3. Release with minor version bump
npm run release minor

# Version: 2.0.4 → 2.1.0
```

---

## 📈 Monitoring Updates

### Check Update Stats

View in GitHub:
1. Go to: https://github.com/rohitmen394/beastbrowser/releases
2. See download counts for each version
3. Monitor which versions are popular

### Logs

Auto-updater logs are saved:
```
Windows: %USERPROFILE%\AppData\Roaming\BeastBrowser\logs\
```

Check logs for:
- Update check attempts
- Download progress
- Installation success/failure
- Error messages

---

## ⚡ Pro Tips

1. **Test Before Release**
   - Build and test locally first
   - Use `npm run pack` for quick testing (creates unpacked build)

2. **Changelog**
   - Maintain CHANGELOG.md file
   - Include in GitHub release notes
   - Users appreciate knowing what changed

3. **Beta Releases**
   - Use pre-release tags: `v2.1.0-beta.1`
   - Mark as "Pre-release" on GitHub
   - Test with select users before full release

4. **Rollback Plan**
   - Keep previous versions available
   - Don't delete old releases
   - Users can downgrade if needed

5. **Communication**
   - Announce updates on social media
   - Email notifications to users
   - In-app changelog viewer

---

## 🎯 Summary

✅ **Auto-update is ready** - No additional setup needed!

**To release new version:**
```powershell
npm run release
```

**Users will get:**
- 🔔 Automatic update notification
- 📥 One-click download
- ⚡ One-click install + restart
- ✅ Seamless update experience

**Your job:**
- Fix bugs / add features
- Run `npm run release`
- GitHub handles the rest!

---

**Status:** 🚀 **PRODUCTION READY - AUTO-UPDATE WORKING**
