# Fix Summary: Desktop Launcher Issues

## Problem

When launching from desktop menu, the app had issues that didn't occur with `npm start`:

- Mouse cursor boxing/confinement
- Darker colors (hardware acceleration not working)
- Desktop shortcuts (Super+1/2) blocked

## Root Cause

The launcher was trying to replicate what `npm start` does by:

1. Calling Electron directly
2. Manually setting environment variables
3. Applying workarounds that broke functionality

## Solution

**Simplified the launcher to call `npm start` directly.**

The launcher (`~/.local/bin/gfn-electron-launcher`) now:

1. Changes to the project directory
2. Ensures npm is in PATH (sources nvm if needed)
3. Calls `npm start` - **exactly** as it works in terminal

## Changes Made

### scripts/gfn-electron-launcher.sh

- Removed all environment variable manipulation
- Removed direct Electron calls
- Now simply executes: `exec npm start "$@"`

### scripts/main.js

- **Reverted** all workarounds:
  - Restored original `setFullScreen(true)` behavior
  - Removed borderless fullscreen hack
  - Removed keyboard event interception
  - Removed always-on-top prevention

### scripts/windowManager.js

- **Reverted** to original upstream behavior
- Removed borderless fullscreen workarounds
- Restored simple `window.setFullScreen(state)`

## Why This Works

`npm start` works perfectly because:

- It inherits the correct shell environment
- npm handles all path resolution
- Electron is called with correct working directory
- No manual environment variable manipulation needed

The launcher now replicates this **exactly** by calling `npm start`.

## Testing

```bash
# Terminal launch (always worked)
npm start

# Desktop launch (now works identically)
~/.local/bin/gfn-electron-launcher

# Or from application menu
# Click "GeForce NOW" in your app menu
```

Both methods now run the exact same code path.

## What NOT to Do

❌ Don't try to call Electron directly from launcher
❌ Don't manually set environment variables
❌ Don't apply workarounds that break functionality
✅ **Just call `npm start`** - it already works

---

_Fix applied: 2025-11-05_
