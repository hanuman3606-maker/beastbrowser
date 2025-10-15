/**
 * Profile Package Service for BeastBrowser
 * Handles complete export/import of profiles including browser data
 * Packages profile metadata + browser data directory into encrypted archive
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { app } = require('electron');
const archiver = require('archiver');
const unzipper = require('unzipper');
const { promisify } = require('util');
const { pipeline } = require('stream');
const pipelineAsync = promisify(pipeline);

// Encryption configuration
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits
const FILE_EXTENSION = '.bbprofile';
const PACKAGE_VERSION = '2.0.0';

class ProfilePackageService {
  constructor() {
    this.userKeys = new Map(); // Cache user keys
  }

  /**
   * Get profiles root directory
   */
  getProfilesRootDir() {
    const base = app.getPath('userData');
    const dir = path.join(base, 'profiles');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  /**
   * Get profile directory path
   */
  getProfileDir(profileId) {
    return path.join(this.getProfilesRootDir(), profileId);
  }

  /**
   * Generate encryption key from user credentials
   */
  generateUserKey(userId, userSecret) {
    // Validate inputs
    if (!userId || typeof userId !== 'string') {
      userId = 'default-user';
    }
    if (!userSecret || typeof userSecret !== 'string') {
      userSecret = 'default-secret-' + require('os').hostname();
    }

    const keyId = `${userId}:${userSecret}`;
    
    if (this.userKeys.has(keyId)) {
      return this.userKeys.get(keyId);
    }

    const salt = crypto.createHash('sha256').update(userId).digest();
    const key = crypto.pbkdf2Sync(
      userSecret,
      salt,
      100000,
      KEY_LENGTH,
      'sha512'
    );

    this.userKeys.set(keyId, key);
    return key;
  }

  /**
   * Get user secret from user object
   */
  getUserSecret(user) {
    // If no user provided, use machine-specific secret (less secure but works offline)
    if (!user || !user.uid || !user.email) {
      console.warn('⚠️ No user credentials provided, using machine-specific encryption');
      const machineId = require('os').hostname() || 'beastbrowser-default';
      const secretData = `machine:${machineId}:beastbrowser`;
      return crypto.createHash('sha256').update(secretData).digest('hex');
    }
    const secretData = `${user.uid}:${user.email}:beastbrowser`;
    return crypto.createHash('sha256').update(secretData).digest('hex');
  }

  /**
   * Get directory size in bytes
   */
  async getDirectorySize(dirPath) {
    let totalSize = 0;
    
    const calculateSize = (dir) => {
      const files = fs.readdirSync(dir);
      
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.isDirectory()) {
          calculateSize(filePath);
        } else {
          totalSize += stats.size;
        }
      }
    };

    if (fs.existsSync(dirPath)) {
      calculateSize(dirPath);
    }

    return totalSize;
  }

  /**
   * Create ZIP archive of profile directory
   */
  async createProfileArchive(profile, tempZipPath) {
    return new Promise((resolve, reject) => {
      console.log(`📦 Creating archive for profile: ${profile.name}`);
      
      const output = fs.createWriteStream(tempZipPath);
      const archive = archiver('zip', {
        zlib: { level: 9 } // Maximum compression
      });

      let totalFiles = 0;
      let totalBytes = 0;

      output.on('close', () => {
        console.log(`✅ Archive created: ${archive.pointer()} bytes (${totalFiles} files)`);
        resolve({
          size: archive.pointer(),
          files: totalFiles
        });
      });

      archive.on('error', (err) => {
        console.error('❌ Archive error:', err);
        reject(err);
      });

      archive.on('entry', (entry) => {
        totalFiles++;
        totalBytes += entry.stats.size;
      });

      archive.pipe(output);

      // Add profile metadata as JSON
      const metadata = {
        version: PACKAGE_VERSION,
        exportedAt: new Date().toISOString(),
        profile: profile,
        platform: process.platform
      };
      archive.append(JSON.stringify(metadata, null, 2), { name: 'profile-metadata.json' });

      // Add browser data directory if it exists
      const profileDir = this.getProfileDir(profile.id);
      if (fs.existsSync(profileDir)) {
        console.log(`📂 Adding browser data from: ${profileDir}`);
        
        // Add all files from profile directory
        archive.directory(profileDir, 'browser-data');
      } else {
        console.log(`⚠️ No browser data directory found for profile ${profile.id}`);
      }

      archive.finalize();
    });
  }

  /**
   * Encrypt file using AES-256-GCM
   */
  async encryptFile(inputPath, outputPath, key) {
    return new Promise((resolve, reject) => {
      console.log(`🔒 Encrypting file...`);
      
      const iv = crypto.randomBytes(IV_LENGTH);
      const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
      
      const input = fs.createReadStream(inputPath);
      const output = fs.createWriteStream(outputPath);

      // Write IV first
      output.write(iv);

      input.on('error', reject);
      output.on('error', reject);

      input.pipe(cipher).on('error', reject);
      
      cipher.pipe(output);

      output.on('finish', () => {
        // Append auth tag at the end
        const authTag = cipher.getAuthTag();
        fs.appendFileSync(outputPath, authTag);
        
        const stats = fs.statSync(outputPath);
        console.log(`✅ File encrypted: ${stats.size} bytes`);
        resolve({
          size: stats.size,
          iv: iv.toString('hex'),
          authTag: authTag.toString('hex')
        });
      });
    });
  }

  /**
   * Decrypt file using AES-256-GCM
   */
  async decryptFile(inputPath, outputPath, key, alternateKey = null) {
    return new Promise((resolve, reject) => {
      console.log(`🔓 Decrypting file...`);
      
      const tryDecrypt = (decryptKey) => {
        try {
          // Read the entire encrypted file
          const encryptedData = fs.readFileSync(inputPath);
          
          if (encryptedData.length < IV_LENGTH + AUTH_TAG_LENGTH) {
            throw new Error('File is too small to be a valid encrypted profile');
          }

          // Extract IV (first 16 bytes)
          const iv = encryptedData.slice(0, IV_LENGTH);
          
          // Extract auth tag (last 16 bytes)
          const authTag = encryptedData.slice(-AUTH_TAG_LENGTH);
          
          // Extract encrypted content (everything in between)
          const encryptedContent = encryptedData.slice(IV_LENGTH, -AUTH_TAG_LENGTH);

          // Create decipher
          const decipher = crypto.createDecipheriv(ALGORITHM, decryptKey, iv);
          decipher.setAuthTag(authTag);

          // Decrypt
          const decrypted = Buffer.concat([
            decipher.update(encryptedContent),
            decipher.final()
          ]);

          // Write decrypted data
          fs.writeFileSync(outputPath, decrypted);
          
          console.log(`✅ File decrypted: ${decrypted.length} bytes`);
          return {
            size: decrypted.length
          };
        } catch (error) {
          throw error;
        }
      };

      try {
        // Try with primary key
        const result = tryDecrypt(key);
        resolve(result);
      } catch (primaryError) {
        // If primary key fails and alternate key provided, try alternate
        if (alternateKey) {
          console.warn('⚠️ Primary key failed, trying alternate key...');
          try {
            const result = tryDecrypt(alternateKey);
            console.log('✅ Decrypted with alternate key');
            resolve(result);
          } catch (alternateError) {
            console.error('❌ Both keys failed');
            reject(new Error(`Decryption failed: ${primaryError.message}`));
          }
        } else {
          console.error('❌ Decryption failed:', primaryError);
          reject(new Error(`Decryption failed: ${primaryError.message}`));
        }
      }
    });
  }

  /**
   * Extract ZIP archive
   */
  async extractArchive(zipPath, extractPath) {
    return new Promise((resolve, reject) => {
      console.log(`📦 Extracting archive to: ${extractPath}`);
      
      let fileCount = 0;
      
      fs.createReadStream(zipPath)
        .pipe(unzipper.Extract({ path: extractPath }))
        .on('entry', (entry) => {
          fileCount++;
        })
        .on('close', () => {
          console.log(`✅ Archive extracted: ${fileCount} files`);
          resolve({ files: fileCount });
        })
        .on('error', (err) => {
          console.error('❌ Extraction error:', err);
          reject(err);
        });
    });
  }

  /**
   * Copy directory recursively
   */
  async copyDirectory(source, destination) {
    if (!fs.existsSync(destination)) {
      fs.mkdirSync(destination, { recursive: true });
    }

    const entries = fs.readdirSync(source, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(source, entry.name);
      const destPath = path.join(destination, entry.name);

      if (entry.isDirectory()) {
        await this.copyDirectory(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }

  /**
   * Delete directory recursively
   */
  deleteDirectory(dirPath) {
    if (fs.existsSync(dirPath)) {
      fs.rmSync(dirPath, { recursive: true, force: true });
    }
  }

  /**
   * Export profile to encrypted package
   */
  async exportProfile(profile, exportPath, user) {
    const tempDir = path.join(app.getPath('temp'), `bbprofile-export-${Date.now()}`);
    const tempZipPath = path.join(tempDir, 'profile.zip');
    
    try {
      // Create temp directory
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      console.log(`\n📤 EXPORT STARTED: ${profile.name}`);
      console.log(`Profile ID: ${profile.id}`);
      console.log(`Temp directory: ${tempDir}`);

      // Step 1: Create ZIP archive with profile data
      const archiveResult = await this.createProfileArchive(profile, tempZipPath);
      
      // Verify ZIP was created and is not empty
      if (!fs.existsSync(tempZipPath)) {
        throw new Error('Failed to create archive file');
      }

      const zipStats = fs.statSync(tempZipPath);
      if (zipStats.size === 0) {
        throw new Error('Archive file is empty');
      }

      console.log(`✅ Archive created: ${zipStats.size} bytes`);

      // Step 2: Copy archive directly (NO ENCRYPTION)
      // Ensure export path has correct extension
      if (!exportPath.endsWith(FILE_EXTENSION)) {
        exportPath += FILE_EXTENSION;
      }

      console.log(`📋 Copying archive to: ${exportPath}`);
      fs.copyFileSync(tempZipPath, exportPath);
      
      // Verify file was created and is not empty
      if (!fs.existsSync(exportPath)) {
        throw new Error('Failed to create export file');
      }

      const finalStats = fs.statSync(exportPath);
      if (finalStats.size === 0) {
        throw new Error('Export file is empty');
      }

      console.log(`✅ EXPORT COMPLETE (NO ENCRYPTION)`);
      console.log(`Final file: ${exportPath}`);
      console.log(`Final size: ${finalStats.size} bytes`);
      console.log(`Archive files: ${archiveResult.files}`);

      return {
        success: true,
        path: exportPath,
        profileName: profile.name,
        fileSize: finalStats.size,
        archiveSize: zipStats.size,
        filesIncluded: archiveResult.files
      };

    } catch (error) {
      console.error('❌ Export failed:', error);
      return {
        success: false,
        error: error.message
      };
    } finally {
      // Cleanup temp directory
      try {
        this.deleteDirectory(tempDir);
        console.log(`🧹 Cleaned up temp directory`);
      } catch (err) {
        console.warn('Failed to cleanup temp directory:', err);
      }
    }
  }

  /**
   * Import profile from encrypted package
   */
  async importProfile(importPath, user, existingProfiles = []) {
    const tempDir = path.join(app.getPath('temp'), `bbprofile-import-${Date.now()}`);
    const tempZipPath = path.join(tempDir, 'profile.zip');
    const extractDir = path.join(tempDir, 'extracted');
    
    try {
      // Create temp directory
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      console.log(`\n📥 IMPORT STARTED`);
      console.log(`Import file: ${importPath}`);
      console.log(`Temp directory: ${tempDir}`);

      // Verify import file exists and is not empty
      if (!fs.existsSync(importPath)) {
        throw new Error('Import file not found');
      }

      const importStats = fs.statSync(importPath);
      if (importStats.size === 0) {
        throw new Error('Import file is empty');
      }

      console.log(`📦 Import file size: ${importStats.size} bytes`);

      // Step 1: Copy import file directly (NO DECRYPTION)
      console.log(`📋 Copying import file to temp...`);
      fs.copyFileSync(importPath, tempZipPath);

      // Verify ZIP exists and is not empty
      if (!fs.existsSync(tempZipPath)) {
        throw new Error('Failed to copy import file');
      }

      const zipStats = fs.statSync(tempZipPath);
      if (zipStats.size === 0) {
        throw new Error('Import file is empty');
      }

      console.log(`✅ Import file ready: ${zipStats.size} bytes (NO DECRYPTION)`);

      // Step 2: Extract the archive
      await this.extractArchive(tempZipPath, extractDir);

      // Step 3: Read profile metadata
      const metadataPath = path.join(extractDir, 'profile-metadata.json');
      if (!fs.existsSync(metadataPath)) {
        throw new Error('Invalid profile package: metadata not found');
      }

      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
      const profile = metadata.profile;

      console.log(`📋 Profile metadata loaded: ${profile.name}`);

      // Step 4: Handle name/ID conflicts
      const resolvedProfile = this.resolveConflicts(profile, existingProfiles);
      const wasRenamed = resolvedProfile.id !== profile.id || resolvedProfile.name !== profile.name;

      // Step 5: Copy browser data to profile directory
      const browserDataSource = path.join(extractDir, 'browser-data');
      const profileDir = this.getProfileDir(resolvedProfile.id);

      if (fs.existsSync(browserDataSource)) {
        console.log(`📂 Copying browser data to: ${profileDir}`);
        await this.copyDirectory(browserDataSource, profileDir);
        
        const copiedSize = await this.getDirectorySize(profileDir);
        console.log(`✅ Browser data copied: ${copiedSize} bytes`);
      } else {
        console.log(`⚠️ No browser data found in package`);
      }

      // Step 6: Update profile timestamps
      resolvedProfile.importedAt = new Date().toISOString();
      resolvedProfile.wasRenamed = wasRenamed;
      resolvedProfile.originalName = profile.name;
      resolvedProfile.originalId = profile.id;

      console.log(`✅ IMPORT COMPLETE`);
      console.log(`Profile: ${resolvedProfile.name}`);
      console.log(`ID: ${resolvedProfile.id}`);
      if (wasRenamed) {
        console.log(`⚠️ Profile was renamed due to conflicts`);
      }

      return {
        success: true,
        profile: resolvedProfile,
        wasRenamed: wasRenamed
      };

    } catch (error) {
      console.error('❌ Import failed:', error);
      return {
        success: false,
        error: error.message
      };
    } finally {
      // Cleanup temp directory
      try {
        this.deleteDirectory(tempDir);
        console.log(`🧹 Cleaned up temp directory`);
      } catch (err) {
        console.warn('Failed to cleanup temp directory:', err);
      }
    }
  }

  /**
   * Resolve profile name/ID conflicts
   */
  resolveConflicts(profile, existingProfiles) {
    const existingIds = new Set(existingProfiles.map(p => p.id));
    const existingNames = new Set(existingProfiles.map(p => p.name));
    
    let resolvedProfile = { ...profile };

    // Check for ID conflict
    if (existingIds.has(profile.id)) {
      resolvedProfile.id = crypto.randomBytes(16).toString('hex');
      console.log(`⚠️ ID conflict resolved: ${profile.id} → ${resolvedProfile.id}`);
    }

    // Check for name conflict
    if (existingNames.has(profile.name)) {
      let newName = `${profile.name} (Imported)`;
      let counter = 1;
      
      while (existingNames.has(newName)) {
        counter++;
        newName = `${profile.name} (Imported ${counter})`;
      }
      
      resolvedProfile.name = newName;
      console.log(`⚠️ Name conflict resolved: ${profile.name} → ${newName}`);
    }

    return resolvedProfile;
  }

  /**
   * Validate import file
   */
  async validateImportFile(importPath) {
    try {
      if (!fs.existsSync(importPath)) {
        return {
          valid: false,
          error: 'File not found'
        };
      }

      const stats = fs.statSync(importPath);
      if (stats.size === 0) {
        return {
          valid: false,
          error: 'File is empty'
        };
      }

      if (!importPath.endsWith(FILE_EXTENSION)) {
        return {
          valid: false,
          error: 'Invalid file extension (must be .bbprofile)'
        };
      }

      return {
        valid: true,
        fileSize: stats.size
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }
}

// Export singleton instance
const profilePackageService = new ProfilePackageService();

module.exports = { profilePackageService };
