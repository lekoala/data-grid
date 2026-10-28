# Styling

The core stylesheet (`css/data-grid.css`) is neutral and dependency-free. All
themeable values are exposed as `--dg-*` custom properties, so the grid follows
the application's design system.

The zero-config standalone script (`dist/data-grid.standalone.min.js`) injects
this stylesheet itself, so no `<link>` is required there - see the README.

## CSS custom properties

Override them on `data-grid` (or globally with `data-grid { ... }`):

| Token                         | Default                 | Used for                       |
|-------------------------------|-------------------------|--------------------------------|
| `--dg-bg`                     | `#fff`                  | table + menu surfaces          |
| `--dg-color`                  | `#1f2328`               | primary text                   |
| `--dg-muted-color`            | `#6b7280`               | footer/meta/placeholder text   |
| `--dg-border-width`           | `1px`                   | structural and control borders |
| `--dg-border-color`           | `#dbdcdd`               | outer structure + separators   |
| `--dg-accent`                 | `#2563eb`               | interactive accent             |
| `--dg-accent-soft`            | `#e9effd`               | subtle accent surface          |
| `--dg-focus-ring`             | `rgb(37 99 235 / 20%)`  | focus ring                     |
| `--dg-header-bg`              | `#f8fafc`               | header + footer background     |
| `--dg-header-color`           | `var(--dg-muted-color)` | header text                    |
| `--dg-filter-bg`              | `var(--dg-bg)`          | filter row background          |
| `--dg-row-stripe-bg`          | `transparent`           | striped rows                   |
| `--dg-row-hover-bg`           | `#f8fafc`               | row hover                      |
| `--dg-row-selected-bg`        | `#eef3fd`               | selected rows                  |
| `--dg-row-selected-hover-bg`  | `#e5ecfd`               | selected row hover             |
| `--dg-row-border-color`       | `#e6e7e8`               | row separators                 |
| `--dg-control-bg`             | `#fff`                  | buttons / inputs / selects     |
| `--dg-control-color`          | `var(--dg-color)`       | control text                   |
| `--dg-control-border-color`   | `#dbdcdd`               | control borders                |
| `--dg-danger-bg`              | `#fef3f2`               | error state                    |
| `--dg-danger-color`           | `#b42318`               | error text                     |
| `--dg-danger-border-color`    | `#fecdca`               | error borders                  |
| `--dg-cell-padding-inline`    | `12px`                  | horizontal cell padding        |
| `--dg-cell-padding-block`     | `8px`                   | vertical cell padding          |
| `--dg-header-padding-y`       | `8px`                   | header vertical padding        |
| `--dg-control-height`         | `32px`                  | filter/footer control height   |
| `--dg-selection-column-width` | `40px`                  | selection column width         |
| `--dg-actions-column-width`   | `48px`                  | collapsed actions column width |
| `--dg-radius`                 | `8px`                   | table / control / menu radius  |

## Host control classes

Use the application's controls while keeping the grid's structural classes:

```js
const DataGrid = customElements.get("data-grid");
DataGrid.setDefaultControlClasses({
    button: "btn outline sm",
    action: "btn outline sm",
    input: "input sm",
    select: "select sm",
});
```

| Role | Controls |
|------|----------|
| `button` | Pagination, bulk actions, load more |
| `action` | Row actions, links, collapsed actions toggle |
| `input` | Search, page number |
| `select` | Page size |

Defaults are resolved when controls render. Changing them also updates connected
controls in place, preserving focus. The static methods are available through
`customElements.get("data-grid")` with ESM and the standalone script.
`DataGrid.getDefaultControlClasses()` returns a copy.

Set `grid.controlClasses = { action: "my-action" }` (or the constructor option)
to override individual roles. Omitted roles follow the current global defaults;
an empty string restores the grid skin for that role. Set the property to `null`
to follow all defaults again. Properties assigned before element upgrade are supported.

