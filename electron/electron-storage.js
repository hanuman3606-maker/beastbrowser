/**
 * Electron Storage Handler
 * Persistent storage for Electron app using app.getPath('userData')
 */

const { app } = require('electron');
const fs = require('fs');
const path = require('path');

class ElectronStorage {
  constructor() {
    this.storagePath = path.join(app.getPath('userData'), 'storage.json');
    this.cache = {};
    this.loadFromDisk();
  }

  loadFromDisk() {
    try {
      if (fs.existsSync(this.storagePath)) {
        const data = fs.readFileSync(this.storagePath, 'utf8');
        this.cache = JSON.parse(data);
        console.log('📦 Loaded storage from disk:', Object.keys(this.cache).length, 'keys');
      } else {
        console.log('📦 No existing storage file, starting fresh');
        this.cache = {};
      }
    } catch (error) {
      console.error('❌ Error loading storage:', error);
      this.cache = {};
    }
  }

  saveToDisk() {
    try {
      fs.writeFileSync(this.storagePath, JSON.stringify(this.cache, null, 2), 'utf8');
      console.log('💾 Saved storage to disk');
    } catch (error) {
      console.error('❌ Error saving storage:', error);
    }
  }

  getItem(key) {
    const value = this.cache[key] || null;
    console.log(`📦 Storage GET: ${key} = ${value ? 'found' : 'null'}`);
    return value;
  }

  setItem(key, value) {
    this.cache[key] = value;
    this.saveToDisk();
    console.log(`💾 Storage SET: ${key} = saved`);
  }

  removeItem(key) {
    delete this.cache[key];
    this.saveToDisk();
    console.log(`🗑️ Storage REMOVE: ${key}`);
  }

  clear() {
    this.cache = {};
    this.saveToDisk();
    console.log('🗑️ Storage cleared');
  }

  key(index) {
    const keys = Object.keys(this.cache);
    return keys[index] || null;
  }

  get length() {
    return Object.keys(this.cache).length;
  }
}

// Export singleton
let storageInstance = null;

function getStorage() {
  if (!storageInstance) {
    storageInstance = new ElectronStorage();
  }
  return storageInstance;
}

module.exports = { getStorage };
