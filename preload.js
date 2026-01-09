const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    systemCommand: (command) => ipcRenderer.invoke('system-command', command),
    getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
    openExternal: (url) => ipcRenderer.invoke('open-external', url),
    getAIStatus: () => ipcRenderer.invoke('get-ai-status'),
    restartSystem: () => ipcRenderer.invoke('restart-system')
});

// Security: Disable node integration in renderer
process.once('loaded', () => {
    // You can expose versions or other safe info here
    global.versions = process.versions;
});