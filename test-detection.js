// Simple Chrome 139 detection test (no Electron)
const fs = require('fs');
const path = require('path');

console.log('🔍 Testing Chrome 139 Detection...\n');

const appPath = process.cwd();
console.log('📂 App Directory:', appPath);

const chromePath = path.join(appPath, 'ungoogled-chromium_139.0.7258.154-1.1_windows_x64', 'chrome.exe');
console.log('🎯 Expected Chrome Path:', chromePath);
console.log('📁 File Exists:', fs.existsSync(chromePath));

if (fs.existsSync(chromePath)) {
  console.log('✅ Chrome 139 binary found!');
  
  // Try to get version
  try {
    const { execFileSync } = require('child_process');
    const output = execFileSync(chromePath, ['--version'], { 
      encoding: 'utf8', 
      timeout: 3000,
      windowsHide: true
    });
    console.log('📋 Version Output:', output.trim());
    
    const match = output.match(/(\d+)\./);
    if (match) {
      console.log('✅ Version Number:', match[1]);
    }
  } catch (e) {
    console.error('❌ Version Check Failed:', e.message);
  }
} else {
  console.error('❌ Chrome 139 not found at expected location');
  
  // List directory contents
  const chromeDir = path.dirname(chromePath);
  if (fs.existsSync(chromeDir)) {
    console.log('\n📂 Directory contents:');
    fs.readdirSync(chromeDir).forEach(file => {
      console.log('  -', file);
    });
  } else {
    console.log('❌ Directory does not exist:', chromeDir);
  }
}
