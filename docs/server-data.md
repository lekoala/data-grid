# Server-side data

The grid is server-first: by default it pages, sorts and filters on the server
and only ever holds the rows of the current page in memory.

## Setup

```html
<data-grid src="/api/users" sortable filterable selectable></data-grid>
```

The `src` attribute (or the `src` option) creates a `FetchDataSource`. Every
query change reloads the data from the server.

```js
import { DataGrid } from "data-grid-component";
import { FetchDataSource } from "data-grid-component/data-source";

const grid = new DataGrid({
    dataSource: new FetchDataSource("/api/users", {
        // optional, defaults to identity (QueryState is sent as-is)
        serializeQuery: (query) => ({
            page: query.page,
            pageSize: query.pageSize,
            sort: query.sort,
            filters: query.filters,
        }),
    }),
});
```

## Column aggregates

Configure `summary: "sum"` or `summary: "avg"` on a data column to display a
source-provided number in a generated `<tfoot>`. This is independent of the
pagination controls outside the table:

```js
columns: [
    { field: "customer" },
    { field: "mrr", summary: "sum", format: "number",
      formatOptions: { style: "currency", currency: "USD" } },
    { field: "health", summary: "avg", format: "number",
      formatOptions: { style: "percent", maximumFractionDigits: 2 } },
]
```

The backend independently configures and calculates these operations. The grid
does not send the column definitions or calculate aggregates from its page:

```json
{
    "rows": [{ "customer": "Example", "mrr": 459, "health": 0.81 }],
    "total": 64,
    "meta": { "aggregates": { "mrr": 48553, "health": 0.5728 } }
}
```

- Values describe **all matching rows after search and filters, before
  pagination**. Page, sort, and row selection do not change that scope.
- Keys are data fields; structural reconciliation uses the column's stable ID.
  Virtual plugin columns remain empty and row-attribute columns have no cell.
- Only finite JSON numbers are displayed. `0` is a value; `null`, missing keys,
  numeric strings, booleans, and other invalid values render `—`.
- A missing, null, scalar, or array `meta.aggregates` removes the footer. An
  object, including `{}`, displays a footer if at least one data column has a
  supported summary; missing values appear as placeholders. The footer is
  hidden while every summary column is hidden, and returns with one of them.
- For no matches, the backend can return sums of `0` and an average of `null`.
  The grid never invents those values, nor derives an unknown total from them.
- Aggregates use numeric formatting. For `format: "number"`, they share the
  column's `formatOptions`; otherwise they use the default number formatter.
  Row `transform`, `renderCell`, templates, editors, and `cellClass` do not run
  for aggregate cells. Column alignment and visibility still apply.
- `pager="more"` sources must return the **complete matching aggregates on each
  chunk**. New metadata replaces old metadata; omitting aggregates removes the
  footer. The grid never adds page/chunk totals together.
- Footer values follow accepted response metadata, including refresh, source
  changes and cancellation. A failed replacement hides the old footer; a failed
  append retains the accepted rows and their aggregates.

Footer cells retain their column-header association. The first version displays
values without SUM/AVG labels; describe the operations and scope in the table's
caption or nearby application text, as in the
[server aggregates demo](../demo/aggregates.html).

Author-supplied declarative `<tfoot>` elements are still discarded. This feature
does not introduce footer templates or automatic `ArrayDataSource` aggregation.

## Query serialization

The current `QueryState` is the single source of truth:

```js
{
    page: 1,
    pageSize: 10,
    search: "dupont",
    sort: [{ field: "name", direction: "asc" }],
    filters: { status: { operator: "eq", value: "active" } },
}
```

By default the whole state is serialized with bracket notation through
`encodeSearchParams`:

```
page=1&pageSize=10&search=dupont&sort[0][field]=name&sort[0][direction]=asc&filters[status][operator]=eq&filters[status][value]=active
```

Provide `serializeQuery` to map the state to your own server protocol.

The endpoint is resolved with the platform's standard
`new URL(endpoint, document.baseURI)` rules. Normal HTTP caching applies by
default. Pass standard `RequestInit` values through `fetch` when a request needs
a different policy:

```js
new FetchDataSource("/api/users", {
    fetch: { cache: "no-store" },
});
```

