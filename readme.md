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
- [Translations](docs/translations.md)
- [Migration from v2](docs/migration-from-v2.md)

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

From a CDN, use the **distributed, versioned build** (`dist/data-grid.min.js`)
rather than relying on the CDN to minify the unbundled source:

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/data-grid-component@3/dist/data-grid.min.js"></script>
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

The supplied table provides the structure, the initial dataset and the
declarative cell presentation; the grid owns subsequent rendering. `caption`,
`colgroup` and the table's own classes and attributes are preserved.

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
`data-hidden`, `data-editable`, `data-editable-type`, `data-transform`,
`data-format`, `data-align`, `data-width` (preferred width) and
`data-min-width` (never compress below)
map to the matching column options. `data-sort="asc"|"desc"`
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
local dataset: `<td>` maps to the columns by index, `tr[data-row-key]` is the
authoritative row key. `td[data-value]` is the **machine value** (typed —
numbers, booleans, null and JSON are parsed), while the cell content is the
**user representation**, preserved across rerenders as long as the value is
unchanged (so badges, `<time>`, `<data>` and formatting survive). Without
`data-value`, the cell text is used as a plain string. Filter `<select>`
labels are derived from the same `data-value` + cell text when present. With a
`src`/`dataSource`, the source stays authoritative and the `<tbody>` is not
consumed as data.

Rule of thumb: **HTML = declarative configuration, JS = behavior.** For
custom rendering (`renderCell`), validators or a custom data source, use the
JavaScript API instead.

## Options

Options are set as constructor options or reflected HTML attributes. HTML
attributes are an **intentionally curated declarative subset** of options
(kebab-case -> camelCase, a bare attribute means `true`); complex or functional
options (`dataSource`, `actions`, `renderCell`, ...) remain JavaScript-only.
Some options only work if the proper plugin is loaded.

| Option                | Type                 | Default              | Description                                                  |
|-----------------------|----------------------|----------------------|--------------------------------------------------------------|
| `src`                 | `String`             | `""`                 | URL to a server-side endpoint                                |
| `params`              | `Object`             | `{}`                 | Extra constant HTTP params per request                       |
| `dataSource`          | `DataSource`         | -                    | Custom data source (defaults to fetch/array)                 |
| `loading`             | `String`             | `"eager"`            | `eager` or `lazy`                                            |
| `columns`             | `Column[]`           | `[]`                 | Available columns                                            |
| `rowKey`              | `String \| Function` | `"id"`               | Field or function for the stable row key                     |
| `rowLabel`            | `String \| Function` | -                    | Field or function for the accessible row label               |
| `sortable`            | `Boolean`            | `false`              | Sort by column                                               |
| `filterable`          | `Boolean`            | `false`              | Show the filter row                                          |
| `selectable`          | `Boolean`            | `false`              | Select rows with checkboxes                                  |
| `singleSelect`        | `Boolean`            | `false`              | Select a single row with radios                              |
| `selectVisibleOnly`   | `Boolean`            | `true`               | `selectAll` only selects the visible rows                    |
| `actions`             | `Action[]`           | `[]`                 | Row actions (also resolved from `$actions` / `meta.actions`) |
| `rowActions`          | `Boolean`            | `false`              | Show the actions column even without static `actions`        |
| `actionRenderer`      | `Function`           | -                    | Global action renderer                                       |
| `collapseActions`     | `Boolean`            | `false`              | Group actions under a toggle                                 |
| `bulkActions`         | `BulkAction[]`       | `[]`                 | Bulk actions on the current selection                        |
| `resizable`           | `Boolean`            | `false`              | Resizable columns                                            |
| `reorder`             | `Boolean`            | `false`              | Draggable column headers                                     |
| `menu`                | `Boolean`            | `false`              | Pointer-positioned column menu; native fallback              |
| `responsive`          | `Boolean`            | `false`              | Responsive columns                                           |
| `responsiveToggle`    | `Boolean`            | `true`               | Show toggle column on small screens                          |
| `responsiveStartOpen` | `Boolean`            | `false`              | Open responsive detail rows by default                       |
| `rowDetails`          | `Function`           | -                    | Render expandable application content for a row              |
| `rowDetailsStartOpen` | `Boolean`            | `false`              | Open row details by default                                  |
| `autosize`            | `Boolean`            | `false`              | Measure widthless columns to give them a preferred width     |
| `autoheight`          | `Boolean`            | `true`               | Fill table height on the last page                           |
| `autohidePager`       | `Boolean`            | `false`              | Hide the pager when everything fits                          |
| `wrap`                | `Boolean`            | `false`              | Allow data cells to wrap over multiple lines                 |
| `snapColumns`         | `Boolean`            | `false`              | Snap horizontal scrolling near column starts                 |
| `pageSizes`           | `Number[]`           | `[10,25,50,100,250]` | Available page size options                                  |
| `showPageSize`        | `Boolean`            | `true`               | Show the page size select                                    |
| `filterDelay`         | `Number`             | `300`                | Debounce delay (ms) for text column filters                  |
| `searchable`          | `Boolean`            | `false`              | Show the global search input                                 |
| `searchPlaceholder`   | `String`             | `"…"`                | Visible hint for the search input                            |
| `searchDelay`         | `Number`             | `300`                | Debounce delay (ms) for the global search                    |
| `minSearchLength`     | `Number`             | `0`                  | Minimum characters before a search is applied                |
| `density`             | `String`             | `"default"`          | Row density: `compact`, `default`, `comfortable`             |
| `spinnerClass`        | `String`             | `""`                 | CSS classes for the loading spinner                          |
| `saveState`           | `Boolean`            | `false`              | Persist query and columns                                    |
| `errorMessage`        | `String`             | `""`                 | Message shown when a load fails                              |
| `noData`              | `String`             | `""`                 | Message shown when there is no data                          |
| `caption`             | `String`             | `""`                 | Table caption (accessible name)                              |
| `initialQuery`        | `QueryState`         | -                    | Initial runtime query state                                  |
| `initialResult`       | `PageResult`         | -                    | Initial result to display without loading                    |
| `validate`            | `Function`           | -                    | Grid-level editor validator                                  |
| `debug`               | `Boolean`            | `false`              | Log actions in DevTools console                              |
| `dir`                 | `String`             | `"ltr"`              | Direction                                                    |
| `id`                  | `String`             | auto                 | Custom id for the grid                                       |

