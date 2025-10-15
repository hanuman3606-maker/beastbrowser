/**
 * Timezone Injector for Chrome 139
 * 
 * This script creates a timezone override JavaScript file that gets injected
 * into Chrome profiles to properly spoof the timezone based on IP location.
 * 
 * The script overrides all Date and Intl methods to match the target timezone.
 */

const fs = require('fs');
const path = require('path');

/**
 * Generate timezone injection script content
 * @param {string} targetTimezone - IANA timezone (e.g., "America/Los_Angeles")
 * @returns {string} - JavaScript code to inject
 */
function generateTimezoneScript(targetTimezone) {
  return `
(function() {
  'use strict';
  
  console.log('🌍 TIMEZONE OVERRIDE ACTIVE: ${targetTimezone}');
  
  // Calculate timezone offset for target timezone
  function getTargetTimezoneOffset() {
    try {
      const now = new Date();
      // Get offset in minutes (negative for west, positive for east)
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: '${targetTimezone}',
        timeZoneName: 'longOffset'
      });
      const parts = formatter.formatToParts(now);
      const offsetPart = parts.find(part => part.type === 'timeZoneName');
      
      if (offsetPart && offsetPart.value) {
        // Parse GMT+05:30 or GMT-08:00
        const match = offsetPart.value.match(/GMT([+-])(\\d{1,2}):?(\\d{2})?/);
        if (match) {
          const sign = match[1] === '+' ? -1 : 1; // Inverted for getTimezoneOffset
          const hours = parseInt(match[2]);
          const mins = parseInt(match[3] || '0');
          return sign * (hours * 60 + mins);
        }
      }
      
      // Fallback method
      const localDate = new Date(now.toLocaleString('en-US', { timeZone: '${targetTimezone}' }));
      const utcDate = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
      return Math.round((utcDate.getTime() - localDate.getTime()) / 60000);
    } catch (e) {
      console.error('❌ Timezone offset calculation failed:', e);
      return 0;
    }
  }
  
  const targetOffset = getTargetTimezoneOffset();
  console.log('🌍 Target timezone offset:', targetOffset, 'minutes');
  
  // Get timezone abbreviation
  function getTimezoneAbbr() {
    try {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: '${targetTimezone}',
        timeZoneName: 'short'
      });
      const parts = formatter.formatToParts(new Date());
      const tzPart = parts.find(part => part.type === 'timeZoneName');
      return tzPart ? tzPart.value : '${targetTimezone}'.split('/').pop();
    } catch (e) {
      return '${targetTimezone}'.split('/').pop();
    }
  }
  
  const timezoneAbbr = getTimezoneAbbr();
  console.log('🌍 Timezone abbreviation:', timezoneAbbr);
  
  // Store original methods
  const originalDateToString = Date.prototype.toString;
  const originalDateToLocaleString = Date.prototype.toLocaleString;
  const originalDateToLocaleDateString = Date.prototype.toLocaleDateString;
  const originalDateToLocaleTimeString = Date.prototype.toLocaleTimeString;
  const originalDateToTimeString = Date.prototype.toTimeString;
  const originalDateToDateString = Date.prototype.toDateString;
  const originalGetTimezoneOffset = Date.prototype.getTimezoneOffset;
  const originalIntlDateTimeFormat = Intl.DateTimeFormat;
  const originalIntlResolvedOptions = Intl.DateTimeFormat.prototype.resolvedOptions;
  
  // ============================================================================
  // CRITICAL OVERRIDE: Date.prototype.getTimezoneOffset()
  // This is the PRIMARY method that websites check for timezone detection
  // ============================================================================
  Date.prototype.getTimezoneOffset = function() {
    return targetOffset;
  };
  
  // ============================================================================
  // CRITICAL OVERRIDE: Date.prototype.toString()
  // This is what gets displayed in browser console and checks
  // ============================================================================
  Date.prototype.toString = function() {
    try {
      // Create date string in target timezone
      const options = {
        timeZone: '${targetTimezone}',
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      };
      
      const parts = new Intl.DateTimeFormat('en-US', options).formatToParts(this);
      const weekday = parts.find(p => p.type === 'weekday')?.value || '';
      const month = parts.find(p => p.type === 'month')?.value || '';
      const day = parts.find(p => p.type === 'day')?.value || '';
      const year = parts.find(p => p.type === 'year')?.value || '';
      const hour = parts.find(p => p.type === 'hour')?.value || '';
      const minute = parts.find(p => p.type === 'minute')?.value || '';
      const second = parts.find(p => p.type === 'second')?.value || '';
      
      // Format GMT offset (inverted sign for display)
      const sign = targetOffset > 0 ? '-' : '+';
      const absOffset = Math.abs(targetOffset);
      const hours = Math.floor(absOffset / 60);
      const mins = absOffset % 60;
      const gmtStr = 'GMT' + sign + hours.toString().padStart(2, '0') + mins.toString().padStart(2, '0');
      
      return weekday + ' ' + month + ' ' + day + ' ' + year + ' ' + hour + ':' + minute + ':' + second + ' ' + gmtStr + ' (' + timezoneAbbr + ')';
    } catch (e) {
      console.error('Date.toString override error:', e);
      return originalDateToString.call(this);
    }
  };
  
  // ============================================================================
  // Override Date.prototype.toTimeString()
  // ============================================================================
  Date.prototype.toTimeString = function() {
    try {
      const options = {
        timeZone: '${targetTimezone}',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      };
      
      const parts = new Intl.DateTimeFormat('en-US', options).formatToParts(this);
      const hour = parts.find(p => p.type === 'hour')?.value || '';
      const minute = parts.find(p => p.type === 'minute')?.value || '';
      const second = parts.find(p => p.type === 'second')?.value || '';
      
      const sign = targetOffset <= 0 ? '+' : '-';
      const absOffset = Math.abs(targetOffset);
      const hours = Math.floor(absOffset / 60);
      const mins = absOffset % 60;
      const gmtStr = 'GMT' + sign + hours.toString().padStart(2, '0') + mins.toString().padStart(2, '0');
      
      return hour + ':' + minute + ':' + second + ' ' + gmtStr + ' (' + timezoneAbbr + ')';
    } catch (e) {
      return originalDateToTimeString.call(this);
    }
  };
  
  // ============================================================================
  // Override Date locale methods
  // ============================================================================
  Date.prototype.toLocaleString = function(locales, options) {
    options = options || {};
    options.timeZone = '${targetTimezone}';
    return originalDateToLocaleString.call(this, locales, options);
  };
  
  Date.prototype.toLocaleDateString = function(locales, options) {
    options = options || {};
    options.timeZone = '${targetTimezone}';
    return originalDateToLocaleDateString.call(this, locales, options);
  };
  
  Date.prototype.toLocaleTimeString = function(locales, options) {
    options = options || {};
    options.timeZone = '${targetTimezone}';
    return originalDateToLocaleTimeString.call(this, locales, options);
  };
  
  // ============================================================================
  // CRITICAL OVERRIDE: Intl.DateTimeFormat
  // This is what websites use to detect the actual browser timezone
  // ============================================================================
  Intl.DateTimeFormat = function(locales, options) {
    options = options || {};
    if (!options.timeZone) {
      options.timeZone = '${targetTimezone}';
    }
    return new originalIntlDateTimeFormat(locales, options);
  };
  
  // Copy static methods and prototype
  Object.setPrototypeOf(Intl.DateTimeFormat, originalIntlDateTimeFormat);
  Object.defineProperty(Intl.DateTimeFormat, 'prototype', {
    value: originalIntlDateTimeFormat.prototype,
    writable: false
  });
  
  // ============================================================================
  // CRITICAL OVERRIDE: Intl.DateTimeFormat.prototype.resolvedOptions()
  // This is the FINAL CHECK that websites use to verify timezone
  // ============================================================================
  Intl.DateTimeFormat.prototype.resolvedOptions = function() {
    const options = originalIntlResolvedOptions.call(this);
    options.timeZone = '${targetTimezone}';
    return options;
  };
  
  // ============================================================================
  // Additional override: navigator.timezone (non-standard but some sites check)
  // ============================================================================
  if (navigator) {
    try {
      Object.defineProperty(navigator, 'timezone', {
        get: function() { return '${targetTimezone}'; },
        configurable: true
      });
    } catch (e) {}
  }
  
  console.log('✅ TIMEZONE OVERRIDE COMPLETE');
  console.log('✅ All Date and Intl methods now use:', '${targetTimezone}');
  console.log('✅ getTimezoneOffset():', new Date().getTimezoneOffset());
  console.log('✅ Date.toString():', new Date().toString());
  console.log('✅ Intl.DateTimeFormat().resolvedOptions().timeZone:', new Intl.DateTimeFormat().resolvedOptions().timeZone);
})();
`;
}