`Action.class` and `BulkAction.class` add classes to their role defaults. A control
with host classes has no `dg-skin` marker: its border, background, radius, dimensions,
intent colors, hover, disabled appearance and focus indicator belong to the host CSS.
Provide a visible `:focus-visible` style, including in forced colors. Pagination
icons keep their geometry, but host buttons can choose their own width (for example
`button: "btn icon-only sm"`). Search uses the host input's own padding and
decoration. Its default placeholder
is the translated search label followed by an ellipsis. Supply `searchPlaceholder`
to customize it, or an empty string to clear it. A host search icon can be styled
on `.dg-search-field`.

The actions column starts with an estimated width and measures host controls
on the next frame, including margins and cell padding. Changes to control
sizes (host classes, loaded fonts or styles) trigger a new measurement. All action
cells and the column model share the measured width.

Classes are applied with `classList`, never interpolated into HTML.

Filter controls and sort headers do not use these roles. Use `column.renderFilterCell`
for application-owned filters. Built-in filter and editor controls retain their cell styling.

`--dg-border-width` changes structural borders and controls using the grid skin;
focus outlines and pictograms keep their own strokes. On browsers supporting `color-mix()`,
row separators use a 70% tint of `--dg-border-color`. Override `--dg-row-border-color`
explicitly when the theme needs solid separators.

Style header typography through the public selectors `.dg-head-columns th` and
`.dg-sort-label`, for example:

```css
data-grid .dg-head-columns th {
    text-transform: uppercase;
}
```

## Density

```html
<data-grid density="compact"></data-grid>
```

`density` is `compact`, `default` or `comfortable` and adjusts the spacing
tokens (`--dg-cell-padding-*`, `--dg-header-padding-y`, `--dg-control-height`).

## Scrollable grid

The header (columns + filter row) stays pinned to the top of the grid's own
scroll viewport, and the footer pager bar sits below that viewport in the
frame. This is the **default** — no option is needed. Give the grid a
constrained height and it becomes its own scroll container, keeping its chrome
visible while the rows scroll:

```css
.results-grid {
  max-height: 70vh;
}
```

```html
<data-grid class="results-grid"></data-grid>
```

On an unconstrained grid nothing changes visually (the grid grows with its
content, so there is nothing to stick against). Keep the height-constraining
decision with the application — the grid never applies an arbitrary cap. This
is a progressive enhancement: browsers without `position: sticky` on
`<thead>` simply show a normal table.

> A separate feature — keeping the header visible while the surrounding
> **page** scrolls (`[sticky]`, header only) — is reserved and not yet
> implemented in v3.


## Topbar composition

`searchable` and `bulkActions` share a `.dg-topbar` that lives inside
`.dg-frame`, above the scroll viewport: frame = [topbar][scroll >
table][footer] with a single shared border. No topbar is created for grids
without search, bulk actions or declarative topbar content.

Provide your own commands declaratively; missing zones are created and free
content moves into `.dg-topbar-start`, while the search input lands in
`.dg-topbar-end`:

```html
<data-grid searchable>
  <div class="dg-topbar">
    <span class="app-summary">$22,550/mo</span>
    <button type="button" id="export">Export</button>
  </div>
</data-grid>
```

| Zone | Default content |
|------|-----------------|
| `.dg-topbar-start` | Bulk actions, selection count, application commands |
| `.dg-topbar-end` | Summary, custom filters, global search |

## One visible title

Bulk actions, search and the table title share one visual space: show a single
visible title, never two. Two recipes cover both cases:

- **Hero** (search with an optional summary, no bulk actions): put the title
  first in the topbar next to the search, and keep the `caption` as the
  visually-hidden accessible name (same snippet as under Caption). One chrome
  row. See `demo/declarative.html`. Hero and Declarative topbar are the visual
  references.
- **Toolbar** (bulk actions, filters or custom controls): keep the topbar for
  controls only and show the title as the quiet `caption` row below it. Two
  chrome rows, no duplication. See the Full scene in `demo/index.html`. Full is
  the combinatorial validation scene, not the visual reference.

A page-level heading above the grid can carry the visible title instead. A
heading does not name the table by itself: point the grid at it explicitly so
assistive technology announces the table. The accessible name always resolves
through `caption`, falling back to `aria-labelledby`, then `aria-label`:

```html
<h2 id="users-title">Users</h2>
<data-grid aria-labelledby="users-title"></data-grid>
```

