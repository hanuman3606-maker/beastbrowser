# Chrome 139 Quick Start Guide

Get up and running with Chrome 139 advanced fingerprinting in 5 minutes.

---

## Step 1: Launch BeastBrowser (30 seconds) ✨ AUTO-INSTALL

**NO MANUAL INSTALLATION NEEDED!** 🎉

Chrome 139 is **bundled** with BeastBrowser and **auto-extracts** on first run.

1. **Just launch BeastBrowser** - That's it!
2. **First run**: Chrome automatically extracts to `C:\Program Files\BeastBrowser\bin\`
3. **Check status**: Look for "Chrome 139 Available ✅" in Runtime Selection

⚠️ **Note**: First extraction takes ~30 seconds. Subsequent launches are instant.

### Manual Verification (Optional)

```powershell
& "C:\Program Files\BeastBrowser\bin\chrome.exe" --version
```
Should output: `Chromium 139.0.7258.154`

---

## Step 2: Create/Edit Profile (30 seconds)

1. Open BeastBrowser
2. Create a new profile or edit existing one
3. Look for **"Runtime Selection"** section

**You should see**:
- ✅ Chrome 139 Available (green checkmark)
- Version: 139
- Path displayed
- "Fingerprint Flags Supported" badge

**If not detected**:
- Reinstall to correct path
- Restart BeastBrowser
- See [troubleshooting](CHROME139_INTEGRATION_GUIDE.md#troubleshooting)

---

## Step 3: Configure Fingerprint (2 minutes)

### Option A: Quick Setup (Recommended)

1. Select runtime: **Chrome 139**
2. Click **"Generate"** next to Fingerprint Seed
3. Click **"Generate"** next to GPU Fingerprinting
4. Set timezone: `Asia/Kolkata` (or your preferred timezone)
5. Done! ✅

### Option B: Custom Setup

Configure each option manually:

```
Runtime:              Chrome 139
Fingerprint Seed:     123456789
Platform:             Windows
Platform Version:     10.0.19045
Browser Brand:        Chrome
Brand Version:        139.0.7258.154
Hardware Concurrency: 8
GPU Vendor:           NVIDIA Corporation
GPU Renderer:         NVIDIA GeForce GTX 1060
Timezone:             Asia/Kolkata
Language:             hi-IN
Accept Languages:     hi-IN,en-US
Window Size:          1920 x 1080
```

**Toggles**:
- ✅ Use Beast Proxy Manager (if you have proxies configured)
- ⬜ Local Auth Tunnel (only if proxy requires it)
- ⬜ Auto GPU from Seed (experimental)

---

## Step 4: Accept Legal Notice (30 seconds)

When you enable Chrome 139 for the first time:

1. **Read the legal notice** carefully
2. **Check all 3 boxes**:
   - ☑ Legal compliance
   - ☑ No illegal use
   - ☑ Full responsibility
3. Click **"Accept & Enable Features"**

⚠️ **Important**: Only use for legal purposes. See [Legal & Ethics](CHROME139_INTEGRATION_GUIDE.md#legal--ethics).

---

## Step 5: Test & Launch (1 minute)

### Run Quick Tests

Click the test buttons to validate your fingerprint:

- **WebRTC Leak** - Should show ✅ (no leaks)
- **Canvas** - Should show ✅ (fingerprint generated)
- **WebGL** - Should show ✅ (GPU spoofed if configured)
- **Cloudflare** - Should show ✅ or ⚠️ (depends on IP)

### Launch Profile

1. Click **"Launch Profile"** or **"Open Browser"**
2. Profile opens in new Chrome 139 window
3. Check taskbar - should show BeastBrowser icon

**Verify it's working**:
- Go to: https://abrahamjuliot.github.io/creepjs/
- Check: Platform, Hardware Concurrency, GPU match your config
- Go to: https://browserleaks.com/webrtc
- Check: No IP leaks detected

---

## Common Use Cases

### Use Case 1: Privacy Browsing with Random Fingerprint

```
Runtime:         Chrome 139
Fingerprint:     [Generate Random]
Platform:        Windows
GPU:             [Generate Random]
Proxy:           Via Beast Proxy Manager
WebRTC:          ✅ Disable non-proxied UDP
```

**Launch** → Each session has unique fingerprint but consistent per seed.

---

### Use Case 2: Testing with Specific Fingerprint

```
Runtime:         Chrome 139
Fingerprint:     999999999 (consistent seed)
Platform:        Windows
Platform Version: 10.0.19045
GPU Vendor:      NVIDIA Corporation
GPU Renderer:    NVIDIA GeForce GTX 1060
Timezone:        America/New_York
```

**Launch** → Same fingerprint every time (for testing).

---

### Use Case 3: Bot Detection Testing

```
Runtime:         Chrome 139
Fingerprint:     [Generate Random]
Platform:        Windows
Brand:           Chrome
Brand Version:   139.0.7258.154
Hardware Cores:  8
GPU:             [Generate Random]
Proxy:           ✅ Enabled
```

**Test Sites**:
- Cloudflare
- Turnstile
- reCAPTCHA
- Custom bot detection

---

## Troubleshooting (Quick Fixes)

### ❌ "Chrome 139 Not Available"

**Fix**:
```powershell
# Check if file exists
Test-Path "C:\Program Files\BeastBrowser\bin\chrome.exe"

