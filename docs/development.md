# Development

## Requirements

- [Bun](https://bun.sh) (package manager + test runner)

## Setup

```bash
bun install
```

## Commands

```bash
bun test           # unit/component tests (happy-dom)
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

## Browser baseline

Runtime code targets modern evergreen browsers with native ES modules and
commonly available Web Platform APIs (~2020). No JavaScript polyfills are
included or required.
