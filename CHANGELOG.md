# Changelog

Notable changes to data-grid are documented here.

This changelog starts with the 3.x series. Earlier releases are intentionally
not documented.

## [Unreleased]

### Added

- Declarative cell templates: a direct-child `<template data-cell="field">`
  renders a column's cells without JavaScript. `data-dg-text="value"` receives
  the raw scalar value through `textContent`, and the rendered cell exposes it
  as `data-value` for CSS. Templates replay on every render, including after
  `updateRow()`, and take precedence over the authored cell markup and
  `format`/`transform` (`renderCell` still wins). Unsafe templates (`script`,
  `style`, `on*`, executable URL protocols) are ignored and fall back to the
  default renderer; `data:` remains available for image/media `src`.
- Row details dialog: `detailsDisplay: "dialog"` (attribute
  `details-display="dialog"`) opens row details in a modal `<dialog>` instead of
  an inline row. Without `rowDetails`, the grid composes a record sheet from its
  visible and responsive-hidden columns; `rowDetails` content, when present, is
  appended after it. The option is initial-only. `RowDetails.expand()`,
  `collapse()`, `toggle()`, `isExpanded()` and `collapseAll()` keep their
  contract, `rowDetailsToggle` reports open and close, and the dialog survives
  body rerenders. `closeDialog` is a new translatable label.

## [3.7.1] - 2026-10-23

### Added

- Added migration guides from DataTables and ShadTable / TanStack Table.

### Changed

- Updated the runtime dependency on `@lekoala/floating` to `^0.3.1`.
- Completed the public API manifest and documentation for grid state, events,
  plugin label updates and progressive pagination labels.

### Fixed

- `column.attr` now refuses event-handler names (`on*`, case-insensitive) and
  non-string values at column normalization: the column renders normally and an
  error is logged, so a row value can no longer become executable code.
- Fixed column visibility, frozen positioning, autosizing and responsive cells
  with column IDs containing quotes or other CSS selector characters. Nested
  grids keep their own column visibility and frozen state.
- Fixed autosizing after body-only renders and measured available width from
  the scroll viewport.
- Fixed column resizing overwriting configured or user-set widths on following
  columns; canceled resizes now restore the original widths.
- Fixed row lookup and local removal with index-based fallback keys, including
  sorted and filtered pages, and action menus for repeated row objects.
- Fixed row details looking up their content outside the owning grid.
- Fixed JSON attribute parsing corrupting literal percent signs and
  percent-encoded text in otherwise valid JSON.

## [3.7.0] - 2026-10-18

### Breaking / migration

- The topbar (`.dg-topbar`) now lives inside `.dg-frame`, above the scroll
  viewport: frame = [topbar][scroll > table][footer] with a single shared
  border. Class names are unchanged; retarget `.dg-topbar` overrides to
  `.dg-frame > .dg-topbar`. Retargeting is required for specificity too, not
  just placement: the core selector changed from `data-grid .dg-topbar` to
  `data-grid > .dg-frame > .dg-topbar`, so a plain `data-grid .dg-topbar`
  override no longer wins. Only a `.dg-topbar` placed directly under
  `<data-grid>` (or already inside `.dg-frame`) is adopted; one nested in a
  wrapper is ignored and a second topbar is created when search or bulk
  actions mount.

### Added

- Added `normalizeTotal()`: numeric string totals (`"142"`) are coerced to
  `Number`, invalid ones become `null`, in `parseResult()` and at the grid
  boundary (`applyResult()`, progressive chunks).
- Added `labels.noResults` (`No results for "{query}"`), shown when a search
  yields nothing unless `options.noData` is set.

### Changed

- Update @lekoala/floating to ^0.3.1 without changing the picker integration API.
- The generic text filter placeholder is now empty instead of `"_"`: an empty,
  unfocused field shows a small I-beam glyph at the inline-end (the text-entry
  counterpart to the select caret) instead of reading as missing data. Focus
  or a value restores the normal field; explicit placeholders keep their hint
  text with no glyph (no wording, so no translation needed;
  browsers without `color-mix` show a plain empty field). `date`
  (`YYYY-MM-DD`), percent (`%`) and explicit per-column `filterPlaceholder`
  hints are unchanged.
- `ColumnResizer` tracks Pointer Events with pointer capture, so touch resizes
  like mouse (wider hit area on coarse pointers). Resize and reorder stay
  pointer-driven with no keyboard alternative; use `column.width` and the
  `options.columns` order instead.
- Toolchain (Bun ≥ 1.4.3): `bun run typecheck` uses `bun check`; the Biome
  script moves to `bun run check:lint` so bare `bun check` is the typechecker.
  tsc stays for `.d.ts` emit only.
- Documented `params` precedence over the runtime query, `fromUrl()`
  limitations, local single-sort, and the `column.attr` event-handler warning.
- Demo server binds `localhost` by default.

### Fixed

- Fixed multiline load errors collapsing without spacing (`"Line oneLine two"`).
- Fixed a declarative `.dg-topbar` without start/end zones silently dropping
  the search input and the bulk-actions bar: free content moves into
  `.dg-topbar-start` and both zones are always normalized.
