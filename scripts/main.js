const { app, BrowserWindow, ipcMain, screen, Menu, MenuItem, powerSaveBlocker } = require('electron');
const electronLocalshortcut = require('electron-localshortcut');
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

const homePage = 'https://play.geforcenow.com';
const userAgent =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

// Cache CLI arguments to avoid repeated checks
const CLI_ARGS = {
  forceFrame: process.argv.includes('--force-frame'),
  directStart: process.argv.includes('--direct-start'),
  directStartIndex: process.argv.indexOf('--direct-start'),
  disableRPC: process.argv.includes('--disable-rpc'),
};

// Conditional logging (can be disabled in production)
const ENABLE_DEBUG_LOGS = process.env.DEBUG === 'true' || process.env.NODE_ENV !== 'production';
function debugLog(...args) {
  if (ENABLE_DEBUG_LOGS) console.log(...args);
}
function debugWarn(...args) {
  if (ENABLE_DEBUG_LOGS) console.warn(...args);
}

debugLog('Using user agent: ' + userAgent);
debugLog('Process arguments: ' + process.argv);

// IMPORTANT: Set Wayland environment variables BEFORE any Electron initialization
// These must be set early to ensure proper hardware acceleration and color rendering
if (!process.env.OZONE_PLATFORM) {
  const sessionType = process.env.XDG_SESSION_TYPE;
  const waylandDisplay = process.env.WAYLAND_DISPLAY;
  if (sessionType === 'wayland' || waylandDisplay) {
    process.env.OZONE_PLATFORM = 'wayland';
    console.log('Early OZONE detection: wayland');
  }
}

// Ensure ELECTRON_OZONE_PLATFORM_HINT is set if Wayland is detected
if (!process.env.ELECTRON_OZONE_PLATFORM_HINT && process.env.OZONE_PLATFORM === 'wayland') {
  process.env.ELECTRON_OZONE_PLATFORM_HINT = 'wayland';
}

// Core features for video decoding and rendering
const coreFeatures = ['VaapiVideoDecoder', 'WaylandWindowDecorations', 'RawDraw'];
app.commandLine.appendSwitch('enable-features', coreFeatures.join(','));

// Force a sane color profile to avoid unexpected color shifts on some Wayland
// compositors / GPU drivers. 'srgb' is the most compatible choice for streamed
// video content.
app.commandLine.appendSwitch('force-color-profile', 'srgb');

app.commandLine.appendSwitch('disable-features', 'UseChromeOSDirectVideoDecoder');
app.commandLine.appendSwitch('enable-features', 'AcceleratedVideoDecodeLinuxGL');
app.commandLine.appendSwitch('enable-accelerated-mjpeg-decode');
app.commandLine.appendSwitch('enable-accelerated-video');
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('enable-native-gpu-memory-buffers');
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('enable-gpu-memory-buffer-video-frames');

// Additional performance optimizations
// Enable efficient resource loading
app.commandLine.appendSwitch('enable-features', 'ThrottleForegroundTimers');
// Optimize rendering pipeline
app.commandLine.appendSwitch('enable-features', 'CanvasOopRasterization');

// Input Latency Optimizations
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('enable-high-resolution-time');

// Network Optimizations
app.commandLine.appendSwitch('enable-quic');

// Arch Linux / VAAPI optimizations
// VaapiVideoDecoder is already in coreFeatures, but we add Arch-specific optimizations
if (process.platform === 'linux') {
  // Optimize for Arch's typical Mesa/Intel/NVIDIA setups
  // These flags enhance VAAPI performance specifically for Arch Linux
  // Note: VaapiVideoDecoder is already enabled in coreFeatures above
  
  // Additional performance optimizations for Arch Linux
  // Enable better I/O scheduling and network service (Arch Linux typically uses CFQ or BFQ)
  app.commandLine.appendSwitch('enable-features', 'NetworkService,NetworkServiceInProcess,ParallelDownloading');
  
  // Better memory management for Arch Linux
  app.commandLine.appendSwitch('js-flags', '--max-old-space-size=4096'); // 4GB max heap
  
  console.log('Arch Linux optimizations enabled (VAAPI + I/O + Memory)');
}

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

