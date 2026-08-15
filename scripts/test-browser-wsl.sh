#!/usr/bin/env bash
set -e

# Run the real-browser suite (test/browser) inside WSL2 on Linux/Chrome.
# Invoked from Windows via `wsl -e bash scripts/test-browser-wsl.sh`:
# WSL translates the Windows working directory to /mnt/..., so the repo root
# is $PWD. No machine-specific paths live in the repo.
#
# Requirements (documented in docs/development.md):
#   - a WSL distro with `bun` from the official installer (not snap,
#     which ships without Bun.WebView) and google-chrome-stable
# Overrides (env):
#   - WSL_REPO   WSL path to the repo (defaults to $PWD)
#   - WSL_HOME   WSL home directory (defaults to /home/<user>)
#   - WSL_CHROME Chrome/Chromium binary (defaults to /usr/bin/google-chrome)

REPO="${WSL_REPO:-$PWD}"
export HOME="${WSL_HOME:-/home/$(id -un)}"
export PATH="$HOME/.bun/bin:$PATH"
export BUN_CHROME_PATH="${WSL_CHROME:-/usr/bin/google-chrome}"

# Sync to a WSL-local copy (named after the repo folder) so the Windows
# node_modules is never touched (its binaries are platform-specific).
WORK="$HOME/$(basename "$REPO")"
rm -rf "$WORK"
mkdir -p "$WORK"
tar -C "$REPO" -cf - --exclude=node_modules --exclude=.git . | tar -C "$WORK" -xf -
cd "$WORK"

bun install
bun run build
bun run test:browser
