/**
 * Encryption Service for BeastBrowser
 * Provides secure encryption/decryption for profile data storage
 * Uses AES-256-GCM for encryption with machine-specific keys
 */

const crypto = require('crypto');
const os = require('os');
const fs = require('fs');
const path = require('path');

// Algorithm configuration
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits
const SALT_LENGTH = 64;

class EncryptionService {
  constructor() {
    this.masterKey = null;
    this.keyPath = null;
  }

  /**
   * Initialize encryption service with machine-specific key
   */
  async initialize(appDataPath) {
    try {
      this.keyPath = path.join(appDataPath, '.beastbrowser_key');
      
      // Try to load existing key
      if (fs.existsSync(this.keyPath)) {
        const keyData = fs.readFileSync(this.keyPath, 'utf8');
        const parsed = JSON.parse(keyData);
        this.masterKey = Buffer.from(parsed.key, 'hex');
        console.log('✅ Encryption key loaded successfully');
      } else {
        // Generate new key based on machine-specific data
        await this.generateMasterKey();
        console.log('✅ New encryption key generated');
      }

      return true;
    } catch (error) {
      console.error('❌ Failed to initialize encryption service:', error);
      throw error;
    }
  }

  /**
   * Generate a machine-specific master key
   */
  async generateMasterKey() {
    try {
      // Combine machine-specific identifiers
      const machineId = this.getMachineIdentifier();
      const salt = crypto.randomBytes(SALT_LENGTH);
      
      // Derive key using PBKDF2
      this.masterKey = crypto.pbkdf2Sync(
        machineId,
        salt,
        100000, // iterations
        KEY_LENGTH,
        'sha512'
      );

      // Save key securely
      const keyData = {
        key: this.masterKey.toString('hex'),
        salt: salt.toString('hex'),
        created: new Date().toISOString(),
        version: '1.0'
      };

      fs.writeFileSync(this.keyPath, JSON.stringify(keyData), {
        mode: 0o600 // Read/write for owner only
      });

      console.log('🔐 Master key generated and saved');
    } catch (error) {
      console.error('❌ Failed to generate master key:', error);
      throw error;
    }
  }

  /**
   * Get machine-specific identifier
   */
  getMachineIdentifier() {
    const platform = os.platform();
    const hostname = os.hostname();
    const cpus = os.cpus();
    const cpuModel = cpus && cpus.length > 0 ? cpus[0].model : 'unknown';
    const totalMem = os.totalmem();
    
    // Combine multiple machine characteristics
    const identifier = `${platform}-${hostname}-${cpuModel}-${totalMem}`;
    
    return identifier;
  }

  /**
   * Encrypt data
   * @param {string|object} data - Data to encrypt
   * @returns {string} Encrypted data as base64 string
   */
  encrypt(data) {
    try {
      if (!this.masterKey) {
        throw new Error('Encryption service not initialized');
      }

      // Convert object to JSON string if needed
      const plaintext = typeof data === 'string' ? data : JSON.stringify(data);
      
      // Generate random IV for each encryption
      const iv = crypto.randomBytes(IV_LENGTH);
      
      // Create cipher
      const cipher = crypto.createCipheriv(ALGORITHM, this.masterKey, iv);
      
      // Encrypt data
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // Get authentication tag
      const authTag = cipher.getAuthTag();
      
      // Combine IV + authTag + encrypted data
      const result = {
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
        data: encrypted
      };
      
      // Return as base64 encoded JSON
      return Buffer.from(JSON.stringify(result)).toString('base64');
    } catch (error) {
      console.error('❌ Encryption failed:', error);
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt data
   * @param {string} encryptedData - Base64 encoded encrypted data
   * @returns {string|object} Decrypted data
   */
  decrypt(encryptedData) {
    try {
      if (!this.masterKey) {
        throw new Error('Encryption service not initialized');
      }

      // Decode base64
      const decoded = JSON.parse(Buffer.from(encryptedData, 'base64').toString('utf8'));
      
      // Extract components
      const iv = Buffer.from(decoded.iv, 'hex');
      const authTag = Buffer.from(decoded.authTag, 'hex');
      const encrypted = decoded.data;
      
      // Create decipher
      const decipher = crypto.createDecipheriv(ALGORITHM, this.masterKey, iv);
      decipher.setAuthTag(authTag);
      
      // Decrypt data
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      // Try to parse as JSON, return string if it fails
      try {
        return JSON.parse(decrypted);
      } catch {
        return decrypted;
      }
    } catch (error) {
      console.error('❌ Decryption failed:', error);
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  /**
   * Encrypt file
   * @param {string} inputPath - Path to file to encrypt
   * @param {string} outputPath - Path to save encrypted file
   */
  encryptFile(inputPath, outputPath) {
    try {
      const data = fs.readFileSync(inputPath, 'utf8');
      const encrypted = this.encrypt(data);
      fs.writeFileSync(outputPath, encrypted, 'utf8');
      return true;
    } catch (error) {
      console.error('❌ File encryption failed:', error);
      throw error;
    }
  }

  /**
   * Decrypt file
   * @param {string} inputPath - Path to encrypted file
   * @param {string} outputPath - Path to save decrypted file
   */
  decryptFile(inputPath, outputPath) {
    try {
      const encrypted = fs.readFileSync(inputPath, 'utf8');
      const decrypted = this.decrypt(encrypted);
      const data = typeof decrypted === 'string' ? decrypted : JSON.stringify(decrypted, null, 2);
      fs.writeFileSync(outputPath, data, 'utf8');
      return true;
    } catch (error) {
      console.error('❌ File decryption failed:', error);
      throw error;
    }
  }

  /**
   * Hash data (one-way)
   * @param {string} data - Data to hash
   * @returns {string} Hash as hex string
   */
  hash(data) {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Generate random ID
   * @param {number} length - Length of ID
   * @returns {string} Random ID
   */
  generateId(length = 16) {
    return crypto.randomBytes(length).toString('hex');
  }
}

// Export singleton instance
const encryptionService = new EncryptionService();

module.exports = { encryptionService };
