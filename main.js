const { app, BrowserWindow, ipcMain, Tray, Menu, screen } = require('electron');
const path = require('path');
const Store = require('electron-store');
const AutoLaunch = require('auto-launch');

// Initialize electron-store for settings persistence
const store = new Store({
  defaults: {
    animationSpeed: 1.0,
    movementSpeed: 1.0,
    soundEnabled: true,
    autoStart: false
  }
});

// Auto-launch configuration
const autoLauncher = new AutoLaunch({
  name: 'Desktop Pet',
  path: app.getPath('exe')
});

let mainWindow = null;
let settingsWindow = null;
let tray = null;

/**
 * Creates the main transparent window for the desktop pet
 * Based on Mimo's architecture (lines 95-146)
 */
function createMainWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  mainWindow = new BrowserWindow({
    width: width,
    height: height,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    closable: true,
    focusable: false,
    hasShadow: false,
    // Screen-saver level ensures pet stays on top
    type: 'panel',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Set window to be click-through by default
  mainWindow.setIgnoreMouseEvents(true, { forward: true });

  // Full screen without entering fullscreen mode
  mainWindow.setPosition(0, 0);
  mainWindow.setSize(width, height);

  // Always on top with screen-saver level
  mainWindow.setAlwaysOnTop(true, 'screen-saver');
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  mainWindow.loadFile('index.html');

  // Prevent window from being closed normally
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/**
 * Creates the settings window
 */
function createSettingsWindow() {
  if (settingsWindow) {
    settingsWindow.focus();
    return;
  }

  settingsWindow = new BrowserWindow({
    width: 400,
    height: 500,
    transparent: false,
    frame: true,
    alwaysOnTop: false,
    skipTaskbar: false,
    resizable: false,
    minimizable: true,
    maximizable: false,
    title: 'Desktop Pet Settings',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  settingsWindow.loadFile('settings.html');

  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });
}

/**
 * Creates system tray icon with context menu
 * Based on Mimo's tray implementation (lines 183-250)
 */
function createTray() {
  // Create tray icon (you should provide an icon file)
  // For now, using a placeholder - replace with actual icon path
  tray = new Tray(path.join(__dirname, 'icon.png'));

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show Pet',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
        }
      }
    },
    {
      label: 'Hide Pet',
      click: () => {
        if (mainWindow) {
          mainWindow.hide();
        }
      }
    },
    {
      type: 'separator'
    },
    {
      label: 'Settings',
      click: () => {
        createSettingsWindow();
      }
    },
    {
      type: 'separator'
    },
    {
      label: 'Quit',
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setToolTip('Desktop Pet');
  tray.setContextMenu(contextMenu);

  // Double-click tray to toggle settings
  tray.on('double-click', () => {
    createSettingsWindow();
  });
}

/**
 * IPC Handlers for communication between renderer and main process
 */

// Handle mouse interaction toggle (for click-through)
ipcMain.on('set-ignore-mouse', (event, ignore) => {
  if (mainWindow) {
    mainWindow.setIgnoreMouseEvents(ignore, { forward: true });
  }
});

// Get current settings
ipcMain.handle('get-settings', async () => {
  return {
    animationSpeed: store.get('animationSpeed'),
    movementSpeed: store.get('movementSpeed'),
    soundEnabled: store.get('soundEnabled'),
    autoStart: store.get('autoStart')
  };
});

// Update settings
ipcMain.handle('update-settings', async (event, settings) => {
  try {
    if (settings.animationSpeed !== undefined) {
      store.set('animationSpeed', settings.animationSpeed);
    }
    if (settings.movementSpeed !== undefined) {
      store.set('movementSpeed', settings.movementSpeed);
    }
    if (settings.soundEnabled !== undefined) {
      store.set('soundEnabled', settings.soundEnabled);
    }
    if (settings.autoStart !== undefined) {
      store.set('autoStart', settings.autoStart);

      // Update auto-launch setting
      if (settings.autoStart) {
        await autoLauncher.enable();
      } else {
        await autoLauncher.disable();
      }
    }

    // Notify main window of settings change
    if (mainWindow) {
      mainWindow.webContents.send('settings-updated', store.store);
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to update settings:', error);
    return { success: false, error: error.message };
  }
});

// Get screen bounds for pet movement
ipcMain.handle('get-screen-bounds', async () => {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  return { width, height };
});

/**
 * App lifecycle management
 */
app.whenReady().then(() => {
  createMainWindow();
  createTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // Don't quit on window close (tray app)
  // Only quit when explicitly requested
  if (process.platform !== 'darwin' && app.isQuitting) {
    app.quit();
  }
});

app.on('before-quit', () => {
  app.isQuitting = true;
});

// Handle errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
});
