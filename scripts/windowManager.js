const { app, BrowserWindow } = require('electron');

// Use Map to track state per window instead of global state
const windowState = new Map();

function getWindowState(window) {
  if (!windowState.has(window)) {
    windowState.set(window, { isFullScreen: false, isGameStreamingScreen: false });
  }
  return windowState.get(window);
}

function toggleFullscreen(window, state) {
  if (!window || window.isDestroyed()) return;
  const stateObj = getWindowState(window);
  const actualState = window.isFullScreen();

  if (stateObj.isFullScreen !== state || actualState !== state) {
    if (state || !stateObj.isGameStreamingScreen) {
      window.setFullScreen(state);
      stateObj.isFullScreen = state;
      console.log('Fullscreen state changed to: ' + state);
      focusWindow(window);
    }
  }
}

function toggleGameStreamingMode(window, state) {
  if (!window || window.isDestroyed()) return;
  const stateObj = getWindowState(window);

  if (stateObj.isGameStreamingScreen !== state) {
    stateObj.isGameStreamingScreen = state;
    console.log('Game streaming mode state changed to: ' + state);
  }

  toggleFullscreen(window, stateObj.isGameStreamingScreen);

  if (state) {
    focusWindow(window);
  }
}

function switchFullscreenState() {
  const windows = BrowserWindow.getAllWindows();
  if (!windows || windows.length === 0) return;
  const window = windows[0];
  if (window.isDestroyed()) return;

  const stateObj = getWindowState(window);
  toggleFullscreen(window, !stateObj.isFullScreen);
}

function focusWindow(window) {
  if (!window || window.isDestroyed()) return;
  window.focus();
}

app.on('browser-window-created', async function (event, browserWindow) {
  // Initialize state for this window
  getWindowState(browserWindow);

  browserWindow.on('leave-full-screen', async function (ev) {
    ev.preventDefault();
    const stateObj = getWindowState(browserWindow);
    if (stateObj.isGameStreamingScreen) {
      toggleFullscreen(browserWindow, true);
    }
  });

  browserWindow.on('page-title-updated', async function (event, title) {
    toggleGameStreamingMode(browserWindow, title.includes('on GeForce NOW'));
  });

  // Cleanup state when window is destroyed
  browserWindow.on('closed', () => {
    windowState.delete(browserWindow);
  });
});

module.exports = { toggleFullscreen, switchFullscreenState };
