# Wayland & GNOME notes for GeForce NOW Electron

This document summarizes recommended flags and steps to improve compatibility with Wayland (GNOME) and Electron.

## Automatic Wayland Detection

The app **automatically detects Wayland** when:

- `XDG_SESSION_TYPE=wayland` is set (most common)
- `WAYLAND_DISPLAY` environment variable is set

When detected, the app automatically sets `OZONE_PLATFORM=wayland` and enables Wayland-specific optimizations.

You can verify detection in the console output:

```text
Session type: wayland
OZONE auto-detected: wayland
Wayland-specific optimizations enabled
```

## Manual Override

If you need to manually control the platform:

- **Force Wayland** (even on X11):

```bash
npm start -- --ozone=wayland
# or
OZONE_PLATFORM=wayland npm start
```

- **Force X11** (even on Wayland):

```bash
npm start -- --ozone=x11
# or
OZONE_PLATFORM=x11 npm start
```

- **Force server-side window decorations** (if client-side decorations misbehave):

```bash
npm start -- --force-frame
```

## Flatpak Notes

Flatpak apps use sandboxing. To pass environment variables to a Flatpak-run app, use Flatpak's `--env` or set them in the manifest:

```fish
flatpak run --env=OZONE_PLATFORM=wayland io.github.hmlendea.geforcenow-electron
```

## GNOME Tray Icons

GNOME removed legacy tray icons; install the "AppIndicator" extension (KStatusNotifierItem) to restore tray icons.

Extensions can be enabled via the GNOME Extensions app or the website <https://extensions.gnome.org>

## Best Practices for Wayland

The app is configured with Wayland best practices:

1. **Automatic Detection**: No manual configuration needed on Wayland sessions
2. **Hardware Acceleration**: VAAPI video decoding enabled for optimal performance
3. **Window Management**: Proper bounds and focus handling for Wayland compositors
4. **Input Handling**: Enhanced touchpad and IME support for Wayland
5. **Color Profile**: sRGB color profile to avoid color shifts on Wayland compositors
6. **GPU Fallback**: Automatic fallback to different GL backends if crashes occur

## Troubleshooting

### Window Controls

If an app only shows the close (X) button, it may be using client-side decorations. Try `--force-frame` to use server-side window decorations:

```bash
npm start -- --force-frame
```

### GPU Crashes

The app automatically attempts alternative GL backends (angle → egl → disabled).

If crashes persist, disable hardware acceleration:

```bash
npm start -- --disable-gpu
```

### Video Playback Issues

If video is choppy or not playing:

- Verify VAAPI support: `vainfo`
- Check GPU acceleration: `glxinfo | grep "direct rendering"`
- Try forcing EGL backend by resetting config: `rm ~/.config/GeForce\ NOW/config.json`

### Window Focus Issues

If windows don't receive focus properly:

- The app uses `ready-to-show` event and briefly sets `always-on-top` to force compositor focus
- If issues persist, try `--force-frame` for server-side decorations
