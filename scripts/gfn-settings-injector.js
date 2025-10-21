/* eslint-env browser */
// GFN Settings Injector - Adds settings button to GeForce NOW interface

// Settings functionality for GeForce NOW interface
// Use the electron IPC that was exposed by preload
const ipcRenderer = window.electronIPC || {
  invoke: async () => {
    console.error('electronIPC not available');
    return null;
  },
};

// Create the settings button
function createSettingsButton() {
  const settingsButton = document.createElement('button');
  settingsButton.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="3"></circle>
      <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1"></path>
    </svg>
    <span>Discord Settings</span>
  `;

  settingsButton.style.cssText = `
    position: fixed;
    top: 12px;
    right: 12px;
    z-index: 10000;
    background: rgba(26, 29, 31, 0.95);
    color: #00d4aa;
    border: 1px solid #00d4aa;
    border-radius: 6px;
    padding: 8px 12px;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 6px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
    transition: all 0.2s ease;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    backdrop-filter: blur(8px);
    min-width: auto;
    white-space: nowrap;
  `;

  settingsButton.addEventListener('mouseenter', () => {
    settingsButton.style.background = 'rgba(0, 212, 170, 0.1)';
    settingsButton.style.borderColor = '#00d4aa';
    settingsButton.style.color = '#00d4aa';
    settingsButton.style.transform = 'translateY(-1px)';
    settingsButton.style.boxShadow = '0 4px 12px rgba(0, 212, 170, 0.2)';
  });

  settingsButton.addEventListener('mouseleave', () => {
    settingsButton.style.background = 'rgba(26, 29, 31, 0.95)';
    settingsButton.style.borderColor = '#00d4aa';
    settingsButton.style.color = '#00d4aa';
    settingsButton.style.transform = 'translateY(0)';
    settingsButton.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.4)';
  });

  settingsButton.addEventListener('click', () => {
    openSettingsModal();
  });

  return settingsButton;
}

// Create the settings modal
function createSettingsModal() {
  const modal = document.createElement('div');
  modal.id = 'gfn-settings-modal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    z-index: 10000;
    display: none;
    align-items: center;
    justify-content: center;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;

  const modalContent = document.createElement('div');
  modalContent.style.cssText = `
    background: #1a1d1f;
    border-radius: 8px;
    padding: 24px;
    max-width: 500px;
    width: 90%;
    max-height: 80vh;
    overflow-y: auto;
    border: 1px solid #00d4aa;
    box-shadow: 0 8px 32px rgba(0, 212, 170, 0.15);
    backdrop-filter: blur(16px);
  `;

  modalContent.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
      <h2 style="color: #00d4aa; margin: 0; font-size: 20px; font-weight: 600;">Discord Rich Presence</h2>
      <button id="close-settings" style="background: none; border: none; color: #888; font-size: 20px; cursor: pointer; padding: 4px;">&times;</button>
    </div>
    
    <div style="margin-bottom: 25px;">
      <label style="display: block; margin-bottom: 8px; color: #fff; font-weight: 600;">Discord Application Client ID</label>
      <input type="text" id="discord-client-id" placeholder="Enter your Discord Application Client ID" 
             style="width: 100%; padding: 10px; background: #2a2d2f; border: 1px solid #00d4aa; border-radius: 6px; color: #fff; font-size: 14px; box-sizing: border-box;">
    </div>

    <div style="background: #2a2d2f; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
      <h4 style="color: #00d4aa; margin-bottom: 15px;">How to get your Discord Client ID:</h4>
      <ol style="color: #ccc; margin-left: 20px;">
        <li style="margin-bottom: 8px;">Go to <a href="https://discord.com/developers/applications" target="_blank" style="color: #00d4aa;">Discord Developer Portal</a></li>
        <li style="margin-bottom: 8px;">Click <strong>"New Application"</strong> and give it a name</li>
        <li style="margin-bottom: 8px;">Go to the <strong>"General Information"</strong> tab</li>
        <li style="margin-bottom: 8px;">Copy the <strong>"Application ID"</strong> (17-19 digits)</li>
        <li>Paste it in the field above</li>
      </ol>
    </div>

    <div style="background: #2a2d2f; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
      <h4 style="color: #00d4aa; margin-bottom: 10px;">Current Status</h4>
      <p style="color: #ccc; margin: 5px 0;">Discord Status: <span id="discord-status">Checking...</span></p>
      <p style="color: #ccc; margin: 5px 0;">Client ID: <span id="current-client-id">Loading...</span></p>
    </div>

    <div style="display: flex; gap: 12px;">
      <button id="save-settings" style="flex: 1; padding: 10px; background: #00d4aa; color: #1a1d1f; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 14px;">Save Settings</button>
      <button id="test-connection" style="flex: 1; padding: 10px; background: #2a2d2f; color: #00d4aa; border: 1px solid #00d4aa; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 14px;">Test Connection</button>
    </div>

    <div id="status-message" style="margin-top: 15px; padding: 12px; border-radius: 8px; display: none; font-weight: 600;"></div>
  `;

  modal.appendChild(modalContent);
  document.body.appendChild(modal);

  // Event listeners
  document.getElementById('close-settings').addEventListener('click', () => {
    modal.style.display = 'none';
  });

  modal.addEventListener('click', e => {
    if (e.target === modal) {
      modal.style.display = 'none';
    }
  });

  document.getElementById('save-settings').addEventListener('click', saveSettings);
  document.getElementById('test-connection').addEventListener('click', testConnection);

  return modal;
}

