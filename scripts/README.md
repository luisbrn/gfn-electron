# Discord Rich Presence for GeForce NOW

<img width="279" height="119" alt="Screenshot from 2025-10-07 12-48-39" src="https://github.com/user-attachments/assets/4a427f51-c07c-4ea2-aa89-3c0a52780529" />
<img width="279" height="119" alt="Screenshot from 2025-10-07 12-48-22" src="https://github.com/user-attachments/assets/32e11b33-3e52-4a5c-8c8f-ea5186c8c805" />

This folder contains the Discord Rich Presence integration for GeForce NOW, providing automatic game detection and dynamic artwork display.

## 🎯 Features

- **Automatic Game Detection** - Extracts game names from GeForce NOW page titles
- **Steam Integration** - Automatically finds Steam App IDs for accurate game matching
- **Dynamic Artwork** - Shows game-specific artwork in Discord when available
- **Intelligent Caching** - Stores Steam ID mappings for faster subsequent launches
- **Robust Fallback** - Uses NVIDIA icon when game artwork isn't available
- **Interactive Settings** - Built-in Discord Client ID configuration interface
- **Debug Logging** - Comprehensive logging for development and troubleshooting

## 📁 Files

- **`rpc.js`** - Main Discord RPC integration with Steam scraping
- **`settings.js`** - Settings management and Discord detection
- **`gfn-settings-injector.js`** - UI injection script for settings interface
- **`test-steam-scraper.js`** - Test script for validating Steam App ID detection
- **`download_poster.js`** - Download Steam game posters (512x512)
- **`download_gfn_capsule.js`** - Download GFN capsules (1024x1024)
- **`inspect_posters.js`** - Check downloaded image dimensions
- **`Poster game images/`** - Collection of 240+ game poster images for Discord assets

## 🚀 Quick Setup

### Interactive Settings (Recommended)

1. **Start the application**: `npm start`
2. **Look for the green "⚙️ Discord Settings" button** in the top-right corner
3. **Click the button** to open the interactive settings modal
4. **Follow the step-by-step instructions** to get your Discord Client ID
5. **Test the connection** and save your settings

### Discord Application Setup

