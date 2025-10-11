#!/usr/bin/env node

/**
 * Release Script for BeastBrowser
 * 
 * This script automates the release process:
 * 1. Increments version in package.json
 * 2. Creates a git tag
 * 3. Builds the app for all platforms
 * 4. Creates a GitHub release
 * 5. Uploads build artifacts
 * 
 * Usage:
 *   npm run release
 * 
 * Requirements:
 *   - GitHub CLI (gh) installed and authenticated
 *   - GH_TOKEN environment variable set (for electron-builder)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function exec(command, options = {}) {
  log(`\n$ ${command}`, 'cyan');
  try {
    return execSync(command, { stdio: 'inherit', ...options });
  } catch (error) {
    log(`\n❌ Command failed: ${command}`, 'red');
    throw error;
  }
}

// Check if GitHub CLI is installed
function checkGitHubCLI() {
  try {
    execSync('gh --version', { stdio: 'ignore' });
    return true;
  } catch (error) {
    return false;
  }
}

// Check if GH_TOKEN is set
function checkGitHubToken() {
  return !!process.env.GH_TOKEN;
}

// Get current version from package.json
function getCurrentVersion() {
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8')
  );
  return packageJson.version;
}

// Increment version (patch by default)
function incrementVersion(version, type = 'patch') {
  const [major, minor, patch] = version.split('.').map(Number);
  
  switch (type) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
    default:
      return `${major}.${minor}.${patch + 1}`;
  }
}

// Update version in package.json
function updatePackageVersion(newVersion) {
  const packagePath = path.join(__dirname, '../package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  packageJson.version = newVersion;
  fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');
  log(`✅ Updated package.json to v${newVersion}`, 'green');
}

// Main release function
async function release() {
  log('\n🚀 Starting BeastBrowser Release Process\n', 'bright');

  // Check prerequisites
  if (!checkGitHubCLI()) {
    log('❌ GitHub CLI (gh) is not installed!', 'red');
    log('\nInstall it from: https://cli.github.com/', 'yellow');
    log('Or run: winget install --id GitHub.cli', 'yellow');
    process.exit(1);
  }

  if (!checkGitHubToken()) {
    log('⚠️  GH_TOKEN environment variable not set', 'yellow');
    log('electron-builder will use gh CLI authentication', 'yellow');
  }

  // Get version type from command line
  const versionType = process.argv[2] || 'patch';
  if (!['major', 'minor', 'patch'].includes(versionType)) {
    log(`❌ Invalid version type: ${versionType}`, 'red');
    log('Usage: npm run release [major|minor|patch]', 'yellow');
    process.exit(1);
  }

  // Calculate new version
  const currentVersion = getCurrentVersion();
  const newVersion = incrementVersion(currentVersion, versionType);
  
  log(`📦 Current version: v${currentVersion}`, 'cyan');
  log(`📦 New version: v${newVersion}`, 'green');

  // Confirm with user
  log('\n⚠️  This will:', 'yellow');
  log(`   1. Update version to v${newVersion}`);
  log(`   2. Commit and tag the release`);
  log(`   3. Build for Windows, macOS, and Linux`);
  log(`   4. Create GitHub release and upload artifacts`);
  log('\nPress Ctrl+C to cancel, or wait 5 seconds to continue...\n', 'yellow');
  
  await new Promise(resolve => setTimeout(resolve, 5000));

  try {
    // Step 1: Update version
    log('\n📝 Step 1: Updating version...', 'bright');
    updatePackageVersion(newVersion);

    // Step 2: Commit changes
    log('\n📝 Step 2: Committing changes...', 'bright');
    exec('git add package.json');
    exec(`git commit -m "chore: bump version to v${newVersion}"`);

    // Step 3: Create tag
    log('\n🏷️  Step 3: Creating git tag...', 'bright');
    exec(`git tag -a v${newVersion} -m "Release v${newVersion}"`);

    // Step 4: Push to GitHub
    log('\n⬆️  Step 4: Pushing to GitHub...', 'bright');
    exec('git push origin main');
    exec(`git push origin v${newVersion}`);

    // Step 5: Build and publish
    log('\n🔨 Step 5: Building and publishing...', 'bright');
    log('This may take several minutes...', 'yellow');
    
    // Set GH_TOKEN from gh CLI if not already set
    if (!process.env.GH_TOKEN) {
      try {
        const token = execSync('gh auth token', { encoding: 'utf8' }).trim();
        process.env.GH_TOKEN = token;
        log('✅ Using gh CLI token for publishing', 'green');
      } catch (error) {
        log('⚠️  Could not get gh CLI token, continuing anyway...', 'yellow');
      }
    }

    exec('npm run publish:github');

    // Success!
    log('\n✅ Release completed successfully!', 'green');
    log(`\n🎉 Version v${newVersion} has been released!`, 'bright');
    log(`\n📦 View release: https://github.com/beastbrowser/beastbrowser/releases/tag/v${newVersion}`, 'cyan');

  } catch (error) {
    log('\n❌ Release failed!', 'red');
    log('\nRolling back changes...', 'yellow');
    
    try {
      // Rollback version
      updatePackageVersion(currentVersion);
      exec('git reset --hard HEAD~1');
      exec(`git tag -d v${newVersion}`);
      log('✅ Changes rolled back', 'green');
    } catch (rollbackError) {
      log('❌ Rollback failed! Please fix manually.', 'red');
    }
    
    process.exit(1);
  }
}

// Run release
release().catch((error) => {
  log(`\n❌ Unexpected error: ${error.message}`, 'red');
  process.exit(1);
});
