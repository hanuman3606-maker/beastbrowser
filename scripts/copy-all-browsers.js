// Copy all browsers for distribution build
// NOTE: This script is now optional as electron-builder handles this via extraResources
// But can be used for manual/development builds
const fs = require('fs');
const path = require('path');

console.log('🔍 Copying all browsers for final build...');
console.log('ℹ️  Note: electron-builder handles this automatically via extraResources');

const buildDir = path.join(__dirname, '..', 'build-output', 'win-unpacked', 'resources');

// 1. Copy Ungoogled Chromium 139
const chromiumSource = path.join(__dirname, '..', 'ungoogled-chromium_139.0.7258.154-1.1_windows_x64');
const chromiumDest = path.join(buildDir, 'ungoogled-chromium_139.0.7258.154-1.1_windows_x64');

// Check if already exists (electron-builder might have copied it)
if (fs.existsSync(chromiumDest)) {
  console.log('✅ Ungoogled Chromium 139 already exists in build (copied by electron-builder)');
} else if (fs.existsSync(chromiumSource)) {
  console.log('📦 Copying Ungoogled Chromium 139 manually...');
  if (!fs.existsSync(buildDir)) {
    fs.mkdirSync(buildDir, { recursive: true });
  }
  fs.cpSync(chromiumSource, chromiumDest, { recursive: true });
  console.log('✅ Ungoogled Chromium 139 copied!');
} else {
  console.warn('⚠️ Ungoogled Chromium not found at:', chromiumSource);
}

// 2. Copy user agent files
const uaSource = path.join(__dirname, '..', 'useragents');
const uaDest = path.join(buildDir, 'app', 'useragents');

if (fs.existsSync(uaSource)) {
  console.log('📦 Copying user agent files...');
  if (!fs.existsSync(uaDest)) {
    fs.mkdirSync(uaDest, { recursive: true });
  }
  fs.readdirSync(uaSource).forEach(file => {
    fs.copyFileSync(path.join(uaSource, file), path.join(uaDest, file));
  });
  console.log('✅ User agent files copied!');
}

console.log('✅ All browsers copied successfully!');
console.log('📊 Ready for distribution!');
