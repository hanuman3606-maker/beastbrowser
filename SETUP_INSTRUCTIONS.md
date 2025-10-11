# 🚀 BeastBrowser Auto-Update Setup - Quick Start

## ✅ What's Already Done

Your app now has:
- ✅ **electron-updater** installed and configured
- ✅ **Auto-updater module** (`electron/auto-updater.js`)
- ✅ **Integrated with main.js**
- ✅ **Release script** (`scripts/release.js`)
- ✅ **GitHub Releases configuration**
- ✅ **Staggered rollout** (random 0-24h delay)

---

## 🎯 Next Steps (Do This Now!)

### Step 1: Install GitHub CLI

**Windows (PowerShell as Admin):**
```powershell
winget install --id GitHub.cli
```

**Verify installation:**
```bash
gh --version
```

### Step 2: Authenticate with GitHub

```bash
gh auth login
```

Choose:
- GitHub.com
- HTTPS
- Login with web browser

### Step 3: Create GitHub Repository

```bash
# Create new repo
gh repo create beastbrowser --public --source=. --remote=origin

# Or connect to existing repo
git remote add origin https://github.com/YOUR_USERNAME/beastbrowser.git
```

### Step 4: Update Repository Details

Edit `package.json` line 9-11:

```json
"repository": {
  "type": "git",
  "url": "https://github.com/YOUR_USERNAME/beastbrowser.git"
}
```

And line 158-160:

```json
"publish": [
  {
    "provider": "github",
    "owner": "YOUR_USERNAME",
    "repo": "beastbrowser"
  }
]
```

### Step 5: Create GitHub Token

1. Go to: https://github.com/settings/tokens/new
2. Name: `BeastBrowser Releases`
3. Select scopes:
   - ✅ `repo` (all)
   - ✅ `write:packages`
4. Click "Generate token"
5. Copy the token

### Step 6: Set Environment Variable

**Windows (PowerShell):**
```powershell
$env:GH_TOKEN="your_token_here"
```

**Or create `.env` file:**
```env
GH_TOKEN=your_github_token_here
```

### Step 7: Push to GitHub

```bash
git add .
git commit -m "feat: add auto-update system"
git branch -M main
git push -u origin main
```

### Step 8: Create First Release

```bash
npm run release
```

This will:
1. Increment version to 2.0.1
2. Build for Windows, macOS, Linux
3. Create GitHub release
4. Upload installers

---

## 🧪 Testing Auto-Updates

### Test Scenario

1. **Install v2.0.0:**
   ```bash
   npm run build:win
   # Install from build-output/BeastBrowser Setup 2.0.0.exe
   ```

2. **Create v2.0.1:**
   ```bash
   # Make a small change (e.g., add console.log)
   npm run release
   ```

3. **Test Update:**
   - Open installed app (v2.0.0)
   - Wait up to 24 hours (or modify delay in auto-updater.js)
   - App will show "Update Available" dialog
   - Click "Download"
   - Click "Restart Now"
   - App updates to v2.0.1!

### Quick Test (Skip Delay)

Edit `electron/auto-updater.js` line 119:

```javascript
// Change from:
const randomDelay = Math.floor(Math.random() * maxDelay);

// To (for testing):
const randomDelay = 5000; // 5 seconds
```

---

## 📝 Example: Adding Dark Mode Feature

### 1. Add Feature

**src/App.tsx:**
```tsx
const [darkMode, setDarkMode] = useState(false);

return (
  <div className={darkMode ? 'dark' : ''}>
    <button onClick={() => setDarkMode(!darkMode)}>
      🌙 Toggle Dark Mode
    </button>
  </div>
);
```

**src/index.css:**
```css
.dark {
  background: #1a1a1a;
  color: #ffffff;
}
```

### 2. Test Locally

```bash
npm run dev
```

### 3. Release Update

```bash
npm run release patch
```

### 4. Users Get Update

- App checks for updates (within 24 hours)
- Downloads v2.0.2
- Installs on restart
- Dark mode button appears!

---

## 🎨 Customizing Update Behavior

### Change Update Check Frequency

**electron/auto-updater.js** line 118:

```javascript
// Current: 0-24 hours
const maxDelay = 24 * 60 * 60 * 1000;

// Change to 0-1 hour:
const maxDelay = 1 * 60 * 60 * 1000;

// Or check immediately:
const maxDelay = 0;
```

### Auto-Download Updates

**electron/auto-updater.js** line 9:

```javascript
// Current: Ask user first
autoUpdater.autoDownload = false;

// Change to auto-download:
autoUpdater.autoDownload = true;
```

### Silent Install

**electron/auto-updater.js** line 10:

```javascript
// Current: Ask user to restart
autoUpdater.autoInstallOnAppQuit = true;

// Change to install immediately:
autoUpdater.autoInstallOnAppQuit = false;
// Then in update-downloaded handler:
autoUpdater.quitAndInstall(false, true);
```

---

## 🐛 Common Issues & Fixes

### Issue: "gh: command not found"

**Fix:**
```bash
# Restart terminal after installing gh
# Or add to PATH manually
```

### Issue: "Permission denied" when pushing

**Fix:**
```bash
gh auth login
# Or use SSH:
git remote set-url origin git@github.com:YOUR_USERNAME/beastbrowser.git
```

### Issue: "No published versions on GitHub"

**Fix:**
```bash
# Check if release exists
gh release list

# Create first release manually
gh release create v2.0.0 --title "v2.0.0" --notes "Initial release"
```

### Issue: "Update check fails in production"

**Fix:**
Check `electron/auto-updater.js` line 136:
```javascript
// Remove this check for production:
if (process.env.NODE_ENV === 'development') {
  return; // ← Remove this line
}
```

---

## 📊 Monitoring

### View Release Stats

```bash
# List all releases
gh release list

# View specific release
gh release view v2.0.1

# Download counts
gh api repos/YOUR_USERNAME/beastbrowser/releases/latest
```

### Check Logs

**Windows:**
```
%USERPROFILE%\AppData\Roaming\BeastBrowser\logs\main.log
```

**macOS:**
```
~/Library/Logs/BeastBrowser/main.log
```

**Linux:**
```
~/.config/BeastBrowser/logs/main.log
```

---

## 🔐 Security Checklist

- [ ] Never commit `.env` file
- [ ] Add `.env` to `.gitignore`
- [ ] Use environment variables for tokens
- [ ] Consider code signing (Windows/macOS)
- [ ] Keep `GH_TOKEN` secret
- [ ] Use HTTPS for repository URL

---

## 📚 Additional Resources

- **Full Guide:** See `AUTO_UPDATE_GUIDE.md`
- **electron-updater docs:** https://www.electron.build/auto-update
- **GitHub CLI docs:** https://cli.github.com/manual/
- **Code signing:** https://www.electron.build/code-signing

---

## 🎉 You're Done!

Your app now has:
- ✅ Automatic update checks
- ✅ User-friendly update dialogs
- ✅ Download progress tracking
- ✅ Staggered rollout
- ✅ One-command releases

**Next:** Run `npm run release` to create your first release!

---

**Questions?** Open an issue on GitHub or check `AUTO_UPDATE_GUIDE.md`
