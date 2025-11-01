const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getWifiInfo: () => ipcRenderer.invoke('get-wifi-info'),
  sendToBackend: (data, url) => ipcRenderer.invoke('send-to-backend', data, url)
});
