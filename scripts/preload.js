/* eslint-env browser */
// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.

window.addEventListener('DOMContentLoaded', () => {
  const replaceText = (selector, text) => {
    const element = document.getElementById(selector);
    if (element) element.innerText = text;
  };

  for (const type of ['chrome', 'node', 'electron']) {
    replaceText(`${type}-version`, process.versions[type]);
  }

  // Inject Discord settings into GeForce NOW interface
  if (
    window.location.hostname.includes('geforcenow.com') ||
    window.location.hostname.includes('play.geforcenow.com')
  ) {
    // Load the settings injector script
    const fs = require('fs');
    const path = require('path');

    try {
      const settingsScript = fs.readFileSync(
        path.join(__dirname, 'gfn-settings-injector.js'),
        'utf8',
      );

      // Create and inject the script
      const script = document.createElement('script');
      script.textContent = settingsScript;
      document.head.appendChild(script);
    } catch (error) {
      console.error('Failed to inject settings script:', error);
    }
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
