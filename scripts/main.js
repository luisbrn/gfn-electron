const { app, BrowserWindow, ipcMain } = require('electron');
const electronLocalshortcut = require('electron-localshortcut');
const findProcess = require('find-process');
const fs = require('fs');
const path = require('path');
const { DiscordRPC } = require('./rpc.js');
const { switchFullscreenState } = require('./windowManager.js');
const {
  loadSettings,
  saveSettings,
  checkDiscordRunning,
  testDiscordConnection,
} = require('./settings.js');

var homePage = 'https://play.geforcenow.com';
var userAgent =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.152 Safari/537.36 Edg/130.0.6723.152';

console.log('Using user agent: ' + userAgent);
console.log('Process arguments: ' + process.argv);

app.commandLine.appendSwitch(
  'enable-features',
  'VaapiVideoDecoder,WaylandWindowDecorations,RawDraw',
);

app.commandLine.appendSwitch('disable-features', 'UseChromeOSDirectVideoDecoder');
app.commandLine.appendSwitch('enable-features', 'AcceleratedVideoDecodeLinuxGL');
app.commandLine.appendSwitch('enable-accelerated-mjpeg-decode');
app.commandLine.appendSwitch('enable-accelerated-video');
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('enable-native-gpu-memory-buffers');
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('enable-gpu-memory-buffer-video-frames');

// To identify a possible stable 'use-gl' switch implementation for our application, we utilize a config file that stores the number of crashes.
// On Linux, the crash count is likely stored here: /home/[username]/.config/GeForce NOW/config.json.
// To reset the crash count, we can delete that file.

// If the 'use-gl' switch with the 'angle' implementation crashes, the app will then use the 'egl' implementation.
// If the 'egl' implementation also crashes, the app will disable hardware acceleration.

// When I try to use the 'use-gl' switch with 'desktop' or 'swiftshader', it results in an error indicating that these options are not among the permitted implementations.
// It's possible that future versions of Electron may introduce support for 'desktop' and 'swiftshader' implementations.

// Based on my current understanding (which may be incorrect), the 'angle' implementation is preferred due to its utilization of 'OpenGL ES', which ensures consistent behavior across different systems, such as Windows and Linux systems.
// Furthermore, 'angle' includes an additional abstraction layer that could potentially mitigate bugs or circumvent limitations inherent in direct implementations.

// When the 'use-gl' switch is functioning correctly, I still encounter the 'GetVSyncParametersIfAvailable() error' three times, but it does not occur thereafter (based on my testing).
const configPath = path.join(app.getPath('userData'), 'config.json');
const config = fs.existsSync(configPath)
  ? JSON.parse(fs.readFileSync(configPath, 'utf-8'))
  : { crashCount: 0 };

switch (config.crashCount) {
  case 0:
    app.commandLine.appendArgument('enable-accelerated-video-decode');
    app.commandLine.appendSwitch('use-gl', 'angle');
    break;
  case 1:
    app.commandLine.appendArgument('enable-accelerated-video-decode');
    app.commandLine.appendSwitch('use-gl', 'egl');
    break;
  default:
    app.disableHardwareAcceleration();
}

// CLI: allow forcing ozone platform via --ozone=wayland or --ozone=x11
const ozoneFlag = process.argv.find(a => a.startsWith('--ozone='));
if (ozoneFlag) {
  const value = ozoneFlag.split('=')[1];
  if (value === 'wayland') {
    process.env.OZONE_PLATFORM = 'wayland';
    console.log('OZONE forced to: wayland');
  } else if (value === 'x11') {
    process.env.OZONE_PLATFORM = 'x11';
    console.log('OZONE forced to: x11');
  }
}

console.log('Session type:', process.env.XDG_SESSION_TYPE || 'unknown');

async function createWindow() {
  const mainWindow = new BrowserWindow({
    fullscreenable: true,
    // Try using server-side decorations when explicitly requested or when
    // client-side decorations misbehave on certain Wayland setups.
    frame: process.argv.includes('--force-frame') ? true : undefined,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: false,
      nodeIntegration: false,
      userAgent: userAgent,
    },
  });

  if (process.argv.includes('--direct-start')) {
    mainWindow.loadURL(
      'https://play.geforcenow.com/mall/#/streamer?launchSource=GeForceNOW&cmsId=' +
        process.argv[process.argv.indexOf('--direct-start') + 1],
    );
  } else {
    mainWindow.loadURL(homePage);
  }

  // Ensure GUI is at 100% zoom (normal size)
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.setZoomFactor(1.0);

    // Inject Discord settings button into GeForce NOW interface
    const settingsInjectorPath = path.join(__dirname, 'gfn-settings-injector.js');
    if (fs.existsSync(settingsInjectorPath)) {
      const injectorScript = fs.readFileSync(settingsInjectorPath, 'utf8');
      // Wrap in try-catch to handle any injection errors
      const wrappedScript = `
        try {
          ${injectorScript}
        } catch (error) {
          console.error('Settings injection error:', error);
        }
      `;
      mainWindow.webContents.executeJavaScript(wrappedScript).catch(error => {
        console.error('Failed to inject settings:', error);
      });
    }
  });

  /*
  uncomment this to debug any errors with loading GFN landing page

  mainWindow.webContents.on("will-navigate", (event, url) => {
    console.log("will-navigate", url);
    event.preventDefault();
  });
  */
}

