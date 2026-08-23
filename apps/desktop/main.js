/**
 * apps/desktop/main.js
 *
 * The Electron main process.
 *
 * Responsibility: create and manage the application window.
 * Nothing else. No UI logic, no agent logic — just the window.
 *
 * The window is:
 *   - Frameless (no native title bar)
 *   - Transparent background (the UI draws its own floating surface)
 *   - Positioned bottom-right on first launch
 *   - Resizable but with sensible minimums
 */

import { app, BrowserWindow, ipcMain, screen } from 'electron';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// __dirname equivalent for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

let mainWindow = null;

// ─── Create the window ────────────────────────────────────────────────────────

function createWindow() {
  const { width: screenW, height: screenH } = screen.getPrimaryDisplay().workAreaSize;

  const WIN_W = 740;
  const WIN_H = 560;

  mainWindow = new BrowserWindow({
    width:  WIN_W,
    height: WIN_H,

    // Start bottom-right, with some padding
    x: screenW - WIN_W - 40,
    y: screenH - WIN_H - 40,

    // Frameless + transparent so our UI can be floating
    frame:       false,
    transparent: true,
    resizable:   true,
    minWidth:    480,
    minHeight:   380,

    // Better rendering on macOS
    hasShadow: true,

    webPreferences: {
      // preload.js is the only bridge between main and renderer
      preload:          join(__dirname, 'preload.js'),
      contextIsolation: true,   // renderer cannot access Node.js directly
      nodeIntegration:  false,  // keeps the renderer sandboxed
      sandbox:          true,
    },
  });

  // Load the HTML file — no dev server, no bundler
  mainWindow.loadFile(join(__dirname, 'renderer', 'code.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ─── IPC handlers ─────────────────────────────────────────────────────────────
//
// The renderer (app.js) communicates with main only through these handlers.
// This is intentionally narrow — only expose what the UI actually needs.

ipcMain.handle('window:minimize', () => {
  mainWindow?.minimize();
});

ipcMain.handle('window:close', () => {
  mainWindow?.close();
});

// ─── App lifecycle ────────────────────────────────────────────────────────────

app.whenReady().then(() => {
  createWindow();

  // macOS: re-create window when dock icon is clicked
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