A visible `caption` lives inside the `<table>` in `.dg-scroll`, so it scrolls
with the rows both vertically and horizontally. The topbar lives outside that
viewport, above it, so its title stays visible. Prefer the topbar title when
the title must stay put; a visible caption remains a valid quiet dataset
label.

The zones wrap naturally: on a narrow grid the actions stay on the first row
and the search takes the second row at full width. Retarget topbar overrides
to `.dg-frame > .dg-topbar`, as the bar is no longer a sibling of the frame.

## Bootstrap theme

`themes/bootstrap.css` maps the tokens onto Bootstrap 5 variables, including dark
mode via `[data-bs-theme="dark"]`. Load it after `data-grid.css`:

```html
<link rel="stylesheet" href="dist/data-grid.css" />
<link rel="stylesheet" href="themes/bootstrap.css" />
```

## Actual CSS theme

`themes/actual.css` maps the grid tokens onto the Actual CSS design tokens. It
keeps the grid's geometry and follows the light/dark values provided by Actual
CSS through `--surface`, `--text`, `--border`, `--primary` and related tokens.
Load it after `data-grid.css`:

```html
<link rel="stylesheet" href="dist/data-grid.css" />
<link rel="stylesheet" href="themes/actual.css" />
```

## State attributes

The core reflects its state on the element with `data-*` attributes, ready to be
styled:

- `data-loading` - a request is in flight
- `data-error` - the last load failed
- `data-empty` - the current query returned no rows
- `data-selected` - set on `tr` of selected rows
- `data-editing` / `data-invalid` - set on editable cells

A column with `attr` skips its cell and sets the named attribute on the row
from the field value instead (e.g. `attr: "class"` adds classes). The name is
developer-controlled but the value comes from row data, so event-handler names
such as `attr: "onclick"` and non-string names are refused during column
normalization (an error is logged) and the column renders normally.

The loading status is already announced by the grid's live region. Applications
that also want a visible indicator, especially during the otherwise empty first
load, can add one without a plugin:

```css
data-grid[data-loading]::after {
  content: "";
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 3;
  inline-size: 1.5rem;
  block-size: 1.5rem;
  margin-top: -0.75rem;
  margin-left: -0.75rem;
  border: 2px solid var(--dg-border-color);
  border-top-color: var(--dg-accent);
  border-radius: 50%;
  animation: app-grid-spinner 0.7s linear infinite;
  pointer-events: none;
}

@keyframes app-grid-spinner {
  to {
    transform: rotate(1turn);
  }
}

@media (prefers-reduced-motion: reduce) {
  data-grid[data-loading]::after {
    animation: none;
  }
}
```

The pseudo-element is deliberately decorative: do not duplicate the loading
message with generated content or another live region.

## Sort glyphs

The sort indicator is drawn entirely in CSS, driven by the `th` state
(`data-sort="asc"`, `data-sort="desc"` or absent for neutral). The
`.dg-sort-indicator` element stays empty; the JS only manages the state. To
swap the glyph, restyle `.dg-sort-indicator` (`::before` / `::after`).

## Boolean marks

A `format: "boolean"` cell renders an empty
`<span class="dg-boolean" data-value="true|false" role="img">`. The accessible
name comes from the `booleanTrue` / `booleanFalse` labels; the check / dash
shape is drawn by the core CSS from `[data-value]`, so no glyph ever lives in
the DOM. Themes recolor or reshape the mark through `color` and two custom
properties:

```css
data-grid .dg-boolean {
  --dg-boolean-size: 1em;
  --dg-boolean-stroke: 0.12em;
}

/* Example: highlight true values */
data-grid .dg-boolean[data-value="true"] {
  color: var(--dg-accent);
}
```

The mark inherits `currentColor`, so a cell-level state hook drives it without
touching the formatter:

```js
columns: [
    {
        field: "active",
        format: "boolean",
        cellClass: ({ value }) => (value ? "is-positive" : "is-muted"),
    },
]
```

```css
data-grid td.is-positive .dg-boolean { color: var(--success); }
data-grid td.is-muted .dg-boolean { color: var(--dg-muted-color); }
```

