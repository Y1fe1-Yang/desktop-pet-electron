const { contextBridge, ipcRenderer } = require('electron');

/**
 * Preload script - Exposes safe IPC methods to renderer process
 * This provides a secure bridge between the renderer and main process
 */

contextBridge.exposeInMainWorld('electronAPI', {
  /**
   * Settings management
   */
  getSettings: () => ipcRenderer.invoke('get-settings'),

  updateSettings: (settings) => ipcRenderer.invoke('update-settings', settings),

  onSettingsUpdated: (callback) => {
    ipcRenderer.on('settings-updated', (event, settings) => callback(settings));
  },

  /**
   * Mouse interaction control
   */
  setIgnoreMouse: (ignore) => {
    ipcRenderer.send('set-ignore-mouse', ignore);
  },

  /**
   * Screen information
   */
  getScreenBounds: () => ipcRenderer.invoke('get-screen-bounds')
});
