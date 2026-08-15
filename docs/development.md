# Development

## Requirements

- [Bun](https://bun.sh) (package manager + test runner)

## Setup

```bash
bun install
```

## Commands

```bash
bun test           # unit/component tests (happy-dom) - excludes test/browser
bun run test:browser # real-browser tests (Bun.WebView + demo/server.js) - CI only, skipped on Windows
bun run test:browser:wsl # run the browser suite inside WSL (Linux/Chrome)
bun run check      # Biome lint + format check
bun run typecheck  # tsc -p jsconfig.json (JSDoc typecheck)
bun run build      # Bun.build JS + CSS into dist/ (scripts/build.js)
bun run ci         # check + typecheck + test + build
bun run dev        # build + serve demo (Bun.serve, demo/server.js)
```

`bun run dev` serves the whole repo on `http://localhost:8002` (root -> the
demo pages) plus a mock server-side API (`/api/users`, `/api/errors`) that
simulates pagination, sort, filters, latency and errors. `demo/server.js`
reuses the same filter/sort helpers as the client (`src/data-source.js`).

`bun run test:browser` needs a real browser: `Bun.WebView` uses Chrome/Chromium
on Linux and WKWebView on macOS. It does not run on Windows (skipped). The CI
workflow runs it on Ubuntu (Chrome) and macOS (WKWebView).

`bun run test:browser:wsl` runs the same suite inside WSL2 (Linux/Chrome) for
a fast local loop on Windows. It requires the default WSL distro to have `bun`
from the official installer (not snap - WebView is missing from the snap build)
and `google-chrome-stable` installed. The repo path is resolved from the
current directory (WSL translates the Windows cwd to `/mnt/...`), so nothing
machine-specific is committed. The repo is synced to a WSL-local copy named
after the repo folder (e.g. `~/k-grid`) to avoid sharing the Windows
`node_modules`. Overrides: `WSL_REPO`, `WSL_HOME`, `WSL_CHROME`.

## Browser baseline

Runtime code targets modern evergreen browsers with native ES modules and
commonly available Web Platform APIs (~2020). No JavaScript polyfills are
included or required.
