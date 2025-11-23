/* eslint-env browser */
// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.

const { contextBridge, ipcRenderer } = require('electron');

// Securely expose Electron APIs to the renderer process using contextBridge
// This prevents XSS attacks by isolating the Node.js context from the web context
contextBridge.exposeInMainWorld('electronAPI', {
  // Settings management
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: settings => ipcRenderer.invoke('save-settings', settings),
  checkDiscordStatus: () => ipcRenderer.invoke('check-discord-status'),
  testDiscordConnection: clientId => ipcRenderer.invoke('test-discord-connection', clientId),
});

// Legacy support: expose window.electronIPC via contextBridge for backward compatibility
// This ensures gfn-settings-injector.js continues to work
contextBridge.exposeInMainWorld('electronIPC', {
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
});

window.addEventListener('DOMContentLoaded', () => {
  const replaceText = (selector, text) => {
    const element = document.getElementById(selector);
    if (element) element.innerText = text;
  };

  for (const type of ['chrome', 'node', 'electron']) {
    replaceText(`${type}-version`, process.versions[type]);
  }

  // Inject Discord settings into GeForce NOW interface
  console.log('Preload.js: Current hostname:', window.location.hostname);
  console.log('Preload.js: Current URL:', window.location.href);

  // Cache hostname check result
  const hostname = window.location.hostname;
  const isGFNPage = hostname.includes('geforcenow.com') || hostname.includes('play.geforcenow.com');

  if (isGFNPage) {
    console.log('Preload.js: Detected GeForce NOW page, injecting settings...');
    // Load the settings injector script (cached in main.js, but we need it here too)
    // Note: This is a separate context, so we can't share cache, but we can optimize the read
    const fs = require('fs');
    const path = require('path');

    try {
      const settingsScriptPath = path.join(__dirname, 'gfn-settings-injector.js');
      // Use existsSync check before read to avoid exception overhead
      if (fs.existsSync(settingsScriptPath)) {
        const settingsScript = fs.readFileSync(settingsScriptPath, 'utf8');
        console.log('Preload.js: Settings script loaded, length:', settingsScript.length);

        // Create and inject the script
        const script = document.createElement('script');
        script.textContent = settingsScript;
        (document.head || document.documentElement).appendChild(script);
        console.log('Preload.js: Settings script injected successfully');
      }
    } catch (error) {
      console.error('Preload.js: Failed to inject settings script:', error);
    }
  } else {
    console.log('Preload.js: Not a GeForce NOW page, skipping injection');
  }
});

(function mockChromeUserAgent() {
  let oiginalVoices = window.speechSynthesis.getVoices();
  window.speechSynthesis.getVoices = function () {
    return [
      {
        voiceURI: 'Google US English',
        name: 'Google US English',
        lang: 'en-US',
        localService: false,
        default: false,
      },
    ];
  };

  //wait some arbitraty time before cleaning up the mess we did previously
  setTimeout(() => {
    window.speechSynthesis.getVoices = function () {
      return oiginalVoices;
    };
  }, 10_000);
})();
