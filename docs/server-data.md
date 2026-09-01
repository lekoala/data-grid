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
`new URL(endpoint, document.baseURI)` rules. `FetchDataSource` does not add a
cache-busting parameter: normal HTTP caching applies. Applications that need
`cache: "no-store"`, a nonce or another request policy should provide their own
data source.

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
- `total` - number of rows matching the current query (after search + filters, used for pagination).
- `meta.unfilteredTotal` - optional, number of rows before any search/filter.
- `meta` - optional extra information, e.g. `filters` to populate select filter options.

`parseResponse` lets you adapt a different response shape. `ArrayDataSource.fromUrl(url)` fetches a static JSON file once and applies the query locally.

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
end of the page, whatever the direction. For `FetchDataSource`, the server
remains responsible for its own sort semantics.

## Errors

When a request fails, the grid sets `data-error`, clears `data-loading`, fills
the empty-message area with the error (or the `errorMessage` option) and fires a
`loadError` event. The previous page is kept. A `refresh()` re-triggers the load.