`rowLabel` falls back to the row key, then the row index. A `dataSource`
defaults to `FetchDataSource` or `ArrayDataSource`; plugin-backed options are
described in `docs/plugins.md`. Set `column.wrap` to override the grid-wide
`wrap` policy for an individual data column.

### Attributes

The main attributes are `src`, `loading`, `sortable`, `filterable`, `searchable`,
`search-placeholder`, `min-search-length`, `responsive`, `responsive-toggle`,
`responsive-start-open`, `row-details-start-open`, `selectable`, `single-select`, `select-visible-only`, `row-key`, `row-label`,
`collapse-actions`, `save-state`, `no-data`, `error-message`, `page-sizes`,
`reorder`, `menu`, `wrap`, `snap-columns`, `autosize`, `resizable`, `autoheight`,
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

## Scrollable grid

The table lives inside a `.dg-scroll` viewport that owns its outer border,
radius, scroll and the sticky anchor. The header (including the filter row)
stays pinned to the top and the footer to the bottom of that viewport. This is
the default behavior — as soon as the grid is given a constrained height, the
viewport takes the remaining space and its chrome stays visible while rows
scroll:

```css
.results-grid {
  max-height: 70vh;
}
```

```html
<data-grid class="results-grid"></data-grid>
```

The host is a vertical flex column: an optional topbar sits above the viewport,
which expands to fill the rest of the height. On an unconstrained grid the
viewport grows with its content, so there is nothing to stick against. Pin the
height only when you want an internal vertical viewport.

## Lazy initial load

`loading="lazy"` defers the **first** data source fetch until the grid nears the
viewport (using a one-shot `IntersectionObserver` with a ~200px margin). It is
ideal for grids in hidden tabs or far below the fold:

```html
<data-grid src="/api/users" loading="lazy"></data-grid>
```

The grid still builds its chrome (header, filters, footer) and fires
`connected` immediately; only the fetch is postponed. It applies to async
sources (`src`/`dataSource`) — a local declarative table or a provided
`initialResult` renders right away. Default is `"eager"` (load on connect).

Query changes before activation accumulate normally: any filters, search or
page state set while hidden are applied in a single request when the grid
becomes visible. An explicit `refresh()`/`load()` (or a `src` change) always
loads immediately, regardless of visibility.

## Responsive stacked

`responsiveStartOpen` turns the responsive detail rows into a start-open
"stacked" view: when columns are hidden on a narrow grid, their values are
shown immediately inside the existing responsive detail row instead of behind a
chevron toggle.

```html
<data-grid responsive responsive-start-open></data-grid>
```

It is a presentation-only option — search, sort, filters, selection, actions,
pagination and the accessibility model are unchanged. Use `responsive: 0` for
columns that must stay in the main row, and (optionally) `responsiveToggle`
`false` for a clean record layout without a toggle column:

```html
<data-grid responsive responsive-start-open responsive-toggle="false"></data-grid>
```

