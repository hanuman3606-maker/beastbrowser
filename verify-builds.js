const fs = require('fs');
const path = require('path');

console.log('Verifying BeastBrowser builds...\n');

// Check if required directories exist
const requiredPaths = [
    'build-output/win-unpacked',
    'build-output/linux-unpacked',
    'distribution'
];

requiredPaths.forEach(p => {
    if (fs.existsSync(p)) {
        console.log(`✅ ${p} exists`);
    } else {
        console.log(`❌ ${p} not found`);
    }
});

console.log('\nChecking distribution files...');
const distFiles = [
    'beast-browser-windows.tar.gz',
    'beast-browser-linux.tar.gz',
    'index.html',
    'README.txt'
];

distFiles.forEach(file => {
    const fullPath = path.join('distribution', file);
    if (fs.existsSync(fullPath)) {
        const stats = fs.statSync(fullPath);
        console.log(`✅ ${file} (${(stats.size / 1024 / 1024).toFixed(1)} MB)`);
    } else {
        console.log(`❌ ${file} not found`);
    }
});

console.log('\nChecking key executables...');
const executables = [
    { path: 'build-output/win-unpacked/BeastBrowser.exe', name: 'Windows executable' },
    { path: 'build-output/linux-unpacked/beast-browser', name: 'Linux executable' }
];

executables.forEach(exe => {
    if (fs.existsSync(exe.path)) {
        const stats = fs.statSync(exe.path);
        console.log(`✅ ${exe.name} (${(stats.size / 1024 / 1024).toFixed(1)} MB)`);
    } else {
        console.log(`❌ ${exe.name} not found`);
    }
});

console.log('\nBuild verification complete!');
console.log('\nNext steps:');
console.log('1. Upload the contents of the "distribution" directory to your web server');
console.log('2. Users can access the download page at your domain URL');
console.log('3. For macOS builds, you need to build on a macOS machine using "npm run mac"');