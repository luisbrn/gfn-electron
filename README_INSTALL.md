# Quick Installation Guide

## Install on Your PC

### 1. Install Dependencies

**Arch Linux:**

```bash
sudo pacman -S nodejs npm
```

### 2. Install Application

```bash
cd /path/to/gfn-electron
npm install
./scripts/install_to_menu.sh
```

### 3. Launch

The app will appear in your application menu as **"GeForce NOW"**.

---

## What Gets Installed

- ✅ Desktop entry (application menu integration)
- ✅ Launcher script (optimized for Arch Linux/Omarchy)
- ✅ Application icon
- ✅ Automatic Wayland/X11 detection
- ✅ Proper environment setup

**All files installed to `~/.local/` (no sudo required)**

---

## Uninstall

```bash
./scripts/uninstall.sh
```

---

## Full Documentation

See `docs/INSTALLATION_GUIDE.md` for complete installation instructions and troubleshooting.
