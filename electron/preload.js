const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),
  testToken: (token) => ipcRenderer.invoke('test-token', token),
  openExternalUrl: (url) => ipcRenderer.invoke('open-external-url', url),
});