// Ensure hardware acceleration is enabled for proper color rendering
// Darker colors indicate hardware acceleration isn't working
switch (config.crashCount) {
  case 0:
    app.commandLine.appendArgument('enable-accelerated-video-decode');
    app.commandLine.appendSwitch('use-gl', 'angle');
    console.log('✓ GPU backend: angle (hardware acceleration enabled)');
    console.log('  This ensures proper color rendering and performance');
    break;
  case 1:
    app.commandLine.appendArgument('enable-accelerated-video-decode');
    app.commandLine.appendSwitch('use-gl', 'egl');
    console.log('✓ GPU backend: egl (hardware acceleration enabled)');
    console.log('  This ensures proper color rendering and performance');
    break;
  default:
    app.disableHardwareAcceleration();
    console.warn('⚠ GPU backend: disabled (fallback due to crashes)');
    console.warn('  Colors may appear darker - reset config.json to re-enable');
}

// Cache primary display info to avoid repeated calls
let cachedDisplayInfo = null;
function getDisplayInfo() {
  if (cachedDisplayInfo) return cachedDisplayInfo;
  const display = screen.getPrimaryDisplay();
  cachedDisplayInfo = display
    ? { width: display.workAreaSize.width, height: display.workAreaSize.height }
    : { width: 1280, height: 800 };
  return cachedDisplayInfo;
}

// Auto-detect and configure Wayland/X11 platform
// Priority: CLI flag > Environment variable > Auto-detection
const ozoneFlag = process.argv.find(a => a.startsWith('--ozone='));
if (ozoneFlag) {
  const value = ozoneFlag.split('=')[1];
  if (value === 'wayland') {
    process.env.OZONE_PLATFORM = 'wayland';
    console.log('OZONE forced to: wayland (via CLI)');
  } else if (value === 'x11') {
    process.env.OZONE_PLATFORM = 'x11';
    console.log('OZONE forced to: x11 (via CLI)');
  }
} else if (!process.env.OZONE_PLATFORM) {
  // Auto-detect Wayland if not explicitly set
  const sessionType = process.env.XDG_SESSION_TYPE;
  const waylandDisplay = process.env.WAYLAND_DISPLAY;
  const hasWaylandEnv = sessionType === 'wayland' || waylandDisplay;

  if (hasWaylandEnv) {
    process.env.OZONE_PLATFORM = 'wayland';
    console.log('✓ OZONE auto-detected: wayland (Wayland session detected)');
  } else {
    // Default to x11 if neither Wayland nor explicit setting
    process.env.OZONE_PLATFORM = 'x11';
    console.log('✓ OZONE auto-detected: x11 (no Wayland detected)');
  }
} else {
  console.log(`✓ OZONE_PLATFORM: ${process.env.OZONE_PLATFORM} (from environment)`);
}

console.log('Session type:', process.env.XDG_SESSION_TYPE || 'unknown');
console.log('OZONE_PLATFORM:', process.env.OZONE_PLATFORM || 'not set');
console.log('ELECTRON_OZONE_PLATFORM_HINT:', process.env.ELECTRON_OZONE_PLATFORM_HINT || 'not set');
console.log('MOZ_ENABLE_WAYLAND:', process.env.MOZ_ENABLE_WAYLAND || 'not set');
console.log('WAYLAND_DISPLAY:', process.env.WAYLAND_DISPLAY || 'not set');

// Cache compositor detection result (computed once at startup)
let isHyprlandCompositor = false;
function detectCompositor() {
  if (isHyprlandCompositor !== false) return isHyprlandCompositor; // Return cached result
  
  const compositor = process.env.XDG_CURRENT_DESKTOP || '';
  isHyprlandCompositor = compositor.toLowerCase().includes('hyprland') || 
                         process.env.HYPRLAND_INSTANCE_SIGNATURE !== undefined;
  return isHyprlandCompositor;
}

