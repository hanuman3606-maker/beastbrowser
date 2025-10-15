# Chrome 139 Runtime Integration Guide

Complete guide for using Chrome 139 as an alternative runtime in BeastBrowser with advanced anti-detection fingerprinting capabilities.

## Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [Configuration](#configuration)
- [Fingerprint Options](#fingerprint-options)
- [CLI Arguments Reference](#cli-arguments-reference)
- [Proxy Configuration](#proxy-configuration)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [Legal & Ethics](#legal--ethics)

---

## Overview

Chrome 139 integration provides:

- **Per-profile runtime selection** - Choose between Beast default or Chrome 139
- **Advanced fingerprinting** - Seed-based deterministic randomization
- **GPU spoofing** - Custom WebGL vendor/renderer strings
- **Platform emulation** - Windows/macOS/Linux with version control
- **Brand masking** - Chrome/Edge/Opera/Vivaldi/Brave
- **Proxy support** - Full proxy authentication via Beast proxy manager
- **Crash recovery** - Auto-detection of faulty profiles
- **Automated testing** - One-click validation suite

---

## Installation

### Step 1: Install Chrome 139 Binary

**Option A: Install ungoogled-chromium (Recommended)**

1. Run the installer in the project root:
   ```
   ungoogled-chromium_139.0.7258.154-1.1_installer_x64.exe
   ```

2. Extract/install to:
   ```
   C:\Program Files\BeastBrowser\bin\chrome.exe
   ```

**Option B: Use System Chrome**

If you have Chrome 139+ installed at:
```
C:\Program Files\Google\Chrome\Application\chrome.exe
```

BeastBrowser will auto-detect it as a fallback.

### Step 2: Verify Detection

1. Launch BeastBrowser
2. Create or edit a profile
3. Go to "Runtime Selection" section
4. Check for "Chrome 139 Available" status with green checkmark

---

## Configuration

### UI Configuration

Navigate to **Profile Settings > Runtime Selection**:

1. **Runtime**: Choose "Chrome 139 (Advanced Fingerprinting)"
2. **Fingerprint Seed**: Generate random seed or enter integer (e.g., 123456789)
3. **Platform**: Select Windows/macOS/Linux
4. **Platform Version**: e.g., "10.0.19045" for Windows 11
5. **Browser Brand**: Chrome/Edge/Opera/Vivaldi/Brave
6. **Brand Version**: e.g., "139.0.7258.154"
7. **Hardware Concurrency**: CPU cores (2-32)
8. **GPU Vendor**: e.g., "NVIDIA Corporation"
9. **GPU Renderer**: e.g., "NVIDIA GeForce GTX 1060"
10. **Timezone**: e.g., "Asia/Kolkata"
11. **Language**: e.g., "hi-IN"
12. **Accept Languages**: e.g., "hi-IN,en-US"

### Programmatic Configuration

```typescript
import { chrome139RuntimeService } from '@/services/chrome139RuntimeService';

const config = {
  id: 'profile-001',
  userDataDir: 'C:\\Users\\YourName\\BeastBrowser\\ChromeProfiles\\profile-001',
  fingerprintSeed: 987654321,
  platform: 'windows',
  platformVersion: '10.0.19045',
  brand: 'Chrome',
  brandVersion: '139.0.7258.154',
  hardwareConcurrency: 8,
  gpuVendor: 'NVIDIA Corporation',
  gpuRenderer: 'NVIDIA GeForce GTX 1060',
  timezone: 'Asia/Kolkata',
  lang: 'hi-IN',
  acceptLang: 'hi-IN,en-US',
  useBuiltinProxy: true,
  proxy: {
    type: 'http',
    host: 'proxy.example.com',
    port: 8080
  },
  disableNonProxiedUdp: true,
  windowWidth: 1920,
  windowHeight: 1080,
  startUrl: 'https://example.com'
};

const result = await chrome139RuntimeService.launchProfile(config);
if (result.success) {
  console.log('Launched with PID:', result.pid);
  console.log('Log file:', result.logPath);
}
```

---

## Fingerprint Options

### Fingerprint Seed

**Purpose**: Deterministic randomization across multiple fingerprint vectors

**Type**: Integer (any positive number)

**Example**: `--fingerprint=123456789`

**Effect**: Same seed = same fingerprint every time. Different seeds = different fingerprints.

### Platform Options

| Flag | Values | Example |
|------|--------|---------|
| `--fingerprint-platform` | windows, macos, linux | `--fingerprint-platform=windows` |
| `--fingerprint-platform-version` | OS version string | `--fingerprint-platform-version="10.0.19045"` |

### Brand Options

| Flag | Values | Example |
|------|--------|---------|
| `--fingerprint-brand` | Chrome, Edge, Opera, Vivaldi, Brave | `--fingerprint-brand="Chrome"` |
| `--fingerprint-brand-version` | Version string | `--fingerprint-brand-version="139.0.7258.154"` |

### Hardware Options

| Flag | Type | Range | Example |
|------|------|-------|---------|
| `--fingerprint-hardware-concurrency` | Integer | 2-32 | `--fingerprint-hardware-concurrency=8` |

### GPU Options (Chrome 139+ only)

| Flag | Type | Example |
|------|------|---------|
| `--fingerprint-gpu-vendor` | String | `--fingerprint-gpu-vendor="NVIDIA Corporation"` |
| `--fingerprint-gpu-renderer` | String | `--fingerprint-gpu-renderer="NVIDIA GeForce GTX 1060"` |

**Common GPU Vendor/Renderer Combinations**:

```
NVIDIA Corporation / NVIDIA GeForce GTX 1060
NVIDIA Corporation / NVIDIA GeForce RTX 3060
Intel Inc. / Intel(R) UHD Graphics 630
AMD / AMD Radeon RX 580
Google Inc. (ANGLE) / ANGLE (NVIDIA, Direct3D11)
```

### Locale Options

| Flag | Type | Example |
|------|------|---------|
| `--timezone` | IANA timezone | `--timezone="Asia/Kolkata"` |
| `--lang` | Language code | `--lang="hi-IN"` |
| `--accept-lang` | Language list | `--accept-lang="hi-IN,en-US"` |

---

## CLI Arguments Reference

### Example Full Launch Command

```bash
"C:\Program Files\BeastBrowser\bin\chrome.exe" \
  --user-data-dir="C:\Users\YourName\BeastBrowser\ChromeProfiles\profile-001" \
  --fingerprint=123456789 \
  --fingerprint-platform=windows \
  --fingerprint-platform-version="10.0.19045" \
  --fingerprint-brand="Chrome" \
  --fingerprint-brand-version="139.0.7258.154" \
  --fingerprint-hardware-concurrency=8 \
  --fingerprint-gpu-vendor="NVIDIA Corporation" \
  --fingerprint-gpu-renderer="NVIDIA GeForce GTX 1060" \
  --timezone="Asia/Kolkata" \
  --lang="hi-IN" \
  --accept-lang="hi-IN,en-US" \
  --proxy-server="http://proxy.example.com:8080" \
  --disable-non-proxied-udp \
  --window-size=1920,1080 \
  --no-first-run \
  --disable-blink-features=AutomationControlled
```

### Required Arguments

- `--user-data-dir=<path>` - **ALWAYS REQUIRED** - Isolated profile directory

### Optional Arguments (Only Added If Configured)

All fingerprint flags are optional. BeastBrowser only includes flags with non-empty values.

---

## Proxy Configuration

### Via Beast Proxy Manager (Recommended)

**Handles authentication automatically** - No credentials exposed in CLI

1. Configure proxy in Beast proxy manager
2. Enable "Use Beast Proxy Manager" in profile settings
3. BeastBrowser injects authentication via local tunnel or extension

### Via --proxy-server Flag

**For non-authenticated proxies only**:

```
--proxy-server="http://proxy.example.com:8080"
--proxy-server="socks5://socks-proxy.example.com:1080"
```

**⚠️ Warning**: `--proxy-server` does NOT support username/password in the CLI for security reasons.

### Proxy with Authentication

**Option A**: Use Beast Proxy Manager (recommended)

**Option B**: Set up local auth tunnel:

```javascript
// Use proxy-chain or similar to create local tunnel
const proxyChain = require('proxy-chain');

const proxyUrl = 'http://username:password@proxy.example.com:8080';
const localProxy = await proxyChain.anonymizeProxy(proxyUrl);
// Returns: http://127.0.0.1:XXXX (no auth required)

// Then use in Chrome:
--proxy-server="${localProxy}"
```

**Option C**: Browser extension (inject Proxy-Authorization header)

### WebRTC Leak Prevention

**Always include when using proxy**:

```
--disable-non-proxied-udp
--enforce-webrtc-ip-permission-check
```

This prevents WebRTC from leaking your real IP outside the proxy tunnel.

---

## Testing

### Automated Test Suite

BeastBrowser includes automated tests for validating fingerprint configuration:

#### Via UI

1. Go to profile settings
2. Scroll to "Fingerprint Tests" section
3. Click test buttons:
   - **WebRTC Leak** - Checks for IP leaks
   - **Canvas** - Validates canvas fingerprinting
   - **WebGL** - Checks GPU vendor/renderer
   - **Cloudflare** - Tests bot detection bypass

#### Via Code

```typescript
import { fingerprintTestService } from '@/services/fingerprintTestService';

// Run all tests
const results = await fingerprintTestService.runAllTests(
  'C:\\Program Files\\BeastBrowser\\bin\\chrome.exe',
  'C:\\Users\\YourName\\BeastBrowser\\ChromeProfiles\\test-profile',
  'http://proxy.example.com:8080' // optional
);

console.log('Test Summary:', results.summary);
// { total: 5, passed: 4, failed: 0, warnings: 1 }

// Run single test
const webrtcResult = await fingerprintTestService.quickTest(
  'webrtc',
  chromePath,
  userDataDir,
  proxy
);

if (webrtcResult.passed) {
  console.log('✅ No WebRTC leaks detected');
}
```

### Manual Testing Sites

Visit these sites to validate fingerprint:

1. **CreepJS**: https://abrahamjuliot.github.io/creepjs/
   - Check: GPU vendor/renderer, platform, hardware concurrency

2. **BrowserLeaks Canvas**: https://browserleaks.com/canvas
   - Check: Canvas fingerprint uniqueness

3. **BrowserLeaks WebRTC**: https://browserleaks.com/webrtc
   - Check: No IP leaks, correct proxy IP shown

4. **DeviceInfo**: https://www.deviceinfo.me/
   - Check: Platform, browser brand/version, timezone, language

5. **Cloudflare**: https://www.cloudflare.com/
   - Check: No bot detection challenges

6. **Turnstile Demo**: https://demo.turnstile.workers.dev/
   - Check: Passes CAPTCHA challenges

### GPU Verification

Open DevTools console and run:

```javascript
const canvas = document.createElement('canvas');
const gl = canvas.getContext('webgl');
const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
console.log('Vendor:', gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL));
console.log('Renderer:', gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL));
```

Should match your configured `gpuVendor` and `gpuRenderer`.

---

## Troubleshooting

### Chrome 139 Not Detected

**Check installation path**:
```
C:\Program Files\BeastBrowser\bin\chrome.exe
```

**Verify file exists**:
```powershell
Test-Path "C:\Program Files\BeastBrowser\bin\chrome.exe"
```

**Check version manually**:
```powershell
& "C:\Program Files\BeastBrowser\bin\chrome.exe" --version
```

Should output: `Chromium 139.0.7258.154` or similar

**Alternative paths searched**:
- `C:\Program Files\Google\Chrome\Application\chrome.exe`
- `%LOCALAPPDATA%\BeastBrowser\chrome\chrome.exe`
- `%USERPROFILE%\BeastBrowser\chrome\chrome.exe`

### Profile Won't Launch

**Error: "Chrome 139 runtime not available"**
- Solution: Install Chrome at correct path (see Installation)

**Error: "Profile already running"**
- Solution: Close existing instance first via UI or:
  ```typescript
  await chrome139RuntimeService.closeProfile(profileId);
  ```

**Error: "Profile has crashed repeatedly"**
- Profile marked as faulty (3+ crashes in 60 seconds)
- Solution: Check logs at `%USERPROFILE%\BeastBrowser\logs\runtime\<profileId>-<timestamp>.log`
- Common causes:
  - Invalid GPU strings
  - Incompatible flags for Chrome version
  - Profile directory locked by another process

### Profile Directory Locked

**Error: "Cannot launch - user data directory is locked"**

**Cause**: Previous Chrome instance didn't close cleanly

**Solution**:
```powershell
# Find and kill Chrome processes
Get-Process chrome | Where-Object {$_.Path -like "*BeastBrowser*"} | Stop-Process -Force

# Or delete lock file (ONLY if Chrome is not running)
Remove-Item "$env:USERPROFILE\BeastBrowser\ChromeProfiles\profile-001\SingletonLock"
```

### Incompatible GPU Strings

**Symptom**: Browser crashes immediately after launch

**Cause**: GPU vendor/renderer combination is invalid or not recognized by Chrome

**Solution**:
1. Use "Generate GPU Strings" button in UI for known-good combinations
2. Or use empty GPU strings (Chrome will use real GPU)
3. Check logs for specific GPU error messages

**Valid patterns**:
```
✅ NVIDIA Corporation + NVIDIA GeForce <model>
✅ Intel Inc. + Intel(R) UHD Graphics <version>
✅ AMD + AMD Radeon <model>
❌ NVIDIA + Intel Graphics (mismatched vendor/renderer)
❌ RandomVendor + RandomRenderer (unknown vendor)
```

### Proxy Connection Failed

**Symptom**: Browser launches but sites don't load or timeout

**Check proxy configuration**:
1. Verify proxy host/port are correct
2. Test proxy separately: `curl --proxy http://proxy.example.com:8080 https://api.ipify.org`
3. Check proxy requires authentication → use Beast Proxy Manager
4. Check logs for proxy connection errors

**For SOCKS5**:
- Beast automatically creates local HTTP tunnel
- Check tunnel status in logs

**For authenticated HTTP**:
- Must use Beast Proxy Manager or local tunnel
- DO NOT put credentials in `--proxy-server` flag

### Fingerprint Not Working

**Symptom**: Sites detect bot or fingerprint matches real system

**Verify flags are applied**:
1. Check launch logs: `%USERPROFILE%\BeastBrowser\logs\runtime\<profileId>-<timestamp>.log`
2. Look for line: `Args: [...]` - verify your flags are present
3. Check Chrome version supports the flags (GPU flags require 139+)

**Test fingerprint**:
1. Visit https://abrahamjuliot.github.io/creepjs/
2. Verify:
   - Platform matches configured platform
   - Hardware concurrency matches configured value
   - GPU vendor/renderer match (if configured)
   - Timezone matches configured timezone

**Common issues**:
- Fingerprint seed not changing → Clear profile data and relaunch
- GPU not spoofed → Check version is 139+ and GPU flags are valid
- Platform detected as real system → Verify `--fingerprint-platform` is included in args

### High Memory Usage

**Cause**: Multiple Chrome 139 profiles running

**Solution**:
```typescript
// Close all Chrome 139 profiles
await chrome139RuntimeService.closeAll();
```

**Per-profile**:
- Each Chrome profile uses ~200-500MB RAM
- Limit concurrent profiles to: Available RAM / 500MB

### Cannot Read Logs

**Location**: 
```
%USERPROFILE%\BeastBrowser\logs\runtime\<profileId>-<timestamp>.log
```

**View in PowerShell**:
```powershell
Get-Content "$env:USERPROFILE\BeastBrowser\logs\runtime\profile-001-*.log" -Tail 50
```

**Logs contain**:
- Launch arguments
- Chrome stdout/stderr
- Exit codes
- Crash information

---

## Legal & Ethics

### ⚠️ Important Notice

Advanced fingerprint spoofing and anti-detection technologies **must be used responsibly and legally**.

### Legal Compliance

**You must comply with all applicable laws**, including:
- Computer Fraud and Abuse Act (CFAA)
- Terms of Service of websites you visit
- Data protection regulations (GDPR, CCPA, etc.)
- Anti-bot and anti-scraping policies
- Local and international laws in your jurisdiction

### Prohibited Uses

**DO NOT use these features for**:
- Unauthorized access to systems
- Fraud or identity theft
- Creating fake accounts for malicious purposes
- Evading security to cause harm
- Violating website terms of service
- Any illegal activity

### Legitimate Uses

**Acceptable use cases include**:
- Privacy protection and personal anonymity
- Security research and testing (with authorization)
- Web scraping of public data (respecting robots.txt)
- Automated testing of your own applications
- Research and educational purposes

### Acceptance

By enabling Chrome 139 advanced fingerprinting features, you acknowledge that:

1. You have read and understood these legal requirements
2. You will comply with all applicable laws and regulations
3. You will not use these features for illegal activities
4. You accept full responsibility for your actions
5. BeastBrowser is not liable for your use of these tools

**The software is provided "as is" without warranty.**

---

## Support & Resources

### Documentation
- Main README: `README.md`
- Profile Storage Guide: `PROFILE_STORAGE_GUIDE.md`
- Export/Import Guide: `PROFILE_EXPORT_IMPORT_GUIDE.md`

### Community
- GitHub Issues: https://github.com/rohitmen394/beastbrowser/issues
- Discussions: https://github.com/rohitmen394/beastbrowser/discussions

### Logs & Debugging
- Runtime logs: `%USERPROFILE%\BeastBrowser\logs\runtime\`
- Main logs: Check Electron console in DevTools

### Version Compatibility
- Chrome 100-138: Basic fingerprinting (no GPU flags)
- Chrome 139+: Full fingerprinting including GPU spoofing
- Recommended: ungoogled-chromium 139.0.7258.154

---

## Quick Reference Card

### Installation Checklist
- [ ] Install chrome.exe at `C:\Program Files\BeastBrowser\bin\chrome.exe`
- [ ] Verify detection in BeastBrowser UI (green checkmark)
- [ ] Read and accept legal/ethics warning
- [ ] Configure first profile with Chrome 139 runtime

### Launch Checklist
- [ ] Select "Chrome 139" runtime
- [ ] Generate or enter fingerprint seed
- [ ] Configure platform, brand, GPU (optional)
- [ ] Set timezone and language
- [ ] Configure proxy (via Beast proxy manager)
- [ ] Enable WebRTC protection
- [ ] Run fingerprint tests
- [ ] Launch profile

### Testing Checklist
- [ ] WebRTC leak test (no IP leaks)
- [ ] Canvas fingerprint (unique)
- [ ] WebGL vendor/renderer (matches config)
- [ ] Cloudflare (no bot detection)
- [ ] Manual check on CreepJS

### Troubleshooting Checklist
- [ ] Check runtime detection status
- [ ] Verify Chrome 139+ installed
- [ ] Check launch logs for errors
- [ ] Verify flags in launch arguments
- [ ] Test proxy separately
- [ ] Clear profile directory if locked
- [ ] Use valid GPU vendor/renderer combinations

---

**Last Updated**: October 14, 2025  
**Version**: 2.0.2  
**Chrome Version**: 139.0.7258.154
