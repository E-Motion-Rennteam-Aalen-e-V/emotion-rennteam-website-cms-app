const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const isDev = require('electron-is-dev');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs');
const os = require('os');

let mainWindow;
let nextServerProcess;
const CONFIG_DIR = path.join(app.getPath('userData'), 'emotion-cms');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

// Stelle sicher, dass Config-Verzeichnis existiert
if (!fs.existsSync(CONFIG_DIR)) {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
}

// Config laden
function loadConfig() {
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    } catch (e) {
      return {};
    }
  }
  return {};
}

// Config speichern
function saveConfig(config) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

// Nächstes Server starten
function startNextServer() {
  const { spawn } = require('child_process');
  const config = loadConfig();

  const env = {
    ...process.env,
    NODE_ENV: 'production',
    PORT: 3000,
    GITHUB_TOKEN: config.GITHUB_TOKEN || '',
    GITHUB_OWNER: config.GITHUB_OWNER || '',
    GITHUB_REPO: config.GITHUB_REPO || '',
    GITHUB_BRANCH: config.GITHUB_BRANCH || 'main',
  };

  nextServerProcess = spawn('npm', ['run', 'start'], {
    cwd: app.getAppPath(),
    env,
    detached: isDev ? false : true,
  });

  nextServerProcess.stdout.on('data', (data) => {
    console.log(`[Next.js] ${data}`);
  });

  nextServerProcess.stderr.on('data', (data) => {
    console.error(`[Next.js Error] ${data}`);
  });

  if (!isDev) {
    nextServerProcess.unref();
  }
}

// Fenster erstellen
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 600,
    icon: path.join(__dirname, '../public/favicon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
    },
  });

  const config = loadConfig();
  const startUrl = isDev
    ? 'http://localhost:3000'
    : 'http://localhost:3000';

  // Wenn noch kein Token gespeichert → Setup-Wizard zeigen
  if (!config.GITHUB_TOKEN) {
    mainWindow.loadFile(path.join(__dirname, 'setup-wizard.html'));
  } else {
    mainWindow.loadURL(startUrl);
  }

  if (isDev) {
    mainWindow.webDevTools.openDevTools();
  }
}

// App-Events
app.on('ready', () => {
  startNextServer();
  setTimeout(() => createWindow(), 2000); // Warte bis Server lädt

  // Auto-Update
  autoUpdater.checkForUpdatesAndNotify();
});

app.on('window-all-closed', () => {
  if (nextServerProcess) {
    nextServerProcess.kill();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (nextServerProcess) {
    nextServerProcess.kill();
  }
});

// IPC Handlers
ipcMain.handle('get-config', async () => {
  return loadConfig();
});

ipcMain.handle('save-config', async (event, config) => {
  try {
    saveConfig(config);

    // Starte Server neu mit neuen Env-Variablen
    if (nextServerProcess) {
      nextServerProcess.kill();
    }

    setTimeout(() => {
      startNextServer();
      // Lade CMS-UI nach Server-Neustart
      setTimeout(() => {
        mainWindow.loadURL('http://localhost:3000');
      }, 2000);
    }, 1000);

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('test-token', async (event, token) => {
  try {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      return { success: true, user: data.login };
    } else {
      return { success: false, error: 'Token ungültig' };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('open-external-url', async (event, url) => {
  require('electron').shell.openExternal(url);
});
