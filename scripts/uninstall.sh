#!/usr/bin/env bash
# Uninstall script for GeForce NOW Electron app
# Removes desktop entry, icon, and launcher script

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

DESKTOP_FILE="$HOME/.local/share/applications/gfn-electron.desktop"
ICON_FILE="$HOME/.local/share/icons/hicolor/256x256/apps/gfn-electron.png"
LAUNCHER="$HOME/.local/bin/gfn-electron-launcher"

echo -e "${BLUE}=== GeForce NOW Electron Uninstallation ===${NC}"
echo ""

REMOVED=0

# Remove desktop entry
if [ -f "$DESKTOP_FILE" ]; then
  rm -f "$DESKTOP_FILE"
  echo -e "${GREEN}✓${NC} Removed desktop entry: $DESKTOP_FILE"
  REMOVED=1
else
  echo -e "${YELLOW}Note: Desktop entry not found${NC}"
fi

# Remove icon
if [ -f "$ICON_FILE" ]; then
  rm -f "$ICON_FILE"
  echo -e "${GREEN}✓${NC} Removed icon: $ICON_FILE"
  REMOVED=1
else
  echo -e "${YELLOW}Note: Icon not found${NC}"
fi

# Remove launcher script
if [ -f "$LAUNCHER" ]; then
  rm -f "$LAUNCHER"
  echo -e "${GREEN}✓${NC} Removed launcher script: $LAUNCHER"
  REMOVED=1
else
  echo -e "${YELLOW}Note: Launcher script not found${NC}"
fi

# Update desktop database
if command -v update-desktop-database >/dev/null 2>&1; then
  update-desktop-database "$HOME/.local/share/applications" 2>/dev/null || true
  echo -e "${GREEN}✓${NC} Updated desktop database"
fi

# Update icon cache
if command -v gtk-update-icon-cache >/dev/null 2>&1; then
  ICON_THEME_DIR="$HOME/.local/share/icons/hicolor"
  if [ -d "$ICON_THEME_DIR" ]; then
    gtk-update-icon-cache -f -t "$ICON_THEME_DIR" 2>/dev/null || true
    echo -e "${GREEN}✓${NC} Updated icon cache"
  fi
fi

echo ""
if [ $REMOVED -eq 1 ]; then
  echo -e "${GREEN}=== Uninstallation Complete ===${NC}"
  echo ""
  echo "All GeForce NOW Electron files have been removed."
  echo "The application will no longer appear in your menu."
else
  echo -e "${YELLOW}=== Nothing to remove ===${NC}"
  echo "No installation files were found."
fi

exit 0

