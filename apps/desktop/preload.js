/**
 * apps/desktop/preload.js
 *
 * The bridge between the Electron main process and the renderer (app.js).
 *
 * This file runs in a privileged context but exposes only
 * a narrow, safe API to the renderer via contextBridge.
 *
 * The renderer CANNOT access Node.js or Electron APIs directly.
 * It can only call what is exposed here as window.fabion.
 *
 * Current API:
 *   window.fabion.minimize()   — minimize the window
 *   window.fabion.close()      — close the window
 *   window.fabion.version      — app version string
 *
 * As Fabion grows, agent communication will be added here too.
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('fabion', {

  // Window controls
  minimize: () => ipcRenderer.invoke('window:minimize'),
  close:    () => ipcRenderer.invoke('window:close'),

  // App info
  version: '0.1.0',

});