Columns that are actively sorted or filtered are never hidden, so an active
criterion stays visible. Users can still collapse individual rows; the grid
never overrides an explicit collapse, and the choice resets on the next data
load.

When responsive columns are combined with application-rendered `rowDetails`,
prefer the start-open presentation without a responsive toggle:

```js
new DataGrid({
    responsive: true,
    responsiveStartOpen: true,
    responsiveToggle: false,
    rowDetails: ({ row }) => renderCustomerActivity(row),
});
```

Responsive content is then the narrow-screen representation of normal table
columns, while the remaining row-details chevron reveals genuinely additional
content. The two plugins and their expansion states remain independent.

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
| `updateRow(rowKey, patch)` / `removeRow(rowKey)`         | mutate / remove a row (see `docs/actions.md`)   |
| `getFirst()` / `getPrev()` / `getNext()` / `getLast()`   | paging                                          |
| `clearFilters()`                                         | clear the current filters                       |
| `sortAsc(field)` / `sortDesc(field)` / `sortNone(field)` | sort helpers                                    |
| `DataGrid.registerPlugins(map)`                          | register plugin constructors                    |
| `DataGrid.getLabels()` / `setLabels(labels)`             | read / translate the UI labels                  |
| `DataGrid.loadLabels(url)`                               | fetch a JSON label file and apply it            |

## Column

| Name                                    | Type                 | Description                                                            |
|-----------------------------------------|----------------------|------------------------------------------------------------------------|
| `field`                                 | `String`             | the key in the data                                                    |
| `title`                                 | `String`             | header title (defaults to `field`)                                     |
| `id`                                    | `String`             | stable identifier (defaults to `field`)                                |
| `width`                                 | `Number`             | preferred width (the column stays flexible without one)                |
| `class`                                 | `String`             | class on the column (`th.class` / `td.class`)                          |
| `attr`                                  | `String`             | set a row attribute instead of rendering                               |
| `hidden`                                | `Boolean`            | hide the column                                                        |
| `sortable`                              | `Boolean`            | disable sorting for this column (defaults to grid)                     |
| `filterable`                            | `Boolean`            | disable filtering for this column (defaults to grid)                   |
| `transform`                             | `String \| Function` | `"uppercase"` / `"lowercase"` / `"array"`, or `(value, ctx) => value`  |
| `minWidth`                              | `Number`             | never compress below this width                                        |
| `align`                                 | `String`             | header and cell alignment: `start` / `center` / `end`                  |
| `format`                                | `String`             | formatter: `"boolean"` / `"date"` / `"datetime"` / `"number"`          |
| `formatOptions`                         | `Object`             | options for `Intl.DateTimeFormat` / `Intl.NumberFormat`                |
| `editable` / `editableType`             | `Boolean` / `String` | inline editing (see `docs/editing.md`)                                 |
| `validate`                              | `Function`           | `(value, ctx) => true \| "error message"`                              |
| `responsive`                            | `Number`             | responsive priority (`0` disables)                                     |
| `filterType`                            | `String`             | filter mode: `text` / `select` / `boolean` / `number` / `date`         |
| `filterList`                            | `FilterOption[]`     | explicit select filter options                                         |
| `firstFilterOption`                     | `FilterOption`       | first select option                                                    |
| `filterMultiple`                        | `Boolean`            | checkbox popover (`in`) when supported; otherwise single select (`eq`) |
| `renderHeaderCell` / `renderFilterCell` | `(th, ctx) => void`  | custom renderers (core creates the `<th>`)                             |
| `renderCell`                            | `(ctx) => content`   | custom cell renderer (primitive / Node / `{ html }`)                   |
| `cellClass`                             | `String \| Function` | body cells only, per row: string or `(ctx) => class`                   |

Column sizing follows three notions: `minWidth` is a floor the column is never
compressed below, `width` is a preferred width, and a column without a preferred
width stays flexible and absorbs the remaining space. Formatter defaults
contribute a floor — and a preferred width for predictable formats — unless the
column sets its own. With `autosize`, widthless text columns are measured once
at render and pinned to a computed width instead of staying flexible.

### Formatting

A column can format its cell values with a built-in formatter. The formatter
owns the representation, the column owns the sizing: `format` and `formatOptions`
are rendering concerns, while `align`, `minWidth` and `width` stay generic column
geometry (a formatter only contributes safe defaults for them: an alignment, a
floor, and a preferred width for predictable formats — `boolean`, `date`,
`datetime` and percent numbers).

Formatters also suggest a preferred filter mode (`boolean` → tri-state select,
`number` → typed numeric equality, `date` → partial ISO prefix match); an
explicit `filterType` always wins. See `docs/filtering.md`.