let discordIsRunning = false;

app.whenReady().then(async () => {
  // Ensure isDiscordRunning is called before createWindow to prevent the 'browser-window-created' event from triggering before the Discord check is complete.
  discordIsRunning = await isDiscordRunning();

  createWindow();

  if (discordIsRunning) {
    DiscordRPC('GeForce NOW').catch(console.error);
  }

  app.on('activate', async function () {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  electronLocalshortcut.register('Super+F', async () => {
    switchFullscreenState();
  });

  electronLocalshortcut.register('F11', async () => {
    switchFullscreenState();
  });

  electronLocalshortcut.register('Alt+F4', async () => {
    app.quit();
  });

  electronLocalshortcut.register('Alt+Home', async () => {
    BrowserWindow.getAllWindows()[0].loadURL(homePage);
  });

  electronLocalshortcut.register('Control+Shift+I', () => {
    BrowserWindow.getAllWindows()[0].webContents.toggleDevTools();
  });

  electronLocalshortcut.register('CmdOrCtrl+,', () => {
    openSettingsWindow();
  });
});

app.on('browser-window-created', async function (e, window) {
  window.setBackgroundColor('#1A1D1F');
  window.setMenu(null);

  window.webContents.setUserAgent(userAgent);

  window.webContents.on('new-window', (event, url) => {
    event.preventDefault();
    BrowserWindow.getAllWindows()[0].loadURL(url);
  });

  // Add context menu for settings access
  window.webContents.on('context-menu', () => {
    const { Menu, MenuItem } = require('electron');
    const menu = new Menu();

    menu.append(
      new MenuItem({
        label: 'Settings',
        click: () => openSettingsWindow(),
      }),
    );

    menu.append(
      new MenuItem({
        label: 'Reload',
        click: () => window.reload(),
      }),
    );

    menu.append(
      new MenuItem({
        label: 'Developer Tools',
        click: () => window.webContents.toggleDevTools(),
      }),
    );

    menu.popup();
  });

  if (discordIsRunning) {
    window.on('page-title-updated', async function (e, title) {
      // Guard: ensure DiscordRPC exists and is callable
      try {
        DiscordRPC && typeof DiscordRPC === 'function' && DiscordRPC(title);
      } catch (err) {
        console.warn('DiscordRPC call failed:', err && err.message ? err.message : err);
      }
    });
  }
});

app.on('child-process-gone', (event, details) => {
  if (details.type === 'GPU' && details.reason === 'crashed') {
    config.crashCount++;
    fs.writeFileSync(configPath, JSON.stringify(config));

    console.log(
      "Initiating application restart with an alternative 'use-gl' switch implementation or with hardware acceleration disabled, aiming to improve stability or performance based on prior execution outcomes.",
    );

    app.relaunch();
    app.exit(0);
  }
});

app.on('will-quit', async () => {
  try {
    const windows = BrowserWindow.getAllWindows();
    windows.forEach(window => {
      if (window && !window.isDestroyed()) {
        electronLocalshortcut.unregisterAll(window);
      }
    });
  } catch (e) {
    // Ignore errors during shutdown
  }
});

app.on('window-all-closed', async function () {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Settings window
let settingsWindow = null;

function openSettingsWindow() {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus();
    return;
  }

  settingsWindow = new BrowserWindow({
    width: 900,
    height: 700,
    resizable: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    title: 'GeForce NOW Settings',
    icon: path.join(__dirname, '..', 'icon.png'),
    show: false,
  });

  settingsWindow.loadFile(path.join(__dirname, 'settings.html'));

  settingsWindow.once('ready-to-show', () => {
    settingsWindow.show();
  });

  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });
}

// IPC handlers for settings
ipcMain.handle('get-settings', async () => {
  return loadSettings();
});

ipcMain.handle('save-settings', async (event, settings) => {
  const success = saveSettings(settings);
  if (success) {
    // Update environment variable for current session
    if (settings.discordClientId) {
      process.env.DISCORD_CLIENT_ID = settings.discordClientId;
    }
  }
  return success;
});

ipcMain.handle('check-discord-status', async () => {
  return await checkDiscordRunning();
});

ipcMain.handle('test-discord-connection', async (event, clientId) => {
  return await testDiscordConnection(clientId);
});

function isDiscordRunning() {
  return new Promise(resolve => {
    // Check for several common Discord process names, case-insensitive
    const namesToCheck = [
      'discord',
      'Discord',
      'discord-canary',
      'DiscordCanary',
      'DiscordPTB',
      'discord_ptb',
    ];
    findProcess('name', namesToCheck.join('|'))
      .then(list => {
        if (list && list.length > 0) {
          resolve(true);
        } else {
          resolve(false);
        }
      })
      .catch(error => {
        console.log('Error checking Discord process:', error);
        resolve(false);
      });
  });
}
