# Filtering

Set `filterable` on the grid to show a filter row under the headers. Text inputs
filter with `contains`, select inputs with `eq`. Change a column's input mode
with `filterType`.

## Preferred filter modes

The effective mode of a column resolves as:

```text
column.filterType explicit
    > formatter-derived hint (when format is set)
    > "text"
```

| Mode      | Control                            | Applied operator                                                  |
|-----------|------------------------------------|-------------------------------------------------------------------|
| `text`    | text input                         | `contains`                                                        |
| `select`  | select (see options below)         | `eq`                                                              |
| `boolean` | tri-state select: empty / Yes / No | `eq` on normalized booleans (`true` matches `1`, `"1"`, `"true"`) |
| `number`  | numeric text input                 | `contains` on the stringified value (typing `12` matches `129.9`); percent divides by 100 (`20`→`0.2`) |
| `date`    | text input accepting partial dates | `startsWith` on the canonical ISO value                           |

Notes:

- A `format: "boolean"` column gets the tri-state select automatically; a
  boolean formatter value and its filter share the same normalization, so what
  displays as ✓ is exactly what "Yes" matches.
- `filterMultiple: true` on a `select` column swaps the native control for a
  checkbox panel emitting an `in` filter - see "Multiple select" below. It is
  ignored for other modes (a multi boolean would degenerate into no filter).
- The `date` mode matches the canonical contract of the date formatter:
  `2026`, `2026-08` and `2026-08-26` all prefix-match. The placeholder is
  `YYYY-MM-DD` unless `filterPlaceholder` is set.
- `datetime` deliberately keeps a plain text filter: prefixing the raw instant
  can disagree with the displayed local date, and that semantics is not defined
  yet.
- A `format: "number"` column with `formatOptions.style: "percent"` is the only
  numeric case whose displayed scale differs from the raw value. The filter still
  runs in number mode as a substring match, but the typed value is divided by 100
  before the query: typing `20` matches the raw `0.2`. The control shows the
  visible scale (placeholder `%`), and a restored query multiplies back by 100
  (`0.2` displays as `20`).
- An explicit `filterType` always wins; custom `renderFilterCell` implementations
  remain the top escape hatch.

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

| Operator     | Behavior                                                                           |
|--------------|------------------------------------------------------------------------------------|
| `eq`         | a boolean value compares normalized booleans (`true` matches `1`, `"1"`, `"true"`) |
| `neq`        | negation of `eq`                                                                   |
| `contains`   | case-insensitive substring                                                         |
| `startsWith` | case-insensitive prefix                                                            |
| `endsWith`   | case-insensitive suffix                                                            |
| `lt` / `lte` | numeric when both operands are finite, otherwise string compare                    |
| `gt` / `gte` | numeric when both operands are finite, otherwise string compare                    |
| `between`    | inclusive range, requires a 2-value array                                          |
| `in`         | value in a list                                                                    |
| `empty`      | value is `null`, `undefined` or `""`                                               |
| `notEmpty`   | negation of `empty`                                                                |

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

A column can opt out of filtering with `filterable: false` (it keeps its empty
filter cell so the row stays aligned, but renders no control). A column without
`filterable` inherits the grid-wide `filterable` option.

## Filter options for select columns

`getFilterOptions(column)` resolves the options of a select filter, in this order:

1. `column.filterList` - an explicit list of `{ value, text }` (authoritative).
2. `meta.filters[field]` - options provided by the server (server-first).
3. `ArrayDataSource` rows - the unique values of the column.

It never derives options from the currently loaded page, so a server grid must
either set `filterList` or return `meta.filters`.

## Multiple select

A select column can accept several values with `filterMultiple: true`. The
native `<select>` is replaced by a compact control summarizing the selection
("Belgium, France +1") that opens a checkbox panel reusing the context menu
presentation:

```js
{
    field: "country",
    filterType: "select",
    filterMultiple: true,
}
```

The contract follows the mode, not the cardinality:

- Checked boxes emit `{ operator: "in", value: ["BE", "FR"] }` - always `in`,
  even when a single value is checked.
- An empty selection means no filter at all: the entry is dropped from the
  query instead of matching nothing.
- Each change applies immediately, like single selects, and resets the page to
  1. `Escape` closes the panel, a click outside closes and keeps it applied.
- Options resolve through `getFilterOptions()` like single selects, but
  empty-valued options ("All", placeholders) are never rendered: an empty
  value cannot participate in a set.
- Restore works both ways: an `in` initial query checks the matching boxes,
  and `clearFilters()` unchecks them.

Server grids receive the array through the standard bracket encoding
(`filters[country][value][0]=BE`), and `ArrayDataSource` matches it natively.

## Live filtering

Text filters apply live, debounced by `filterDelay` (default 300 ms) so rapid
typing triggers a single request. The `input` event drives the debounce; the
value is only committed to the query (and the page reset to 1) when the filter
is actually applied.

```js
new DataGrid({
    filterable: true,
    filterDelay: 300, // 0 = apply on every keystroke
});
```

Shortcuts and special cases:

- `Enter` applies the filter immediately, cancelling any pending debounce.
- `Escape` clears the field and applies immediately.
- Select filters apply immediately on `change`.
- IME composition (CJK…) is ignored until `compositionend`, so no filter runs on
  intermediate fragments.

## Global search vs column filters

The global `search` is a separate concept from column `filters`: they combine
with `AND`. The server decides which fields the search covers (see
`docs/server-data.md`), while column filters constrain explicit fields. The
search input is shown with `searchable: true` and gated by `minSearchLength`
(an empty value clears the search, a non-empty value below the minimum keeps the
current results).

Clearing works precisely:

- `clearSearch()` - global search only.
- `clearFilters()` - column filters only.
- `resetQuery()` - search + filters + sort + page.

## API

- `clearFilters()` - clears the filter inputs and resets the filters.
- `filterData()` - collects the current filter inputs into the query and reloads.
- `setSearch(value)` / `clearSearch()` - set / clear the global search.
- `resetQuery()` - restores the initial query state.
