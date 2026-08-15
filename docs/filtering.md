# Filtering

Set `filterable` on the grid to show a filter row under the headers. Text inputs
filter with `contains`, select inputs with `eq`. Change a column's input type
with `filterType: "select"`.

## Filter state

Filters accept two forms. A scalar value is a shorthand for the default
`contains` operator; the structured form lets you choose the operator
(`empty`/`notEmpty` have no value):

```js
// shorthand (contains)
filters: {
    name: "alice",
    active: true,
}

// explicit
filters: {
    name: { operator: "startsWith", value: "ali" },
    deletedAt: { operator: "empty" },
}
```

The public API accepts `FilterValue | FilterState`; internally the query state
is always normalized to the structured `FilterState`, including `grid.query`:

```js
grid.query.filters
// { status: { operator: "eq", value: "active" } }
```

Operators:

| Operator      | Behavior                                                          |
|---------------|-------------------------------------------------------------------|
| `eq`          | scalar equality (after string coercion, `42` matches `"42"`)       |
| `neq`         | negation of `eq`                                                   |
| `contains`    | case-insensitive substring                                         |
| `startsWith`  | case-insensitive prefix                                            |
| `endsWith`    | case-insensitive suffix                                            |
| `lt` / `lte`  | numeric when both operands are finite, otherwise string compare    |
| `gt` / `gte`  | numeric when both operands are finite, otherwise string compare    |
| `between`     | inclusive range, requires a 2-value array                          |
| `in`          | value in a list                                                    |
| `empty`       | value is `null`, `undefined` or `""`                               |
| `notEmpty`    | negation of `empty`                                                |

`0` and `false` are real values: they are preserved and only `empty`/`notEmpty`
match against missing values. Invalid or empty filter values are ignored, not
treated as "match nothing".

You can set filters programmatically:

```js
grid.setQuery({
    filters: { status: { operator: "eq", value: "active" }, name: "alice" },
});
```

Any change to `filters` (via `setQuery`) resets the page to 1.

## Filter options for select columns

`getFilterOptions(column)` resolves the options of a select filter, in this order:

1. `column.filterList` - an explicit list of `{ value, text }` (authoritative).
2. `meta.filters[field]` - options provided by the server (server-first).
3. `ArrayDataSource` rows - the unique values of the column.

It never derives options from the currently loaded page, so a server grid must
either set `filterList` or return `meta.filters`.

## Enter to filter

By default filtering happens on Enter (`filterOnEnter: true`). Set
`filterOnEnter: false` and adjust `filterKeypressDelay` (milliseconds) to filter
as the user types.

## API

- `clearFilters()` - clears the filter inputs and resets the filters.
- `filterData()` - collects the current filter inputs into the query and reloads.
