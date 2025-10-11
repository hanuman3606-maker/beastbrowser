# 🔄 BeastBrowser Auto-Update System

Complete guide for setting up and using the auto-update system with GitHub Releases.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Initial Setup](#initial-setup)
3. [How It Works](#how-it-works)
4. [Creating a Release](#creating-a-release)
5. [Testing Updates](#testing-updates)
6. [Adding New Features](#adding-new-features)
7. [Troubleshooting](#troubleshooting)

---

## 🔧 Prerequisites

### 1. GitHub CLI Installation

**Windows:**
```bash
winget install --id GitHub.cli
```

**macOS:**
```bash
brew install gh
```

**Linux:**
```bash
sudo apt install gh
```

### 2. GitHub Authentication

```bash
gh auth login
```

Follow the prompts to authenticate with your GitHub account.

### 3. Environment Variables

Create a `.env` file in the project root:

```env
GH_TOKEN=your_github_personal_access_token
```

**To create a GitHub token:**
1. Go to https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Select scopes: `repo` (all), `write:packages`
4. Copy the token and add to `.env`

---

## 🚀 Initial Setup

### 1. Update GitHub Repository Details

Already configured in `package.json`:

```json
{
  "repository": {
    "type": "git",
    "url": "https://github.com/beastbrowser/beastbrowser.git"
  },
  "build": {
    "publish": [
      {
        "provider": "github",
        "owner": "beastbrowser",
        "repo": "beastbrowser"
      }
    ]
  }
}
```

**⚠️ Important:** Replace `beastbrowser/beastbrowser` with your actual GitHub username/repo!

### 2. Initialize Git Repository

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

---

## 🔄 How It Works

### Auto-Update Flow

```
User Opens App
    ↓
Random Delay (0-24 hours) ← Prevents server load spikes
    ↓
Check GitHub Releases
    ↓
New Version Found?
    ├─ Yes → Show "Update Available" dialog
    │         ↓
    │      User Clicks "Download"
    │         ↓
    │      Download Update (with progress)
    │         ↓
    │      Show "Update Ready" dialog
    │         ↓
    │      User Clicks "Restart Now"
    │         ↓
    │      App Restarts & Installs Update
    │
    └─ No → Continue normally
```

### Staggered Rollout

The auto-updater uses a **random delay (0-24 hours)** to prevent all users from checking for updates simultaneously. This:

- ✅ Prevents server overload
- ✅ Allows gradual rollout
- ✅ Gives time to catch critical bugs

---

## 📦 Creating a Release

### Method 1: Automated Script (Recommended)

```bash
# Patch release (2.0.0 → 2.0.1)
npm run release

# Minor release (2.0.0 → 2.1.0)
npm run release minor

# Major release (2.0.0 → 3.0.0)
npm run release major
```

**What it does:**
1. ✅ Increments version in `package.json`
2. ✅ Commits changes
3. ✅ Creates git tag
4. ✅ Pushes to GitHub
5. ✅ Builds for Windows, macOS, Linux
6. ✅ Creates GitHub release
7. ✅ Uploads installers

### Method 2: Manual Release

```bash
# 1. Update version
npm version patch  # or minor, major

# 2. Build
npm run build

# 3. Publish to GitHub
npm run publish:github
```

---

## 🧪 Testing Updates

### Local Testing

1. **Build a test version:**
   ```bash
   npm run build:win
   ```

2. **Install the app** from `build-output/`

3. **Create a fake update:**
   - Increment version in `package.json` to `2.0.1`
   - Build again: `npm run build:win`
   - Create a GitHub release with the new version
   - Upload the new installer

4. **Test auto-update:**
   - Open the installed app (v2.0.0)
   - Wait for update check (or trigger manually)
   - Should detect v2.0.1 and offer to update

### Testing Without GitHub

Set `autoUpdater.setFeedURL()` to a local server for testing:

```javascript
// In auto-updater.js (for testing only!)
autoUpdater.setFeedURL({
  provider: 'generic',
  url: 'http://localhost:3000/updates'
});
```

---

## ✨ Adding New Features

### Example: Dark Mode Toggle

#### 1. Add Feature Code

**src/App.tsx:**
```tsx
import { useState } from 'react';

function App() {
  const [darkMode, setDarkMode] = useState(false);

  return (
    <div className={darkMode ? 'dark' : 'light'}>
      <button onClick={() => setDarkMode(!darkMode)}>
        Toggle Dark Mode
      </button>
      {/* Rest of your app */}
    </div>
  );
}
```

**src/index.css:**
```css
:root {
  --bg-color: #ffffff;
  --text-color: #000000;
}

.dark {
  --bg-color: #1a1a1a;
  --text-color: #ffffff;
}

body {
  background-color: var(--bg-color);
  color: var(--text-color);
}
```

#### 2. Test Locally

```bash
npm run dev
```

#### 3. Create Release

```bash
npm run release patch
```

#### 4. Users Get Update

- App checks for updates (within 24 hours)
- Downloads new version
- Installs on restart
- New "Toggle Dark Mode" button appears!

---

## 🐛 Troubleshooting

### Issue: "No updates available" (but update exists)

**Causes:**
- Version in `package.json` not incremented
- GitHub release not published
- Release tag doesn't match version (must be `v2.0.1`, not `2.0.1`)

**Fix:**
```bash
# Check current version
cat package.json | grep version

# Check GitHub releases
gh release list

# Ensure tag format is correct (v prefix)
git tag -l
```

### Issue: "Update check failed"

**Causes:**
- No internet connection
- GitHub API rate limit
- Repository is private (must be public for free updates)

**Fix:**
```bash
# Check GitHub authentication
gh auth status

# Make repo public
gh repo edit --visibility public
```

### Issue: "Download failed"

**Causes:**
- Large file size + slow connection
- GitHub release assets not uploaded
- Wrong asset name

**Fix:**
```bash
# Check release assets
gh release view v2.0.1 --json assets

# Re-upload assets
gh release upload v2.0.1 build-output/*.exe
```

### Issue: "App won't restart after update"

**Causes:**
- Installer not signed (Windows SmartScreen)
- Insufficient permissions

**Fix:**
- Sign your app with a code signing certificate
- Or: Users must click "More info" → "Run anyway" on first install

---

## 🔐 Security Best Practices

### 1. Code Signing (Recommended)

**Windows:**
```json
// package.json
{
  "build": {
    "win": {
      "certificateFile": "path/to/cert.pfx",
      "certificatePassword": "password"
    }
  }
}
```

**macOS:**
```json
{
  "build": {
    "mac": {
      "identity": "Developer ID Application: Your Name (TEAM_ID)"
    }
  }
}
```

### 2. Never Commit Secrets

Add to `.gitignore`:
```
.env
*.pfx
*.p12
```

### 3. Use Environment Variables

```bash
# In CI/CD or local terminal
export GH_TOKEN=your_token_here
npm run publish:github
```

---

## 📊 Monitoring Updates

### Check Update Statistics

```bash
# View release download counts
gh release view v2.0.1 --json assets

# List all releases
gh release list
```

### Logs

Auto-updater logs are saved to:
- **Windows:** `%USERPROFILE%\AppData\Roaming\BeastBrowser\logs\`
- **macOS:** `~/Library/Logs/BeastBrowser/`
- **Linux:** `~/.config/BeastBrowser/logs/`

---

## 🎯 Quick Reference

### Common Commands

```bash
# Create patch release (2.0.0 → 2.0.1)
npm run release

# Build for specific platform
npm run build:win
npm run build:mac
npm run build:linux

# Publish to GitHub
npm run publish:github

# Check for updates manually (in app)
Help → Check for Updates
```

### Version Numbering

- **Major (3.0.0):** Breaking changes, major new features
- **Minor (2.1.0):** New features, backward compatible
- **Patch (2.0.1):** Bug fixes, small improvements

---

## 📞 Support

- **Issues:** https://github.com/beastbrowser/beastbrowser/issues
- **Discussions:** https://github.com/beastbrowser/beastbrowser/discussions
- **Email:** support@beastbrowser.com

---

**Made with ❤️ by BeastBrowser Team**