/**
 * Create timezone injection file in profile's user data directory
 * @param {string} userDataDir - Chrome user data directory path
 * @param {string} timezone - Target timezone
 * @returns {string} - Path to created script file
 */
function createTimezoneInjectionFile(userDataDir, timezone) {
  if (!timezone) {
    throw new Error('Timezone is required');
  }
  
  // Ensure user data directory exists
  if (!fs.existsSync(userDataDir)) {
    fs.mkdirSync(userDataDir, { recursive: true });
  }
  
  // Create scripts directory
  const scriptsDir = path.join(userDataDir, 'scripts');
  if (!fs.existsSync(scriptsDir)) {
    fs.mkdirSync(scriptsDir, { recursive: true });
  }
  
  // Generate script content
  const scriptContent = generateTimezoneScript(timezone);
  const scriptPath = path.join(scriptsDir, 'timezone-override.js');
  
  // Write script file
  fs.writeFileSync(scriptPath, scriptContent, 'utf8');
  console.log('✅ Timezone injection script created:', scriptPath);
  
  return scriptPath;
}

/**
 * Get Chrome args to load the timezone injection script
 * @param {string} scriptPath - Path to timezone script
 * @returns {Array<string>} - Chrome launch args
 */
function getTimezoneInjectionArgs(scriptPath) {
  // Chrome doesn't have a direct --user-script flag, so we need to use
  // content scripts injection via extensions or preferences
  // For now, we'll return the path for manual injection
  return [];
}

module.exports = {
  generateTimezoneScript,
  createTimezoneInjectionFile,
  getTimezoneInjectionArgs
};
