#!/usr/bin/env bash
# Optimized launcher script for GeForce NOW Electron app
# Ensures proper environment setup and calls npm start

set -euo pipefail

# Project root directory (set by install script)
PROJECT_ROOT="${PROJECT_ROOT:-}"

# Auto-detect project root if not set
if [ -z "${PROJECT_ROOT}" ]; then
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  
  # Try to find project root by going up from script directory
  if [ -d "${SCRIPT_DIR}/../scripts" ] && [ -f "${SCRIPT_DIR}/../package.json" ]; then
    PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
  else
    # If script is in ~/.local/bin, search common locations
    for possible_root in \
      "${HOME}/Documents/gfn-electron" \
      "${HOME}/gfn-electron" \
      "/opt/gfn-electron" \
      "/usr/local/share/gfn-electron"; do
      if [ -f "${possible_root}/package.json" ] && [ -d "${possible_root}/scripts" ]; then
        PROJECT_ROOT="${possible_root}"
        break
      fi
    done
  fi
fi

# If still not found, error
if [ -z "${PROJECT_ROOT:-}" ]; then
  echo "Error: Cannot determine project root directory" >&2
  echo "Please re-run the installation script or set PROJECT_ROOT environment variable" >&2
  exit 1
fi

# Change to project directory
if ! cd "${PROJECT_ROOT}" 2>/dev/null; then
  echo "Error: Cannot change to project directory: ${PROJECT_ROOT}" >&2
  exit 1
fi

# Verify we're in the right place
if [ ! -f "package.json" ]; then
  echo "Error: package.json not found in ${PROJECT_ROOT}" >&2
  exit 1
fi

# Ensure Node.js and npm are in PATH
# Check for nvm, fnm, or other Node version managers
if ! command -v npm >/dev/null 2>&1; then
  # Try nvm
  if [ -f "${HOME}/.nvm/nvm.sh" ]; then
    # shellcheck source=/dev/null
    source "${HOME}/.nvm/nvm.sh"
  # Try fnm
  elif [ -f "${HOME}/.fnm/fnm" ]; then
    eval "$("${HOME}/.fnm/fnm" env)"
  # Try systemd user environment
  elif command -v systemctl >/dev/null 2>&1; then
    # Source systemd user environment
    eval "$(systemctl --user show-environment 2>/dev/null | grep -E '^PATH=' || true)"
  fi
fi

# Verify npm is available
if ! command -v npm >/dev/null 2>&1; then
  echo "Error: npm is not available in PATH" >&2
  echo "Please install Node.js and npm, or ensure they are in your PATH" >&2
  echo "Current PATH: ${PATH}" >&2
  exit 1
fi

# Verify Node.js version (20+ recommended)
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
  echo "Warning: Node.js version 20+ recommended (found: $(node -v))" >&2
fi

# Ensure Wayland environment variables are set (for Arch Linux / Omarchy / Kubuntu KDE)
if [ -z "${OZONE_PLATFORM:-}" ] && [ -n "${XDG_SESSION_TYPE:-}" ]; then
  if [ "${XDG_SESSION_TYPE}" = "wayland" ]; then
    export OZONE_PLATFORM=wayland
    export ELECTRON_OZONE_PLATFORM_HINT=wayland
    
    # KDE Plasma specific optimizations
    if [ "${XDG_CURRENT_DESKTOP}" = "KDE" ]; then
      echo "KDE Plasma Wayland session detected"
      # Hint for Qt applications (though Electron uses Ozone, this can help system integration)
      export QT_QPA_PLATFORM=wayland
    fi
  fi
fi

# Ensure XDG runtime directory is set (critical for Wayland)
if [ -z "${XDG_RUNTIME_DIR:-}" ] && [ -d "/run/user/$(id -u)" ]; then
  export XDG_RUNTIME_DIR="/run/user/$(id -u)"
fi

# Launch using npm start - optimized for seamless integration
# npm start handles all environment variables and electron initialization correctly
exec npm start "$@"
