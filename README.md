# 🦁 BeastBrowser v2.0.2

> Advanced Anti-Detection Browser with Chrome 139 Runtime, Proxy Support and Browser Automation

[![Build Status](https://github.com/rohitmen394/beastbrowser/workflows/Manual%20Build/badge.svg)](https://github.com/rohitmen394/beastbrowser/actions)
[![Release](https://img.shields.io/github/v/release/rohitmen394/beastbrowser)](https://github.com/rohitmen394/beastbrowser/releases)
[![License](https://img.shields.io/badge/license-Proprietary-blue.svg)](LICENSE)

---

## 🎯 Features

### 🎨 Modern UI
- **Professional Blue-Indigo Theme** - Clean, modern, and trustworthy interface
- **Responsive Design** - Works seamlessly on all screen sizes
- **Dark Mode Optimized** - Easy on the eyes for long sessions

### 🖥️ Multi-Platform Support
- 🪟 **Windows** - Full support with native features
- 🍎 **macOS** - Optimized for Apple devices
- 🐧 **Linux** - Complete Linux compatibility
- 📱 **Android** - Mobile browser profiles
- 📱 **iOS** - iPhone/iPad support
- 📺 **TV** - Smart TV browser profiles

### 🚀 Smart Profile Management
- **Auto-Increment Naming** - Profiles automatically numbered (Profile 11, 12, 13...)
- **Auto Pagination** - Jumps to last page after creation
- **Bulk Creation** - Create 1-1000 profiles at once
- **Parallel Launching** - 60-70% faster than sequential (1.5s stagger delay)

### 🔒 Anti-Detection Features
- **Canvas Fingerprinting** - Unique canvas signatures
- **WebGL Randomization** - Randomized WebGL parameters
- **Audio Fingerprinting** - Audio context spoofing
- **Navigator Properties** - Customizable browser properties
- **Timezone Matching** - Auto-detect from proxy IP

### 🚀 Chrome 139 Runtime Integration (NEW!)
- **Alternative Runtime** - Use Chrome 139 instead of default Beast browser
- **Advanced Fingerprinting** - Seed-based deterministic fingerprint spoofing
- **GPU Spoofing** - Custom WebGL vendor/renderer strings (Chrome 139+)
- **Platform Emulation** - Windows/macOS/Linux with version control
- **Brand Masking** - Appear as Chrome/Edge/Opera/Vivaldi/Brave
- **Hardware Spoofing** - CPU cores, device memory, touch points
- **Locale Control** - Timezone, language, accept-language headers
- **Automated Testing** - One-click validation (CreepJS, BrowserLeaks, WebRTC)
- **Crash Recovery** - Auto-detection of faulty profiles
- **Full Logging** - Per-profile launch logs with stdout/stderr capture

### 🌐 Proxy Support
- **HTTP/HTTPS/SOCKS5** - All major proxy protocols
- **Bulk Import** - Import hundreds of proxies at once
- **Auto Timezone Detection** - Matches timezone to proxy location
- **Proxy Testing** - Built-in proxy verification
- **Saved Proxies** - Reuse working proxies

### 🤖 Browser Automation (RPA)
- **Script Builder** - Visual automation builder
- **Bulk Execution** - Run scripts on multiple profiles
- **Profile-Specific Scripts** - Custom automation per profile
- **Real-time Monitoring** - Track automation progress

---

## 📦 Installation

### Download Latest Release

1. Go to [Releases](https://github.com/rohitmen394/beastbrowser/releases)
2. Download `BeastBrowser-Setup-2.0.2.exe`
3. Run the installer
4. Follow the setup wizard

### Chrome 139 Runtime ✨ BUNDLED

**Chrome 139 (ungoogled-chromium) comes pre-bundled!**

1. **Just launch BeastBrowser** - Chrome 139 ready instantly!
2. **Location**: `ungoogled-chromium_139.0.7258.154-1.1_windows_x64/chrome.exe`
3. **Verify**: Go to Profile Settings > Runtime Selection
   - Should show "Chrome 139 Available ✅"
4. **Full Documentation**: See [CHROME139_INTEGRATION_GUIDE.md](CHROME139_INTEGRATION_GUIDE.md)

**Features**:
- 🚀 Pre-bundled Chrome 139 (300 MB ungoogled-chromium)
- 🎭 6 Platform User-Agents (auto-injected from `useragents/` folder)
- 🔄 No forced window sizes (natural browser behavior)
- 🎲 Random user-agent per launch from txt files
- ⚡ Instant startup (no extraction needed)

### System Requirements

- **OS:** Windows 10/11 (64-bit)
- **RAM:** 4GB minimum (8GB recommended)
- **Storage:** 500MB free space
- **Internet:** Required for initial setup

---

## 🛠️ Development Setup

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Git

### Clone Repository

```bash
git clone https://github.com/rohitmen394/beastbrowser.git
cd beastbrowser
```

### Install Dependencies

```bash
npm install
```

### Development Mode

```bash
npm run dev
```

### Build Application

```bash
npm run build
```

### Run Electron App

```bash
npm run electron-dev
```

### Build Windows Installer

```bash
npm run build:win
```

Output: `build-output/BeastBrowser-Setup-2.0.2.exe`

### Run Chrome 139 Tests

```bash
# Quick runtime detection and launch test
node test-chrome139-integration.js --quick

# Full test suite with fingerprint validation
node test-chrome139-integration.js

# Run specific test only
node test-chrome139-integration.js --test=webrtc
```

---

## 🎯 Usage

### Creating Profiles

1. Click **"Create Profile"** or **"Bulk Create"**
2. Select platform (Windows, macOS, Linux, Android, iOS, TV)
3. Configure proxy settings (optional)
4. Set fingerprint randomization
5. Click **"Create"**

### Launching Profiles

1. Select profiles (single or multiple)
2. Click **"Launch"** or **"Launch All"**
3. Profiles open in parallel with 1.5s stagger delay
4. Each profile has unique fingerprint

### Bulk Operations

1. Click **"Bulk Create"**
2. Set count (1-1000)
3. Choose platforms
4. Configure proxy list
5. Create all at once

---

## 🔧 Configuration

### Proxy Formats

```
host:port
host:port:username:password
username:password@host:port
protocol://username:password@host:port
```

### Environment Variables

Create `.env` file:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
```

---

## 📊 Performance

### Parallel Launching

- **Sequential (Old):** 10 profiles = 50 seconds
- **Parallel (New):** 10 profiles = 18 seconds
- **Improvement:** 60-70% faster

### Resource Usage

- **Per Profile:** ~100-150MB RAM
- **CPU:** Low impact with staggered launching
- **Network:** Minimal bandwidth usage

---

## 🐛 Troubleshooting

### Common Issues

**Q: Profiles not launching?**
- Check if Chromium is installed
- Verify proxy settings
- Check firewall settings

**Q: Fingerprints not randomizing?**
- Enable "Randomize All" option
- Restart the application
- Clear browser cache

**Q: Proxy not working?**
- Test proxy connection
- Verify credentials
- Check proxy format

---

## 🤝 Contributing

This is a private project. For issues or suggestions, contact the development team.

---

## 📝 Changelog

### v2.0.2 (Current)

#### Added ✅
- **Chrome 139 Runtime Integration** - Alternative runtime with advanced fingerprinting
- **Advanced Fingerprint Controls** - Seed, platform, brand, GPU, locale configuration
- **GPU Spoofing** - WebGL vendor/renderer customization (Chrome 139+)
- **Automated Test Suite** - CreepJS, BrowserLeaks, WebRTC, Cloudflare, WebGL tests
- **Crash Recovery** - Auto-detection of repeatedly crashing profiles
- **Per-Profile Logging** - Detailed stdout/stderr capture with timestamps
- **Security/Ethics Warning** - Modal for accepting legal/ethical responsibilities
- **Chrome 139 Integration Guide** - Comprehensive documentation
- **Test Automation Script** - Command-line testing utility

#### Enhanced ✅
- Profile configuration UI with runtime selection
- Proxy handling with authentication support
- Error handling and user feedback
- Documentation and troubleshooting guides

### v2.0.1

#### Added ✅
- Complete blue-indigo professional theme
- Support for all platforms (Android, iOS, TV)
- Smart profile auto-numbering
- Auto pagination to last page
- Parallel profile launching with stagger
- Enhanced anti-detection features

#### Fixed ✅
- All color inconsistencies
- Profile naming issues
- Pagination bugs
- Sequential launch delays
- UI/UX improvements

#### Removed ✅
- Header component (for more space)
- Orange-red color scheme
- Unnecessary delays

---

## 📄 License

Copyright © 2025 BeastBrowser Team. All rights reserved.

This is proprietary software. Unauthorized copying, distribution, or modification is prohibited.

---

## 📞 Support

- **Website:** https://beastbrowser.com
- **Email:** support@beastbrowser.com
- **GitHub Issues:** [Report Bug](https://github.com/rohitmen394/beastbrowser/issues)

---

## 🙏 Acknowledgments

Built with:
- [Electron](https://www.electronjs.org/)
- [React](https://reactjs.org/)
- [Vite](https://vitejs.dev/)
- [TailwindCSS](https://tailwindcss.com/)
- [Puppeteer](https://pptr.dev/)

---

**Built with ❤️ by BeastBrowser Team**

⭐ Star this repo if you find it useful!