// Open settings modal
function openSettingsModal() {
  const modal = document.getElementById('gfn-settings-modal') || createSettingsModal();
  modal.style.display = 'flex';
  loadCurrentSettings();
  checkDiscordStatus();
}

// Load current settings
async function loadCurrentSettings() {
  try {
    const settings = await ipcRenderer.invoke('get-settings');
    document.getElementById('discord-client-id').value = settings.discordClientId || '';
    document.getElementById('current-client-id').textContent =
      settings.discordClientId || 'Not configured';
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
}

// Check Discord status
async function checkDiscordStatus() {
  try {
    const status = await ipcRenderer.invoke('check-discord-status');
    document.getElementById('discord-status').textContent = status.message;
    document.getElementById('discord-status').style.color = status.isRunning
      ? '#00d4aa'
      : '#ff6b6b';
  } catch (error) {
    document.getElementById('discord-status').textContent = 'Error checking Discord status';
    document.getElementById('discord-status').style.color = '#ff6b6b';
  }
}

// Save settings
async function saveSettings() {
  const clientId = document.getElementById('discord-client-id').value.trim();

  if (!clientId) {
    showStatus('Please enter a Discord Client ID', 'error');
    return;
  }

  if (!/^\d{17,19}$/.test(clientId)) {
    showStatus('Invalid Client ID format. Should be 17-19 digits.', 'error');
    return;
  }

  try {
    await ipcRenderer.invoke('save-settings', { discordClientId: clientId });
    showStatus('Settings saved successfully! Restart the app to apply changes.', 'success');
    document.getElementById('current-client-id').textContent = clientId;
  } catch (error) {
    showStatus('Failed to save settings: ' + error.message, 'error');
  }
}

// Test connection
async function testConnection() {
  const clientId = document.getElementById('discord-client-id').value.trim();

  if (!clientId) {
    showStatus('Please enter a Discord Client ID first', 'error');
    return;
  }

  try {
    const result = await ipcRenderer.invoke('test-discord-connection', clientId);
    showStatus(result.message, result.success ? 'success' : 'error');
  } catch (error) {
    showStatus('Test failed: ' + error.message, 'error');
  }
}

// Show status message
function showStatus(message, type) {
  const status = document.getElementById('status-message');
  status.textContent = message;
  status.style.display = 'block';
  status.style.background = type === 'success' ? '#1e3a1e' : '#3a1e1e';
  status.style.border = type === 'success' ? '1px solid #00d4aa' : '1px solid #ff6b6b';
  status.style.color = type === 'success' ? '#00d4aa' : '#ff6b6b';

  setTimeout(() => {
    status.style.display = 'none';
  }, 5000);
}

// Initialize when page loads
function initializeSettings() {
  console.log('GFN Settings Injector: Initializing...');
  console.log('GFN Settings Injector: document.readyState:', document.readyState);

  // Wait for the page to be ready
  if (document.readyState === 'loading') {
    console.log('GFN Settings Injector: Document still loading, waiting for DOMContentLoaded');
    document.addEventListener('DOMContentLoaded', () => {
      console.log('GFN Settings Injector: DOMContentLoaded fired, will add button in 2 seconds');
      setTimeout(addSettingsButton, 2000);
    });
  } else {
    console.log('GFN Settings Injector: Document already loaded, will add button in 2 seconds');
    setTimeout(addSettingsButton, 2000);
  }
}

// Add settings button to the page
function addSettingsButton() {
  console.log('GFN Settings Injector: Attempting to add settings button...');

  // Check if button already exists
  if (document.getElementById('gfn-settings-button')) {
    console.log('GFN Settings Injector: Button already exists, skipping');
    return;
  }

  console.log('GFN Settings Injector: Creating settings button...');
  const settingsButton = createSettingsButton();
  settingsButton.id = 'gfn-settings-button';
  document.body.appendChild(settingsButton);
  console.log('GFN Settings Injector: Settings button added successfully!');
}

// Start the initialization
console.log('GFN Settings Injector: Script loaded, starting initialization...');
initializeSettings();