`column.cellClass` is evaluated once per row at render time and only lands on
body cells (`column.class` stays the structural, header + body hook).

## Selection badge

`bulkActions` renders a `.dg-selection-count` badge that shows the plain count,
hidden while nothing is selected. It carries `role="status"` and announces
`selectedCount` through a `.dg-visually-hidden` text, so the visible UI needs
no translation.

`.dg-visually-hidden` is the component's screen-reader-only utility, paired
with an `aria-hidden` visible counterpart.

All `<select>` controls inside the component share the same CSS caret and
reserve the same inline-end space for it. This includes page-size and column
filter controls as well as selects rendered by plugins.

## Caption

`options.caption` renders a real `<caption>` styled as a quiet dataset label
(left-aligned, muted). When the surrounding page already provides a heading,
hide it visually while keeping the semantics:

```css
data-grid caption {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

## Cell wrapping

Data cells stay on one line with an ellipsis by default. Opt long-text columns
into wrapping without changing compact identifier, email or status columns:

```js
columns: [
    { field: "name" },
    { field: "description", wrap: true },
]
```

`column.wrap` overrides the grid-wide `wrap` option in both directions. In
declarative tables, use `data-wrap` or `data-wrap="false"` on the corresponding
`<th>`.

## Frozen columns and scroll snap

A column with `frozen: "start"` stays pinned to the logical inline-start edge,
`frozen: "end"` to the inline-end edge. Pair the freeze with the matching
placement (`position: "start"` / `"end"`), as the plugin control columns do.
Each frozen block draws its divider only on its outer boundary, never between
adjacent frozen columns. Plugin control columns at the start are stacked
automatically, and frozen columns are never hidden by `ResponsiveGrid`.

```js
columns: [
    { field: "customer", width: 240, frozen: "start" },
    { field: "email", width: 280 },
    { field: "status", width: 140, position: "end", frozen: "end" },
]
```

Declarative tables use `data-frozen="start"` or `data-frozen="end"`. Enable proximity-based horizontal
snapping with `snapColumns: true` or the `snap-columns` attribute. The scroll
viewport remains native and keyboard-scrollable; the grid does not intercept
arrow keys. See `demo/frozen.html`.

## Cell annotations and popovers

Notes do not need a grid API. Return a button and a popover from
`column.renderCell`, using the native Popover API. CSS Anchor Positioning can be
added under `@supports (position-anchor: --note)` as progressive enhancement;
the grid itself does not depend on it.

## Disclosure controls

The responsive toggle column (`$responsive`) and the row details toggle column
(`$details`) render the same primitive: a `.dg-disclosure` icon button inside a
`.dg-disclosure-cell`. Geometry and colors are shared, the inline chevron rotates
on open, and the row details dialog mode replaces the mask with an eye:

```css
data-grid .dg-disclosure {
  border-radius: 0;
  color: var(--dg-accent);
}
```

Built-in decorative icons have empty DOM hooks and CSS masks colored with
`currentColor`. A theme can resize or replace a shape on `.dg-search-icon`,
`.dg-disclosure::before`, or `.dg-actions-toggle::before`; set both
`-webkit-mask-image` and `mask-image` when replacing a mask.

Notes:

- the feature classes (`.dg-responsive-toggle-control`,
  `.dg-row-details-toggle-control` and their `-open` variants) stay on the
  elements for per-feature overrides and behavior selectors;
- the open state is styled from `[aria-expanded="true"]`, which both plugins
  keep in sync with the accessible state;
- the hover tint is translucent, not a surface color, so the control stays
  readable over plain, striped, hovered and selected rows alike. It is internal
  to the control (no token): restyle `.dg-disclosure:hover` if you need another
  feedback, and keep some transparency to preserve that guarantee.

## Details dialog

`detailsDisplay: "dialog"` renders the row details in a `<dialog
class="dg-details-dialog">`, a direct child of the grid (never inside
`.dg-scroll`), so it inherits the grid tokens in the top layer.

```html
<dialog class="dg-details-dialog" aria-labelledby="…">
  <button class="dg-details-close" type="button" aria-label="Close dialog"></button>
  <div class="dg-details-panel">
    <header class="dg-details-header">
      <h2 class="dg-details-title">Alice Martin</h2>
    </header>
    <div class="dg-details-body">
      <dl class="dg-details-list">
        <dt>Email</dt>
        <dd>alice@example.com</dd>
      </dl>
      <div class="dg-details-app"><!-- rowDetails --></div>
    </div>
  </div>
