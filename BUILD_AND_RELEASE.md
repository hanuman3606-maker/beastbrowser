# 🚀 BeastBrowser - Build & Release Guide

Complete guide for building and releasing BeastBrowser with automatic updates.

## 📋 Prerequisites

1. **Node.js & npm** installed
2. **GitHub Account** with access to repository
3. **GitHub Personal Access Token** (for releases)

---

## 🔧 Build Commands

### Development Build
```bash
npm run electron-dev
```

### Production Build (Windows)
```bash
npm run build:win
```

Output: `build-output/BeastBrowser-Setup-2.0.3.exe`

### Build All Platforms
```bash
npm run dist
```

---

## 📦 Release Process

### Step 1: Update Version
Update version in `package.json`:
```json
{
  "version": "2.0.4"
}
```

### Step 2: Create GitHub Release

#### Option A: Automatic (GitHub Actions)
1. Push changes to `main` branch
2. Create git tag:
```bash
git tag v2.0.4
git push origin v2.0.4
```
3. GitHub Actions will automatically build and create release

#### Option B: Manual Release
1. Build locally:
```bash
npm run build:win
```

2. Go to GitHub → Releases → "Create new release"
3. Tag: `v2.0.4`
4. Title: `BeastBrowser v2.0.4`
5. Upload `build-output/BeastBrowser-Setup-2.0.4.exe`
6. Upload `build-output/latest.yml`
7. Publish release

### Step 3: Auto-Update Will Work! ✅

Users will automatically get notification when they launch BeastBrowser!

---

## 🔄 How Auto-Update Works

### User Experience:
1. **User opens BeastBrowser**
2. App checks GitHub releases (with random 0-24h delay)
3. If new version found → **Dialog appears**: "Update Available v2.0.4"
4. User clicks "Download" → Progress shown
5. Download complete → **Dialog**: "Restart Now / Later"
6. User clicks "Restart Now" → App updates and restarts!

### Technical Flow:
```
App Start
  ↓
Auto-Updater checks GitHub
  ↓
Compares local version (package.json) vs GitHub latest release
  ↓
If newer version exists:
  - Show dialog to user
  - Download .exe from GitHub release
  - Show progress
  - Prompt restart
  - Install update
  - Relaunch app
```

---

## 📂 Important Files

### Build Configuration
- `package.json` → Build settings, version, GitHub repo
- `electron-builder.json` → Advanced build config (if exists)

### Auto-Update Files
- `electron/auto-updater.js` → Update logic
- `electron/main.js` → Initializes auto-updater

### Output Files (Must Upload to GitHub)
- `BeastBrowser-Setup-{version}.exe` → Main installer
- `latest.yml` → Update metadata (CRITICAL!)

---

## ⚠️ Important Notes

### GitHub Repository Settings
Package.json MUST have correct GitHub repo:
```json
{
  "repository": {
    "type": "git",
    "url": "https://github.com/rohitmen394/beastbrowser.git"
  }
}
```

### Release Assets Required
Each GitHub release MUST have:
1. ✅ `BeastBrowser-Setup-{version}.exe`
2. ✅ `latest.yml`

Without `latest.yml`, auto-update won't work!

### Version Format
- Use semantic versioning: `MAJOR.MINOR.PATCH`
- Example: `2.0.3` → `2.0.4` → `2.1.0` → `3.0.0`
- Git tag must match: `v2.0.4`

---

## 🐛 Troubleshooting

### Update Not Working?

1. **Check GitHub releases exist**
   - Go to: https://github.com/rohitmen394/beastbrowser/releases
   - Verify latest release has .exe and latest.yml

2. **Check version in package.json**
   ```bash
   cat package.json | grep version
   ```

3. **Check electron-log**
   - Windows: `%USERPROFILE%\AppData\Roaming\BeastBrowser\logs\`
   - Look for update check errors

4. **Check GitHub repo URL**
   ```bash
   cat package.json | grep repository
   ```

5. **Test manually**
   - Open DevTools in app
   - Type: `require('electron').remote.autoUpdater.checkForUpdates()`

---

## 🎯 Quick Release Checklist

- [ ] Update version in `package.json`
- [ ] Commit changes: `git commit -am "Release v2.0.4"`
- [ ] Create tag: `git tag v2.0.4`
- [ ] Push: `git push && git push --tags`
- [ ] Build: `npm run build:win`
- [ ] Create GitHub release
- [ ] Upload `BeastBrowser-Setup-2.0.4.exe`
- [ ] Upload `latest.yml`
- [ ] Publish release
- [ ] Test auto-update on old version

---

## 🚀 Automated Release Script

Create `release.bat`:
```batch
@echo off
echo 🚀 BeastBrowser Release Script
echo.

set /p VERSION="Enter version (e.g., 2.0.4): "

echo.
echo 📝 Updating package.json...
npm version %VERSION% --no-git-tag-version

echo.
echo 🔨 Building...
call npm run build:win

echo.
echo 📦 Creating Git tag...
git add package.json
git commit -m "Release v%VERSION%"
git tag v%VERSION%
git push origin main
git push origin v%VERSION%

echo.
echo ✅ Done! Now:
echo 1. Go to GitHub Releases
echo 2. Create new release with tag v%VERSION%
echo 3. Upload build-output/BeastBrowser-Setup-%VERSION%.exe
echo 4. Upload build-output/latest.yml
echo 5. Publish release
echo.
pause
```

---

## 📊 Release History

- **v2.0.3** - RPA automation fixes, direct DOM scrolling
- **v2.0.2** - Profile manager improvements
- **v2.0.1** - Initial Chrome 139 support
- **v2.0.0** - Major rewrite with anti-detection

---

## 🎉 Success!

Your users will now automatically receive update notifications! 🎊
