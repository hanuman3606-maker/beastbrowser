/**
 * Proxy Authentication Extension Builder
 * 
 * Creates a Chrome extension that automatically handles proxy authentication
 * without showing the popup dialog
 */

const fs = require('fs');
const path = require('path');

/**
 * Create proxy authentication extension
 * @param {string} userDataDir - Chrome user data directory
 * @param {string} username - Proxy username
 * @param {string} password - Proxy password
 * @returns {string} - Path to extension directory
 */
function createProxyAuthExtension(userDataDir, username, password) {
  if (!username || !password) {
    throw new Error('Username and password required for proxy auth extension');
  }
  
  const extensionDir = path.join(userDataDir, 'BeastProxyAuthExtension');
  
  // Remove old extension if exists
  if (fs.existsSync(extensionDir)) {
    fs.rmSync(extensionDir, { recursive: true, force: true });
  }
  
  fs.mkdirSync(extensionDir, { recursive: true });
  
  // Create manifest.json (Manifest V2 for better compatibility)
  const manifest = {
    manifest_version: 2,
    name: "Beast Browser Proxy Auth",
    version: "1.0.1",
    description: "Automatically handles proxy authentication",
    permissions: [
      "webRequest",
      "webRequestBlocking",
      "<all_urls>"
    ],
    background: {
      scripts: ["background.js"],
      persistent: true
    }
  };
  
  fs.writeFileSync(
    path.join(extensionDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2),
    'utf8'
  );
  
  // Create background script for auth handling
  const backgroundScript = `
// Beast Browser Proxy Authentication Handler
console.log('========================================');
console.log('🔐 PROXY AUTH EXTENSION LOADED');
console.log('========================================');

const PROXY_USERNAME = '${username.replace(/'/g, "\\'")}';
const PROXY_PASSWORD = '${password.replace(/'/g, "\\'")}';

console.log('🔐 Username configured:', PROXY_USERNAME);
console.log('🔐 Password length:', PROXY_PASSWORD.length);

// Counter for auth attempts
let authAttempts = 0;

chrome.webRequest.onAuthRequired.addListener(
  function(details) {
    authAttempts++;
    console.log('========================================');
    console.log('🔐 AUTH REQUEST #' + authAttempts);
    console.log('🔐 URL:', details.url);
    console.log('🔐 Method:', details.method);
    console.log('🔐 Type:', details.type);
    console.log('🔐 Is Proxy:', details.isProxy);
    console.log('🔐 Challenger:', JSON.stringify(details.challenger));
    console.log('🔐 Providing credentials...');
    console.log('   Username:', PROXY_USERNAME);
    console.log('   Password: [' + PROXY_PASSWORD.length + ' chars]');
    
    // Return credentials synchronously
    const response = {
      authCredentials: {
        username: PROXY_USERNAME,
        password: PROXY_PASSWORD
      }
    };
    
    console.log('✅ Credentials returned for request #' + authAttempts);
    console.log('========================================');
    
    return response;
  },
  { urls: ["<all_urls>"] },
  ['blocking']
);

console.log('✅✅✅ PROXY AUTH HANDLER ACTIVE ✅✅✅');
console.log('Listening for authentication requests on all URLs');
console.log('========================================');
`;
  
  fs.writeFileSync(
    path.join(extensionDir, 'background.js'),
    backgroundScript,
    'utf8'
  );
  
  console.log('✅ Proxy auth extension created at:', extensionDir);
  console.log('🔐 Username:', username);
  
  return extensionDir;
}

module.exports = {
  createProxyAuthExtension
};