| Format     | Output                              | Intl options                 |
|------------|-------------------------------------|------------------------------|
| `boolean`  | accessible `<span>` mark, CSS-drawn | none                         |
| `date`     | `<time datetime>`                   | `Intl.DateTimeFormatOptions` |
| `datetime` | `<time datetime>`                   | `Intl.DateTimeFormatOptions` |
| `number`   | formatted text                      | `Intl.NumberFormatOptions`   |

```js
{
    field: "created",
    format: "date",
}

{
    field: "price",
    format: "number",
    formatOptions: {
        style: "currency",
        currency: "EUR",
    },
}

{
    field: "active",
    format: "boolean",
}
```

`format: "date"` is a calendar date without a time zone: it accepts `Date`,
timestamp or a validated `YYYY-MM-DD`, and rejects time / `timeZone` options.
`format: "datetime"` is an instant: `Date`, timestamp or an ISO datetime string
with a time zone (`2026-08-26T08:30:00Z`, `2026-08-26T10:30:00+02:00`). The
locale comes from the closest `lang` attribute (the grid itself included),
falling back to the document element. Custom DOM rendering stays in `renderCell`,
which always takes precedence over `format`.

`formatOptions` are passed to Intl after applying the formatter defaults and
convenience inferences: `{ currency }` / `{ unit }` imply `style`, and a date
`{ style }` maps to `dateStyle` / `timeStyle`. When granular date options
(`year`, `month`, ...) are present, no default `dateStyle` / `timeStyle` is
injected. An invalid Intl configuration throws visibly, so a misconfigured
column is never silently hidden.

```text
explicit column option > formatter default > normal grid behavior
```

## Action

| Name       | Type                                                   | Description                             |
|------------|--------------------------------------------------------|-----------------------------------------|
| `name`     | `String`                                               | action name (`button[data-action]`)     |
| `label`    | `String`                                               | button label and accessible name        |
| `intent`   | `"default" \| "primary" \| "danger"`                   | sets `data-intent`                      |
| `href`     | `String \| Function`                                   | renders an `<a>` link                   |
| `class`    | `String`                                               | class on the button                     |
| `visible`  | `(row, ctx) => Boolean`                                | hide the action when falsy              |
| `disabled` | `Boolean \| (row, ctx) => Boolean`                     | block the action (`aria-disabled`)      |
| `render`   | `({ action, row, grid }) => content`                   | replace the button content              |
| `confirm`  | `Boolean \| String \| (row, ctx) => Boolean \| String` | ask for confirmation before dispatching |
| `default`  | `Boolean`                                              | row click triggers the action           |

`visible`/`disabled`/`href`/`confirm` receive `(row, ctx)` with `ctx = { grid, action, rowKey }`.

Actions can also be driven by the server: a `row.$actions` array lists which
actions a row gets (strings are looked up by name, objects override the
definition), and `meta.actions` provides server-side definitions. Set
`rowActions: true` (or `row-actions`) to activate the column without static
`actions`.

See `docs/actions.md` for the full contract.

## Events

| Name               | Detail                                             | Trigger                    |
|--------------------|----------------------------------------------------|----------------------------|
| `connected`        | -                                                  | the grid is connected      |
| `disconnected`     | -                                                  | the grid is disconnected   |
| `loadError`        | error                                              | a load fails               |
| `selectionChange`  | `{ selectionState }`                               | the selection changes      |
| `columnVisibility` | `{ col, visibility }`                              | a column is hidden/shown   |
| `columnResized`    | `{ col, width }`                                   | a column is resized        |
| `columnReordered`  | `{ col, from, to }`                                | a column is dragged        |
| `headerRendered`   | -                                                  | the header is rendered     |
| `bodyRendered`     | -                                                  | the body is rendered       |
| `rowRendered`      | `{ rowData, tr }`                                  | a row is rendered          |
| `action`           | `{ action, name, row, rowKey, rowIndex, trigger }` | an action is performed     |
| `bulkAction`       | `{ action, name, selection, query, trigger }`      | a bulk action is performed |
| `edit`             | `{ data, value, field, column }` (cancelable)      | an edit is committed       |
| `rowDetailsToggle` | `{ row, rowKey, expanded }`                        | row details are toggled    |

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

All UI labels are plain strings, overridable at runtime through `setLabels()`,
`loadLabels()` or the shipped `locales/*` modules. See
[docs/translations.md](docs/translations.md).

## Browser Support

The core runtime targets modern evergreen browsers with native ES modules and
commonly available Web Platform APIs (~2020). `filterMultiple` additionally
requires native Popover API and CSS Anchor Positioning support. Browsers that
miss those capabilities keep a working single-select filter emitting `eq`. The
optional `menu` plugin only requires Popover support; older browsers keep the
ordinary browser context menu.

## License

data-grid-component is licensed under the MIT license.
