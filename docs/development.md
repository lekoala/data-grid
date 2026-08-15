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
bun run typecheck  # tsc -p jsconfig.json (JSDoc typecheck, strict)
bun run types      # tsc -p tsconfig.types.json -> dist/types/*.d.ts
bun run manifest   # generate custom-elements.json (scripts/custom-elements.js)
bun run build      # Bun.build JS + CSS into dist/ (scripts/build.js)
bun run check:package # verify the npm tarball content (scripts/check-package.js)
bun run ci         # check + typecheck + test + types + manifest + build + drift check
bun run dev        # build + serve demo (Bun.serve, demo/server.js)
```

`bun run ci` ends with `git diff --exit-code -- dist custom-elements.json`: the
committed `dist/` and `custom-elements.json` must stay in sync with the source.
Modify a JSDoc or a `--dg-*` token and forget to regenerate -> CI goes red.

`bun run check:package` runs `npm pack --dry-run --json` and asserts the package
contract: the public artifacts (`data-grid.js`, `src/`, `dist/types/*`,
`custom-elements.json`, `themes/`, `docs/`) are present, dev-only sources
(`test/`, `demo/`, `css/`, `scripts/`, `.github/`) are absent, and every
`exports` target resolves inside the tarball. It needs `npm` (not just Bun).

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

## Release

The publish decision stays human; the CI only validates that the package is
publishable (`bun run ci` + `npm pack --dry-run` + `bun run check:package`).

1. Set the version in `package.json`.
2. Validate:

   ```bash
   bun run ci
   npm pack --dry-run
   bun run check:package
   ```

3. Review the tarball contents (`npm pack --dry-run`).
4. Publish:

   ```bash
   npm publish
   ```

5. Tag the exact published commit:

   ```bash
   git tag 3.0.0
   git push origin 3.0.0
   ```

6. Post-publish check:

   ```bash
   npm view data-grid-component@3.0.0
   ```

