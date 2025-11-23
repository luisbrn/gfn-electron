# Installation Guide

## Overview

This guide explains the different ways to run the GeForce NOW Electron app and the differences between development mode and installed mode.

## Running Modes

### 1. Development Mode (`npm start`)

**What it does:**

- Runs Electron through npm's script runner
- Uses `electron .` command from `node_modules/.bin/electron`
- Requires Node.js and npm to be installed
- Suitable for development and testing

**Usage:**

```bash
npm install
npm start
```

**Pros:**

- Easy to use
- Works with npm scripts
- Can pass arguments easily

**Cons:**

- Environment variables may not propagate correctly through npm
- Slower startup (npm overhead)
- Not suitable for desktop integration

### 2. Desktop Launcher (Recommended)

**What it does:**

- Calls Electron directly (`./node_modules/.bin/electron .`)
- Sets all environment variables BEFORE Electron starts
- Properly configured for Wayland/X11 auto-detection
- Installed via `scripts/install_to_menu.sh`

**Usage:**

```bash
# Install to desktop menu
bash scripts/install_to_menu.sh

# Then launch from your application menu
# Or manually:
~/.local/bin/gfn-electron-launcher
```

**Pros:**

- ✅ Proper environment variable propagation
- ✅ Hardware acceleration enabled correctly
- ✅ Correct color rendering (not darker)
- ✅ Proper mouse input (no cursor boxing)
- ✅ Wayland/X11 auto-detection works
- ✅ Fast startup (no npm overhead)
- ✅ Desktop integration ready

**Cons:**

- Requires installation step
- Must be reinstalled if project moves

### 3. Packaged AppImage (Production)

**What it does:**

- Creates standalone executable via `electron-builder`
- No Node.js/npm required
- System-wide installation possible
- Production-ready distribution

**Usage:**

```bash
npm run build
# Creates: dist/geforcenow-electron_2.2.0_linux.AppImage
./dist/geforcenow-electron_2.2.0_linux.AppImage
```

**Pros:**

- ✅ Standalone (no dependencies)
- ✅ Can be distributed
- ✅ Production-ready
- ✅ Proper environment handling

**Cons:**

- Requires build step
- Larger file size
- Must rebuild for updates

## Key Differences

### Environment Variables

**Development Mode (`npm start`):**

- Environment variables may not be set correctly
- Wayland detection may fail
- Hardware acceleration may not enable
- Colors may appear darker
- Mouse input may be boxed

**Desktop Launcher:**

- ✅ All environment variables set BEFORE Electron starts
- ✅ Wayland/X11 properly detected
- ✅ Hardware acceleration enabled
- ✅ Correct color rendering
- ✅ Free mouse movement

### Hardware Acceleration

The app uses GPU backend detection with fallback:

1. **First attempt**: `use-gl=angle` (OpenGL ES via ANGLE)
2. **Second attempt**: `use-gl=egl` (EGL backend)
3. **Fallback**: Software rendering (darker colors)

**Critical**: Environment variables (`OZONE_PLATFORM`, `ELECTRON_OZONE_PLATFORM_HINT`, etc.) must be set BEFORE Electron initializes. The desktop launcher ensures this.

### Mouse Input Issues

**Problem**: When launched from desktop, mouse cursor may be:

- Frozen or slow to respond
- Confined to a box
- Not moving the character view properly

**Root Cause**: Environment variables not set → Wayland detection fails → pointer lock issues

**Solution**: Use the desktop launcher which sets all environment variables before Electron starts.

## Installation Steps

### Quick Install (Recommended)

```bash
# Clone repository
git clone https://github.com/luisbrn/gfn-electron.git
cd gfn-electron

# Install dependencies
npm install

# Install to desktop menu
bash scripts/install_to_menu.sh

# Launch from application menu
```

### Manual Installation

If you prefer to install manually:

1. **Install launcher script:**

```bash
cp scripts/gfn-electron-launcher.sh ~/.local/bin/gfn-electron-launcher
chmod +x ~/.local/bin/gfn-electron-launcher
```

2. **Edit launcher to set PROJECT_ROOT:**

```bash
# Edit ~/.local/bin/gfn-electron-launcher
# Set PROJECT_ROOT="/path/to/gfn-electron"
```

3. **Create desktop entry:**

```bash
cat > ~/.local/share/applications/gfn-electron.desktop <<EOF
[Desktop Entry]
Name=GeForce NOW
Comment=GeForce NOW (Electron wrapper)
Exec=$HOME/.local/bin/gfn-electron-launcher
Icon=/path/to/gfn-electron/icon.png
Terminal=false
Type=Application
Categories=Game;
EOF
```

## Troubleshooting

### Colors are darker than expected

**Cause**: Hardware acceleration not enabled

**Solution**:

1. Use desktop launcher (not `npm start`)
2. Check console for GPU backend message
3. If disabled, reset: `rm ~/.config/GeForce\ NOW/config.json`

### Mouse cursor is boxed/frozen

**Cause**: Environment variables not set → Wayland detection fails

**Solution**:

1. Use desktop launcher
2. Ensure `WAYLAND_DISPLAY` or `XDG_SESSION_TYPE` is set
3. Check launcher debug log: `DEBUG=1 ~/.local/bin/gfn-electron-launcher`

### App not launching from desktop

**Check**:

1. Desktop entry exists: `ls ~/.local/share/applications/gfn-electron.desktop`
2. Launcher is executable: `ls -l ~/.local/bin/gfn-electron-launcher`
3. PROJECT_ROOT is set in launcher
4. Electron exists: `ls node_modules/.bin/electron`

**Debug**:

```bash
DEBUG=1 ~/.local/bin/gfn-electron-launcher
cat ~/.cache/gfn-electron/launcher-env.log
```

## Best Practices

1. **Always use the desktop launcher** for desktop integration
2. **Use `npm start`** only for development/testing
3. **Build AppImage** for distribution or system-wide installation
4. **Check console logs** for GPU backend and Wayland detection messages
5. **Enable debug mode** (`DEBUG=1`) if issues persist

## Advanced: Building AppImage

For production distribution:

```bash
npm run build
# Output: dist/geforcenow-electron_2.2.0_linux.AppImage

# Make executable
chmod +x dist/geforcenow-electron_2.2.0_linux.AppImage

# Run
./dist/geforcenow-electron_2.2.0_linux.AppImage
```

The AppImage includes all dependencies and works on any Linux distribution.