# If False, reinstall to correct path
```

### ❌ "Profile has crashed repeatedly"

**Fix**:
1. Check logs: `%USERPROFILE%\BeastBrowser\logs\runtime\`
2. Try without GPU flags (remove GPU vendor/renderer)
3. Use default GPU (leave fields empty)

### ❌ "Proxy not working"

**Fix**:
1. Enable "Use Beast Proxy Manager"
2. Disable "Use builtin --proxy-server"
3. Test proxy separately in Beast proxy settings

### ❌ "Fingerprint not changing"

**Fix**:
1. Generate new random seed
2. Clear profile data
3. Close and relaunch profile

---

## Advanced Features

### Automated Testing Script

Run from project root:

```bash
# Quick test (runtime detection + launch only)
node test-chrome139-integration.js --quick

# Full test suite (includes fingerprint validation)
node test-chrome139-integration.js

# Single test
node test-chrome139-integration.js --test=webrtc
```

### Check Logs

View recent logs:
```powershell
# Latest log
Get-ChildItem "$env:USERPROFILE\BeastBrowser\logs\runtime" | 
  Sort-Object LastWriteTime -Descending | 
  Select-Object -First 1 | 
  Get-Content -Tail 50
```

### Bulk Profile Creation with Chrome 139

1. Click **"Bulk Create"**
2. Set count: 10
3. In template profile:
   - Runtime: Chrome 139
   - Fingerprint: [Generate Random] (each profile gets unique seed)
4. Create all at once

Each profile gets:
- Unique fingerprint seed
- Isolated user data directory
- Independent Chrome process

---

## Verification Checklist

After setup, verify everything works:

- [ ] ✅ Chrome 139 detected in UI (green checkmark)
- [ ] ✅ Legal notice accepted
- [ ] ✅ Fingerprint configured (seed + GPU)
- [ ] ✅ WebRTC test passes (no leaks)
- [ ] ✅ Canvas test passes (fingerprint generated)
- [ ] ✅ WebGL test passes (if GPU configured)
- [ ] ✅ Profile launches successfully
- [ ] ✅ CreepJS shows correct fingerprint
- [ ] ✅ BrowserLeaks shows no WebRTC leaks
- [ ] ✅ Logs created at `%USERPROFILE%\BeastBrowser\logs\runtime\`

---

## Next Steps

1. **Read full guide**: [CHROME139_INTEGRATION_GUIDE.md](CHROME139_INTEGRATION_GUIDE.md)
2. **Configure proxies**: See [Proxy Configuration](CHROME139_INTEGRATION_GUIDE.md#proxy-configuration)
3. **Run full tests**: Visit all test sites manually
4. **Create profiles**: Bulk create with different fingerprints
5. **Monitor logs**: Check for errors or crashes

---

## Support

**Issues?**
- Check logs: `%USERPROFILE%\BeastBrowser\logs\runtime\`
- See full guide: [CHROME139_INTEGRATION_GUIDE.md](CHROME139_INTEGRATION_GUIDE.md)
- Report bugs: [GitHub Issues](https://github.com/rohitmen394/beastbrowser/issues)

**Documentation**:
- 📘 [Full Integration Guide](CHROME139_INTEGRATION_GUIDE.md)
- 📋 [Implementation Summary](CHROME139_IMPLEMENTATION_SUMMARY.md)
- 📖 [Main README](README.md)

---

**Ready to go!** 🚀

You now have Chrome 139 with advanced anti-detection fingerprinting fully configured and tested.

**Enjoy secure, anonymous browsing! 🦁**
