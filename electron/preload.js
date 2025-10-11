const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  antiBrowserOpen: (profile, opts) => ipcRenderer.invoke('antiBrowserOpen', profile, opts),
  antiBrowserClose: (profileId) => ipcRenderer.invoke('antiBrowserClose', profileId),
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

  onProfileWindowClosed: (callback) => ipcRenderer.on('profile-window-closed', callback),
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
});


