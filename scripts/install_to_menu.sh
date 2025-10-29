#!/usr/bin/env bash
set -euo pipefail

# Installs a user desktop entry for the GeForce NOW Electron app (local install)
# - creates a desktop file at ~/.local/share/applications/gfn-electron.desktop
# - copies icon.png to ~/.local/share/icons/hicolor/256x256/apps/gfn-electron.png
# - does NOT require sudo

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
APP_NAME="GeForce NOW"
EXEC_CMD="bash -lc 'cd "${REPO_DIR}" && npm start'"
ICON_SRC="${REPO_DIR}/icon.png"
ICON_DST_DIR="$HOME/.local/share/icons/hicolor/256x256/apps"
ICON_DST="$ICON_DST_DIR/gfn-electron.png"
DESKTOP_DIR="$HOME/.local/share/applications"
DESKTOP_FILE="$DESKTOP_DIR/gfn-electron.desktop"

mkdir -p "$ICON_DST_DIR" "$DESKTOP_DIR"

if [ -f "$ICON_SRC" ]; then
  cp "$ICON_SRC" "$ICON_DST"
  echo "Installed icon to $ICON_DST"
else
  echo "Warning: icon not found at $ICON_SRC; desktop entry will reference that path if present."
fi

cat > "$DESKTOP_FILE" <<EOF
[Desktop Entry]
Name=${APP_NAME}
Comment=GeForce NOW (Electron wrapper)
Exec=${EXEC_CMD}
Icon=${ICON_DST}
Terminal=false
Type=Application
Categories=Game;Network;
StartupWMClass=GeForce NOW
EOF

chmod 644 "$DESKTOP_FILE"

# Try to update desktop database if available
if command -v update-desktop-database >/dev/null 2>&1; then
  update-desktop-database "$HOME/.local/share/applications" || true
fi

# Try to update icon cache
if command -v gtk-update-icon-cache >/dev/null 2>&1; then
  # update only the hicolor theme if present
  ICON_THEME_DIR="$HOME/.local/share/icons/hicolor"
  if [ -d "$ICON_THEME_DIR" ]; then
    gtk-update-icon-cache -f -t "$ICON_THEME_DIR" || true
  fi
fi

echo "Installed desktop entry: $DESKTOP_FILE"
echo "You should now find '${APP_NAME}' in your application menu. If it doesn't appear, log out/in or run 'update-desktop-database' and/or restart your desktop session."

exit 0
