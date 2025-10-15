# Timezone Reference for Proxy Locations

## 🌍 Common Timezone Settings by Country/Region

### United States
| City/State | Timezone | UTC Offset |
|------------|----------|------------|
| Los Angeles, San Francisco (Pacific) | `America/Los_Angeles` | UTC-8 / UTC-7 (DST) |
| New York, Boston (Eastern) | `America/New_York` | UTC-5 / UTC-4 (DST) |
| Chicago, Dallas (Central) | `America/Chicago` | UTC-6 / UTC-5 (DST) |
| Denver, Phoenix (Mountain) | `America/Denver` | UTC-7 / UTC-6 (DST) |
| Honolulu, Hawaii | `Pacific/Honolulu` | UTC-10 |
| Anchorage, Alaska | `America/Anchorage` | UTC-9 / UTC-8 (DST) |

### Europe
| City/Country | Timezone | UTC Offset |
|------------|----------|------------|
| London, UK | `Europe/London` | UTC+0 / UTC+1 (DST) |
| Paris, France | `Europe/Paris` | UTC+1 / UTC+2 (DST) |
| Berlin, Germany | `Europe/Berlin` | UTC+1 / UTC+2 (DST) |
| Amsterdam, Netherlands | `Europe/Amsterdam` | UTC+1 / UTC+2 (DST) |
| Moscow, Russia | `Europe/Moscow` | UTC+3 |
| Istanbul, Turkey | `Europe/Istanbul` | UTC+3 |

### Asia
| City/Country | Timezone | UTC Offset |
|------------|----------|------------|
| Dubai, UAE | `Asia/Dubai` | UTC+4 |
| Mumbai, India | `Asia/Kolkata` | UTC+5:30 |
| Singapore | `Asia/Singapore` | UTC+8 |
| Hong Kong | `Asia/Hong_Kong` | UTC+8 |
| Tokyo, Japan | `Asia/Tokyo` | UTC+9 |
| Seoul, South Korea | `Asia/Seoul` | UTC+9 |

### Australia
| City/State | Timezone | UTC Offset |
|------------|----------|------------|
| Sydney, Melbourne | `Australia/Sydney` | UTC+10 / UTC+11 (DST) |
| Perth | `Australia/Perth` | UTC+8 |
| Brisbane | `Australia/Brisbane` | UTC+10 |

### Americas (Other)
| City/Country | Timezone | UTC Offset |
|------------|----------|------------|
| Toronto, Canada | `America/Toronto` | UTC-5 / UTC-4 (DST) |
| Mexico City, Mexico | `America/Mexico_City` | UTC-6 / UTC-5 (DST) |
| Buenos Aires, Argentina | `America/Buenos_Aires` | UTC-3 |
| Sao Paulo, Brazil | `America/Sao_Paulo` | UTC-3 / UTC-2 (DST) |

---

## 📋 How to Set Timezone in Profile

### Option 1: Manual Profile Configuration (Frontend)
Add timezone field to profile creation form:
```javascript
{
  "id": "profile_123",
  "timezone": "America/Los_Angeles",  // 👈 Add this
  "proxy": {
    "type": "socks5",
    "host": "us-proxy.example.com",
    "port": 1080
  }
}
```

### Option 2: Automatic (Already Implemented for SOCKS5)
When you create a SOCKS5 profile, it automatically sets:
- **Timezone**: `America/Los_Angeles` (default)
- **WebRTC Protection**: Enabled
- **Proxy Bypass**: Disabled

---

## 🔧 Test Timezone Settings

Visit these sites after launching profile:
1. **`https://browserleaks.com/timezone`** - Shows detected timezone
2. **`https://whoer.net`** - Shows full fingerprint including timezone
3. **`https://ipleak.net`** - Shows IP + timezone consistency

### Expected Results (US Proxy Example):
✅ **IP Location**: United States  
✅ **Timezone**: America/Los_Angeles (or matching US timezone)  
✅ **Time From IP**: PST/PDT time  
✅ **Time From JavaScript**: PST/PDT time (MUST MATCH!)  

---

## ⚠️ Common Timezone Leaks

### ❌ LEAK: Mismatched Timezone
```
IP: United States (California)
Timezone: Asia/Calcutta ← LEAK!
```

### ✅ FIXED: Matched Timezone
```
IP: United States (California)
Timezone: America/Los_Angeles ← CORRECT!
```

---

## 🛠️ Advanced: Geolocation Spoofing

For complete fingerprint consistency, also set GPS coordinates:

| City | Latitude | Longitude |
|------|----------|-----------|
| Los Angeles | 34.0522 | -118.2437 |
| New York | 40.7128 | -74.0060 |
| Chicago | 41.8781 | -87.6298 |
| London | 51.5074 | -0.1278 |
| Paris | 48.8566 | 2.3522 |
| Tokyo | 35.6762 | 139.6503 |

Example profile:
```javascript
{
  "timezone": "America/Los_Angeles",
  "latitude": 34.0522,    // Los Angeles
  "longitude": -118.2437,
  "geoAccuracy": 100      // meters
}
```

---

## 📝 Implementation Status

✅ **Timezone via Chrome flag**: `--timezone=America/Los_Angeles`  
✅ **Timezone via ENV variable**: `TZ=America/Los_Angeles`  
✅ **Auto-set for SOCKS5 proxies**: Default to US Pacific  
✅ **Geolocation spoofing**: `--latitude` / `--longitude` flags  
✅ **WebRTC leak protection**: `--disable-non-proxied-udp`  

---

## 🚀 Quick Fix for Current Issue

**Your problem:** US proxy but India timezone showing

**Solution:**
1. Edit your profile
2. Add: `"timezone": "America/Los_Angeles"`
3. Save and relaunch
4. Visit: `https://browserleaks.com/timezone`
5. Should now show: **America/Los_Angeles** ✅

OR just relaunch - SOCKS5 profiles now auto-set US timezone! 🎯
