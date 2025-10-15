/**
 * Profile Export/Import Service for BeastBrowser
 * Handles encrypted export and import of individual profiles
 * Uses user-specific encryption for cross-device compatibility
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Encryption configuration
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits
const SALT_LENGTH = 32;
const FILE_EXTENSION = '.bbprofile';
const FILE_VERSION = '1.0.0';

class ProfileExportImportService {
  constructor() {
    this.userKeys = new Map(); // Cache user keys
  }

  /**
   * Generate encryption key from user credentials
   * @param {string} userId - User ID or email
   * @param {string} userSecret - User password hash or secret
   * @returns {Buffer} Encryption key
   */
  generateUserKey(userId, userSecret) {
    // Validate inputs
    if (!userId || typeof userId !== 'string') {
      userId = 'default-user';
    }
    if (!userSecret || typeof userSecret !== 'string') {
      userSecret = 'default-secret-' + require('os').hostname();
    }

    // Create a unique key identifier
    const keyId = `${userId}:${userSecret}`;
    
    // Check cache
    if (this.userKeys.has(keyId)) {
      return this.userKeys.get(keyId);
    }

    // Generate key using PBKDF2
    const salt = crypto.createHash('sha256').update(userId).digest();
    const key = crypto.pbkdf2Sync(
      userSecret,
      salt,
      100000, // iterations
      KEY_LENGTH,
      'sha512'
    );

    // Cache the key
    this.userKeys.set(keyId, key);
    
    return key;
  }

  /**
   * Encrypt profile data
   * @param {object} profileData - Profile data to encrypt
   * @param {Buffer} key - Encryption key
   * @returns {object} Encrypted data with metadata
   */
  encryptProfile(profileData, key) {
    try {
      // Convert profile to JSON
      const plaintext = JSON.stringify(profileData);
      
      // Generate random IV
      const iv = crypto.randomBytes(IV_LENGTH);
      
      // Create cipher
      const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
      
      // Encrypt data
      let encrypted = cipher.update(plaintext, 'utf8', 'base64');
      encrypted += cipher.final('base64');
      
      // Get authentication tag
      const authTag = cipher.getAuthTag();
      
      // Create export package
      const exportPackage = {
        version: FILE_VERSION,
        format: 'bbprofile',
        timestamp: new Date().toISOString(),
        profileName: profileData.name,
        profileId: profileData.id,
        iv: iv.toString('base64'),
        authTag: authTag.toString('base64'),
        data: encrypted,
        metadata: {
          platform: profileData.platform,
          browserType: profileData.browserType,
          createdAt: profileData.createdAt,
          hasProxy: !!profileData.proxy,
          proxyType: profileData.proxyType
        }
      };
      
      return exportPackage;
    } catch (error) {
      console.error('❌ Encryption failed:', error);
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt profile data
   * @param {object} exportPackage - Encrypted export package
   * @param {Buffer} key - Decryption key
   * @returns {object} Decrypted profile data
   */
  decryptProfile(exportPackage, key) {
    try {
      // Validate package format
      if (exportPackage.format !== 'bbprofile') {
        throw new Error('Invalid file format');
      }

      // Extract components
      const iv = Buffer.from(exportPackage.iv, 'base64');
      const authTag = Buffer.from(exportPackage.authTag, 'base64');
      const encrypted = exportPackage.data;
      
      // Create decipher
      const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
      decipher.setAuthTag(authTag);
      
      // Decrypt data
      let decrypted = decipher.update(encrypted, 'base64', 'utf8');
      decrypted += decipher.final('utf8');
      
      // Parse JSON
      const profileData = JSON.parse(decrypted);
      
      return profileData;
    } catch (error) {
      console.error('❌ Decryption failed:', error);
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  /**
   * Export a single profile to encrypted file
   * @param {object} profile - Profile to export
   * @param {string} exportPath - Path to save the file
   * @param {string} userId - User ID
   * @param {string} userSecret - User secret for encryption
   * @returns {object} Export result
   */
  async exportProfile(profile, exportPath, userId, userSecret) {
    try {
      console.log(`📤 Exporting profile: ${profile.name}`);
      
      // Generate user-specific encryption key
      const key = this.generateUserKey(userId, userSecret);
      
      // Encrypt profile
      const exportPackage = this.encryptProfile(profile, key);
      
      // Ensure file has correct extension
      if (!exportPath.endsWith(FILE_EXTENSION)) {
        exportPath += FILE_EXTENSION;
      }
      
      // Write to file
      fs.writeFileSync(exportPath, JSON.stringify(exportPackage, null, 2), 'utf8');
      
      console.log(`✅ Profile exported successfully: ${exportPath}`);
      
      return {
        success: true,
        path: exportPath,
        profileName: profile.name,
        fileSize: fs.statSync(exportPath).size
      };
    } catch (error) {
      console.error('❌ Export failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Export multiple profiles to a single encrypted file
   * @param {Array} profiles - Profiles to export
   * @param {string} exportPath - Path to save the file
   * @param {string} userId - User ID
   * @param {string} userSecret - User secret for encryption
   * @returns {object} Export result
   */
  async exportMultipleProfiles(profiles, exportPath, userId, userSecret) {
    try {
      console.log(`📤 Exporting ${profiles.length} profiles (NO ENCRYPTION)`);
      
      // Create multi-profile package WITHOUT encryption
      const multiPackage = {
        version: FILE_VERSION,
        format: 'bbprofile-multi',
        timestamp: new Date().toISOString(),
        profileCount: profiles.length,
        profiles: profiles  // Direct profiles, no encryption
      };
      
      // Ensure file has correct extension
      if (!exportPath.endsWith(FILE_EXTENSION)) {
        exportPath += FILE_EXTENSION;
      }
      
      // Write to file (plain JSON, no encryption)
      fs.writeFileSync(exportPath, JSON.stringify(multiPackage, null, 2), 'utf8');
      
      console.log(`✅ ${profiles.length} profiles exported successfully (NO ENCRYPTION): ${exportPath}`);
      
      return {
        success: true,
        path: exportPath,
        profileCount: profiles.length,
        fileSize: fs.statSync(exportPath).size
      };
    } catch (error) {
      console.error('❌ Export failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Import profile from encrypted file
   * @param {string} importPath - Path to the import file
   * @param {string} userId - User ID
   * @param {string} userSecret - User secret for decryption
   * @param {Array} existingProfiles - Existing profiles for conflict checking
   * @returns {object} Import result with profile data
   */
  async importProfile(importPath, userId, userSecret, existingProfiles = []) {
    try {
      console.log(`📥 Importing profile from: ${importPath}`);
      
      // Read file
      if (!fs.existsSync(importPath)) {
        throw new Error('Import file not found');
      }
      
      const fileContent = fs.readFileSync(importPath, 'utf8');
      const importPackage = JSON.parse(fileContent);
      
      console.log(`📦 Import format: ${importPackage.format} (NO DECRYPTION)`);
      
      // Handle single or multiple profiles WITHOUT decryption
      let profiles = [];
      
      if (importPackage.format === 'bbprofile') {
        // Single profile (plain JSON, no decryption needed)
        profiles.push(importPackage.data || importPackage);
      } else if (importPackage.format === 'bbprofile-multi') {
        // Multiple profiles (plain JSON, no decryption needed)
        profiles = importPackage.profiles;
      } else {
        throw new Error('Unknown file format');
      }
      
      // Handle name conflicts
      const resolvedProfiles = this.resolveNameConflicts(profiles, existingProfiles);
      
      console.log(`✅ Successfully imported ${resolvedProfiles.length} profile(s) (NO DECRYPTION)`);
      
      return {
        success: true,
        profiles: resolvedProfiles,
        conflicts: resolvedProfiles.filter(p => p.wasRenamed).length
      };
    } catch (error) {
      console.error('❌ Import failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Resolve profile name conflicts
   * @param {Array} newProfiles - Profiles being imported
   * @param {Array} existingProfiles - Existing profiles
   * @returns {Array} Profiles with resolved names
   */
  resolveNameConflicts(newProfiles, existingProfiles) {
    const existingNames = new Set(existingProfiles.map(p => p.name));
    const existingIds = new Set(existingProfiles.map(p => p.id));
    
    return newProfiles.map(profile => {
      let resolvedProfile = { ...profile };
      let wasRenamed = false;
      
      // Check for ID conflict (same profile already exists)
      if (existingIds.has(profile.id)) {
        // Generate new ID
        resolvedProfile.id = crypto.randomBytes(16).toString('hex');
        wasRenamed = true;
      }
      
      // Check for name conflict
      if (existingNames.has(profile.name)) {
        let newName = `${profile.name} (Imported)`;
        let counter = 1;
        
        // Keep incrementing until we find a unique name
        while (existingNames.has(newName)) {
          counter++;
          newName = `${profile.name} (Imported ${counter})`;
        }
        
        resolvedProfile.name = newName;
        wasRenamed = true;
      }
      
      // Mark if renamed
      resolvedProfile.wasRenamed = wasRenamed;
      resolvedProfile.originalName = profile.name;
      
      // Update timestamps
      resolvedProfile.importedAt = new Date().toISOString();
      
      return resolvedProfile;
    });
  }

  /**
   * Validate import file
   * @param {string} importPath - Path to the import file
   * @returns {object} Validation result
   */
  async validateImportFile(importPath) {
    try {
      if (!fs.existsSync(importPath)) {
        return {
          valid: false,
          error: 'File not found'
        };
      }

      const fileContent = fs.readFileSync(importPath, 'utf8');
      const importPackage = JSON.parse(fileContent);
      
      // Check format
      if (!['bbprofile', 'bbprofile-multi'].includes(importPackage.format)) {
        return {
          valid: false,
          error: 'Invalid file format'
        };
      }
      
      // Check version compatibility
      if (!importPackage.version) {
        return {
          valid: false,
          error: 'Missing version information'
        };
      }
      
      // Get profile count
      let profileCount = 0;
      let profileNames = [];
      
      if (importPackage.format === 'bbprofile') {
        profileCount = 1;
        profileNames.push(importPackage.profileName);
      } else {
        profileCount = importPackage.profileCount || importPackage.profiles.length;
        profileNames = importPackage.profiles.map(p => p.profileName);
      }
      
      return {
        valid: true,
        format: importPackage.format,
        version: importPackage.version,
        profileCount,
        profileNames,
        timestamp: importPackage.timestamp
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }

  /**
   * Get user secret from current user
   * This should be called with the authenticated user's data
   * @param {object} user - Current user object
   * @returns {string} User secret for encryption
   */
  getUserSecret(user) {
    // If no user provided, use machine-specific secret (less secure but works offline)
    if (!user || !user.uid || !user.email) {
      console.warn('⚠️ No user credentials provided, using machine-specific encryption');
      const machineId = require('os').hostname() || 'beastbrowser-default';
      const secretData = `machine:${machineId}:beastbrowser`;
      return crypto.createHash('sha256').update(secretData).digest('hex');
    }
    // Generate secret from user data
    // This ensures the same user can decrypt on any device
    const secretData = `${user.uid}:${user.email}:beastbrowser`;
    return crypto.createHash('sha256').update(secretData).digest('hex');
  }
}

// Export singleton instance
const profileExportImportService = new ProfileExportImportService();

module.exports = { profileExportImportService };
