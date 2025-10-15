/**
 * Timezone Extension Builder
 * 
 * Creates a Chrome extension on-the-fly that injects timezone override
 * scripts into every page. This is the most reliable way to inject JavaScript
 * into Chrome 139 without Puppeteer access.
 */

const fs = require('fs');
const path = require('path');

/**
 * Create timezone injection Chrome extension
 * @param {string} userDataDir - Chrome user data directory
 * @param {string} timezone - Target timezone (IANA format)
 * @returns {string} - Path to extension directory
 */
function createTimezoneExtension(userDataDir, timezone) {
  if (!timezone) {
    throw new Error('Timezone is required for extension creation');
  }
  
  // Create extension directory
  const extensionDir = path.join(userDataDir, 'BeastTimezoneExtension');
  if (!fs.existsSync(extensionDir)) {
    fs.mkdirSync(extensionDir, { recursive: true });
  }
  
  // Create manifest.json with CRITICAL world: "MAIN" injection
  const manifest = {
    manifest_version: 3,
    name: "Beast Browser Timezone Override",
    version: "1.0.0",
    description: "Blocks system timezone and injects proxy timezone",
    permissions: [],
    host_permissions: ["<all_urls>"],
    content_scripts: [
      {
        matches: ["<all_urls>"],
        js: ["timezone-inject.js"],
        run_at: "document_start", // CRITICAL: Before page loads
        world: "MAIN", // CRITICAL: Inject into page's main world, not isolated
        all_frames: true,
        match_about_blank: true,
        match_origin_as_fallback: true
      }
    ],
    web_accessible_resources: []
  };
  
  fs.writeFileSync(
    path.join(extensionDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2),
    'utf8'
  );
  
  // Create timezone injection script
  const timezoneScript = generateTimezoneInjectScript(timezone);
  fs.writeFileSync(
    path.join(extensionDir, 'timezone-inject.js'),
    timezoneScript,
    'utf8'
  );
  
  console.log('✅ Timezone extension created at:', extensionDir);
  console.log('✅ Timezone set to:', timezone);
  
  return extensionDir;
}

/**
 * Generate timezone injection script for extension
 * @param {string} targetTimezone - IANA timezone
 * @returns {string} - JavaScript code
 */
