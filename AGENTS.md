# data-grid — project conventions

## Positioning

Server-first, explicitly paginated data grid Web Component. No virtualization /
infinite scroll. Real semantic `<table>`, light DOM, vanilla JS, zero runtime
dependencies, optional and decoupled plugins. Bun is tooling only — never a
runtime requirement (no Bun/Node APIs in `src/`).

## Toolchain

- Bun: install, test, build (`scripts/build.js` via `Bun.build`), dev server (`demo/server.js`)
- Biome: lint + format (single `bun run check`)
- tsc: typecheck from JSDoc (`checkJs`, `strict` on) via `bun run typecheck`; emits
  `.d.ts` into `dist/types` via `bun run types` (`tsconfig.types.json`)
- `scripts/custom-elements.js` generates `custom-elements.json` (`bun run manifest`), schema `2.1.0`
- `bun run ci` = check + typecheck + test + types + manifest + build + drift check
  (`git diff --exit-code -- dist custom-elements.json`) so committed artifacts stay in sync
- Mark the public API surface of `src/data-grid.js` with `@public` in JSDoc: the
  CEM generator and the docs rely on it. No `@deprecated` markers: v3 is a clean
  contract, legacy behavior is removed, not annotated.

## Architecture rules

- One data path: UI event -> setQuery() -> load() -> render()
- DataGrid knows `Plugin`, never a specific plugin name
- Prefer plain objects and functions over classes; duck typing; no abstract
  hierarchies, no event bus, no DI, no state framework
- Avoid Manager / Service / Factory / Registry names
- Normalize at API boundaries; every new abstraction must remove
  branching/coupling (rule: "what does it let me delete?")
- Prefer simplification over abstraction

## Code style

- `for...of` (not `forEach`); optional chaining / nullish coalescing
- ~2020 browser baseline; no polyfills; avoid `structuredClone`, `Array.at`,
  `Object.hasOwn`
- Docs and commit messages in English
