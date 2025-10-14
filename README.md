# GeForce Now Electron

[CI](https://github.com/luisbrn/gfn-electron/actions/workflows/node.js.yml/badge.svg) [![coverage (steam-rpc-feature)](https://codecov.io/gh/luisbrn/gfn-electron/branch/steam-rpc-feature/graph/badge.svg)](https://codecov.io/gh/luisbrn/gfn-electron/branch/steam-rpc-feature) [![license](https://img.shields.io/badge/license-GPL--3.0-blue.svg)](LICENSE.md) ![node](https://img.shields.io/badge/node-%3E%3D20-brightgreen)
[![Latest GitHub release](https://img.shields.io/github/v/release/luisbrn/gfn-electron)](https://github.com/luisbrn/gfn-electron/releases/latest)

## NO LONGER DISCONTINUED

Hi everyone!

The owner of this repository had discontinued and archived the project a few weeks ago but the project is back now. I will be continuing to work on this project and we welcome as much help as possible from the community!

Thanks for everyone's support!

---

## About

Unofficial client for Nvidia's GeForce NOW game streaming service, providing a native Linux desktop experience and some additional features such as Discord rich presence.

## About us

## Disclaimer

This project and its contributors are not affiliated with Nvidia, nor its GeForce NOW product. This repository does not contain any Nvidia / GeForce NOW software. It is simply an Electron wrapper that loads the official GFN web application page, just as it would in a regular web browser.

## Developers

Founder & Owner: [Horațiu Mlendea](https://github.com/hmlendea)

Maintainer: [Goldy Yan](https://github.com/Cybertaco360)

## Installation

[![Get it from the AUR](https://raw.githubusercontent.com/hmlendea/readme-assets/master/badges/stores/aur.png)](https://aur.archlinux.org/packages/geforcenow-electron/) [![Get it from FlatHub](https://raw.githubusercontent.com/hmlendea/readme-assets/master/badges/stores/flathub.png)](https://flathub.org/apps/details/io.github.hmlendea.geforcenow-electron)

**\*Note**: The main version of this project, which receives the most support, is the flatpak version hosted on FlatHub!\*

## Manual Installation

- Go to the [latest release](https://github.com/hmlendea/gfn-electron/releases/latest).
- Download the specific file that best fits your distro.

**\*Note**: Manual installations are possible but not supported. Please use the flatpak version if you have any trouble with the manual installation!\*

## Usage

- [Basic usage](https://github.com/hmlendea/gfn-electron/wiki/Basic-usage)
  - [Keyboard shortcuts](https://github.com/hmlendea/gfn-electron/wiki/Basic-usage#keyboard-shortcuts)
  - [Command-line arguments](https://github.com/hmlendea/gfn-electron/wiki/Basic-usage#command-line-arguments)
  - [Changing the keyboard layout](https://github.com/hmlendea/gfn-electron/wiki/Basic-usage#changing-the-keyboard-layout)
  - [Directly launching a game from the desktop](https://github.com/hmlendea/gfn-electron/wiki/Basic-usage#directly-launching-a-game-from-the-desktop)
- [Integrations](https://github.com/hmlendea/gfn-electron/wiki/Integrations)
  - [Discord (Rich Presence details & disable instructions)](scripts/README.md#disabling-discord-rich-presence-rpc)

<!-- Discord Rich Presence details moved to scripts/README.md (single source of truth) -->

## Developer npm scripts

Useful scripts for development:

- `npm run lint` — run ESLint across the codebase
- `npm run format` — run Prettier to format files
- `npm run format:check` — check formatting
- `npm test` — run the smoke test (`scripts/test-steam-scraper.js`)
- `npm run gen-changelog` — generate a commit-based changelog (prints to stdout)

- [Troubleshooting](https://github.com/hmlendea/gfn-electron/wiki/Troubleshooting)
  - [Gamepad controls are not detected](https://github.com/hmlendea/gfn-electron/wiki/Troubleshooting#gamepad-controls-are-not-detected)
  - [Steam Deck controls are not detected](https://github.com/hmlendea/gfn-electron/wiki/Troubleshooting#steam-deck-controls-are-not-detected)

## Developer / testing notes

Quick notes for contributors and CI:

- For Discord Rich Presence configuration and disable instructions see [scripts/README.md#disabling-discord-rich-presence-rpc](scripts/README.md#disabling-discord-rich-presence-rpc).

  - Coverage on branch (steam-rpc-feature): Lines **94.66%**, Branches **76.03%** — [![codecov (steam-rpc-feature)](https://codecov.io/gh/luisbrn/gfn-electron/branch/steam-rpc-feature/graph/badge.svg)](https://codecov.io/gh/luisbrn/gfn-electron/branch/steam-rpc-feature)

> Note: badges show data for this fork where possible. The release badge now points to this fork's releases; if you'd prefer to show upstream releases instead, I can revert it.

- Run unit tests locally (Jest):

```fish
npm ci
npm run test:unit --if-present
# or for coverage
npx jest --coverage --runInBand
```

- Note: CI uses Node 20 and tests are configured to ignore `dist/**` (see `jest.config.js`) so built artifacts do not affect test discovery or coverage.

## Building from source

## Requirements

You will need to install [npm](https://www.npmjs.com/), the Node.js package manager. On most distributions, the package is simply called `npm`.

## Cloning the source code

Once you have npm, clone the wrapper to a convenient location:

```bash
git clone https://github.com/hmlendea/gfn-electron.git
```

## Building

```bash
npm install
npm start
```

On subsequent runs, `npm start` will be all that's required.

## Updating the source code

Simply pull the latest version of master and install any changed dependencies:

```bash
git checkout master
git pull
npm install
```

## Links

- [GeForce NOW](https://nvidia.com/en-eu/geforce-now)
- [FlatHub release](https://flathub.org/apps/details/io.github.hmlendea.geforcenow-electron)
- [FlatHub repository](https://github.com/flathub/io.github.hmlendea.geforcenow-electron)
- [Basic usage](https://github.com/hmlendea/gfn-electron/wiki/Basic-usage)
- [Troubleshooting](https://github.com/hmlendea/gfn-electron/wiki/Troubleshooting)
