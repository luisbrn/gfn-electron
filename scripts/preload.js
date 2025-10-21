/* eslint-env browser */
// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.

const { ipcRenderer } = require('electron');

// Expose ipcRenderer to the renderer process
window.electronIPC = {
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
};

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

  if (
    window.location.hostname.includes('geforcenow.com') ||
    window.location.hostname.includes('play.geforcenow.com')
  ) {
    console.log('Preload.js: Detected GeForce NOW page, injecting settings...');
    // Load the settings injector script
    const fs = require('fs');
    const path = require('path');

    try {
      const settingsScript = fs.readFileSync(
        path.join(__dirname, 'gfn-settings-injector.js'),
        'utf8',
      );

      console.log('Preload.js: Settings script loaded, length:', settingsScript.length);

      // Create and inject the script
      const script = document.createElement('script');
      script.textContent = settingsScript;
      (document.head || document.documentElement).appendChild(script);
      console.log('Preload.js: Settings script injected successfully');
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
