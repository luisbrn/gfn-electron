# GeForce NOW Electron

[![CI](https://github.com/luisbrn/gfn-electron/actions/workflows/node.js.yml/badge.svg)](https://github.com/luisbrn/gfn-electron/actions/workflows/node.js.yml)
[![coverage (steam-rpc-feature)](https://codecov.io/gh/luisbrn/gfn-electron/branch/steam-rpc-feature/graph/badge.svg)](https://codecov.io/gh/luisbrn/gfn-electron/branch/steam-rpc-feature)
[![Latest release](https://img.shields.io/github/v/release/luisbrn/gfn-electron)](https://github.com/luisbrn/gfn-electron/releases/latest)
[![license](https://img.shields.io/badge/license-GPL--3.0-blue.svg)](LICENSE.md)
[![node](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org/)

## 🎮 About

An unofficial Electron client for NVIDIA's GeForce NOW game streaming service, providing a native Linux desktop experience with enhanced features including **Discord Rich Presence integration** and **interactive settings interface**.

### ✨ Key Features

- 🖥️ **Native Linux Desktop Experience** - Optimized for Linux with hardware acceleration
- 🎯 **Discord Rich Presence** - Show what you're playing on Discord with game artwork
- ⚙️ **Interactive Settings** - Built-in Discord Client ID configuration
- 🎮 **Game Detection** - Automatic Steam game lookup and artwork
- 🚀 **Hardware Acceleration** - VAAPI, GPU rasterization, and zero-copy support
- ⌨️ **Keyboard Shortcuts** - Fullscreen, settings, and navigation shortcuts

## 🚀 Quick Start

### Installation

#### From Source (Recommended)

```bash
git clone https://github.com/luisbrn/gfn-electron.git
cd gfn-electron
npm install
npm start
```

#### From Releases

- Download from [Releases page](https://github.com/luisbrn/gfn-electron/releases/latest)
- Extract and run the executable for your distribution

### First Time Setup

1. **Start the application**: `npm start`
2. **Configure Discord Rich Presence**:
   - Look for the green "⚙️ Discord Settings" button in the top-right corner
   - Click it to open the settings modal
   - Follow the step-by-step instructions to get your Discord Client ID
   - Test the connection and save your settings

## 🎯 Discord Rich Presence Setup

### Quick Setup

1. **Start the app** and look for the green "⚙️ Discord Settings" button in the top-right corner
2. **Click the button** to open the interactive settings modal
3. **Follow the step-by-step instructions** to get your Discord Client ID
4. **Test the connection** and save your settings

### Features

- **Automatic Game Detection** - Detects what game you're playing
- **Steam Integration** - Looks up Steam artwork for games
- **Interactive Settings** - Built-in Discord Client ID configuration
- **Status Updates** - Shows "Playing [Game Name] on GeForce NOW"

### Discord Asset Management

To display game artwork in Discord, you need to upload images to your Discord application:

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

**📁 Pre-made Assets**: Check `scripts/Poster game images/` for 240+ ready-to-use game posters!

> **📖 Detailed Setup**: See [scripts/README.md](scripts/README.md) for complete Discord Rich Presence configuration, asset management, and troubleshooting.

## ⌨️ Keyboard Shortcuts

| Shortcut           | Action                     |
| ------------------ | -------------------------- |
| `F11` or `Super+F` | Toggle fullscreen          |
| `Ctrl+,`           | Open Discord settings      |
| `Ctrl+Shift+I`     | Toggle developer tools     |
| `Alt+Home`         | Go to GeForce NOW homepage |
| `Alt+F4`           | Quit application           |

## 🛠️ Development

### Prerequisites

- Node.js ≥ 20
- npm

### Development Setup

```bash
git clone https://github.com/luisbrn/gfn-electron.git
cd gfn-electron
npm install
npm start
```

### Available Scripts

```bash
npm start          # Start the application
npm run lint       # Run ESLint
npm run format     # Format code with Prettier
npm run format:check # Check formatting
npm test           # Run tests
npm run gen-changelog # Generate changelog
```

### Discord Asset Tools

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

### Testing

```bash
# Run unit tests
npm test

# Run with coverage
npx jest --coverage --runInBand
```

## 🔧 Configuration

### Discord Settings

- **Settings File**: `~/.config/gfn-electron-settings.json`
- **Environment Variable**: `DISCORD_CLIENT_ID`
- **Interactive Setup**: Use the built-in settings interface

### Hardware Acceleration

The app automatically configures:

- VAAPI video decoding
- GPU rasterization
- Zero-copy rendering
- Wayland support

## 🐛 Troubleshooting

### Common Issues

#### Discord Not Detected

- Ensure Discord is running
- Check that the Discord process is visible in system monitor
- Try restarting the application

#### Settings Button Not Visible

- Wait 2-3 seconds after the page loads
- Check browser console for errors (F12)
- Ensure you're on the GeForce NOW interface

#### Performance Issues

- Enable hardware acceleration in your system
- Check GPU drivers are up to date
- Try different `--use-gl` implementations

### Debug Mode

```bash
# Enable debug logging
DEBUG=* npm start

# Check Discord detection
npm test
```

## 📁 Project Structure

```
scripts/
├── main.js                 # Main Electron process
├── rpc.js                  # Discord Rich Presence integration
├── settings.js             # Settings management
├── gfn-settings-injector.js # UI injection script
├── preload.js              # Preload script
├── windowManager.js        # Window management
├── download_poster.js      # Download Steam game posters (512x512)
├── download_gfn_capsule.js # Download GFN capsules (1024x1024)
├── inspect_posters.js      # Check downloaded image dimensions
├── test-steam-scraper.js   # Test Steam App ID detection
└── Poster game images/     # 240+ pre-made game assets
```

### Scripts Documentation

- **[scripts/README.md](scripts/README.md)** - Complete Discord Rich Presence setup guide
- **Asset Management** - How to download and upload game artwork
- **Steam Integration** - Game detection and App ID lookup
- **Troubleshooting** - Common issues and debug information

## 🤝 Contributing

This is a maintained fork of the original project. Contributions are welcome!

### Development Workflow

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

See `docs/non-pr-fork-workflow.md` for detailed contribution guidelines.

## 📜 Credits

**Original Author**: [Horațiu Mlendea](https://github.com/hmlendea)  
**Previous Maintainer**: [Goldy Yan](https://github.com/Cybertaco360)  
**Current Maintainer**: [luisbrn](https://github.com/luisbrn)

## ⚖️ Disclaimer

This project and its contributors are not affiliated with NVIDIA or its GeForce NOW product. This repository does not contain any NVIDIA/GeForce NOW software. It is simply an Electron wrapper that loads the official GFN web application, just as it would in a regular web browser.

## 📄 License

This project is licensed under the GPL-3.0 License - see the [LICENSE.md](LICENSE.md) file for details.

## 🔗 Links

- [GeForce NOW](https://nvidia.com/en-eu/geforce-now)
- [Discord Developer Portal](https://discord.com/developers/applications)
- [Releases](https://github.com/luisbrn/gfn-electron/releases)
- [Issues](https://github.com/luisbrn/gfn-electron/issues)

---

**Made with ❤️ for the Linux gaming community**