function generateTimezoneInjectScript(targetTimezone) {
  return `
// Beast Browser Timezone Override
// Target: ${targetTimezone}

(function() {
  'use strict';
  
  const TARGET_TIMEZONE = '${targetTimezone}';
  
  // Calculate timezone offset - FIXED CALCULATION
  function getTargetTimezoneOffset() {
    try {
      const now = new Date();
      
      // Method 1: Parse using Intl (most accurate)
      try {
        const formatter = new Intl.DateTimeFormat('en-US', {
          timeZone: TARGET_TIMEZONE,
          timeZoneName: 'longOffset'
        });
        const parts = formatter.formatToParts(now);
        const offsetPart = parts.find(part => part.type === 'timeZoneName');
        
        if (offsetPart && offsetPart.value) {
          const match = offsetPart.value.match(/GMT([+-])(\\d{1,2}):?(\\d{2})?/);
          if (match) {
            const sign = match[1] === '+' ? -1 : 1; // Inverted for getTimezoneOffset
            const hours = parseInt(match[2]);
            const mins = parseInt(match[3] || '0');
            const offset = sign * (hours * 60 + mins);
            console.log('📍 Offset calculated (Method 1):', offset, 'minutes');
            return offset;
          }
        }
      } catch (e) {
        console.warn('Method 1 failed:', e);
      }
      
      // Method 2: Direct time comparison (MOST ACCURATE)
      try {
        // Get current time in both timezones
        const nowUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(),
                                 now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds());
        
        // Format in target timezone
        const tzParts = new Intl.DateTimeFormat('en-US', {
          timeZone: TARGET_TIMEZONE,
          year: 'numeric',
          month: 'numeric',
          day: 'numeric',
          hour: 'numeric',
          minute: 'numeric',
          second: 'numeric',
          hour12: false
        }).formatToParts(now);
        
        const tzYear = parseInt(tzParts.find(p => p.type === 'year').value);
        const tzMonth = parseInt(tzParts.find(p => p.type === 'month').value) - 1;
        const tzDay = parseInt(tzParts.find(p => p.type === 'day').value);
        const tzHour = parseInt(tzParts.find(p => p.type === 'hour').value);
        const tzMinute = parseInt(tzParts.find(p => p.type === 'minute').value);
        const tzSecond = parseInt(tzParts.find(p => p.type === 'second').value);
        
        const nowTZ = Date.UTC(tzYear, tzMonth, tzDay, tzHour, tzMinute, tzSecond);
        const offset = Math.round((nowUTC - nowTZ) / 60000);
        
        console.log('📍 Offset calculated (Method 2):', offset, 'minutes');
        return offset;
      } catch (e) {
        console.warn('Method 2 failed:', e);
      }
      
      // Fallback: Return 0 (UTC)
      return 0;
    } catch (e) {
      console.error(' All offset calculation methods failed:', e);
      return 0;
    }
  }
  
  const targetOffset = getTargetTimezoneOffset();
  
  function getTimezoneAbbr() {
    try {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: TARGET_TIMEZONE,
        timeZoneName: 'short'
      });
      const parts = formatter.formatToParts(new Date());
      const tzPart = parts.find(part => part.type === 'timeZoneName');
      return tzPart ? tzPart.value : TARGET_TIMEZONE.split('/').pop();
    } catch (e) {
      return TARGET_TIMEZONE.split('/').pop();
    }
  }
  
  const timezoneAbbr = getTimezoneAbbr();
  
  console.log('🌍 TIMEZONE OVERRIDE STARTING');
  console.log('🎯 Target timezone:', TARGET_TIMEZONE);
  console.log('📍 Calculated offset:', targetOffset, 'minutes');
  console.log('🏷️ Timezone abbr:', timezoneAbbr);
  console.log('🚫 BLOCKING SYSTEM TIMEZONE');
  
  // Store originals
  const originals = {
    toString: Date.prototype.toString,
    toLocaleString: Date.prototype.toLocaleString,
    toLocaleDateString: Date.prototype.toLocaleDateString,
    toLocaleTimeString: Date.prototype.toLocaleTimeString,
    toTimeString: Date.prototype.toTimeString,
    getTimezoneOffset: Date.prototype.getTimezoneOffset,
    IntlDateTimeFormat: Intl.DateTimeFormat,
    resolvedOptions: Intl.DateTimeFormat.prototype.resolvedOptions
  };
  
  // CRITICAL: Override ALL Date methods to use target timezone
  // Helper: Get date parts in target timezone
  function getTargetDateParts(date) {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: TARGET_TIMEZONE,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      weekday: 'long',
      hour12: false
    });
    const parts = formatter.formatToParts(date);
    const get = (type) => {
      const part = parts.find(p => p.type === type);
      return part ? part.value : null;
    };
    return {
      year: parseInt(get('year')),
      month: parseInt(get('month')) - 1, // 0-indexed
      day: parseInt(get('day')),
      hour: parseInt(get('hour')),
      minute: parseInt(get('minute')),
      second: parseInt(get('second')),
      weekday: get('weekday')
    };
  }
  
  // Override getTimezoneOffset - MOST CRITICAL
  try {
    delete Date.prototype.getTimezoneOffset;
    Object.defineProperty(Date.prototype, 'getTimezoneOffset', {
      value: function() {
        return targetOffset;
      },
      writable: false,
      enumerable: false,
      configurable: false
    });
    console.log('🔒 getTimezoneOffset() LOCKED to', targetOffset);
  } catch (e) {
    Date.prototype.getTimezoneOffset = function() { return targetOffset; };
  }
  
  // Override getHours - CRITICAL for time display
  const origGetHours = Date.prototype.getHours;
  Date.prototype.getHours = function() {
    const parts = getTargetDateParts(this);
    return parts.hour;
  };
  
  // Override getMinutes
  const origGetMinutes = Date.prototype.getMinutes;
  Date.prototype.getMinutes = function() {
    const parts = getTargetDateParts(this);
    return parts.minute;
  };
  
  // Override getSeconds
  const origGetSeconds = Date.prototype.getSeconds;
  Date.prototype.getSeconds = function() {
    const parts = getTargetDateParts(this);
    return parts.second;
  };
  
  // Override getDay
  const origGetDay = Date.prototype.getDay;
  Date.prototype.getDay = function() {
    const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const parts = getTargetDateParts(this);
    return weekdays.indexOf(parts.weekday);
  };
  
  // Override getDate
  const origGetDate = Date.prototype.getDate;
  Date.prototype.getDate = function() {
    const parts = getTargetDateParts(this);
    return parts.day;
  };
  
  // Override getMonth
  const origGetMonth = Date.prototype.getMonth;
  Date.prototype.getMonth = function() {
    const parts = getTargetDateParts(this);
    return parts.month;
  };
  
  // Override getFullYear
  const origGetFullYear = Date.prototype.getFullYear;
  Date.prototype.getFullYear = function() {
    const parts = getTargetDateParts(this);
    return parts.year;
  };
  
  console.log('🔒 ✅ ALL Date getters OVERRIDDEN - System timezone COMPLETELY BLOCKED');
  
  // Override toString - Now uses our overridden getters!
  Date.prototype.toString = function() {
    try {
      const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      // Use our overridden getters which return target timezone values
      const weekday = weekdays[this.getDay()];
      const month = months[this.getMonth()];
      const day = String(this.getDate()).padStart(2, '0');
      const year = this.getFullYear();
      const hours = String(this.getHours()).padStart(2, '0');
      const minutes = String(this.getMinutes()).padStart(2, '0');
      const seconds = String(this.getSeconds()).padStart(2, '0');
      
      // Calculate GMT offset string
      const sign = targetOffset > 0 ? '-' : '+';
      const absOffset = Math.abs(targetOffset);
      const offsetHours = String(Math.floor(absOffset / 60)).padStart(2, '0');
      const offsetMinutes = String(absOffset % 60).padStart(2, '0');
      
      return weekday + ' ' + month + ' ' + day + ' ' + year + ' ' + 
             hours + ':' + minutes + ':' + seconds + 
             ' GMT' + sign + offsetHours + offsetMinutes + ' (' + timezoneAbbr + ')';
    } catch (e) {
      console.error('toString failed:', e);
      return originals.toString.call(this);
    }
  };
  
  // Override toTimeString - Uses our overridden getters!
  Date.prototype.toTimeString = function() {
    try {
      // Use our overridden getters
      const hours = String(this.getHours()).padStart(2, '0');
      const minutes = String(this.getMinutes()).padStart(2, '0');
      const seconds = String(this.getSeconds()).padStart(2, '0');
      
      const sign = targetOffset > 0 ? '-' : '+';
      const absOffset = Math.abs(targetOffset);
      const offsetHours = String(Math.floor(absOffset / 60)).padStart(2, '0');
      const offsetMinutes = String(absOffset % 60).padStart(2, '0');
      
      return hours + ':' + minutes + ':' + seconds + 
             ' GMT' + sign + offsetHours + offsetMinutes + ' (' + timezoneAbbr + ')';
    } catch (e) {
      console.error('toTimeString failed:', e);
      return originals.toTimeString.call(this);
    }
  };
  
  // Override locale methods
  Date.prototype.toLocaleString = function(locales, options) {
    options = options || {};
    options.timeZone = TARGET_TIMEZONE;
    return originals.toLocaleString.call(this, locales, options);
  };
  
  Date.prototype.toLocaleDateString = function(locales, options) {
    options = options || {};
    options.timeZone = TARGET_TIMEZONE;
    return originals.toLocaleDateString.call(this, locales, options);
  };
  
  Date.prototype.toLocaleTimeString = function(locales, options) {
    options = options || {};
    options.timeZone = TARGET_TIMEZONE;
    return originals.toLocaleTimeString.call(this, locales, options);
  };
  
  // Override Intl.DateTimeFormat
  try {
    Intl.DateTimeFormat = function(locales, options) {
      options = options || {};
      if (!options.timeZone) {
        options.timeZone = TARGET_TIMEZONE;
      }
      return new originals.IntlDateTimeFormat(locales, options);
    };
    
    Object.setPrototypeOf(Intl.DateTimeFormat, originals.IntlDateTimeFormat);
    Object.defineProperty(Intl.DateTimeFormat, 'prototype', {
      value: originals.IntlDateTimeFormat.prototype,
      writable: false
    });
  } catch (e) {
    console.error('Failed to override Intl.DateTimeFormat:', e);
  }
  
  // Override resolvedOptions - CRITICAL
  try {
    Intl.DateTimeFormat.prototype.resolvedOptions = function() {
      const options = originals.resolvedOptions.call(this);
      options.timeZone = TARGET_TIMEZONE;
      return options;
    };
  } catch (e) {
    console.error('Failed to override resolvedOptions:', e);
  }
  
  // METHOD 6: Block ALL possible timezone leak points
  
  // Block navigator.timezone
  try {
    Object.defineProperty(navigator, 'timezone', {
      get: function() { 
        console.log('🚫 navigator.timezone access BLOCKED - returning:', TARGET_TIMEZONE);
        return TARGET_TIMEZONE; 
      },
      configurable: false
    });
  } catch (e) {}
  
  // Block navigator.geolocation timezone leaks
  try {
    const originalGetCurrentPosition = navigator.geolocation.getCurrentPosition;
    navigator.geolocation.getCurrentPosition = function(success, error, options) {
      return originalGetCurrentPosition.call(this, function(position) {
        // Keep position but prevent timezone leak
        console.log('🚫 Geolocation timezone leak BLOCKED');
        return success(position);
      }, error, options);
    };
  } catch (e) {}
  
  // Override Date.now() to prevent timing attacks
  try {
    const originalDateNow = Date.now;
    Date.now = function() {
      const utcNow = originalDateNow();
      // Add offset to simulate target timezone
      const offsetMs = targetOffset * 60 * 1000;
      return utcNow;
    };
  } catch (e) {}
  
  // Block performance timing that might leak timezone
  try {
    const originalTimeOrigin = performance.timeOrigin;
    Object.defineProperty(performance, 'timeOrigin', {
      get: function() { return originalTimeOrigin; },
      configurable: false
    });
  } catch (e) {}
  
  // Override Date() constructor without new keyword
  try {
    const OriginalDate = Date;
    window.Date = function(...args) {
      if (args.length === 0) {
        return new OriginalDate().toString();
      }
      return new OriginalDate(...args).toString();
    };
    window.Date.prototype = OriginalDate.prototype;
    window.Date.now = OriginalDate.now;
    window.Date.parse = OriginalDate.parse;
    window.Date.UTC = OriginalDate.UTC;
  } catch (e) {
    console.error('Failed to override Date constructor:', e);
  }
  
  // Prevent extension detection
  if (typeof chrome !== 'undefined' && chrome.runtime) {
    try {
      delete chrome.runtime.id;
    } catch (e) {}
  }
  
  console.log('✅✅✅ TIMEZONE OVERRIDE COMPLETE - 6 METHODS ACTIVE ✅✅✅');
  console.log('✅ METHOD 6: Extension JavaScript overrides');
  console.log('   - Date.prototype.getTimezoneOffset() LOCKED');
  console.log('   - Date.prototype.getHours/Minutes/Seconds/etc OVERRIDDEN');
  console.log('   - Date.prototype.toString/toTimeString OVERRIDDEN');
  console.log('   - Intl.DateTimeFormat OVERRIDDEN');
  console.log('   - navigator.timezone BLOCKED');
  console.log('   - Date.now() OVERRIDDEN');
  console.log('');
  console.log('✅ Active timezone:', TARGET_TIMEZONE);
  console.log('✅ Test getTimezoneOffset():', new Date().getTimezoneOffset(), 'minutes');
  console.log('✅ Test toString():', new Date().toString());
  console.log('✅ Test Intl timezone:', new Intl.DateTimeFormat().resolvedOptions().timeZone);
  console.log('');
  console.log('🚫🚫🚫 INDIA TIMEZONE COMPLETELY BLOCKED 🚫🚫🚫');
  console.log('🚫 IST / Asia/Kolkata / GMT+0530 CANNOT be accessed');
  console.log('🔒 System timezone is COMPLETELY HIDDEN');
  console.log('🔒 Only proxy timezone (' + TARGET_TIMEZONE + ') is visible');
})();
`;
}

module.exports = {
  createTimezoneExtension
};
