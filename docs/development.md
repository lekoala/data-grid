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
bun run build      # bundle JS + CSS into dist/
bun run ci         # check + typecheck + test + build
bun run dev        # serve demo with esbuild (--servedir)
```

## Browser baseline

Runtime code targets modern evergreen browsers with native ES modules and
commonly available Web Platform APIs (~2020). No JavaScript polyfills are
included or required.