// Additional Wayland-specific optimizations
if (process.env.OZONE_PLATFORM === 'wayland') {
  // Enable Wayland IME (Input Method Editor) support
  app.commandLine.appendSwitch('enable-wayland-ime');
  // UseOzonePlatform is automatically enabled when OZONE_PLATFORM is set
  // WaylandWindowDecorations is already in coreFeatures
  // Improve input handling on Wayland
  app.commandLine.appendSwitch('enable-features', 'TouchpadTapToClick,TouchpadScroll');
  // Note: PointerLockOptions removed - it was causing cursor confinement issues
  // Let games handle pointer lock naturally via user interaction
  console.log('Wayland-specific optimizations enabled');
  
  // Detect compositor for compositor-specific optimizations (Arch Linux / Omarchy / Kubuntu KDE)
  if (detectCompositor()) {
    // Hyprland-specific optimizations (Omarchy uses Hyprland)
    console.log('Hyprland compositor detected - applying Omarchy optimizations');
    // Optimize window management for tiling window manager
    app.commandLine.appendSwitch('enable-features', 'WaylandWindowDecorations,UseOzonePlatform');
    // Improve focus handling for Hyprland
    app.commandLine.appendSwitch('disable-features', 'DesktopScreenSharing');
  } else if (process.env.XDG_CURRENT_DESKTOP === 'KDE') {
    console.log('KDE Plasma compositor detected - applying KDE optimizations');
    // KDE handles server-side decorations well, but client-side might be preferred for uniformity
    // app.commandLine.appendSwitch('enable-features', 'WaylandWindowDecorations'); 
    
    // Hint for system integration (if not already set by launcher)
    if (!process.env.QT_QPA_PLATFORM) {
      process.env.QT_QPA_PLATFORM = 'wayland';
    }
  }
}

// Cache injected scripts to avoid reading from disk on every page load
let cachedSettingsInjector = null;
let cachedPointerLockMonitor = null;

function loadSettingsInjector() {
  if (cachedSettingsInjector !== null) return cachedSettingsInjector;
  
  const settingsInjectorPath = path.join(__dirname, 'gfn-settings-injector.js');
  if (fs.existsSync(settingsInjectorPath)) {
    try {
      cachedSettingsInjector = fs.readFileSync(settingsInjectorPath, 'utf8');
    } catch (e) {
      console.warn('Failed to load settings injector:', e && e.message ? e.message : e);
      cachedSettingsInjector = '';
    }
  } else {
    cachedSettingsInjector = '';
  }
  return cachedSettingsInjector;
}

function getPointerLockMonitor() {
  if (cachedPointerLockMonitor !== null) return cachedPointerLockMonitor;
  
  cachedPointerLockMonitor = `
    (function() {
      console.log('Pointer lock monitor: Initializing (passive mode)...');
      
      // Monitor pointer lock state but NEVER request it
      let pointerLockActive = false;
      
      // Listen for pointer lock events
      document.addEventListener('pointerlockchange', () => {
        pointerLockActive = document.pointerLockElement !== null;
        console.log('Pointer lock changed:', pointerLockActive ? 'ACTIVE' : 'INACTIVE');
        
        if (pointerLockActive) {
          // Hide cursor when pointer lock is active (game requested it)
          document.body.style.cursor = 'none';
        } else {
          // Restore cursor when pointer lock is released
          document.body.style.cursor = 'default';
        }
      });
      
      document.addEventListener('pointerlockerror', (e) => {
        console.warn('Pointer lock error:', e);
      });
      
      // Ensure cursor is never confined to a box
      // This is critical for proper mouse input in games
      document.addEventListener('DOMContentLoaded', () => {
        // Remove any CSS that might confine cursor
        const style = document.createElement('style');
        style.textContent = \`
          * {
            cursor: default !important;
          }
          canvas, video {
            cursor: none !important;
          }
        \`;
        document.head.appendChild(style);
      });
      
      // Force pointer lock to work properly by preventing any cursor confinement
      // This ensures the mouse can move freely across the entire screen
      if (document.body) {
        document.body.style.cursor = 'default';
        // Prevent any element from capturing pointer events incorrectly
        document.body.style.pointerEvents = 'auto';
      }
      
      console.log('Pointer lock monitor: Initialized (monitoring only, no auto-request)');
    })();
  `;
  return cachedPointerLockMonitor;
}

