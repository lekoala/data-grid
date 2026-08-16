# Data Grid Web Component

[![NPM](https://nodei.co/npm/data-grid-component.png?mini=true)](https://nodei.co/npm/data-grid-component/)
[![Downloads](https://img.shields.io/npm/dt/data-grid-component.svg)](https://www.npmjs.com/package/data-grid-component)

Autonomous open source grid component with RTL support. Designed for server side
paginated content but also works for basic tables.

Key features:

- Server side support (`FetchDataSource`)
- Inline editing
- Sorting / filtering
- i18n friendly
- Easily themable (`--dg-*` tokens)

Docs:

- [Server-side data](docs/server-data.md)
- [Filtering](docs/filtering.md)
- [Selection](docs/selection.md)
- [Row actions](docs/actions.md)
- [Plugins](docs/plugins.md)
- [Styling](docs/styling.md)
- [Inline editing](docs/editing.md)

## How to use

### Installation

```
$ npm install data-grid-component
```

### Initialization

- HTML way

```html
<data-grid src="data.json" sortable filterable></data-grid>
<script type="module" src="./data-grid.js"></script>
```

- using the DOM API

```js
const grid = document.createElement("data-grid");
grid.setAttribute("src", "/api/users"); // triggers a reload on an existing instance
document.body.appendChild(grid);
```

- using the constructor with an import statement

```js
import { DataGrid } from "data-grid-component";
const grid = new DataGrid({ src: "/api/users" });
document.body.appendChild(grid);
```

### Declarative HTML

A native `<table>` inside `<data-grid>` is adopted as-is: the grid enhances the
real table instead of creating its own. `caption`, `colgroup` and the table's
own classes and attributes are preserved.

```html
<data-grid sortable filterable searchable page-size="10">
    <table>
        <thead>
            <tr>
                <th data-field="name" data-sort="asc">Name</th>
                <th data-field="email">Email</th>
                <th data-field="status" data-filter="select">Status</th>
            </tr>
        </thead>
        <tbody>
            <tr data-row-key="42">
                <td>User One</td>
                <td>user1@example.com</td>
                <td data-value="active">Active</td>
            </tr>
        </tbody>
    </table>
</data-grid>
```

`<th data-field>` declares a column: `title` is the cell text, and
`data-sortable`, `data-filterable`, `data-filter`, `data-responsive`,
`data-hidden`, `data-editable`, `data-editable-type`, `data-transform` and
`data-width` map to the matching column options. `data-sort="asc"|"desc"`
seeds the initial sort (DOM order is the priority). The host still activates
the global capabilities — `data-sortable` on a column only opts out, it never
turns sorting on globally.

The `<data-grid>` host takes the reflected attributes listed above
(`select-visible-only`, `row-key`, `no-data`, `page-sizes`, `row-actions`,
...): HTML covers structure, data and scalar configuration; functions,
objects and behaviors (`renderCell`, validators, `dataSource`, `actions`)
stay JavaScript.

Row actions can also come from the markup: a `<th data-actions>` column
activates the capability, and each `<td data-actions>` cell is normalized into
`row.$actions` descriptors:

```html
<data-grid row-actions>
    <table>
        <thead>
            <tr>
                <th data-field="name">Name</th>
                <th data-actions>Actions</th>
            </tr>
        </thead>
        <tbody>
            <tr data-row-key="42">
                <td>User One</td>
                <td data-actions>
                    <a data-action="view" href="/users/42">View</a>
                    <button data-action="delete" data-confirm="Delete this user?">Delete</button>
                </td>
            </tr>
        </tbody>
    </table>
</data-grid>
```

When **no** `dataSource`/`src` is configured, the `<tbody>` rows become the
local dataset: `<td>` maps to the columns by index, `td[data-value]` provides
a machine-readable value (display text otherwise), and `tr[data-row-key]` is
the authoritative row key. With a `src`/`dataSource`, the source stays
authoritative and the `<tbody>` is not consumed as data.

Rule of thumb: **HTML = declarative configuration, JS = behavior.** For
custom rendering (`renderCell`), validators or a custom data source, use the
JavaScript API instead.

## Options

Options are set as constructor options or reflected HTML attributes. HTML
attributes are an **intentionally curated declarative subset** of options
(kebab-case -> camelCase, a bare attribute means `true`); complex or functional
options (`dataSource`, `actions`, `renderCell`, ...) remain JavaScript-only.
Some options only work if the proper plugin is loaded.

| Option                | Type                 | Default              | Description                                      |
|-----------------------|----------------------|----------------------|--------------------------------------------------|
| `src`                 | `String`             | `""`                 | URL to a server-side endpoint                    |
| `params`              | `Object`             | `{}`                 | Extra constant HTTP params per request           |
| `dataSource`          | `DataSource`         | -                    | Custom data source (defaults to fetch/array)     |
| `columns`             | `Column[]`           | `[]`                 | Available columns                                |
| `rowKey`              | `String \| Function` | `"id"`               | Field or function for the stable row key         |
| `rowLabel`            | `String \| Function` | -                    | Field or function for the accessible row label   |
| `sortable`            | `Boolean`            | `false`              | Sort by column                                   |
| `filterable`          | `Boolean`            | `false`              | Show the filter row                              |
| `selectable`          | `Boolean`            | `false`              | Select rows with checkboxes                      |
| `singleSelect`        | `Boolean`            | `false`              | Select a single row with radios                  |
| `selectVisibleOnly`   | `Boolean`            | `true`               | `selectAll` only selects the visible rows        |
| `actions`             | `Action[]`           | `[]`                 | Row actions (also resolved from `$actions` / `meta.actions`) |
| `rowActions`          | `Boolean`            | `false`              | Show the actions column even without static `actions`        |
| `actionRenderer`      | `Function`           | -                    | Global action renderer                           |
| `collapseActions`     | `Boolean`            | `false`              | Group actions under a toggle                     |
| `bulkActions`         | `BulkAction[]`       | `[]`                 | Bulk actions on the current selection            |
| `resizable`           | `Boolean`            | `false`              | Resizable columns                                |
| `reorder`             | `Boolean`            | `false`              | Draggable column headers                         |
| `menu`                | `Boolean`            | `false`              | Right-click column menu                          |
| `responsive`          | `Boolean`            | `false`              | Responsive columns                               |
| `responsiveToggle`    | `Boolean`            | `true`               | Show toggle column on small screens              |
| `autosize`            | `Boolean`            | `true`               | Compute column sizes from data                   |
| `autoheight`          | `Boolean`            | `true`               | Fill table height on the last page               |
| `autohidePager`       | `Boolean`            | `false`              | Hide the pager when everything fits              |
| `expand`              | `Boolean`            | `false`              | Allow cell content to span multiple lines        |
| `pageSizes`           | `Number[]`           | `[10,25,50,100,250]` | Available page size options                      |
| `showPageSize`        | `Boolean`            | `true`               | Show the page size select                        |
| `filterDelay`         | `Number`             | `300`                | Debounce delay (ms) for text column filters      |
| `searchable`          | `Boolean`            | `false`              | Show the global search input                     |
| `searchDelay`         | `Number`             | `300`                | Debounce delay (ms) for the global search        |
| `minSearchLength`     | `Number`             | `0`                  | Minimum characters before a search is applied    |
| `density`             | `String`             | `"default"`          | Row density: `compact`, `default`, `comfortable` |
| `spinnerClass`        | `String`             | `""`                 | CSS classes for the loading spinner              |
| `saveState`           | `Boolean`            | `false`              | Persist query and columns                        |
| `errorMessage`        | `String`             | `""`                 | Message shown when a load fails                  |
| `noData`              | `String`             | `""`                 | Message shown when there is no data              |
| `caption`             | `String`             | `""`                 | Table caption (accessible name)                  |
| `initialQuery`        | `QueryState`         | -                    | Initial runtime query state                      |
| `initialResult`       | `PageResult`         | -                    | Initial result to display without loading        |
| `validate`            | `Function`           | -                    | Grid-level editor validator                      |
| `debug`               | `Boolean`            | `false`              | Log actions in DevTools console                  |
| `dir`                 | `String`             | `"ltr"`              | Direction                                        |
| `id`                  | `String`             | auto                 | Custom id for the grid                           |

`rowLabel` falls back to the row key, then the row index. A `dataSource`
defaults to `FetchDataSource` or `ArrayDataSource`; plugin-backed options are
described in `docs/plugins.md`.

### Attributes

The main attributes are `src`, `sortable`, `filterable`, `searchable`,
`min-search-length`, `responsive`, `responsive-toggle`, `selectable`,
`single-select`, `select-visible-only`, `row-key`, `row-label`,
`collapse-actions`, `save-state`, `no-data`, `error-message`, `page-sizes`,
`reorder`, `menu`, `expand`, `autosize`, `resizable`, `autoheight`,
`autohide-pager`, `show-page-size`, `debug`, `dir`, `density`. Example:

```html
<data-grid
    src="/api/users"
    sortable
    filterable
    searchable
    selectable
    select-visible-only="false"
    row-key="UserID"
    min-search-length="3"
    page-sizes="10,25,50"
    no-data="No users"
></data-grid>
```

## API

The runtime state is a `QueryState` (`page`, `pageSize`, `sort`, `filters`).
Query methods reload through the single `load()` path (AbortController + stale
response protection).

| Member                                                   | Description                                     |
|----------------------------------------------------------|-------------------------------------------------|
| `grid.query`                                             | snapshot of the current query state (getter)    |
| `grid.page`                                              | current page (getter)                           |
| `grid.rows` / `grid.total` / `grid.meta`                 | result of the current query                     |
| `grid.loading` / `grid.error`                            | load status and last error                      |
| `setQuery(patch)`                                        | merge a query patch and reload                  |
| `resetQuery()`                                           | reset to the initial query and reload           |
| `refresh()` / `load()`                                   | reload the current query                        |
| `getColumns()`                                           | normalized column list of the current cycle     |
| `showColumn(field)` / `hideColumn(field)`                | toggle a column                                 |
| `getFilterOptions(column)`                               | options for a select filter                     |
| `getSelectionState()`                                    | `{ mode, ids, except }` snapshot (server-first) |
| `isRowSelected(row)`                                     | whether a row is selected                       |
| `selectRow(row)` / `deselectRow(row)` / `toggleRow(row)` | row selection                                   |
| `selectAll()` / `clearSelection()`                       | select/reset the selection                      |
| `getSelection(...keys)`                                  | page-local selected rows                        |
| `setSearch(value)` / `clearSearch()`                     | set / clear the global search                   |
| `updateRow(rowKey, patch)` / `removeRow(rowKey)`          | mutate / remove a row (see `docs/actions.md`)   |
| `getFirst()` / `getPrev()` / `getNext()` / `getLast()`   | paging                                          |
| `clearFilters()`                                         | clear the current filters                       |
| `sortAsc(field)` / `sortDesc(field)` / `sortNone(field)` | sort helpers                                    |
| `DataGrid.registerPlugins(map)`                          | register plugin constructors                    |
| `DataGrid.getLabels()` / `setLabels(labels)`            | read / translate the UI labels                     |
| `DataGrid.loadLabels(url)`                              | fetch a JSON label file and apply it               |

## Column

| Name                                    | Type                 | Description                                          |
|-----------------------------------------|----------------------|------------------------------------------------------|
| `field`                                 | `String`             | the key in the data                                  |
| `title`                                 | `String`             | header title (defaults to `field`)                   |
| `id`                                    | `String`             | stable identifier (defaults to `field`)              |
| `width`                                 | `Number`             | column width (auto otherwise)                        |
| `class`                                 | `String`             | class on the column (`th.class` / `td.class`)        |
| `attr`                                  | `String`             | set a row attribute instead of rendering             |
| `hidden`                                | `Boolean`            | hide the column                                      |
| `sortable`                              | `Boolean`            | disable sorting for this column (defaults to grid)   |
| `filterable`                            | `Boolean`            | disable filtering for this column (defaults to grid) |
| `transform`                             | `String`             | `uppercase` / `lowercase`                            |
| `editable` / `editableType`             | `Boolean` / `String` | inline editing (see `docs/editing.md`)               |
| `validate`                              | `Function`           | `(value, ctx) => true \| "error message"`            |
| `responsive`                            | `Number`             | responsive priority (`0` disables)                   |
| `filterType`                            | `"text" \| "select"` | filter field type                                    |
| `filterList`                            | `FilterOption[]`     | explicit select filter options                       |
| `firstFilterOption`                     | `FilterOption`       | first select option                                  |
| `renderHeaderCell` / `renderFilterCell` | `(th, ctx) => void`  | custom renderers (core creates the `<th>`)           |
| `renderCell`                            | `(ctx) => content`   | custom cell renderer (primitive / Node / `{ html }`) |

## Action

| Name       | Type                                                | Description                                      |
|------------|-----------------------------------------------------|--------------------------------------------------|
| `name`     | `String`                                            | the action name (`button[data-action]`)          |
| `label`    | `String`                                            | the button label and accessible name             |
| `intent`   | `"default" \| "primary" \| "danger"`                | sets `data-intent`                               |
| `href`     | `String \| Function`                                | renders an `<a>` link (`{field}` interpolation or `(row, ctx) => string`) |
| `class`    | `String`                                            | class on the button                              |
| `visible`  | `(row, ctx) => Boolean`                             | hide the action when falsy                       |
| `disabled` | `Boolean \| (row, ctx) => Boolean`                  | blocks the action (`aria-disabled` + guarded click) |
| `render`   | `({ action, row, grid }) => content`                | replace the button content                      |
| `confirm`  | `Boolean \| String \| (row, ctx) => Boolean \| String` | ask for confirmation (generic label, message, or resolver) |
| `default`  | `Boolean`                                           | clicking the row triggers the action (first resolved default wins, interactive elements are ignored) |

`visible`/`disabled`/`href`/`confirm` receive `(row, ctx)` with `ctx = { grid, action, rowKey }`.

Actions can also be driven by the server: a `row.$actions` array lists which
actions a row gets (strings are looked up by name, objects override the
definition), and `meta.actions` provides server-side definitions. Set
`rowActions: true` (or `row-actions`) to activate the column without static
`actions`.

See `docs/actions.md` for the full contract.

## Events

| Name               | Detail                                        | Trigger                    |
|--------------------|-----------------------------------------------|----------------------------|
| `connected`        | -                                             | the grid is connected      |
| `disconnected`     | -                                             | the grid is disconnected   |
| `loadError`        | error                                         | a load fails               |
| `selectionChange`  | `{ selectionState }`                          | the selection changes      |
| `columnVisibility` | `{ col, visibility }`                         | a column is hidden/shown   |
| `columnResized`    | `{ col, width }`                              | a column is resized        |
| `columnReordered`  | `{ col, from, to }`                           | a column is dragged        |
| `headerRendered`   | -                                             | the header is rendered     |
| `bodyRendered`     | -                                             | the body is rendered       |
| `rowRendered`      | `{ rowData, tr }`                             | a row is rendered          |
| `action`           | `{ action, name, row, rowKey, rowIndex, trigger }` | an action is performed |
| `bulkAction`       | `{ action, name, selection, query, trigger }`      | a bulk action is performed |
| `edit`             | `{ data, value, field, column }` (cancelable) | an edit is committed       |

## Server

For large data sets, pagination, sorting and filtering happen on the server.
See `docs/server-data.md`. The response contract is a `PageResult`:

```json
{
    "rows": [...],
    "total": 142,
    "meta": { "filters": { "status": [{ "value": "active", "text": "Active" }] } }
}
```

`demo/server.js` (`bun demo/server.js`) is a working example using the same
filter/sort helpers as the client.

## Translations

All UI labels are plain strings and can be overridden at any time. Labels are
expressed as full phrases: `pageRange` uses `{from}`, `{to}` and `{total}`
placeholders, `resultCount` and `selectedCount` use `{count}`.

```js
DataGrid.setLabels({
    pageRange: "{from} - {to} of {total} rows",
    resultCount: "{count} rows",
});
```

`setLabels()` updates every connected grid immediately. It should normally be
called before creating grids (the internal template is built from the current
labels on first render).

### Application labels (JSON)

`loadLabels()` fetches a flat JSON file with the same keys and applies it:

```js
await DataGrid.loadLabels("/i18n/data-grid.fr.json");
```

```json
{
  "itemsPerPage": "Éléments par page",
  "pageRange": "{from} – {to} sur {total}",
  "noData": "Aucune donnée"
}
```

### Official locales (modules)

Ready-made, self-applying locales ship in the package. Importing one calls
`setLabels()` for you, so a language switch just works:

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/data-grid-component@3/locales/fr.js"></script>
```

```js
import "data-grid-component/locales/fr";
```

For a dynamic switch, import the module and let it refresh the grids:

```js
const { default: labels } = await import("data-grid-component/locales/fr");
DataGrid.setLabels(labels);
```

Available locales: `en`, `fr`, `nl`, `de`, `es`, `it`, `pt-BR`, `pt-PT`,
`zh-CN`, `ja`, `ko`, `ar`, `hi`, `ru`, `tr`, `id`, `pl`.

Available labels: `itemsPerPage`, `gotoPage`, `gotoFirstPage`, `gotoPrevPage`,
`gotoNextPage`, `gotoLastPage`, `pageRange`, `resultCount`, `selectedCount`,
`selectAll`, `selectRow`, `toggleActions`, `resizeColumn`, `search`, `noData`,
`loading`, `areYouSure`, `networkError`.

## Browser Support

Only modern browsers (anything that supports ES modules).

## License

data-grid-component is licensed under the MIT license.
