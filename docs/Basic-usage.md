# Basic usage

This page gathers the most common usage patterns and shortcuts for the GeForce NOW Electron wrapper.

## Launching the app

Use the packaged binary from your distribution or run from source:

```bash
npm install
npm start
```

On subsequent runs, `npm start` will be sufficient.

## Keyboard shortcuts

The wrapper provides a few handy shortcuts while running the GeForce NOW web app. The defaults are:

- F11 — Toggle fullscreen
- Ctrl+R / Cmd+R — Reload the web view
- Ctrl+Shift+I / Cmd+Alt+I — Toggle DevTools (development builds)
- Ctrl+Q — Quit the app

If you need platform-specific adjustments, check the `scripts/windowManager.js` for code paths that register shortcuts.

## Command-line arguments

The app accepts a subset of command-line arguments forwarded to the internal Electron process. Common options:

- `--disable-gpu` — disable GPU acceleration
- `--no-sandbox` — run without the Chromium sandbox (not recommended unless troubleshooting)
- `--url <url>` — open a custom URL instead of the default GFN web app

Use `npm start -- --help` to list available Electron flags for your environment.

## Changing the keyboard layout

If keys are remapped or you use a non-standard layout, change your system layout or use the in-app remapping support if your distribution package provides one. For advanced users, keyboard handling is performed by the renderer and can be adjusted in `scripts/renderer.js`.

## Directly launching a game from the desktop

Desktop files and integration points can be used to launch the GFN wrapper. See `com.github.hmlendea.geforcenow-electron.desktop` for an example desktop file. Modify the `Exec` line to add `--url` with a specific GFN game URL if needed.

If you need help creating per-desktop shortcuts for specific games, I can generate example desktop files for common environments (GNOME, KDE, XFCE).