// Cache main window reference to avoid repeated getAllWindows()[0] calls
let mainWindowRef = null;

// Set App User Model ID for proper taskbar icon association on Linux/Windows
if (process.platform === 'linux' || process.platform === 'win32') {
  app.setAppUserModelId('com.github.hmlendea.geforcenow-electron');
}

async function createWindow() {
  debugLog('Creating window...');
  // Prefer creating the window sized to the primary display. On Wayland
  // this helps avoid fractional scaling / offscreen windows that can
  // cause weird cursor and input clipping when games request pointer
  // grab or fullscreen.
  const { width: dispW, height: dispH } = getDisplayInfo();
  debugLog(`Window size: ${dispW}x${dispH}`);

  debugLog('Initializing BrowserWindow...');
  
  // Prevent display from sleeping while app is running (critical for gaming)
  const powerSaveId = powerSaveBlocker.start('prevent-display-sleep');
  debugLog(`Power save blocker started (ID: ${powerSaveId})`);

  const mainWindow = new BrowserWindow({
    icon: path.join(__dirname, '../icon.png'), // Explicitly set icon for Wayland/Linux
    fullscreenable: true,
    // Try using server-side decorations when explicitly requested or when
    // client-side decorations misbehave on certain Wayland setups.
    // KDE Plasma needs explicit frame: true for window decorations on Wayland
    frame: CLI_ARGS.forceFrame || process.env.XDG_CURRENT_DESKTOP === 'KDE' ? true : undefined,
    // Start hidden and show after ready-to-show so the DE has a chance to
    // map and focus the window correctly (fixes many Wayland focus issues).
    show: false,
    width: dispW,
    height: dispH,
    useContentSize: true,
    skipTaskbar: false,
    // Arch Linux / Omarchy optimizations
    // Better window management for tiling window managers (Hyprland)
    autoHideMenuBar: true,
    // Optimize for desktop environments
    backgroundColor: '#1A1D1F', // Match GFN theme immediately
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, // Enable context isolation for security (prevents XSS attacks)
      nodeIntegration: false,
      userAgent: userAgent,
      enableWebSQL: false,
      // Arch Linux: Optimize for better performance
      backgroundThrottling: false, // Keep app responsive even when backgrounded
      offscreen: false, // Ensure proper rendering
      // Performance optimizations
      v8CacheOptions: 'code', // Enable V8 code caching for faster startup
      enableBlinkFeatures: 'CSSColorSchemeUARendering', // Better color rendering
      // Memory optimizations
      spellcheck: false, // Disable spellcheck to save memory
      enableRemoteModule: false, // Security and performance
    },
  });
  
  // Cache main window reference
  mainWindowRef = mainWindow;
  
  debugLog('BrowserWindow created, loading URL...');

  if (CLI_ARGS.directStart && CLI_ARGS.directStartIndex >= 0) {
    const cmsId = process.argv[CLI_ARGS.directStartIndex + 1];
    if (cmsId) {
      const url = `https://play.geforcenow.com/mall/#/streamer?launchSource=GeForceNOW&cmsId=${cmsId}`;
      debugLog('Loading direct start URL:', url);
      mainWindow.loadURL(url);
    } else {
      debugWarn('--direct-start specified but no CMS ID provided');
      mainWindow.loadURL(homePage);
    }
  } else {
    debugLog('Loading home page:', homePage);
    mainWindow.loadURL(homePage);
  }

  // Ensure GUI is at 100% zoom (normal size). Show/focus window when ready
  // so Wayland compositors don't place it off-screen or prevent input.
  mainWindow.webContents.on('did-finish-load', () => {
    try {
      mainWindow.webContents.setZoomFactor(1.0);
    } catch (e) {
      console.warn('Failed to set zoom factor:', e && e.message ? e.message : e);
    }

    // Inject Discord settings button into GeForce NOW interface (cached)
    const injectorScript = loadSettingsInjector();
    if (injectorScript) {
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

    // Inject cursor/pointer lock monitor for game streaming (cached)
    // This ONLY monitors pointer lock state - does NOT request it
    // GFN/games will request pointer lock themselves when needed
    // This prevents "boxed cursor" issues by not interfering with natural behavior
    const pointerLockMonitor = getPointerLockMonitor();
    mainWindow.webContents.executeJavaScript(pointerLockMonitor).catch(error => {
      console.error('Failed to inject pointer lock monitor:', error);
    });
  });

  // When the content is ready, show and focus the window explicitly. This
  // helps on Wayland where compositors sometimes don't give focus to new
  // windows or map them on a different workspace.
  mainWindow.once('ready-to-show', () => {
    console.log('Window ready-to-show, displaying...');
    try {
      mainWindow.show();
      
      // For Hyprland/Omarchy: Use requestIdleCallback-like delay for better tiling integration
      if (detectCompositor()) {
        // Small delay for Hyprland to properly tile/manage the window
        setTimeout(() => {
          mainWindow.focus();
          mainWindow.setBounds({ x: 0, y: 0, width: dispW, height: dispH });
          console.log('Window displayed successfully (Hyprland optimized)');
        }, 100);
      } else {
        // Standard focus for other compositors
        mainWindow.focus();
        mainWindow.setBounds({ x: 0, y: 0, width: dispW, height: dispH });
        mainWindow.center();
        console.log('Window displayed successfully');
      }
    } catch (e) {
      console.error('Failed to show/focus/adjust window:', e && e.message ? e.message : e);
    }
  });
  
  // Add error handler for window creation
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Failed to load page:', errorCode, errorDescription);
  });
  
  // Cleanup function for proper memory management
  function cleanupWindow() {
    console.log('Cleaning up window resources...');
    try {
      // Remove all event listeners to prevent memory leaks
      mainWindow.removeAllListeners();
      // Destroy webContents to free memory
      if (mainWindow.webContents && !mainWindow.webContents.isDestroyed()) {
        mainWindow.webContents.removeAllListeners();
      }
    } catch (e) {
      console.warn('Error during window cleanup:', e && e.message ? e.message : e);
    }
  }

  mainWindow.on('closed', () => {
    debugLog('Main window closed');
    mainWindowRef = null; // Clear cached reference
    cleanupWindow();
  });

  // Optimize rendering when window is minimized/hidden (Arch Linux performance)
  mainWindow.on('minimize', () => {
    // Reduce resource usage when minimized
    try {
      mainWindow.webContents.setFrameRate(10); // Lower frame rate when minimized
    } catch (e) {
      // Ignore errors
    }
  });

  mainWindow.on('restore', () => {
    // Restore normal frame rate when restored
    try {
      mainWindow.webContents.setFrameRate(60); // Normal frame rate
    } catch (e) {
      // Ignore errors
    }
  });

  // Mirror HTML5 fullscreen requests into actual window fullscreen so pointer
  // locking and input capture behave correctly for streamed games.
  mainWindow.webContents.on('enter-html-full-screen', () => {
    try {
      mainWindow.setFullScreen(true);
      // Ensure the window occupies the whole display so pointer locking and
      // input are not constrained to a smaller surface.
      try {
        const { width: w, height: h } = getDisplayInfo();
        mainWindow.setBounds({ x: 0, y: 0, width: w, height: h });
        
        // For Hyprland/Omarchy: Ensure proper fullscreen handling with tiling WM
        if (detectCompositor()) {
          // Force focus after fullscreen for Hyprland
          setTimeout(() => {
            mainWindow.focus();
          }, 50);
        }
      } catch (e) {
        /* ignore */
      }
    } catch (e) {
      console.warn('enter-html-full-screen failed:', e && e.message ? e.message : e);
    }
  });

  mainWindow.webContents.on('leave-html-full-screen', () => {
    try {
      mainWindow.setFullScreen(false);
      // Restore bounds to primary display work area
      try {
        const { width: w, height: h } = getDisplayInfo();
        mainWindow.setBounds({ x: 0, y: 0, width: w, height: h });
      } catch (e) {
        /* ignore */
      }
    } catch (e) {
      console.warn('leave-html-full-screen failed:', e && e.message ? e.message : e);
    }
  });

  // Capture unhandled promise rejections and log them to help debugging streaming
  // Only register once globally, not per window
  if (!process.listenerCount('unhandledRejection')) {
    process.on('unhandledRejection', (reason, p) => {
      debugWarn('Unhandled Rejection at:', p, 'reason:', reason);
    });
  }

  /*
  uncomment this to debug any errors with loading GFN landing page

  mainWindow.webContents.on("will-navigate", (event, url) => {
    console.log("will-navigate", url);
    event.preventDefault();
  });
  */
}

