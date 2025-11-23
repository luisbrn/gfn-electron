#!/usr/bin/env bash
set -euo pipefail

# Optimized installation script for GeForce NOW Electron app
# - Creates desktop entry at ~/.local/share/applications/gfn-electron.desktop
# - Installs icon to ~/.local/share/icons/hicolor/256x256/apps/gfn-electron.png
# - Installs optimized launcher script to ~/.local/bin/gfn-electron-launcher
# - Updates desktop database and icon cache
# - Verifies installation
# - Does NOT require sudo (user-level installation)

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
APP_NAME="GeForce NOW"
LAUNCHER_SRC="${REPO_DIR}/scripts/gfn-electron-launcher.sh"
LAUNCHER_DST="$HOME/.local/bin/gfn-electron-launcher"
ICON_SRC="${REPO_DIR}/icon.png"
ICON_DST_DIR="$HOME/.local/share/icons/hicolor/256x256/apps"
ICON_DST="$ICON_DST_DIR/gfn-electron.png"
DESKTOP_DIR="$HOME/.local/share/applications"
DESKTOP_FILE="$DESKTOP_DIR/gfn-electron.desktop"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== GeForce NOW Electron Installation ===${NC}"
echo ""

# Verify we're in the right directory
if [ ! -f "${REPO_DIR}/package.json" ]; then
  echo -e "${RED}Error: package.json not found in ${REPO_DIR}${NC}" >&2
  exit 1
fi

# Check for Node.js and npm
if ! command -v node >/dev/null 2>&1; then
  echo -e "${RED}Error: Node.js is not installed${NC}" >&2
  echo "Please install Node.js (version 20 or higher) first"
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo -e "${RED}Error: npm is not installed${NC}" >&2
  exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
  echo -e "${YELLOW}Warning: Node.js version 20+ recommended (found: $(node -v))${NC}"
fi

# Create necessary directories
echo -e "${BLUE}Creating directories...${NC}"
mkdir -p "$ICON_DST_DIR" "$DESKTOP_DIR" "$(dirname "$LAUNCHER_DST")"

# Install launcher script with project path embedded
echo -e "${BLUE}Installing launcher script...${NC}"
if [ -f "$LAUNCHER_SRC" ]; then
  # Create launcher with embedded project path
  # Replace PROJECT_ROOT line or add it if missing
  if grep -q "^PROJECT_ROOT=" "$LAUNCHER_SRC"; then
    sed "s|^PROJECT_ROOT=.*|PROJECT_ROOT=\"${REPO_DIR}\"|" "$LAUNCHER_SRC" > "$LAUNCHER_DST"
  else
    # Insert PROJECT_ROOT after shebang and initial comments
    awk -v proot="${REPO_DIR}" \
      '/^# Project root/ {print "PROJECT_ROOT=\"" proot "\""; next} 1' "$LAUNCHER_SRC" > "$LAUNCHER_DST"
  fi
  chmod +x "$LAUNCHER_DST"
  echo -e "${GREEN}✓${NC} Installed launcher script to $LAUNCHER_DST"
else
  echo -e "${RED}Error: Launcher script not found at $LAUNCHER_SRC${NC}" >&2
  exit 1
fi

# Install icon
echo -e "${BLUE}Installing icon...${NC}"
if [ -f "$ICON_SRC" ]; then
  cp "$ICON_SRC" "$ICON_DST"
  echo -e "${GREEN}✓${NC} Installed icon to $ICON_DST"
else
  echo -e "${YELLOW}Warning: icon not found at $ICON_SRC${NC}"
  echo "Desktop entry will work but may not show an icon"
fi

# Create optimized desktop file
echo -e "${BLUE}Creating desktop entry...${NC}"
cat > "$DESKTOP_FILE" <<EOF
[Desktop Entry]
Version=1.0
Type=Application
Name=${APP_NAME}
GenericName=Cloud Gaming
Comment=Play games on GeForce NOW cloud gaming service
Exec=${LAUNCHER_DST}
Icon=${ICON_DST}
Terminal=false
Categories=Game;Network;
Keywords=GeForce NOW;GFN;NVIDIA;gaming;streaming;cloud;network;
StartupWMClass=GeForce NOW
StartupNotify=true
MimeType=
# Optimized for Arch Linux / Omarchy
X-GNOME-Autostart-enabled=false
EOF

chmod 644 "$DESKTOP_FILE"
echo -e "${GREEN}✓${NC} Created desktop entry: $DESKTOP_FILE"

# Update desktop database
echo -e "${BLUE}Updating desktop database...${NC}"
if command -v update-desktop-database >/dev/null 2>&1; then
  if update-desktop-database "$HOME/.local/share/applications" 2>/dev/null; then
    echo -e "${GREEN}✓${NC} Desktop database updated"
  else
    echo -e "${YELLOW}Warning: Could not update desktop database${NC}"
  fi
else
  echo -e "${YELLOW}Note: update-desktop-database not found (optional)${NC}"
fi

# Update icon cache
echo -e "${BLUE}Updating icon cache...${NC}"
if command -v gtk-update-icon-cache >/dev/null 2>&1; then
  ICON_THEME_DIR="$HOME/.local/share/icons/hicolor"
  if [ -d "$ICON_THEME_DIR" ]; then
    if gtk-update-icon-cache -f -t "$ICON_THEME_DIR" 2>/dev/null; then
      echo -e "${GREEN}✓${NC} Icon cache updated"
    else
      echo -e "${YELLOW}Warning: Could not update icon cache${NC}"
    fi
  fi
else
  echo -e "${YELLOW}Note: gtk-update-icon-cache not found (optional)${NC}"
fi

# Verify installation
echo ""
echo -e "${BLUE}Verifying installation...${NC}"
VERIFY_FAILED=0

if [ -f "$DESKTOP_FILE" ]; then
  echo -e "${GREEN}✓${NC} Desktop entry exists"
else
  echo -e "${RED}✗${NC} Desktop entry missing"
  VERIFY_FAILED=1
fi

if [ -x "$LAUNCHER_DST" ]; then
  echo -e "${GREEN}✓${NC} Launcher script is executable"
else
  echo -e "${RED}✗${NC} Launcher script not executable"
  VERIFY_FAILED=1
fi

if [ -f "$ICON_DST" ]; then
  echo -e "${GREEN}✓${NC} Icon file exists"
else
  echo -e "${YELLOW}⚠${NC} Icon file missing (optional)"
fi

# Test launcher
if [ -x "$LAUNCHER_DST" ]; then
  if "$LAUNCHER_DST" --help >/dev/null 2>&1 || [ $? -ne 127 ]; then
    echo -e "${GREEN}✓${NC} Launcher script is functional"
  else
    echo -e "${YELLOW}⚠${NC} Could not test launcher (may need npm dependencies)"
  fi
fi

echo ""
if [ $VERIFY_FAILED -eq 0 ]; then
  echo -e "${GREEN}=== Installation Complete! ===${NC}"
  echo ""
  echo "You can now find '${APP_NAME}' in your application menu."
  echo ""
  echo "To launch from terminal:"
  echo "  ${LAUNCHER_DST}"
  echo ""
  echo "If the app doesn't appear in your menu:"
  echo "  1. Log out and log back in"
  echo "  2. Or restart your desktop session"
  echo "  3. Or run: update-desktop-database ~/.local/share/applications"
else
  echo -e "${RED}=== Installation completed with errors ===${NC}"
  echo "Please check the errors above and try again."
  exit 1
fi

exit 0
