# Changelog

Notable changes to data-grid are documented here.

This changelog starts with the 3.x series. Earlier releases are intentionally
not documented.

## [3.6.0] - Unreleased

### Breaking / migration
- `parseResult()` no longer fabricates `total` from `rows.length` when the payload has
  no `total`: it returns `null` (unknown total). `PageResult.total` is now
  `number | null | undefined`. The grid itself still falls back to `rows.length` in
  `pager="pages"`; only code reading `parseResult(...).total` directly is affected.
- The pager footer is no longer a `<tfoot>`: retarget `data-grid tfoot` /
  `tfoot .dg-*` overrides to `.dg-footer` / `.dg-footer .dg-*`.

### Added

- Added `pager="more"` and `loadMore()` for progressively loading and appending
  result chunks without exposing transport pages in `QueryState`.
- Added optional `PageResult.hasMore` and support for unknown totals, allowing
  backends to skip expensive `COUNT(*)` queries.
- Added `querychange`, emitted when the runtime query changes, for integrations
  such as URL state and external query builders.
- Added `frozen: "end"` in addition to start-frozen columns.
- Added custom cell editors through `column.renderEditor`.
- Added `enterMovesDown` for spreadsheet-like editing flows.
- Added `|` alternatives to `ArrayDataSource` global search
  (`info|warn` matches either value).
- Added advanced-search, URL-state, frozen-column and progressive logs demos.

### Changed

- `SaveState` now persists column order and user-resized widths in addition to
  query and visibility state.
- Progressive results may expose `total: null`; `hasMore` is authoritative when
  provided.
- Frozen-column geometry now handles start and end groups independently,
  including scroll snapping and RTL.
- Moved the grid footer outside the table scroll viewport so pagination remains
  fixed to the visible grid width instead of scrolling with wide tables.
- Improved editing lifecycle, typing and custom-editor integration.

### Fixed

- Improved context-menu positioning and browser geometry tests.
- Fixed progressive-loading edge cases around stale requests, resets, empty
  chunks and unknown totals.

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
