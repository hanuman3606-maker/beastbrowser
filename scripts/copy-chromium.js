const fs = require('fs-extra');
const path = require('path');
const os = require('os');

console.log('🔍 Copying Chromium for bundling...');

// Get Puppeteer cache path
const puppeteerCachePath = path.join(os.homedir(), '.cache', 'puppeteer');
const projectChromiumPath = path.join(__dirname, '..', 'chromium-bundle');

console.log('📂 Source:', puppeteerCachePath);
console.log('📂 Destination:', projectChromiumPath);

// Check if source exists
if (!fs.existsSync(puppeteerCachePath)) {
  console.error('❌ Puppeteer cache not found!');
  console.error('💡 Run: npx puppeteer browsers install chrome');
  process.exit(1);
}

// Remove old chromium-bundle if exists
if (fs.existsSync(projectChromiumPath)) {
  console.log('🧹 Removing old chromium-bundle...');
  fs.removeSync(projectChromiumPath);
}

// Copy Chromium to project
try {
  console.log('📦 Copying Chromium (this may take a minute)...');
  fs.copySync(puppeteerCachePath, projectChromiumPath);
  console.log('✅ Chromium copied successfully!');
  
  // Check size
  const stats = fs.statSync(projectChromiumPath);
  console.log('📊 Chromium bundle size:', Math.round(getDirectorySize(projectChromiumPath) / 1024 / 1024), 'MB');
} catch (error) {
  console.error('❌ Failed to copy Chromium:', error.message);
  process.exit(1);
}

function getDirectorySize(dirPath) {
  let size = 0;
  const files = fs.readdirSync(dirPath);
  
  for (const file of files) {
    const filePath = path.join(dirPath, file);
    const stats = fs.statSync(filePath);
    
    if (stats.isDirectory()) {
      size += getDirectorySize(filePath);
    } else {
      size += stats.size;
    }
  }
  
  return size;
}

console.log('✅ Ready to build with bundled Chromium!');