let discordIsRunning = false;

// Error recovery: Retry window creation with exponential backoff
async function createWindowWithRetry(maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      debugLog(`Window creation attempt ${attempt}/${maxRetries}`);
      await createWindow();
      debugLog('Window created successfully');
      return;
    } catch (error) {
      console.error(`Window creation attempt ${attempt}/${maxRetries} failed:`, error && error.message ? error.message : error);
      
      if (attempt === maxRetries) {
        console.error('Failed to create window after all retries');
        throw error;
      }
      
      // Exponential backoff: 1s, 2s, 4s
      const backoffMs = 1000 * Math.pow(2, attempt - 1);
      debugLog(`Retrying window creation in ${backoffMs}ms...`);
      await new Promise(resolve => setTimeout(resolve, backoffMs));
    }
  }
}

app.whenReady().then(async () => {
  // Create window immediately for faster startup - don't block on Discord check
  debugLog('App ready, creating window...');
  try {
    await createWindowWithRetry();
    debugLog('Window created successfully');
  } catch (error) {
    console.error('Critical: Failed to create window:', error && error.message ? error.message : error);
    app.quit();
    return;
  }

  // Check Discord in parallel (non-blocking) - this doesn't need to block window creation
  debugLog('Checking Discord status (non-blocking)...');
  isDiscordRunning().then(running => {
    discordIsRunning = running;
    debugLog('Discord check complete:', running ? 'Discord is running' : 'Discord not running');
    if (discordIsRunning) {
      DiscordRPC('GeForce NOW').catch(err => debugWarn('DiscordRPC error:', err && err.message ? err.message : err));
    }
  }).catch(err => {
    debugWarn('Discord check failed (non-critical):', err && err.message ? err.message : err);
    discordIsRunning = false;
  });

  app.on('activate', async function () {
    if (BrowserWindow.getAllWindows().length === 0) {
      try {
        await createWindowWithRetry();
      } catch (error) {
        console.error('Failed to create window on activate:', error && error.message ? error.message : error);
      }
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
    const window = mainWindowRef || BrowserWindow.getAllWindows()[0];
    if (window && !window.isDestroyed()) window.loadURL(homePage);
  });

  electronLocalshortcut.register('Control+Shift+I', () => {
    const window = mainWindowRef || BrowserWindow.getAllWindows()[0];
    if (window && !window.isDestroyed()) window.webContents.toggleDevTools();
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
    const targetWindow = mainWindowRef || BrowserWindow.getAllWindows()[0];
    if (targetWindow && !targetWindow.isDestroyed()) {
      targetWindow.loadURL(url);
    }
  });

  // Add context menu for settings access
  window.webContents.on('context-menu', () => {
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

  // Debounce rapid title updates to avoid excessive RPC calls
  let titleUpdateTimer = null;
  const TITLE_UPDATE_DEBOUNCE_MS = 500;
  
  // Always register page-title-updated listener (Discord check is async, so we check dynamically)
  window.on('page-title-updated', async function (e, title) {
    // Clear existing timer
    if (titleUpdateTimer) {
      clearTimeout(titleUpdateTimer);
    }
    
    // Debounce title updates
    titleUpdateTimer = setTimeout(() => {
      // Check Discord status dynamically (non-blocking)
      // If already checked and running, use it; otherwise check now
      if (discordIsRunning === true) {
        // Discord confirmed running, update RPC
        try {
          if (DiscordRPC && typeof DiscordRPC === 'function') {
            DiscordRPC(title);
          }
        } catch (err) {
          debugWarn('DiscordRPC call failed:', err && err.message ? err.message : err);
        }
      } else if (discordIsRunning === undefined) {
        // Not checked yet, check now (non-blocking)
        isDiscordRunning().then(running => {
          discordIsRunning = running;
          if (discordIsRunning) {
            try {
              if (DiscordRPC && typeof DiscordRPC === 'function') {
                DiscordRPC(title);
              }
            } catch (err) {
              debugWarn('DiscordRPC call failed:', err && err.message ? err.message : err);
            }
          }
        }).catch(() => {
          discordIsRunning = false;
        });
      }
      // If discordIsRunning === false, do nothing (Discord not running)
      titleUpdateTimer = null;
    }, TITLE_UPDATE_DEBOUNCE_MS);
  });
});

app.on('child-process-gone', (event, details) => {
  if (details.type === 'GPU' && details.reason === 'crashed') {
    config.crashCount++;
    try {
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    } catch (e) {
      console.error('Failed to save crash count:', e && e.message ? e.message : e);
    }

    console.log(
      "Initiating application restart with an alternative 'use-gl' switch implementation or with hardware acceleration disabled, aiming to improve stability or performance based on prior execution outcomes.",
    );

    app.relaunch();
    app.exit(0);
  }
});

app.on('will-quit', async () => {
  try {
    // Cleanup settings window
    if (settingsWindow && !settingsWindow.isDestroyed()) {
      settingsWindow.removeAllListeners();
      settingsWindow.destroy();
      settingsWindow = null;
    }
    
    // Cleanup all windows
    const windows = BrowserWindow.getAllWindows();
    windows.forEach(cleanupWindow);
  } catch (e) {
    // Ignore errors during shutdown
    console.warn('Error during app shutdown cleanup:', e && e.message ? e.message : e);
  }
});

// Cleanup function for proper memory management
function cleanupWindow(window) {
  if (!window || window.isDestroyed()) return;
  
  try {
    // Remove all event listeners
    window.removeAllListeners();
    
    // Cleanup webContents
    const webContents = window.webContents;
    if (webContents && !webContents.isDestroyed()) {
      webContents.removeAllListeners();
      // Clear cache and storage to free memory
      try {
        webContents.session.clearCache();
        webContents.session.clearStorageData();
      } catch (e) {
        // Ignore cleanup errors
      }
    }
    
    // Unregister all shortcuts for this window
    try {
      electronLocalshortcut.unregisterAll(window);
    } catch (e) {
      // Ignore if already unregistered
    }
    
    // Destroy window
    window.destroy();
  } catch (e) {
    console.warn('Error cleaning up window:', e && e.message ? e.message : e);
  }
}

app.on('window-all-closed', async function () {
  // Cleanup all windows before quit for proper memory management
  BrowserWindow.getAllWindows().forEach(cleanupWindow);
  
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
    if (settingsWindow && !settingsWindow.isDestroyed()) {
      settingsWindow.removeAllListeners();
    }
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

// Cache Discord check result briefly to avoid excessive process checks
let discordCheckCache = { result: null, timestamp: 0 };
const DISCORD_CHECK_CACHE_MS = 5000; // Cache for 5 seconds

function isDiscordRunning() {
  return new Promise(resolve => {
    // Use cached result if recent
    const now = Date.now();
    if (discordCheckCache.result !== null && 
        (now - discordCheckCache.timestamp) < DISCORD_CHECK_CACHE_MS) {
      resolve(discordCheckCache.result);
      return;
    }
    
    // Use faster ps-based check instead of find-process for better performance
    const { exec } = require('child_process');
    const startTime = Date.now();
    
    exec('ps aux | grep -i discord | grep -v grep | head -1', { timeout: 2000 }, (error, stdout) => {
      const elapsed = Date.now() - startTime;
      if (elapsed > 1000) {
        debugLog(`Discord check took ${elapsed}ms (considering timeout)`);
      }
      
      if (error) {
        // No Discord process found or error (non-critical)
        discordCheckCache = { result: false, timestamp: now };
        resolve(false);
        return;
      }
      
      const hasDiscord = stdout.trim().length > 0 && 
                         stdout.toLowerCase().includes('discord') &&
                         !stdout.includes('grep') &&
                         !stdout.includes('node');
      
      // Cache result
      discordCheckCache = { result: hasDiscord, timestamp: now };
      resolve(hasDiscord);
    });
  });
}
