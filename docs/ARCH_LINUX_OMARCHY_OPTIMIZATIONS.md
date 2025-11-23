# Arch Linux & Omarchy Optimizations

## Overview

This document details optimizations specifically implemented for **Arch Linux** and **Omarchy** desktop environment compatibility.

---

## 🎯 Omarchy-Specific Optimizations

### Hyprland Window Manager Detection

Omarchy uses **Hyprland** as its window manager. The app now:

1. **Auto-detects Hyprland** via:

   - `XDG_CURRENT_DESKTOP` environment variable
   - `HYPRLAND_INSTANCE_SIGNATURE` environment variable

2. **Applies Hyprland-specific optimizations**:
   - Window focus handling optimized for tiling window managers
   - Delayed focus for proper window tiling integration
   - Fullscreen handling optimized for Hyprland
   - Window management flags optimized for tiling WMs

### Window Focus Optimization

```javascript
// For Hyprland: Small delay allows proper window tiling
if (isHyprland) {
  setTimeout(() => {
    mainWindow.focus();
    // Window bounds set after tiling
  }, 100);
}
```

**Impact**: Prevents window focus issues when Omarchy tiles the window.

---

## 🐧 Arch Linux Optimizations

### VAAPI Hardware Acceleration

Arch Linux typically has excellent VAAPI support. The app now:

1. **Enables VAAPI video decoding**:

   - `VaapiVideoDecoder` feature enabled
   - Hardware video decode acceleration
   - Optimized for Mesa/Intel/NVIDIA setups common on Arch

2. **Memory Management**:
   - Zero-copy enabled for better performance
   - Native GPU memory buffers
   - Optimized memory handling for Arch's typical setups

**Impact**: Better video performance, lower CPU usage, smoother streaming.

### Window Management

1. **Background Throttling Disabled**:

   - `backgroundThrottling: false` - App stays responsive even when backgrounded
   - Important for multi-workspace usage in Omarchy

2. **Immediate Background Color**:
   - Window shows correct background color immediately
   - Better visual experience during load

**Impact**: Smoother experience, better responsiveness.

---

## 🔧 Technical Details

### Compositor Detection

```javascript
const compositor = process.env.XDG_CURRENT_DESKTOP || '';
const isHyprland =
  compositor.toLowerCase().includes('hyprland') ||
  process.env.HYPRLAND_INSTANCE_SIGNATURE !== undefined;
```

### VAAPI Detection

VAAPI is automatically enabled on Linux when:

- Platform is `linux`
- GPU acceleration is enabled
- No crashes detected

### Window Focus Strategy

**For Hyprland (Omarchy)**:

- 100ms delay before focus
- Allows Hyprland to properly tile/manage window
- Prevents focus conflicts

**For Other Compositors**:

- Immediate focus
- Standard center/bounds handling

---

## 📊 Performance Impact

| Optimization              | Impact     | Arch Linux | Omarchy |
| ------------------------- | ---------- | ---------- | ------- |
| VAAPI Hardware Decode     | High       | ✅         | ✅      |
| Hyprland Focus Delay      | Medium     | -          | ✅      |
| Background Throttling Off | Medium     | ✅         | ✅      |
| Zero-Copy Memory          | Low-Medium | ✅         | ✅      |
| Window Management         | Medium     | -          | ✅      |

---

## 🧪 Testing on Omarchy

### Verify Hyprland Detection

```bash
npm start
# Look for: "Hyprland compositor detected - applying Omarchy optimizations"
```

### Verify VAAPI

```bash
# Check if VAAPI is available
vainfo

# In app console, look for:
# "Arch Linux VAAPI optimizations enabled"
```

### Test Window Behavior

1. **Launch app** - Window should appear and tile correctly
2. **Fullscreen** - Should work smoothly with Hyprland
3. **Workspace switching** - Should maintain focus correctly
4. **Multi-window** - Should tile properly with other windows

---

## 🐛 Troubleshooting

### Window Doesn't Focus Properly

If window doesn't receive focus on Omarchy:

```bash
# Check if Hyprland is detected
echo $XDG_CURRENT_DESKTOP
echo $HYPRLAND_INSTANCE_SIGNATURE

# Force frame mode if needed
npm start -- --force-frame
```

### Video Playback Issues

If video is choppy:

```bash
# Verify VAAPI
vainfo

# Check GPU acceleration
glxinfo | grep "direct rendering"

# Reset GPU config if needed
rm ~/.config/GeForce\ NOW/config.json
```

### Window Tiling Issues

If window doesn't tile correctly:

1. Check Hyprland detection in console
2. Verify window is not forced to float in Hyprland config
3. Try `--force-frame` flag

---

## 🔄 Future Enhancements

Potential improvements for Arch/Omarchy:

1. **Hyprland Rules Integration**: Auto-configure Hyprland rules for optimal window behavior
2. **Workspace Detection**: Better workspace/desktop switching integration
3. **Performance Monitoring**: Arch-specific performance metrics
4. **AUR Package**: Official AUR package for easier installation

---

_Last Updated: 2025-11-05_
_Status: ✅ Implemented_
