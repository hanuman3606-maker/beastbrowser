const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Create distribution directory
const distDir = path.join(__dirname, 'distribution');
if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
}

console.log('Packaging builds for distribution...');

// Package Windows build
console.log('Packaging Windows build...');
try {
    execSync(`tar -czf ${path.join(distDir, 'beast-browser-windows.tar.gz')} -C build-output win-unpacked`, { stdio: 'inherit' });
    console.log('Windows build packaged successfully!');
} catch (error) {
    console.log('Failed to package Windows build with tar, trying zip...');
    try {
        // Try using PowerShell to create ZIP on Windows
        execSync(`powershell Compress-Archive -Path build-output\\win-unpacked -DestinationPath ${path.join(distDir, 'beast-browser-windows.zip')} -Force`, { stdio: 'inherit' });
        console.log('Windows build packaged as ZIP successfully!');
    } catch (zipError) {
        console.log('Failed to package Windows build');
    }
}

// Package Linux build
console.log('Packaging Linux build...');
try {
    execSync(`tar -czf ${path.join(distDir, 'beast-browser-linux.tar.gz')} -C build-output linux-unpacked`, { stdio: 'inherit' });
    console.log('Linux build packaged successfully!');
} catch (error) {
    console.log('Failed to package Linux build with tar');
}

// Copy the download page
const downloadPageSrc = path.join(__dirname, 'simple-build', 'download.html');
const downloadPageDest = path.join(distDir, 'index.html');
if (fs.existsSync(downloadPageSrc)) {
    fs.copyFileSync(downloadPageSrc, downloadPageDest);
    console.log('Download page copied successfully!');
}

// Create a simple README
const readmeContent = `
# BeastBrowser Distribution

This package contains builds of BeastBrowser for Windows and Linux.

## Contents:
- beast-browser-windows.tar.gz or beast-browser-windows.zip: Windows build
- beast-browser-linux.tar.gz: Linux build
- index.html: Simple download page

## Deployment Instructions:
1. Upload all files to your web server
2. Point your domain or subdomain to this directory
3. Users can access the download page at your domain URL

## Manual Installation:
- Windows: Extract the archive and run BeastBrowser.exe
- Linux: Extract the archive and run ./beast-browser (you may need to chmod +x first)

For macOS builds, you'll need to build on a macOS machine using 'npm run mac'.
`;

fs.writeFileSync(path.join(distDir, 'README.txt'), readmeContent);
console.log('README created successfully!');

console.log(`\nDistribution package created in: ${distDir}`);
console.log('\nTo deploy:');
console.log('1. Upload the contents of the distribution directory to your web server');
console.log('2. Users can access the download page at your domain URL');
console.log('3. They can download the appropriate version for their operating system');