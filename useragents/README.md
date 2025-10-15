# User-Agents Directory

This directory contains user-agent strings for different platforms that are automatically injected into Chrome profiles.

## Files

- **windows.txt** - Windows desktop user-agents
- **macos.txt** - macOS desktop user-agents
- **linux.txt** - Linux desktop user-agents
- **android.txt** - Android mobile user-agents
- **ios.txt** - iOS (iPhone/iPad) user-agents
- **tv.txt** - Smart TV user-agents

## How It Works

1. When launching a Chrome 139 profile, the system reads the corresponding txt file based on the selected platform
2. A **random user-agent** is picked from the file
3. The user-agent is injected via `--user-agent=` flag
4. Each profile launch gets a different random user-agent (unless you use the same seed)

## File Format

Each file contains one user-agent per line:

```
Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ...
Mozilla/5.0 (Windows NT 11.0; Win64; x64) AppleWebKit/537.36 ...
Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 ...
```

## Adding Custom User-Agents

You can add your own user-agents to any file:

1. Open the platform txt file (e.g., `windows.txt`)
2. Add one user-agent per line
3. Save the file
4. Next Chrome 139 launch will include your new user-agents in random selection

## Example User-Agents by Platform

### Windows
- Chrome 139 on Windows 10/11 (64-bit, WOW64)
- Edge, Opera, Vivaldi, Brave variations
- Firefox on Windows

### macOS
- Chrome 139 on macOS 10.15, 13.x, 14.x
- Safari on macOS
- Edge, Opera, Vivaldi, Brave for macOS

### Linux
- Chrome 139 on Ubuntu, Fedora, generic Linux
- Firefox on Linux
- Chromium-based browsers on Linux

### Android
- Chrome on Samsung, Pixel, OnePlus, Xiaomi, Vivo, OPPO, Realme
- Latest Android 13/14 versions
- Various screen sizes and device models

### iOS
- Safari on iPhone and iPad
- Chrome (CriOS) on iOS
- iOS 16.x and 17.x versions

### TV
- WebOS (LG Smart TVs)
- Tizen (Samsung Smart TVs)
- Android TV (NVIDIA Shield, Sony Bravia, Mi Box)
- HbbTV (European standard)

## Technical Details

- **Random Selection**: Uses `Math.random()` to pick user-agent
- **Platform Mapping**: Platform name from profile → `{platform}.txt` file
- **Fallback**: If file not found or empty, no user-agent flag is added
- **Bundled**: These files are bundled with the application via electron-builder
- **Location**: 
  - Development: `./useragents/`
  - Production: `app.asar/useragents/` (extracted to app directory)

## Best Practices

1. **Keep Updated**: Update user-agents periodically to match current browser versions
2. **Platform Consistency**: Ensure user-agents match the selected platform
3. **Realistic Strings**: Use real-world user-agents from actual browsers
4. **Variety**: Include 10+ user-agents per platform for better randomization
5. **Testing**: Test user-agents on https://www.whatismybrowser.com/

## Updating User-Agents

To get latest user-agents:

1. Visit: https://www.whatismybrowser.com/guides/the-latest-user-agent/
2. Copy user-agent strings for your target platform
3. Add to corresponding txt file
4. Remove very old or deprecated user-agents

## No Auto-Update

These files do **not** auto-update. You need to manually update them when:
- New browser versions release
- Old user-agents become suspicious
- You want to target specific browsers/versions

---

**Last Updated**: October 14, 2025  
**Chrome Version**: 139.0.7258.154  
**Total User-Agents**: 60 (10 per platform)
