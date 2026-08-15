# Styling

The core stylesheet (`css/data-grid.css`) is neutral and dependency-free. All
themeable values are exposed as `--dg-*` custom properties, so the grid follows
the application's design system.

## CSS custom properties

Override them on `data-grid` (or globally with `data-grid { ... }`):

| Token                     | Default        | Used for                                |
|---------------------------|----------------|------------------------------------------|
| `--dg-bg`                 | `#fff`         | table + menu surfaces                    |
| `--dg-color`              | `#212529`      | text                                     |
| `--dg-border-color`       | `#e9ecef`      | default border                           |
| `--dg-accent`             | `#0d6efd`      | interactive accent                       |
| `--dg-accent-soft`        | `#cfe2ff`      | focus ring                               |
| `--dg-header-bg`          | `#e9ecef`      | header background                        |
| `--dg-header-color`       | `#212529`      | header text                              |
| `--dg-row-stripe-bg`      | `rgba(0,0,0,.05)` | striped rows                          |
| `--dg-row-hover-bg`       | `#fffcee`      | row hover                                |
| `--dg-row-selected-bg`    | `#cfe2ff`      | selected rows                            |
| `--dg-row-border-color`   | `#f2f2f2`      | row borders                              |
| `--dg-control-bg`         | `#fff`         | buttons / inputs / selects               |
| `--dg-control-color`      | `#212529`      | control text                             |
| `--dg-control-border-color` | `#e9ecef`   | control borders                          |
| `--dg-danger-bg`          | `#f8d7da`      | error state                              |
| `--dg-danger-color`       | `#842029`      | error text                               |
| `--dg-danger-border-color`| `#f5c2c7`      | error borders                            |
| `--dg-padding-x`          | `0.75rem`      | horizontal cell padding                  |
| `--dg-padding-y`          | `0.5rem`       | vertical cell padding                    |
| `--dg-header-padding-y`   | `0.75rem`      | header vertical padding                  |
| `--dg-radius`             | `0.25rem`      | control / menu radius                    |

## Density

```html
<data-grid density="compact"></data-grid>
```

`density` is `compact`, `default` or `comfortable` and only adjusts the
`--dg-padding-*` tokens.

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

Common hooks: `th.dg-sortable`, `th.dg-not-sortable`, `.dg-actions`, `.dg-footer`,
`.dg-bulk-actions`, `.dg-menu`, `.dg-responsive-hidden`. Actions use
`[data-intent="danger"]` / `[data-intent="primary"]`.
