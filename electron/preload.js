const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Browser profile operations
  antiBrowserOpen: (profile, opts) => ipcRenderer.invoke('antiBrowserOpen', profile, opts),
  antiBrowserClose: (profileId) => ipcRenderer.invoke('antiBrowserClose', profileId),
  closeProfile: (profileId) => ipcRenderer.invoke('antiBrowserClose', profileId), // Alias for closeProfile
  antiBrowserOpenBulk: (profiles, opts) => ipcRenderer.invoke('antiBrowserOpenBulk', profiles, opts),
  antiBrowserCloseBulk: (profileIds) => ipcRenderer.invoke('antiBrowserCloseBulk', profileIds),
  getProfileStatus: (profileId) => ipcRenderer.invoke('getProfileStatus', profileId),
  executeRPAScript: (profileId, action) => ipcRenderer.invoke('executeRPAScript', profileId, action),
  clearProfileData: (profileId, types) => ipcRenderer.invoke('clearProfileData', profileId, types),
  clearAllProfileData: (profileId) => ipcRenderer.invoke('clearAllProfileData', profileId),
  getProfileDataUsage: (profileId) => ipcRenderer.invoke('getProfileDataUsage', profileId),
  closeAllProfiles: () => ipcRenderer.invoke('closeAllProfiles'),
  loadUserAgents: (platform) => ipcRenderer.invoke('loadUserAgents', platform),
  getTimezoneFromIP: (ipOrHost) => ipcRenderer.invoke('getTimezoneFromIP', ipOrHost),
  profileWillDelete: (profileId) => ipcRenderer.invoke('profileWillDelete', profileId),
  profilesWillDelete: (profileIds) => ipcRenderer.invoke('profilesWillDelete', profileIds),
  testProxy: (proxy) => ipcRenderer.invoke('testProxy', proxy),

  // Subscription validation
  validateSubscription: (userEmail) => ipcRenderer.invoke('validateSubscription', userEmail),
  getSubscriptionDetails: (userEmail) => ipcRenderer.invoke('getSubscriptionDetails', userEmail),
  clearSubscriptionCache: () => ipcRenderer.invoke('clearSubscriptionCache'),

  // Profile storage operations (persistent local storage)
  initializeStorage: () => ipcRenderer.invoke('storage:initialize'),
  getAllProfiles: () => ipcRenderer.invoke('storage:getAllProfiles'),
  getProfile: (profileId) => ipcRenderer.invoke('storage:getProfile', profileId),
  saveProfile: (profile) => ipcRenderer.invoke('storage:saveProfile', profile),
  saveProfiles: (profiles) => ipcRenderer.invoke('storage:saveProfiles', profiles),
  deleteProfile: (profileId) => ipcRenderer.invoke('storage:deleteProfile', profileId),
  deleteProfiles: (profileIds) => ipcRenderer.invoke('storage:deleteProfiles', profileIds),
  exportProfiles: (defaultPath) => ipcRenderer.invoke('storage:exportProfiles', defaultPath),
  importProfiles: (merge) => ipcRenderer.invoke('storage:importProfiles', merge),
  getStorageStats: () => ipcRenderer.invoke('storage:getStats'),
  createBackup: () => ipcRenderer.invoke('storage:createBackup'),
  restoreBackup: () => ipcRenderer.invoke('storage:restoreBackup'),
  clearAllProfiles: () => ipcRenderer.invoke('storage:clearAll'),
  migrateFromLocalStorage: (profiles) => ipcRenderer.invoke('storage:migrateFromLocalStorage', profiles),
  openStorageDirectory: () => ipcRenderer.invoke('storage:openDirectory'),

  // Profile export/import operations (user-specific encryption for cross-device transfer)
  exportProfileSingle: (profile, user) => ipcRenderer.invoke('profile:exportSingle', profile, user),
  exportProfileMultiple: (profiles, user) => ipcRenderer.invoke('profile:exportMultiple', profiles, user),
  importProfile: (user, existingProfiles) => ipcRenderer.invoke('profile:import', user, existingProfiles),
  validateImportFile: (filePath) => ipcRenderer.invoke('profile:validateImport', filePath),

  onProfileWindowClosed: (callback) => ipcRenderer.on('profile-window-closed', callback),
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),

  // Persistent storage for auth (Electron file-based storage)
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args)
});