- Fixed an empty topbar zone offsetting the remaining zone by the topbar gap:
  whitespace and comments are never parked in a zone and empty zones are
  hidden.
- Fixed search debounce lost after element disconnect/reconnect.
- Fixed local global search matching `"[object Object]"` on nested values:
  only scalars participate.
- Fixed locally derived select filter options: deduplicated on stringified
  values and sorted locale-aware with numeric ordering.

## [3.6.0] - 2026-10-04

### Breaking / migration
- `parseResult()` no longer fabricates `total` from `rows.length` when the payload has
  no `total`: it returns `null` (unknown total). `PageResult.total` is now
  `number | null | undefined`. The grid itself still falls back to `rows.length` in
  `pager="pages"`; only code reading `parseResult(...).total` directly is affected.
- The pager footer is no longer a `<tfoot>`: retarget `data-grid tfoot` /
  `tfoot .dg-*` overrides to `.dg-footer` / `.dg-footer .dg-*`.

### Added

- Added `pager="more"` and `loadMore()` for progressively loading and appending
  result chunks without exposing transport pages in `QueryState`. The Load more
  button keeps keyboard focus while busy and hands it to the first new row once
  the results are exhausted.
- Added optional `PageResult.hasMore` and support for unknown totals, allowing
  backends to skip expensive `COUNT(*)` queries. Bulk actions stay enabled for
  an all-results selection whose total is unknown.
- Added `querychange`, emitted when the runtime query changes, for integrations
  such as URL state and external query builders.
- Added `frozen: "end"` in addition to start-frozen columns.
- Added custom cell editors through `column.renderEditor`.
- Added `enterMovesDown` for spreadsheet-like editing flows.
- Added `|` alternatives to `ArrayDataSource` global search
  (`info|warn` matches either value).
- Added the stable column `id` to the `columnResized` event detail.
- Added advanced-search, URL-state, frozen-column and progressive logs demos.

### Changed

- `SaveState` now persists column order and user-resized widths in addition to
  query and visibility state, keyed by stable column id (states saved by 3.5,
  keyed by field, are still restored).
- Frozen-column geometry now handles start and end groups independently,
  including scroll snapping and RTL.
- Moved the grid footer outside the table scroll viewport so pagination remains
  fixed to the visible grid width instead of scrolling with wide tables.
- Improved editing lifecycle, typing and custom-editor integration.

### Fixed

- Improved context-menu positioning and browser geometry tests.

## [3.5.0] - 2026-09-16

### Added

- Added checkbox editing support.

### Changed

- Improved the editing lifecycle and validation behavior.
- Improved keyboard navigation for collapsed row actions.
- Improved grid geometry, sizing and visual consistency.

## [3.4.0] - 2026-09-09

### Added

- Added a standalone browser bundle.
- Added the Actual CSS theme and demo.
- Added support for authored table headers and `autohidePager`.

### Changed

- Popover positioning uses `@lekoala/floating`.
- Improved package metadata and bundler `sideEffects` declarations.
- Improved theming and demos.

## [3.3.0] - 2026-09-01

### Changed

- Clarified and tightened the public API and option lifecycle.
- Improved SaveState isolation and persistence behavior.
- Improved responsive/plugin plumbing and initial attribute handling.
- Improved package exports, generated types and custom-elements metadata.
- Added optional fetch cache busting.
- Removed the obsolete touch-support plugin.

## [3.2.1] - 2026-08-28

### Fixed

- Fixed scroll capture behavior.

## [3.2.0] - 2026-08-27

### Changed

- Refactored query, column, declarative-table and filter handling into clearer
  internal modules.
- Consolidated disclosure behavior across responsive rows and row details.
- Refactored row actions and responsive behavior.
- Improved pagination, event handling and fixed-height behavior.
- Improved themable icons and disclosure controls.

## [3.1.1] - 2026-08-27

### Fixed

- Fixed draggable-column behavior.
- Fixed boolean filter alignment and related layout issues.

## [3.1.0] - 2026-08-26

### Added

- Added clickable-row behavior and single-selection mode.
- Added value transforms, built-in formatters and per-cell classes.
- Added formatter-aware filtering, percent filters and richer filter syntax.
- Added multi-select filters using the native Popover API when available.

### Changed

- Context menus and collapsed row actions now use native popovers.
- Improved column sizing, alignment and resize limits.
- Improved action layout and filter presentation.

## [3.0.1] - 2026-08-25

### Added

- Added richer declarative tables, including declarative row actions,
  `data-value`, preserved authored cell presentation and minimum column widths.

### Changed

- Improved action and pagination control styling.

## [3.0.0] - 2026-08-23

Version 3 establishes the current data-grid architecture.

### Added

- Added the `DataSource` / `QueryState` model for local and server-backed data.
- Added the plugin-based architecture.
- Added server-first selection state and bulk actions.
- Added structured column filtering and global search.
- Added row actions, editable cells and row details.
- Added responsive behavior, frozen columns and lazy loading.
- Added declarative HTML-table support.
- Added translations, theming and accessibility contracts.
- Added generated TypeScript declarations and custom-elements metadata.

### Changed

- Migrated development, build and test tooling to Bun.
- Reworked packaging and the public API for the 3.x series.
