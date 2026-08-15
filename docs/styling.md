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

## Selectors

Common hooks: `th.dg-sortable`, `.dg-sort`, `.dg-filter`, `.dg-actions`,
`.dg-footer`, `.dg-bulk-actions`, `.dg-menu`, `.dg-responsive-hidden`.
Actions use `[data-intent="danger"]` / `[data-intent="primary"]`.
