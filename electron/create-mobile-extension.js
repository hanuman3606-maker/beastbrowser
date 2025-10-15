const fs = require('fs');
const path = require('path');
const getMobileViewportScript = require('./mobile-viewport-inject');

/**
 * Create a Chrome extension that injects mobile viewport script
 */
function createMobileExtension(userDataDir, width, height) {
  const extensionDir = path.join(userDataDir, 'BeastMobileViewport');
  
  // Create extension directory
  if (!fs.existsSync(extensionDir)) {
    fs.mkdirSync(extensionDir, { recursive: true });
  }

  const devicePixelRatio = width === 412 ? 2.625 : 3;
  const platform = width === 412 ? 'android' : 'ios';
  
  // Manifest v2 for better compatibility
  const manifest = {
    manifest_version: 2,
    name: 'BeastBrowser Mobile Viewport',
    version: '1.0.0',
    description: 'Forces mobile viewport for mobile profiles',
    content_scripts: [
      {
        matches: ['<all_urls>'],
        js: ['inject.js'],
        run_at: 'document_start',
        all_frames: true
      }
    ],
    permissions: ['<all_urls>']
  };

  // Get the injection script content
  const scriptContent = getMobileViewportScript(width, height, devicePixelRatio, platform);

  // Write manifest
  fs.writeFileSync(
    path.join(extensionDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2)
  );

  // Write injection script
  fs.writeFileSync(
    path.join(extensionDir, 'inject.js'),
    scriptContent
  );

  console.log(`✅ Mobile viewport extension created: ${width}x${height} @ ${devicePixelRatio}x`);
  return extensionDir;
}

module.exports = { createMobileExtension };
