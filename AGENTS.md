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
- `bun run check:baseline` (`scripts/check-baseline.js`) greps `src/` for APIs
  newer than the documented browser floor (`scrollend`) and `css/`
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

- logical values that compile cleanly stay preferred: `text-align: start/end`
  backs `Column.align` and follows the reading direction natively — never
  replace them with physical declarations plus an RTL mirror;
- directional layout properties (`margin/padding/inset/border-inline-*`) are
  authored as physical LTR declarations plus a `[dir="rtl"]` mirror in
  `_rtl.css` — a bundler constraint, not a CSS philosophy;
- fixed pictogram geometry (check strokes, icon coordinates) stays
  intentionally physical: the drawing must not flip in RTL;
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
- `BaseElement` discovers `${option}Changed()` methods dynamically for observed
  attributes. Add one only when a runtime attribute change requires an
  immediate effect that a native attribute or a live option read does not
  already provide. The hook must fully synchronize the affected model,
  lifecycle and DOM state in both directions, with transition tests; never add
  a rerender-only hook merely to satisfy the naming convention. Reuse the hook
  during initial setup when it performs the same synchronization.
- Keep `BaseElement` lifecycle entry points (`_ready`, `_connected`, and
  `_disconnected`) accessible; other `DataGrid` state and helpers should be
  private unless they are part of the documented public or plugin API.

## Public surface

A small, flexible, powerful grid — not a monster to configure. Every public knob
(option, attribute, event, `--dg-*` token, documented class) is API: it lands in
`custom-elements.json`, in the docs, and in the compatibility contract for good.
Add one only when it buys a consumer something they could not already do:

- a value read by a single internal rule stays a literal in that rule. Tokens
  are for what a theme legitimately recolors: surfaces, rows, controls, states —
  not the internal tint of one control
- prefer one shared class over a new option, and an existing hook over a new one
- rule (the styling twin of "what does it let me delete?"): "what does it let a
  consumer do that they cannot do today?" If the answer is "nothing, it saves
  them one CSS rule", leave it out

## Browser baseline (JS)

`src/` is itself exported by the package (see `exports`), so the source must be
compatible by construction — never transpiled, and matching these early-2022
evergreen browser floors:

- Chromium 99+
- Firefox 98+
- Safari 15.4+

No JavaScript polyfills are included or required. This is enforced by review and
by the compatibility gate below.

Optional floating UI may use newer native platform APIs when that materially
removes custom lifecycle or positioning code. The feature must be capability
detected and unsupported browsers must lose or simplify only that optional UI,
never the grid itself. `filterMultiple` is the first such exception: browsers
with Popover API and CSS Anchor Positioning get the checkbox popover emitting
`in`; older browsers receive the ordinary single select emitting `eq`. Do not
add a polyfill or a JavaScript positioning fallback for this feature.

This exception does not change the package-wide JS baseline or the
`check:baseline` rules. Keep the core runtime compatible with the documented
floor.

Allowed:
- ES modules, async/await, `for...of`
- `Object.entries` / `Object.fromEntries`
- optional chaining (`?.`) and nullish coalescing (`??`)
- private class members (`#method`, `#field`)
- `Object.hasOwn`, `Array.prototype.at`, `String.prototype.replaceAll`
- `structuredClone` when a real structured clone is required
- `AbortController`, `ResizeObserver`, template literals

Avoid:
- APIs and syntax newer than the documented browser floor
- top-level await in public entry modules unless there is a concrete need
- class fields when constructor initialization is clearer
- Web APIs newer than the baseline such as `scrollend`
- forcing `passive` implicitly in the `on()`/`off()` event helper — pass
  explicit options instead

## Code style

- `for...of` (not `forEach`); optional chaining / nullish coalescing
- early-2022 browser baseline; no polyfills
- Docs and commit messages in English
- Leave one blank line between class methods.

## Testing

- Tests live in `test/*.test.js`, grouped by feature or plugin: each distinct
  subject gets its own file (e.g. `row-details.test.js`, `editing.test.js`).
  Never accumulate in a catch-all file.
- Prefer the shared semantic helpers from `test/helpers.js` (`change()`,
  `input()`) over inline `dispatchEvent` for repeated user interactions; keep
  rare or specific cases explicit locally.
- Simulated events must bubble like real interactions: the grid and its
  plugins rely on delegated listeners.
- Shared Chrome/WebKit browser tests assert portable, user-visible invariants,
  not engine output such as exact sub-pixel geometry, computed-style
  serialization, or browser-specific synthetic focus behavior. Wait for the
  functional state under test and re-query the DOM after rerenders; do not
  observe layout, transitions, or top-layer changes synchronously.
- Gate backend-specific tests explicitly. CDP, physical pointer injection,
  hover, precise drag/right-click, and pixel-level geometry are Chrome-only.
  Before changing production code for a browser-test failure, establish whether
  the product state is wrong or only the harness interaction/observation differs.
- `skipIf(IS_WINDOWS)` means a browser test never runs on a Windows dev machine:
  a green local `bun test` proves nothing about it, and CI is its first real
  execution. `bun run test:browser:wsl` covers it when a working WSL2 distro is
  available; when it is not, the test is unverified until CI runs it, so keep it
  built out of interactions the suite already exercises rather than new ones.
- Synthesized input is not real input. `view.press()` sends a key down/up pair
  with no `keypress`, so it cannot activate a `<button>` with Enter on Chrome:
  use `Space`, which activates on keyup. Reuse a key/gesture already proven in
  the suite; a new interaction primitive must be shown to reach the element
  before the assertion around it is trusted.

## Documentation

- Markdown table rows must fit on one line and be properly formatted
- Keep a reasonable line length (roughly ≤ 120 characters). When a table cell
  needs a long explanation, keep the row concise and move the detail into a
  bullet note below the table instead of stuffing one very long cell — a single
  line that wraps across most of the editor is not "properly formatted"