When an intermediary requires a unique URL instead, `cacheBust: true` appends
`_=<timestamp>` to each request. It is disabled by default and applied after
`serializeQuery` and `params`; prefer the standard fetch cache option when it
solves the problem.

Constant `params` are merged over the serialized runtime query
(`{ ...serialized, ...params }`), so a constant `page`, `search` or `filters`
entry overrides the live query value. Avoid those keys for constants, or do so
deliberately.

## Global search

`search` is a single global search term, distinct from the column `filters`
(`search AND filters`). The server decides which fields it covers — it is a
capability of the dataset, not a naive concatenation of the returned columns.
The client only ever sends the term, never a list of search fields.

> **A server must whitelist sortable/filterable/searchable fields and filter
> operators. Client-provided field names must never be interpolated directly
> into SQL.**

For `ArrayDataSource` a generic case-insensitive `contains` over the scalar
values of each row is applied; this is a convenient local default, **not** the
contract imposed on backends.

## Response contract

The server must return a `PageResult`:

```json
{
    "rows": [{ "id": 1, "name": "Ada" }],
    "total": 142,
    "meta": {
        "unfilteredTotal": 998,
        "filters": { "status": [{ "value": "active", "text": "Active" }] }
    }
}
```

- `rows` - the rows of the requested page.
- `total` - number of rows matching the current query (after search + filters). Required for `pager="pages"`; optional in `pager="more"`, where a backend that skips `COUNT(*)` omits it (it arrives as `null`, never as a fabricated count). A finite numeric string (`"142"`, e.g. `COUNT(*)` returned as bigint text) is coerced to a `Number`; anything else becomes `null`.
- `hasMore` - optional authoritative continuation signal for `pager="more"` (`true`/`false` wins over `total` when both are present; an empty chunk always ends the list).
- `meta.unfilteredTotal` - optional, number of rows before any search/filter.
- `meta` - optional extra information, e.g. `filters` to populate select filter options.

Without `total` or `hasMore`, the grid falls back to a chunk-size heuristic in `pager="more"` mode: a full chunk assumes a sequel, a short one ends the list (at the cost of one possibly empty extra click when the last chunk is exactly full).

## Progressive loading without COUNT(*)

For log-like interfaces, counting the whole table per request is wasteful. Ask for one row more than the page size and trim:

```sql
SELECT ...
FROM logs
WHERE ...
ORDER BY recorded_at DESC, id DESC
LIMIT 21 OFFSET :offset   -- pageSize 20
```

```js
hasMore = rows.length > 20;
rows = rows.slice(0, 20);
```

The grid only needs `{ rows, hasMore }`. For very large volumes the same contract works with a keyset cursor instead of an offset:

```sql
WHERE (recorded_at, id) < (:lastDate, :lastId)
ORDER BY recorded_at DESC, id DESC
LIMIT 21
```

See `demo/logs.html`, which emulates this pattern locally through a `NoCountSource` wrapper.

`parseResponse` lets you adapt a different response shape. `ArrayDataSource.fromUrl(url)` fetches a static JSON file once (no fetch options or abort signal) and applies the query locally.

## Local data

`ArrayDataSource` owns the whole collection in the browser and applies
filters/sort/pagination locally:

```js
import { ArrayDataSource } from "data-grid-component/data-source";

const grid = new DataGrid({
    columns: [{ field: "name", title: "Name" }],
    dataSource: new ArrayDataSource([{ name: "Ada" }, { name: "Grace" }]),
});
```

The server helpers (`applyFilters`, `applySort`, `paginate`, `parseResult`) are
exported from `src/data-source.js` and reused by `demo/server.js` so the client
and the server speak the same contract.

`applySort` always places empty values (`null`, `undefined`, empty string) at the
end of the page, whatever the direction. Only the first entry of `QueryState.sort`
is applied locally; further entries are ignored. For `FetchDataSource`, the server
remains responsible for its own sort semantics.

## Errors

When a request fails, the grid sets `data-error`, clears `data-loading`, fills
the empty-message area with the error (or the `errorMessage` option) and fires a
`loadError` event. The previous page is kept. A `refresh()` re-triggers the load.
