# Installation Guide - GeForce NOW Electron

## Quick Installation

### Step 1: Install Dependencies

**Arch Linux / Omarchy:**

```bash
# Install Node.js 20+ and npm
sudo pacman -S nodejs npm

# Or use nvm (recommended for development)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20
```

### Step 2: Install Application Dependencies

```bash
cd /path/to/gfn-electron
npm install
```

### Step 3: Run Installation Script

```bash
./scripts/install_to_menu.sh
```

That's it! The app will now appear in your application menu.

---

## Installation Details

### What Gets Installed

1. **Desktop Entry**: `~/.local/share/applications/gfn-electron.desktop`

   - Makes the app appear in your application menu
   - Optimized for Arch Linux / Omarchy

2. **Launcher Script**: `~/.local/bin/gfn-electron-launcher`

   - Handles environment setup
   - Ensures proper Wayland/X11 detection
   - Manages Node.js/npm PATH

3. **Icon**: `~/.local/share/icons/hicolor/256x256/apps/gfn-electron.png`
   - Application icon for menu display

### Installation Locations

All files are installed to user directories (`~/.local/`), so:

- ✅ No sudo required
- ✅ User-specific installation
- ✅ Easy to uninstall
- ✅ Works with multiple users

---

## Launching the Application

### From Application Menu

1. Open your application menu (Super key or equivalent)
2. Search for "GeForce NOW"
3. Click to launch

### From Terminal

```bash
~/.local/bin/gfn-electron-launcher
```

Or if `~/.local/bin` is in your PATH:

```bash
gfn-electron-launcher
```

### From Project Directory

```bash
cd /path/to/gfn-electron
npm start
```

---

## Uninstallation

To remove the application:

```bash
./scripts/uninstall.sh
```

This removes:

- Desktop entry
- Launcher script
- Icon file
- Updates desktop database

**Note**: This does NOT remove:

- Project files (you can delete manually if needed)
- User data (`~/.config/GeForce NOW/`)
- Game cache (`~/.config/GeForce NOW/game_cache.json`)

---

## Troubleshooting

### App Doesn't Appear in Menu

1. **Update desktop database:**

   ```bash
   update-desktop-database ~/.local/share/applications
   ```

2. **Update icon cache:**

   ```bash
   gtk-update-icon-cache -f -t ~/.local/share/icons/hicolor
   ```

3. **Log out and log back in** (or restart desktop session)

4. **Check desktop file exists:**
   ```bash
   ls -la ~/.local/share/applications/gfn-electron.desktop
   ```

### Launcher Fails to Start

1. **Check Node.js/npm:**

   ```bash
   node -v  # Should be 20+
   npm -v
   ```

2. **Check launcher script:**

   ```bash
   ~/.local/bin/gfn-electron-launcher --help
   ```

3. **Check project path:**

   ```bash
   # The launcher should have PROJECT_ROOT set
   grep PROJECT_ROOT ~/.local/bin/gfn-electron-launcher
   ```

4. **Reinstall:**
   ```bash
   ./scripts/uninstall.sh
   ./scripts/install_to_menu.sh
   ```

### Wayland Issues

The launcher automatically detects Wayland, but if you have issues:

1. **Check environment:**

   ```bash
   echo $XDG_SESSION_TYPE
   echo $OZONE_PLATFORM
   ```

2. **Force Wayland:**

   ```bash
   OZONE_PLATFORM=wayland ~/.local/bin/gfn-electron-launcher
   ```

3. **Force X11:**
   ```bash
   OZONE_PLATFORM=x11 ~/.local/bin/gfn-electron-launcher
   ```

---

## Advanced Configuration

### Custom Installation Location

Edit `scripts/install_to_menu.sh` and change:

- `LAUNCHER_DST` - Launcher script location
- `ICON_DST_DIR` - Icon directory
- `DESKTOP_DIR` - Desktop entry directory

### Multiple Installations

You can install multiple versions by:

1. Using different desktop entry names
2. Installing to different user directories
3. Using different launcher script names

### System-Wide Installation

For system-wide installation (requires sudo):

1. Change installation paths in `install_to_menu.sh`:

   - `/usr/local/bin/gfn-electron-launcher`
   - `/usr/local/share/applications/gfn-electron.desktop`
   - `/usr/local/share/icons/hicolor/256x256/apps/gfn-electron.png`

2. Run with sudo:
   ```bash
   sudo ./scripts/install_to_menu.sh
   ```

---

## Verification

After installation, verify everything works:

```bash
# Check desktop entry
desktop-file-validate ~/.local/share/applications/gfn-electron.desktop

# Check launcher
~/.local/bin/gfn-electron-launcher --help

# Test launch
~/.local/bin/gfn-electron-launcher
```

---

## Post-Installation

### First Launch

On first launch:

1. The app will open GeForce NOW website
2. You may want to configure Discord Rich Presence (optional)
3. Settings are saved to `~/.config/GeForce NOW/`

### Discord Setup (Optional)

See `scripts/README.md` for Discord Rich Presence setup instructions.

---

_Last Updated: 2025-11-05_
_Optimized for Arch Linux / Omarchy_
