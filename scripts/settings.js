const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const SETTINGS_FILE = path.join(app.getPath('userData'), 'settings.json');

function loadSettings() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = fs.readFileSync(SETTINGS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
  return {};
}

function saveSettings(settings) {
  try {
    // Ensure directory exists
    const settingsDir = path.dirname(SETTINGS_FILE);
    if (!fs.existsSync(settingsDir)) {
      fs.mkdirSync(settingsDir, { recursive: true });
    }

    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
    return true;
  } catch (error) {
    console.error('Failed to save settings:', error);
    return false;
  }
}

function getDiscordClientId() {
  const settings = loadSettings();
  return settings.discordClientId || process.env.DISCORD_CLIENT_ID || 'YOUR_CLIENT_ID_HERE';
}

function checkDiscordRunning() {
  return new Promise(resolve => {
    const { exec } = require('child_process');

    // Use ps command to find Discord processes (more reliable on Linux)
    exec('ps aux | grep -i discord | grep -v grep', (error, stdout) => {
      if (error) {
        console.error('Discord detection error:', error);
        resolve({
          isRunning: false,
          message: 'Could not check Discord status',
        });
        return;
      }

      const lines = stdout
        .trim()
        .split('\n')
        .filter(line => line.length > 0);
      const discordProcesses = lines.filter(
        line =>
          line.toLowerCase().includes('discord') &&
          !line.includes('grep') &&
          !line.includes('node'),
      );

      console.log('Discord detection: Found processes:', discordProcesses);
      resolve({
        isRunning: discordProcesses.length > 0,
        message:
          discordProcesses.length > 0
            ? `Discord is running (${discordProcesses.length} process${
                discordProcesses.length > 1 ? 'es' : ''
              } found)`
            : 'Discord is not running',
      });
    });
  });
}

function testDiscordConnection(clientId) {
  return new Promise(resolve => {
    try {
      // Basic validation
      if (!/^\d{17,19}$/.test(clientId)) {
        resolve({
          success: false,
          message: 'Invalid Client ID format. Should be 17-19 digits.',
        });
        return;
      }

      // Try to require discord-rich-presence
      try {
        const discordRPC = require('discord-rich-presence');
        const client = discordRPC(clientId);

        // Test if we can create a client
        if (client) {
          resolve({
            success: true,
            message: 'Discord Client ID is valid and ready to use!',
          });
        } else {
          resolve({
            success: false,
            message: 'Failed to create Discord client',
          });
        }
      } catch (error) {
        resolve({
          success: false,
          message: 'Discord RPC library error: ' + error.message,
        });
      }
    } catch (error) {
      resolve({
        success: false,
        message: 'Test failed: ' + error.message,
      });
    }
  });
}

module.exports = {
  loadSettings,
  saveSettings,
  getDiscordClientId,
  checkDiscordRunning,
  testDiscordConnection,
};