1. **Create a Discord application** at [Discord Developer Portal](https://discord.com/developers/applications)
2. **Go to your application's "General Information" page**
3. **Copy the "Application ID"** (this is your client ID)
4. **Use the Interactive Settings Interface**:
   - Start the app: `npm start`
   - Click the green "⚙️ Discord Settings" button in the top-right corner
   - Paste your Client ID in the settings modal
   - Test the connection and save

## 🔧 Configuration Methods

### Interactive Settings (Primary Method)

The app provides a built-in settings interface accessible via the green "⚙️ Discord Settings" button in the top-right corner of the GeForce NOW interface.

**Settings are automatically saved to**: `~/.config/gfn-electron-settings.json`

### Alternative Configuration Methods

#### Environment Variable

```bash
DISCORD_CLIENT_ID=1234567890123456789 npm start
```

#### Legacy Local Config (Development)

For development purposes, you can still use the local config file:

```bash
# Create local config (gitignored)
cp scripts/local-config.js.example scripts/local-config.js
```

Edit `scripts/local-config.js`:

```javascript
module.exports = {
  DISCORD_CLIENT_ID: '1234567890123456789', // Your Discord client ID
};
```

**Priority Order:**

1. Interactive settings file (`~/.config/gfn-electron-settings.json`)
2. Environment variable (`DISCORD_CLIENT_ID`)
3. Local config file (`scripts/local-config.js`)
4. Fallback placeholder (`YOUR_CLIENT_ID_HERE`)

## 🎨 Discord Asset Management

### Uploading Game Artwork

To display game artwork in Discord Rich Presence:

1. **Go to Discord Developer Portal** → Your Application → "Rich Presence" → "Art Assets"
2. **Upload Game Images** using Steam App IDs as asset names (e.g., `1240440` for Halo Infinite)
3. **Use Provided Scripts** to download and process game artwork:

```bash
# Download poster images for specific games
node scripts/download_poster.js 1240440  # Halo Infinite
node scripts/download_poster.js 1938090 # Call of Duty

# Download GFN capsule images (1024x1024 with transparency)
node scripts/download_gfn_capsule.js 1240440

# Inspect downloaded images
node scripts/inspect_posters.js
```

4. **Use Pre-made Assets**: Check `Poster game images/` folder for 240+ ready-to-use game posters!

### Asset Download Scripts

```bash
# Download game posters (512x512)
node scripts/download_poster.js [SteamAppID]

# Download GFN capsules (1024x1024 with transparency)
node scripts/download_gfn_capsule.js [SteamAppID]

# Inspect downloaded images
node scripts/inspect_posters.js

# Test Steam App ID detection
node scripts/test-steam-scraper.js "Game Name"
```

## 🎮 Game Cache

The system automatically caches Steam App ID mappings for performance:

**Cache Location:**

- **Linux**: `~/.config/GeForce NOW/game_cache.json`
- **Development fallback**: `./game_cache.json` (project root)

**View Cache Contents:**

```bash
cat ~/.config/"GeForce NOW"/game_cache.json
```

**Example Cache Structure:**

```json
{
  "Call of Duty®": "1938090",
  "Battlefield™ 2042": "1517290",
  "DEATH STRANDING": "1850570",
  "Halo Infinite": "1240440"
}
```

## 🛠️ Usage Options

### Basic Usage (Interactive Settings - Recommended)

```bash
npm start
```

Then use the interactive settings interface:

1. Click the green "⚙️ Discord Settings" button
2. Enter your Discord Client ID
3. Test the connection and save

### Alternative Usage Methods

#### Environment Variable

```bash
DISCORD_CLIENT_ID=your_client_id npm start
```

#### Settings File

The app automatically uses `~/.config/gfn-electron-settings.json` when configured through the interactive interface.

### Debug Mode

Enable verbose logging to see detailed information about game detection, Steam searches, and RPC updates:

```bash
DEBUG=true npm start
```

**Debug Output Includes:**

- Cache file path resolution
- Steam search results and scoring
- Discord RPC client initialization
- Game name extraction and matching
- Steam App ID lookup process

### Disable Discord RPC

Run without Discord integration:

```bash
npm start -- --disable-rpc
```

#### Disabling Discord Rich Presence (RPC)

You can disable Discord Rich Presence if you don't want the app to attempt to connect to a running Discord client.

- Environment variable (temporary):

```bash
# Disable for this run
DISABLE_RPC=true npm start
```

- Persistent (local configuration — not committed):
  Create `scripts/local-config.js` (it is gitignored) and add:

```javascript
module.exports = {
  DISABLE_RPC: true,
};
```

The application will honor either method and skip initializing Discord RPC when set.

## 🧪 Testing

### Steam Scraper Test

Test the Steam App ID detection system:

```bash
# Test specific games
node scripts/test-steam-scraper.js "Halo Infinite" "Cyberpunk 2077"

# Test with default game list
node scripts/test-steam-scraper.js
```

### Manual Testing

Test a single game detection:

```bash
DEBUG=true node -e "
const { DiscordRPC } = require('./scripts/rpc.js');
DiscordRPC('Halo Infinite on GeForce NOW').then(() => console.log('Done'));
"
```

### Interactive Settings Testing

Test the settings interface:

```bash
# Start the app and test the settings button
npm start

# The settings button should appear in the top-right corner
# Click it to test the Discord Client ID configuration
```

## 🔍 How It Works

### Game Detection Process

1. **Title Extraction**: Monitors GeForce NOW page title changes
2. **Game Name Parsing**: Extracts game name from "Game Name on GeForce NOW" format
3. **Steam Lookup**: Searches Steam Store for matching games
4. **Smart Matching**: Uses multiple scoring algorithms:
   - Exact match (100 points)
   - Partial containment (85/70 points)
   - Word overlap analysis (up to 50 points)
5. **Text Normalization**: Strips trademark symbols (™®©), punctuation, and smart quotes
6. **Caching**: Stores successful matches for future use
7. **Discord Update**: Updates Rich Presence with game artwork or fallback

### Steam Scraping Details

The system uses **Cheerio** for robust HTML parsing instead of fragile regex patterns:

- Fetches Steam Store search results
- Extracts `data-ds-appid` and game titles using DOM parsing
- Applies normalized text matching with configurable thresholds
- Handles special characters and international titles
- Includes comprehensive error handling and timeouts

### Rich Presence Behavior

- **With Game Artwork**: Shows Steam App ID as `largeImageKey` when asset exists in Discord app
- **Fallback Mode**: Uses `nvidia` asset when game artwork isn't uploaded
- **Status Details**: Displays full GeForce NOW title (e.g., "Halo Infinite on GeForce NOW")
- **State Message**: "Not affiliated with NVIDIA" disclaimer
- **Timestamp**: Shows session start time

## 📦 Dependencies

- **`axios`**: HTTP client for Steam Store requests
- **`cheerio`**: Server-side jQuery for HTML parsing
- **`discord-rich-presence`**: Discord RPC client library
- **`find-process`**: Process detection for Discord status
- **`jimp`**: Image processing for asset management

## ⚙️ Configuration Options

### Environment Variables

| Variable            | Description                   | Default               |
| ------------------- | ----------------------------- | --------------------- |
| `DISCORD_CLIENT_ID` | Discord application client ID | `YOUR_CLIENT_ID_HERE` |
| `DEBUG`             | Enable verbose logging        | `false`               |
| `DISABLE_RPC`       | Disable Discord Rich Presence | `false`               |

### Command Line Arguments

| Argument        | Description                   |
| --------------- | ----------------------------- |
| `--disable-rpc` | Disable Discord Rich Presence |

## 🐛 Troubleshooting

### Common Issues

**Discord client not connecting:**

- Ensure Discord is running
- Verify client ID is correct
- Check Discord Developer Portal application status
- Use the interactive settings to test the connection

**Games not detected:**

- Enable debug mode: `DEBUG=true`
- Check game name extraction in logs
- Verify Steam Store accessibility
- Review matching scores in debug output

**Settings button not visible:**

- Wait 2-3 seconds after the page loads
- Check browser console for errors (F12)
- Ensure you're on the GeForce NOW interface
- Try refreshing the page

**Cache issues:**

- Clear cache: `rm ~/.config/"GeForce NOW"/game_cache.json`
- Check cache permissions and path access
- Verify Electron userData directory exists

**Steam scraping failures:**

- Check network connectivity to store.steampowered.com
- Verify User-Agent header acceptance
- Review timeout settings (default: 15 seconds)

### Debug Information

Enable debug logging to see:

```text
Cache file resolution and loading
Steam search URLs and responses
Game name normalization process
Matching scores for each candidate
Discord RPC client status
Rich Presence update results
Settings interface injection
Discord process detection
```

## 📊 Performance Notes

- **Caching**: First lookup per game may take 2-5 seconds; subsequent launches are instant
- **Rate Limiting**: No explicit rate limiting on Steam requests (use responsibly)
- **Memory Usage**: Minimal; cache file typically <1KB for 50+ games
- **Network**: Only makes requests for uncached games

## 🏆 Credits

This implementation is based on the original Windows app: [GeForce-NOW-Rich-Presence](https://github.com/luisbrn/GeForce-NOW-Rich-Presence)
