# Migrating from ShadTable (shad-table.dev)

[ShadTable](https://www.shad-table.dev/) is a **collection of copy-paste table recipes** using shadcn/ui and TanStack
Table, not a single published table API. Its examples include client-side tables, server-driven tables and specialized
interactions. This guide compares its [Data Table example](https://www.shad-table.dev/data-table) (React / TanStack
Table **v8**) with **Data Grid 3.7** (`data-grid-component`), and points out where a migration is architectural rather
than a property rename.

Data Grid is a framework-independent **custom element** with built-in rendering, querying, pagination and opt-in
features. ShadTable is a set of **application-owned React/Vue components**; you decide how to assemble TanStack state,
shadcn controls and markup. Neither model is inherently better: the trade-off is ownership and flexibility versus a
smaller integration surface.

> **Version scope:** ShadTable also offers TanStack v9 variants, with `useTable({ features, ... })` instead of v8's
> `useReactTable`. Their core migration considerations here are the same, but individual TanStack method signatures
> differ. This is **not** a TanStack v8-to-v9 migration guide; see [ShadTable's v9
> guide](https://www.shad-table.dev/migrate-v9).

## Quick comparison

| ShadTable / TanStack (React v8 example) | Data Grid |
| --- | --- |
| Copy registry components into your app | Install `data-grid-component` |
| `<DataTable data={rows} columns={columns} />` | `<data-grid>` or `new DataGrid({ ... })` |
| `useReactTable({ data, columns, ... })` | `new DataGrid({ dataSource, columns, ... })` |
| `ColumnDef` `accessorKey` | `Column` `field` |
| `header: "Name"` | `title: "Name"` |
| `cell: ({ row }) => JSX` | `renderCell: ({ value, row }) => Node/text` |
| `getFilteredRowModel()` | `ArrayDataSource` + `filterable` / `searchable` |
| `getSortedRowModel()` | `ArrayDataSource` + `sortable: true` |
| `getPaginationRowModel()` | `ArrayDataSource` / built-in pager |
| `table.setGlobalFilter(text)` | `grid.setSearch(text)` |
| `column.setFilterValue(value)` | `grid.setQuery({ filters })` |
| `column.toggleSorting(...)` | `grid.sortAsc(field)` / sortable headers |
| `table.setPageSize(size)` | `grid.setQuery({ pageSize: size })` |
| `rowSelection: Record<id, boolean>` | `getSelectionState()` / `selectionChange` |
| `columnVisibility`, `columnOrder`, `columnPinning` | `hidden`, `reorder`, `frozen: "start"/"end"` |
| shadcn `DropdownMenu` / custom row cell | `actions` + `action` event |
| `manualPagination`, controlled state, data fetch | `FetchDataSource` / `src` |
| Tailwind + shadcn variants | Core CSS + `--dg-*` tokens |

- The custom element owns the table DOM and renders text or DOM nodes; React JSX needs a separate integration.
- Local processing lives in `ArrayDataSource`. Pages are 1-based and local sorting uses the first sort descriptor.
- Selection stores IDs in Sets and can represent all matching remote rows.
- Controlled state, server protocols and visual styling require explicit adaptation, detailed below.

## 1. Replace a basic client-side table

The ShadTable recipe typically assembles TanStack row models and renders them through shadcn/ui's table components:

```tsx
// ShadTable-style React v8 / TanStack setup (abbreviated)
const columns = [
    { accessorKey: "name", header: "Name" },
    { accessorKey: "email", header: "Email" },
    { accessorKey: "status", header: "Status" },
];

const table = useReactTable({
    data: users,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
});

// The component also loops over table.getHeaderGroups() and
// table.getRowModel().rows to render <TableHead>, <TableCell>, etc.
```

With Data Grid, the table UI and row-model pipeline are not application code:

```js
import { DataGrid, ArrayDataSource } from "data-grid-component";
import "data-grid-component/styles";

const grid = new DataGrid({
    dataSource: new ArrayDataSource(users),
    columns: [
        { field: "name", title: "Name" },
        { field: "email", title: "Email" },
        {
            field: "status",
            title: "Status",
            filterType: "select",
            filterList: [
                { value: "active", text: "Active" },
                { value: "inactive", text: "Inactive" },
            ],
        },
    ],
    sortable: true,
    searchable: true,
    filterable: true,
    initialQuery: { pageSize: 10 },
});
document.querySelector("#users-host").append(grid);
```

`ArrayDataSource` retains the full array in memory and handles search, filters, sort and pagination locally. Data Grid
also handles its own accessible header buttons, pager and filter row; no `flexRender`, row model composition or custom
pagination toolbar is necessary for the common case. Global search and column filters are **different options**
(`searchable` and `filterable`).

For an even smaller setup, render declarative HTML without a JavaScript configuration object:

```html
<data-grid sortable searchable filterable page-size="10">
    <table>
        <thead><tr>
            <th data-field="name">Name</th>
            <th data-field="status" data-filter="select">Status</th>
        </tr></thead>
        <tbody><tr data-row-key="1">
            <td>Ada</td>
            <td data-value="active">Active</td>
        </tr></tbody>
    </table>
</data-grid>
```

That is a good fit for server-rendered HTML or progressive enhancement, **not** a way to directly reuse React
component markup. The grid takes ownership of the supplied table after initialization; don't have React and Data Grid
simultaneously reconcile the same `<tbody>`.

## 2. Integrate Data Grid in an existing React app

You do **not** need to rewrite an entire React application to adopt the custom element. Give Data Grid a dedicated DOM
mount node and let React own only the node **outside** the grid:

```tsx
import { useEffect, useRef } from "react";
import { DataGrid, ArrayDataSource } from "data-grid-component";
import "data-grid-component/styles";

type User = { id: string; name: string; email: string };

export function UsersGrid({ users }: { users: User[] }) {
    const hostRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const host = hostRef.current;
        if (!host) return;

        const grid = new DataGrid({
            dataSource: new ArrayDataSource(users),
            columns: [
                { field: "name", title: "Name" },
                { field: "email", title: "Email" },
            ],
            sortable: true,
            searchable: true,
        });

        host.append(grid);
        return () => grid.remove();
    }, [users]);

    return <div ref={hostRef} />;
}
```

This is a deliberately simple bridge for a browser-rendered React app. If `users` receives a new array frequently, the
effect above **recreates the grid and resets its query/selection**. For a production wrapper, create it once, then
update its `ArrayDataSource.rows` and call `refresh()` as data changes (or define how much state should reset). In an
SSR framework, load the browser-only custom-element package through a client-only dynamic import or disable SSR for
this wrapper; a client component can still be prerendered on the server. Keep application React state and Data Grid
state ownership explicit; avoid two competing sources of truth.

If your table depends extensively on live React cells (hooks, context providers, React portals or a custom TanStack
feature), retaining ShadTable for that table may be simpler. Data Grid's `renderCell` accepts text or DOM nodes, not
React elements; embedding an entire React subtree per cell is a separate integration project, not an automatic
translation.

## 3. Map column definitions and cell rendering

ShadTable's `ColumnDef` is very flexible: accessors, headers, cells, filter functions, sorting functions and
display-only columns are all defined through TanStack. Data Grid instead favors declarative column metadata and a
small set of extension hooks:

```js
const columns = [
    {
        field: "name",
        title: "Name",
        renderCell: ({ value }) => {
            const strong = document.createElement("strong");
            strong.textContent = String(value ?? "");
            return strong;
        },
    },
    { field: "email", title: "Email", hidden: false },
    {
        field: "amount",
        title: "Amount",
        format: "number",
        formatOptions: { style: "currency", currency: "EUR" },
        align: "end",
    },
    {
        field: "active",
        title: "Active",
        format: "boolean", // also suggests a tri-state boolean filter
    },
];
```

Prefer `format` for standard localized values; `renderCell` for custom markup; `renderEditor` for an application-owned
input; and `renderHeaderCell` / `renderFilterCell` for special column controls. `renderCell` does **not** supply a
TanStack `CellContext` and is not an orthogonal sort/filter value. `ArrayDataSource` sorts and filters the raw data.
For computed fields, calculate a normalized field in the records or supply a custom `DataSource`.

Data Grid offers `column.frozen: "start" | "end"` to freeze a column at a logical edge, with layout behavior distinct
from TanStack's pinning state and CSS. Grid-wide `resizable` and `reorder` enable pointer-driven column interactions;
they do not expose TanStack's controlled resizing/ordering model. See [Plugins](plugins.md) and [Styling](styling.md).

## 4. Sort, filter, search and paginate

ShadTable's basic example uses TanStack methods such as `table.setGlobalFilter`, `column.setFilterValue`,
`table.setPageSize` and `column.getToggleSortingHandler`. Data Grid centralizes runtime state in `grid.query`:

```js
grid.setSearch("ada");

grid.setQuery({
    page: 1, // 1-based
    pageSize: 25,
    sort: [{ field: "name", direction: "asc" }],
    filters: {
        status: { operator: "eq", value: "active" },
        amount: { operator: "gte", value: 100 },
    },
});

console.log(grid.query); // read-only snapshot of QueryState
grid.sortDesc("name");
grid.clearFilters();
```

`filters` are keyed by the business field and use structured operations. A free-text filter defaults to `contains`;
select filters typically use `eq`. With `filterMultiple: true`, browsers with the Popover API get a checkbox popover
emitting `in`; older browsers keep a single select emitting `eq`. The built-in filter row covers conventional admin
tables; custom faceted builders or complex condition groups need application-owned UI.

Important semantic differences to test:

- **Pages:** TanStack's typical `pageIndex` is 0-based; Data Grid's `page` is 1-based.
- **Local sorting:** Data Grid's `ArrayDataSource` currently applies only the first sort descriptor; TanStack's
  multi-sort behavior is not matched automatically.
- **Global search:** `ArrayDataSource` performs case/accent-insensitive substring search over scalar row values, with
  `|` separating OR alternatives. TanStack's `globalFilterFn`, filterable column selection and faceting logic may
  differ. Remote search semantics belong to the backend.
- **Query updates:** `setQuery` causes a load; search/filter changes reset pagination and invalidate selections from
  the previous population. Do not maintain a second, unsynchronized TanStack state object.

For non-standard filter builders, keep your own UI and use `grid.setQuery({ filters })`; implement any unsupported
semantics in a custom data source/backend rather than assuming the stock controls reproduce every recipe.

## 5. Move from ShadTable's SSR recipes to remote data

ShadTable includes separate examples for [server pagination](https://www.shad-table.dev/server-pagination), [server
filters](https://www.shad-table.dev/server-filter) and [combined
sort/filter/pagination](https://www.shad-table.dev/server-combined-table). Many deliberately use **the URL as the
source of truth** for search/page/filter state. Data Grid does not dictate your URL router: it exposes `QueryState`
and a data source contract. Choose explicitly who owns URL synchronization.

A Data Grid server source sends `QueryState` to a backend and expects a `PageResult`:

```js
import { DataGrid } from "data-grid-component";
import { FetchDataSource } from "data-grid-component/data-source";

const grid = new DataGrid({
    columns: [
        { field: "name", title: "Name" },
        { field: "status", title: "Status", filterType: "select" },
    ],
    dataSource: new FetchDataSource("/api/users", {
        serializeQuery: ({ page, pageSize, search, sort, filters }) => ({
            page, pageSize, search, sort, filters,
        }),
    }),
    sortable: true,
    filterable: true,
    searchable: true,
});
```

The default serializer already sends these values with bracket-style URL parameters; `serializeQuery` is included
above to show the extension point. You can omit it for an endpoint that speaks Data Grid's native query format.

```js
// Request state
{
    page: 2,
    pageSize: 10,
    search: "ada",
    sort: [{ field: "name", direction: "asc" }],
    filters: { status: { operator: "eq", value: "active" } },
}
```

```json
{
    "rows": [{ "id": 42, "name": "Ada", "status": "active" }],
    "total": 73,
    "meta": { "unfilteredTotal": 120 }
}
```

`total` counts the filtered population. For an existing API with a different result envelope, use `parseResponse`, for
example `parseResponse: json => ({ rows: json.items, total: json.totalCount })`. Remote sorting and filtering must be
implemented server-side; `FetchDataSource` does not fetch all records and process them in the browser. Whitelist
accepted fields and operators before generating SQL.

If the ShadTable page uses URL-driven state, initialize from your router's parsed query (`initialQuery`), listen to
`querychange` for updates, and restore history navigation through `setQuery()`. The [shareable URL
example](filtering.md#shareable-urls) shows this application-owned adapter in both directions. Choose one fetch owner
when integrating a router. See [Server-side data](server-data.md) for cancellation, `initialResult`, `pager="more"`
and server-provided filter choices.

## 6. Selection, bulk actions, row actions, and editing

A typical TanStack controlled `rowSelection` is a map of row IDs to booleans. Data Grid uses a separate selection
model whose state is `{ mode, ids, except }`, with `ids` / `except` as `Set`s:

```js
const grid = new DataGrid({
    rowKey: "id",
    selectable: true,
    selectVisibleOnly: false,
    bulkActions: [{ name: "archive", label: "Archive" }],
});

grid.addEventListener("selectionChange", ({ detail }) => {
    console.log(detail.selectionState);
});

grid.addEventListener("bulkAction", ({ detail }) => {
    // Use detail.selection and detail.query for an authorized server operation.
    // "all" mode means all matching records except the excluded keys,
    // NOT just the rows currently held in memory.
});
```

By default, `selectVisibleOnly: true` selects the current page. Setting it to `false` opts into server-first
all-results selection. Search/filter changes clear an old population's selection. This differs fundamentally from
TanStack's controlled row selection and must be reflected in bulk-operation APIs.

For row actions, Data Grid generates action controls from descriptors and emits a DOM `action` event; your application
implements the business effect:

```js
const grid = new DataGrid({
    columns: [{ field: "name", title: "Name" }],
    actions: [
        { name: "open", label: "Open", href: (row) => `/users/${row.id}` },
        { name: "delete", label: "Delete", intent: "danger", confirm: true },
    ],
});

grid.addEventListener("action", async ({ detail }) => {
    if (detail.name !== "delete") return;
    await api.delete(detail.rowKey);
    await grid.refresh();
});
```

ShadTable-specific React dropdowns and async cell interactions cannot be mechanically converted into `renderCell`:
some are better as standalone controls outside the grid. Data Grid's inline editing targets simple editable cells
(`editable`, `editableType`, `renderEditor`, cancelable `edit`). For complex validation, multi-cell transactions,
Excel-like navigation, pivot tables, group aggregations, rich drag-and-drop or React-driven virtualized views,
**evaluate the feature individually**. The presence of a ShadTable example does not imply equivalent Data Grid
behavior. See [Selection](selection.md), [Actions](actions.md) and [Editing](editing.md).

## 7. Styling and architectural trade-offs

ShadTable inherits shadcn/Tailwind components and lets you edit the copied source. Data Grid ships one neutral CSS
implementation using `--dg-*` tokens, with optional Actual CSS and Bootstrap themes. Migrating the data behavior
**does not** automatically preserve your ShadTable visual identity. Adapt the tokens and host control classes rather
than trying to reuse Tailwind class strings on internal table elements. See [Styling](styling.md).

**Where Data Grid is especially appropriate:** conventional admin lists, server-paginated datasets, progressive
enhancement of HTML tables, framework-agnostic screens, reusable grids where stable behavior outweighs per-table
customization.

**Where keeping ShadTable/TanStack may be preferable:** highly bespoke React/Vue cell components, complex controlled
state across the application, uncommon table algorithms (pivot/group/tree) or interactions where owning all JSX and
state is the explicit goal.

A migration can be **incremental**. Keep unusual ShadTable screens and replace repetitive CRUD lists first; both
approaches can coexist in one application. The comparison is about integration cost and ownership, not a feature-count
contest.

## Migration checklist

1. Identify the exact ShadTable recipe and TanStack version (v8 or v9); don't assume all example tables share one API.
2. Decide whether the target is an HTML/custom-element mount inside React, or a separate progressively enhanced page.
3. Map `accessorKey` to `field` and move simple formatting into `format` / `formatOptions`.
4. Replace the TanStack row models with `ArrayDataSource` **only** for data already fully in memory.
5. For remote tables, translate pagination, sorting, filters, totals and URL-state ownership intentionally.
6. Rebuild custom cells/menus with DOM renderers or application-owned UI; don't pass React elements as `renderCell`
   results.
7. Review selection semantics, server authorization, and action / edit event handlers.
8. Compare keyboard accessibility, responsive behavior, special advanced features, CSS and lifecycle behavior before
   deleting the old implementation.

## Further reading

- [Data Grid README](../readme.md) · [Server-side data](server-data.md) · [Filtering](filtering.md) ·
  [Selection](selection.md) · [Plugins](plugins.md) · [Styling](styling.md)
- [ShadTable Data Table](https://www.shad-table.dev/data-table) · [SSR combined
  table](https://www.shad-table.dev/server-combined-table) · [ShadTable v8-to-v9
  guide](https://www.shad-table.dev/migrate-v9)
