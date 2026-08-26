# Styling

The core stylesheet (`css/data-grid.css`) is neutral and dependency-free. All
themeable values are exposed as `--dg-*` custom properties, so the grid follows
the application's design system.

## CSS custom properties

Override them on `data-grid` (or globally with `data-grid { ... }`):

| Token                     | Default            | Used for                                |
|---------------------------|--------------------|------------------------------------------|
| `--dg-bg`                 | `#fff`             | table + menu surfaces                    |
| `--dg-color`              | `#1f2937`          | primary text                             |
| `--dg-muted-color`        | `#6b7280`          | footer/meta/placeholder text             |
| `--dg-border-color`       | `#d8e1eb`          | outer structure + separators             |
| `--dg-accent`             | `#0d6efd`          | interactive accent                       |
| `--dg-accent-soft`        | `#e8f1ff`          | subtle accent surface                    |
| `--dg-focus-ring`         | `rgb(13 110 253 / 18%)` | focus ring                         |
| `--dg-header-bg`          | `#f6f8fb`          | header + footer background               |
| `--dg-header-color`       | `#111827`          | header text                              |
| `--dg-filter-bg`          | `#fbfcfe`          | filter controls                          |
| `--dg-row-stripe-bg`      | `transparent`      | striped rows                             |
| `--dg-row-hover-bg`       | `#f8fafc`          | row hover                                |
| `--dg-row-selected-bg`    | `#eef4ff`          | selected rows                            |
| `--dg-row-selected-hover-bg` | `#e7f0ff`      | selected row hover                       |
| `--dg-row-border-color`   | `#edf2f7`          | row separators                           |
| `--dg-control-bg`         | `#fff`             | buttons / inputs / selects               |
| `--dg-control-color`      | `var(--dg-color)`  | control text                             |
| `--dg-control-border-color` | `#d4dde7`       | control borders                          |
| `--dg-danger-bg`          | `#fef3f2`          | error state                              |
| `--dg-danger-color`       | `#b42318`          | error text                               |
| `--dg-danger-border-color`| `#fecdca`          | error borders                            |
| `--dg-cell-padding-inline`| `12px`             | horizontal cell padding                  |
| `--dg-cell-padding-block` | `8px`              | vertical cell padding                    |
| `--dg-header-padding-y`   | `8px`              | header vertical padding                  |
| `--dg-control-height`     | `32px`             | filter/footer control height             |
| `--dg-selection-column-width` | `40px`        | selection column width                   |
| `--dg-actions-column-width`   | `40px`        | collapsed actions column width           |
| `--dg-radius`             | `8px`              | table / control / menu radius            |

## Density

```html
<data-grid density="compact"></data-grid>
```

`density` is `compact`, `default` or `comfortable` and adjusts the spacing
tokens (`--dg-cell-padding-*`, `--dg-header-padding-y`, `--dg-control-height`).

## Scrollable grid

The header (columns + filter row) stays pinned to the top and the footer to the
bottom of the grid's own scroll viewport. This is the **default** — no option
is needed. Give the grid a constrained height and it becomes its own scroll
container, keeping its chrome visible while the rows scroll:

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


## Bootstrap theme

`themes/bootstrap.css` maps the tokens onto Bootstrap 5 variables, including dark
mode via `[data-bs-theme="dark"]`. Load it after `data-grid.css`:

```html
<link rel="stylesheet" href="dist/data-grid.css" />
<link rel="stylesheet" href="themes/bootstrap.css" />
```

## State attributes

The core reflects its state on the element with `data-*` attributes, ready to be
styled:

- `data-loading` - a request is in flight
- `data-error` - the last load failed
- `data-empty` - the current query returned no rows
- `data-selected` - set on `tr` of selected rows
- `data-editing` / `data-invalid` - set on editable cells

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

A column with `frozen: "start"` stays pinned to the logical inline-start edge.
Only `start` is supported. Plugin control columns at the start are stacked
automatically, and frozen columns are never hidden by `ResponsiveGrid`.

```js
columns: [
    { field: "customer", width: 240, frozen: "start" },
    { field: "email", width: 280 },
]
```

Declarative tables use `data-frozen="start"`. Enable proximity-based horizontal
snapping with `snapColumns: true` or the `snap-columns` attribute. The scroll
viewport remains native and keyboard-scrollable; the grid does not intercept
arrow keys.

## Cell annotations and popovers

Notes do not need a grid API. Return a button and a popover from
`column.renderCell`, using the native Popover API. CSS Anchor Positioning can be
added under `@supports (position-anchor: --note)` as progressive enhancement;
the grid itself does not depend on it.

## Selectors

Common hooks: `th.dg-sortable`, `.dg-sort`, `.dg-sort-indicator`, `.dg-boolean`, `.dg-filter`,
`.dg-actions`, `.dg-footer`, `.dg-topbar`, `.dg-topbar-start`,
`.dg-topbar-end`, `.dg-search`, `.dg-bulk-actions`, `.dg-selection-count`,
`.dg-visually-hidden`, `.dg-menu`, `.dg-responsive-hidden`.
Column alignment lands on both header and body cells as
`th[data-align="start|center|end"]` / `td[data-align=...]` (explicit `align` or
formatter default); filter cells keep their natural alignment.
Actions use `[data-intent="danger"]` / `[data-intent="primary"]`.

## Right-to-left

RTL is driven by the `dir` attribute set on the grid element itself
(`demo/i18n.html` does this per locale). Directional horizontal styles are
authored as physical LTR declarations mirrored through `data-grid[dir="rtl"]`
rules in `css/_rtl.css`; generated CSS never uses `:lang()` selectors, so a
page can set `dir` independently of its language.
