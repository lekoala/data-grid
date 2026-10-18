# Migrating from DataTables

This guide compares **DataTables 2** (`new DataTable(...)`) with **Data Grid 3.7** (`data-grid-component`). The goal
is to translate common use cases, not to claim that the libraries have identical behavior. DataTables enhances a table
through a comprehensive imperative API; Data Grid is a framework-independent custom element built around an explicit
data source and query state.

**Choose your path:** If you have an existing HTML table, start with [declarative HTML](#1-an-existing-html-table). If
you pass JavaScript records, use [`ArrayDataSource`](#2-javascript-data-and-column-definitions). If you have
`serverSide: true`, read [the server protocol section](#4-server-side-processing) before replacing anything.

## Install and initialize

DataTables:

```js
import DataTable from "datatables.net-dt";
import "datatables.net-dt/css/dataTables.dataTables.css";

const table = new DataTable("#users", {
    searching: true,
    ordering: true,
    pageLength: 25,
});
```

Data Grid:

```js
import { DataGrid, ArrayDataSource } from "data-grid-component";
import "data-grid-component/styles";

const grid = new DataGrid({
    dataSource: new ArrayDataSource(users),
    columns: [
        { field: "name", title: "Name" },
        { field: "email", title: "Email" },
    ],
    sortable: true,
    searchable: true,
    initialQuery: { pageSize: 25 },
});
document.querySelector("#users-host").append(grid);
```

`users` is an array of records. Unlike DataTables, the grid does **not** enable sorting or global search by default:
opt in with `sortable` / `searchable`. `filterable` enables a separate **per-column filter row**, not global search.
Data Grid can be installed without a framework; its package entry registers `<data-grid>` and the built-in plugins.

## API at a glance

| DataTables | Data Grid |
| --- | --- |
| `new DataTable("#users", options)` | `new DataGrid(options)` or `<data-grid>` |
| `data: rows` | `dataSource: new ArrayDataSource(rows)` |
| `columns: [{ data, title }]` | `columns: [{ field, title }]` |
| `columns.render` | `column.renderCell({ value, row, ... })` |
| `searching: true` | `searchable: true` |
| `table.search(term).draw()` | `grid.setSearch(term)` |
| `table.column(i).search(term).draw()` | `grid.setQuery({ filters })` |
| `order: [[0, "asc"]]` | `initialQuery.sort` with `{ field: "name", direction: "asc" }` |
| `table.order(...).draw()` | `grid.setQuery({ sort })` / `grid.sortAsc("name")` |
| `pageLength: 25` | `initialQuery: { pageSize: 25 }` |
| `table.page(n).draw()` | `grid.setQuery({ page: n + 1 })` |
| `table.ajax.reload()` | `grid.refresh()` |
| `table.column(i).visible(false)` | `grid.hideColumn("email")` |
| `rowId` | `rowKey: "id"` |
| Select extension | `selectable: true` + selection API |
| `stateSave: true` | `saveState: true` + stable `id` |
| `serverSide: true, ajax: ...` | `FetchDataSource` / `src` |
| DataTables extensions | Built-in plugins / application code |

- Columns, filters and sort descriptors use field names; sort direction is named `direction`.
- Data Grid pages are **1-based**; DataTables API page indices are 0-based.
- Query methods reload automatically. `refresh()` reloads a remote source or re-applies the query to a local source.
- Renderers, selection, persistence and server protocols have different contracts, detailed below.

## 1. An existing HTML table

If your DataTables instance enhances server-rendered HTML, Data Grid can also start from markup. Wrap the table in
`<data-grid>`, annotate the headers with stable fields, and keep `tbody` for local data:

```html
<!-- Before: DataTables enhances this existing table -->
<table id="users">
    <thead><tr><th>Name</th><th>Status</th></tr></thead>
    <tbody><tr><td>Ada</td><td>Active</td></tr></tbody>
</table>
<script type="module">
    new DataTable("#users");
</script>
```

```html
<!-- After: Data Grid consumes and then owns the supplied table -->
<data-grid sortable searchable filterable page-size="25">
    <table>
        <thead>
            <tr>
                <th data-field="name">Name</th>
                <th data-field="status" data-filter="select">Status</th>
            </tr>
        </thead>
        <tbody>
            <tr data-row-key="user-1">
                <td>Ada</td>
                <td data-value="active">Active</td>
            </tr>
        </tbody>
    </table>
</data-grid>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/data-grid-component@3/dist/data-grid.min.css">
<script type="module" src="https://cdn.jsdelivr.net/npm/data-grid-component@3/dist/data-grid.min.js"></script>
```

The example uses versioned CDN assets; in a bundler, import `data-grid-component/styles` instead. A `data-value`
contains a typed **machine value** while cell content remains the authored presentation. Without `data-value`, a cell
becomes a string. `data-row-key` provides a stable key; unlike DataTables, your `<th>` needs `data-field` to
participate in the declarative schema. Don't initialize DataTables on the same table: both libraries own its
rendering.

This approach is excellent for server-rendered small tables. For live data, configure `src` or `dataSource` and let
the endpoint own the rows; the original `<tbody>` is not consumed when a remote source exists. See [the declarative
example in the README](../readme.md#declarative-html).

## 2. JavaScript data and column definitions

Before:

```js
const table = new DataTable("#users", {
    data: users,
    columns: [
        { data: "name", title: "Name" },
        { data: "status", title: "Status" },
        { data: "amount", title: "Amount", render: DataTable.render.number(null, null, 2, "€") },
    ],
    order: [[0, "asc"]],
    pageLength: 25,
});
```

After:

```js
const grid = new DataGrid({
    dataSource: new ArrayDataSource(users),
    columns: [
        { field: "name", title: "Name" },
        { field: "status", title: "Status", filterType: "select" },
        {
            field: "amount",
            title: "Amount",
            format: "number",
            formatOptions: { style: "currency", currency: "EUR" },
            align: "end",
        },
    ],
    sortable: true,
    filterable: true,
    searchable: true,
    initialQuery: {
        page: 1,
        pageSize: 25,
        sort: [{ field: "name", direction: "asc" }],
    },
});
document.querySelector("#users-host").append(grid);
```

`ArrayDataSource` locally filters, searches, sorts, then paginates its full collection. It is **not** the default
remote mode. Its local sort applies the first sort descriptor only; if your DataTables setup relies on multi-column
ordering, implement that explicitly in a custom source or on the server. Data Grid's local search/filter comparison
rules may also differ from DataTables', including regex, type detection, date formats and orthogonal search values:
regression-test business-critical cases.

### Custom renderers

DataTables' `render(data, type, row, meta)` can return distinct values for `display`, `sort` and `filter`. Data Grid's
`renderCell` is a **display renderer** that receives a context object:

```js
{
    field: "name",
    title: "Name",
    renderCell: ({ value }) => {
        const strong = document.createElement("strong");
        strong.textContent = String(value ?? "");
        return strong;
    },
}
```

Use a real DOM node (or text) rather than interpolating untrusted data into `{ html }`. Formatting and data
transformation are separate: prefer `format` / `formatOptions` for numbers, dates, datetimes and booleans. An
`ArrayDataSource` operates on raw row values, **not** the text returned by `renderCell`. For custom derived
sort/filter semantics, prepare an explicit data field or implement the behavior in your data source/backend;
DataTables orthogonal rendering does not transfer automatically.

## 3. Search, filters and state

```js
grid.setSearch("ada");

grid.setQuery({
    sort: [{ field: "name", direction: "desc" }],
    filters: {
        status: { operator: "eq", value: "active" },
        amount: { operator: "gte", value: 100 },
    },
});

console.log(grid.query.page, grid.query.search, grid.query.filters);
grid.clearFilters();
grid.clearSearch();
```

Global `search` and per-column `filters` are separate and combined. Filter operators include `contains`, `eq`, `in`,
`between`, `empty`, comparisons and others. Changing a search or filter resets pagination; any existing selection of a
population is invalidated. Text controls have built-in operator shortcuts (for example `>=100`), documented in
[Filtering](filtering.md).

For custom UI controls, bind to the public API rather than querying or modifying Data Grid's internal filter inputs.
For remote grids, **your backend decides which fields are searched**, and must whitelist allowed fields/operators.
There is no automatic DataTables-compatible regex search.

## 4. Server-side processing

This is the **largest migration difference**. DataTables `serverSide: true` sends parameters such as `draw`, `start`,
`length`, `search[value]` and `order[0][column]`, and expects `{ draw, recordsTotal, recordsFiltered, data }`. Data
Grid sends `QueryState` (`page`, `pageSize`, `search`, `sort`, `filters`) and expects a `PageResult` (`rows`, `total`,
optional `meta`). Simply changing `ajax` to `src` against an unchanged DataTables endpoint will not work.

**Recommended: adopt the Data Grid protocol on your backend.**

```html
<data-grid src="/api/users" sortable searchable filterable></data-grid>
```

After applying search, sorting and a status filter, a request state can look like this:

```js
{
    page: 1,
    pageSize: 10,
    search: "ada",
    sort: [{ field: "name", direction: "asc" }],
    filters: { status: { operator: "eq", value: "active" } },
}
```

The response is:

```json
{
    "rows": [{ "id": 1, "name": "Ada", "status": "active" }],
    "total": 1,
    "meta": { "unfilteredTotal": 120 }
}
```

For a **temporary read-only compatibility adapter**, keep the old DataTables backend and translate the query. This
example supports global search and **single-column sorting**; it intentionally rejects column filters, which require
you to decide how each structured operator maps to the legacy server's string search semantics:

```js
const fields = ["name", "email", "status"]; // same order as legacy columns
let draw = 0;

const legacyDataTablesSource = {
    async load(query, { signal } = {}) {
        if (Object.keys(query.filters).length) {
            throw new Error("Translate column filters before using this adapter");
        }
        if (query.sort.length > 1) {
            throw new Error("This adapter handles one sort column");
        }

        const params = new URLSearchParams({
            draw: String(++draw),
            start: String((query.page - 1) * query.pageSize),
            length: String(query.pageSize),
            "search[value]": query.search,
            "search[regex]": "false",
        });
        for (const [i, field] of fields.entries()) {
            params.set(`columns[${i}][data]`, field);
            params.set(`columns[${i}][name]`, field);
            params.set(`columns[${i}][searchable]`, "true");
            params.set(`columns[${i}][orderable]`, "true");
            params.set(`columns[${i}][search][value]`, "");
            params.set(`columns[${i}][search][regex]`, "false");
        }
        const sort = query.sort[0];
        if (sort) {
            const index = fields.indexOf(sort.field);
            if (index < 0) throw new Error(`Unknown sort field: ${sort.field}`);
            params.set("order[0][column]", String(index));
            params.set("order[0][dir]", sort.direction);
        }

        const response = await fetch(`/api/legacy-users?${params}`, { signal });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const result = await response.json();
        return {
            rows: result.data,
            total: result.recordsFiltered,
            meta: { unfilteredTotal: result.recordsTotal },
        };
    },
};

const grid = new DataGrid({
    columns: fields.map((field) => ({ field, title: field })),
    dataSource: legacyDataTablesSource,
    searchable: true,
    sortable: true,
});
document.querySelector("#users-host").append(grid);
```

Your real legacy endpoint may enforce `draw` sequencing, require auth/POST, interpret an empty sort differently, or
rely on DataTables extensions' extra parameters. Adapt accordingly; use `signal` for cancellation. If the server
**already accepts Data Grid's query** but only responds in DataTables format, a simpler [`FetchDataSource` with
`parseResponse`](server-data.md#response-contract) is enough. When converting directly, `total` must be
**`recordsFiltered`**, not `recordsTotal`.

A DataTables `ajax` endpoint that returns the *entire collection once* is different: fetch it once and use
`ArrayDataSource`, or `await ArrayDataSource.fromUrl(url, json => ({ rows: json.data }))` for a compatible static JSON
response. Do not point `src` at that endpoint and assume remote pagination will work.

## 5. Selection, actions and editing

Data Grid's selection is keyed by `rowKey` (default `id`) and can represent either explicitly selected IDs or “all
matching rows except these IDs”, useful for server-paginated operations:

```js
const grid = new DataGrid({
    rowKey: "id",
    selectable: true,
    selectVisibleOnly: false, // select across matching server pages
    bulkActions: [{ name: "archive", label: "Archive" }],
});

grid.addEventListener("bulkAction", (event) => {
    const { selection, query } = event.detail;
    // selection.mode is "explicit" or "all"; ids/except are Sets.
    // Authorize the operation on the server using the query + exclusions.
});
```

This is **not** the DataTables Select extension state or an array of all selected records. In particular, the current
page's `grid.getSelection()` is not the whole server-side selection; use `getSelectionState()` (and treat sets as sets
when serializing).

Row actions are descriptors, not DataTables Buttons/Editor configuration:

```js
const grid = new DataGrid({
    columns: [{ field: "name", title: "Name" }],
    actions: [
        { name: "edit", label: "Edit", href: (row) => `/users/${row.id}` },
        { name: "delete", label: "Delete", intent: "danger", confirm: true },
    ],
});

grid.addEventListener("action", async (event) => {
    if (event.detail.name !== "delete") return;
    await api.delete(event.detail.rowKey);
    await grid.refresh(); // remote data: removeRow() is local-only
});
```

For simple inline editing, set `column.editable` and handle the cancelable `edit` event; custom editors can use
`renderEditor`. There is no drop-in replacement for DataTables Editor's full form and server integration. See
[Actions](actions.md), [Selection](selection.md) and [Editing](editing.md).

## 6. Styling, extensions and persistence

- Use the neutral Data Grid stylesheet and `--dg-*` custom properties. Optional themes ship for Bootstrap 5 and Actual
  CSS. DataTables-specific classes, layout integrations and CSS overrides do not carry over.
- `saveState: true` requires a stable grid `id` and persists query, column order, explicit visibility and resized
  widths. It is **not** a DataTables `stateSave` storage migration.
- Common behavior lives in optional plugins (`resizable`, `reorder`, `responsive`, row actions, selection). Extensions
  such as Buttons, SearchBuilder, FixedHeader or Editor must be evaluated individually; some require application code
  or have no equivalent.
- The output is still a native `<table>`. Data Grid does not expose the DataTables `rows().every()`, `column(i)`,
  `draw()` or jQuery plugin surface.

## Migration checklist

1. Identify whether your DataTables setup uses HTML, local JS, one-time Ajax, or `serverSide: true`.
2. Replace positional column references with named `field` keys and choose a stable `rowKey`.
3. Enable the desired capabilities explicitly: `sortable`, `searchable`, `filterable`, `selectable`.
4. Translate initial ordering and page size into `initialQuery` (page is **1-based**).
5. Migrate cell display renderers separately from sort/filter data semantics.
6. For remote data, translate **both** request and response contracts and test total counts, cancellation and invalid
   filters.
7. Migrate events, actions and selection via the public API; do not depend on DataTables' DOM wrappers or extension
   internals.
8. Re-test filtering, search, keyboard interaction, responsive behavior, locale-sensitive ordering and stored state.

## Further reading

- [Data Grid README](../readme.md) · [Server-side data](server-data.md) · [Filtering](filtering.md) ·
  [Selection](selection.md) · [Actions](actions.md) · [Styling](styling.md)
- [DataTables initialization](https://datatables.net/manual/core/options) · [DataTables server-side
  protocol](https://datatables.net/manual/core/server-side)
