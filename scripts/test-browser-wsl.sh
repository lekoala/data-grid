#!/usr/bin/env bash
set -e

# Progress markers: the sync below copies the whole repo across the Windows
# filesystem boundary and can take a minute with no output of its own.
step() {
    echo >&2
    echo "==> $1" >&2
}

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

step "Environment"
echo "repo:   $REPO" >&2
echo "bun:    $(command -v bun || echo 'NOT FOUND') $(bun --version 2>/dev/null)" >&2
echo "chrome: $BUN_CHROME_PATH $("$BUN_CHROME_PATH" --version 2>/dev/null || echo 'NOT FOUND')" >&2

# Sync to a WSL-local copy (named after the repo folder) so the Windows
# node_modules is never touched (its binaries are platform-specific).
WORK="$HOME/$(basename "$REPO")"
step "Syncing repo to $WORK (slow: reads across /mnt)"
rm -rf "$WORK"
mkdir -p "$WORK"
tar -C "$REPO" -cf - --exclude=node_modules --exclude=.git . | tar -C "$WORK" -xf -
cd "$WORK"
echo "synced $(find . -type f | wc -l) files" >&2

step "bun install"
bun install

step "bun run build"
bun run build

step "bun run test:browser"
bun run test:browser