</dialog>
```

- The `<dialog>` is the outer surface (`padding: 0`, no scroll,
  `overflow: hidden`).
- `.dg-details-panel` carries the spacing and the flex column; its padding is
  exposed as the local `--details-pad` (default `--dg-space-4`).
- `.dg-details-header` stays outside the scroll area; `.dg-details-body` is the
  only scrollable region.
- `.dg-details-close` is absolute in the dialog corner, outside the panel. Its X
  is an empty `::before` CSS mask colored with `currentColor`.
- `.dg-details-list` is a two-column `dl`; below `30rem` the pairs stack.
- `dialog.dg-details-dialog::backdrop` uses a literal `rgb(0 0 0 / 40%)`.
- `data-value` on the sheet value cells comes from declarative cell templates; a
  page can style the sheet with `.dg-details-dialog [data-value="…"]`.

The dialog never uses `:modal` (Chrome 105) and caps its height with `vh`, then
`100svh` inside `@supports (height: 100svh)`.

### Actual CSS

`themes/actual.css` maps the dialog onto Actual's modal tokens without using its
global `.modal` classes (also a Bootstrap class):

| Element | Core | `themes/actual.css` |
|---|---|---|
| Surface | `--dg-bg` | `--surface-raised` |
| Text | `--dg-color` | `--text` |
| Border | `--dg-border-color` | `--border` |
| Radius | `--dg-radius` | `--radius-lg` |
| Shadow | literal | `--shadow` |
| Header | `--dg-header-bg` | `--surface-subtle` |
| Spacing | `--details-pad` | `--modal-pad` |
| Width | `32rem` | `--modal-size` |
| Backdrop | literal | `--backdrop-fill` |

DataGrid owns the dialog lifecycle (`showModal()`, `close()`, focus and events).
Use an Actual CSS release whose dialog runtime excludes dialogs that live inside
a web component; DataGrid does not opt into it. If that exclusion is not
available yet, keep `actual-css/js/dialog.js` off the pages that open the sheet,
otherwise both runtimes handle the same `<dialog>`.
`demo/themes/actual.html` opens the record sheet with these tokens; it does not
load the Actual dialog runtime.

## Selectors

Common hooks: `.dg-head-columns th`, `.dg-sort-label`, `th.dg-sortable`, `.dg-sort`,
`.dg-sort-indicator`, `.dg-boolean`, `.dg-filter`, `.dg-actions`, `.dg-footer`,
`.dg-topbar`, `.dg-topbar-start`, `.dg-topbar-end`, `.dg-search`, `.dg-bulk-actions`,
`.dg-selection-count`, `.dg-visually-hidden`, `.dg-menu`, `.dg-responsive-hidden`,
`.dg-disclosure`, `.dg-disclosure-cell`, `.dg-details-dialog`, `.dg-details-panel`,
`.dg-details-header`, `.dg-details-title`, `.dg-details-body`, `.dg-details-close`,
`.dg-details-list`, `.dg-details-app`.
Column alignment lands on header, body, and filter cells as
`th[data-align="start|center|end"]` / `td[data-align=...]` (explicit `align` or
formatter default); the filter control inherits the same `text-align`, except
the built-in boolean tri-state select keeps its option labels at `start` via
`select.dg-filter-control[data-filter-mode="boolean"][data-align="start"]`.
Actions use `[data-intent="danger"]` / `[data-intent="primary"]`.

## Right-to-left

RTL is driven by the `dir` attribute set on the grid element itself
(`demo/i18n.html` does this per locale). Directional horizontal styles are
authored as physical LTR declarations mirrored through `data-grid[dir="rtl"]`
rules in `css/_rtl.css`; generated CSS never uses `:lang()` selectors, so a
page can set `dir` independently of its language.
