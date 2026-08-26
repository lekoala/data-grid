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
- `bun run check:baseline` (`scripts/check-baseline.js`) greps `src/` for the
  post-baseline APIs below (private members, class fields, `structuredClone`,
  `Object.hasOwn`, `replaceAll`, `.at(`, `scrollend`, `getRootNode`) and `css/`
  for directional inline-axis logical properties (see "Bun CSS workaround")
- `bun run size` (`scripts/css-size.js`) reports raw/gzip/brotli of the built CSS
- `bun run ci` = check + check:baseline + typecheck + test + types + manifest +
  build + drift check (`git diff --exit-code -- dist custom-elements.json`) so
  committed artifacts stay in sync
- Mark the public API surface of `src/data-grid.js` with `@public` in JSDoc: the
  CEM generator and the docs rely on it. No `@deprecated` markers: v3 is a clean
  contract, legacy behavior is removed, not annotated.

### Bun CSS workaround (circumstantial, not a CSS philosophy)

Bun's CSS bundler downlevels directional inline-axis logical properties
(`margin-inline-start`, `padding-inline-end`, ...) into large generated
`:lang()` selector sets, because its hardcoded CSS targets predate support
(no user-facing CSS target option yet; upstream PR oven-sh/bun#40368).
DataGrid drives RTL through `[dir="rtl"]` on the grid element
(`css/_rtl.css`), so:

- author directional inline-axis styles as physical LTR declarations plus a
  `[dir="rtl"]` mirror in `_rtl.css`;
- logical sizing (`inline-size`, `min-inline-size`, ...) and block-axis
  properties compile unchanged and stay preferred where they fit;
- `scripts/build.js` fails if generated CSS contains `:lang(`, and
  `check:baseline` rejects new inline-direction logicals in `css/`.

Revisit when Bun ships a CSS target option: migrating back to logical
properties would then be optional, not automatic.

## Architecture rules

- One data path: UI event -> setQuery() -> load() -> render()
- DataGrid knows `Plugin`, never a specific plugin name
- Prefer plain objects and functions over classes; duck typing; no abstract
  hierarchies, no event bus, no DI, no state framework
- Avoid Manager / Service / Factory / Registry names
- Normalize at API boundaries; every new abstraction must remove
  branching/coupling (rule: "what does it let me delete?")
- Prefer simplification over abstraction
- Prefer native platform APIs for direct DOM operations. Extract helpers when
  they encapsulate reusable parsing, normalization, event semantics, or
  component invariants that would otherwise obscure the code's intent. Do not
  wrap native APIs merely for brevity.

## Browser baseline (JS)

`src/` is itself exported by the package (see `exports`), so the source must be
compatible by construction — never transpiled, and matching a ~2020 browser
target. This is enforced by review, not by a build step.

Optional floating UI may use newer native platform APIs when that materially
removes custom lifecycle or positioning code. The feature must be capability
detected and unsupported browsers must lose or simplify only that optional UI,
never the grid itself. `filterMultiple` is the first such exception: browsers
with Popover API and CSS Anchor Positioning get the checkbox popover emitting
`in`; older browsers receive the ordinary single select emitting `eq`. Do not
add a polyfill or a JavaScript positioning fallback for this feature.

This exception does not change the package-wide JS baseline or the
`check:baseline` rules. Keep the core runtime compatible with the established
~2020 contract.

Allowed:
- ES modules, async/await, `for...of`
- `Object.entries` / `Object.fromEntries`
- optional chaining (`?.`) and nullish coalescing (`??`)
- `AbortController`, `ResizeObserver`, template literals

Avoid (post-baseline APIs and syntax):
- private class members (`#method`) and class-field initializers — use an
  explicit `constructor` for instance state and ordinary prototype methods
  (prototype methods are also shared between instances, unlike arrow-function
  fields)
- `Array.prototype.at`, `Object.hasOwn`, `structuredClone`, `replaceAll`
  (use `replace`), `Node.getRootNode`, dynamic `import()`, top-level await
- Web APIs newer than the baseline such as `scrollend`
- forcing `passive` implicitly in the `on()`/`off()` event helper — pass
  explicit options instead

## Code style

- `for...of` (not `forEach`); optional chaining / nullish coalescing
- ~2020 browser baseline; no polyfills; avoid `structuredClone`, `Array.at`,
  `Object.hasOwn`
- Docs and commit messages in English

## Testing

- Tests live in `test/*.test.js`, grouped by feature or plugin: each distinct
  subject gets its own file (e.g. `row-details.test.js`, `editing.test.js`).
  Never accumulate in a catch-all file.
- Prefer the shared semantic helpers from `test/helpers.js` (`change()`,
  `input()`) over inline `dispatchEvent` for repeated user interactions; keep
  rare or specific cases explicit locally.
- Simulated events must bubble like real interactions: the grid and its
  plugins rely on delegated listeners.

## Documentation

- Markdown table rows must fit on one line and be properly formatted
- Keep a reasonable line length (roughly ≤ 120 characters). When a table cell
  needs a long explanation, keep the row concise and move the detail into a
  bullet note below the table instead of stuffing one very long cell — a single
  line that wraps across most of the editor is not "properly formatted"
