# Filtering

Set `filterable` on the grid to show a filter row under the headers. Text-based
inputs accept a minimal operator syntax, while select inputs use `eq`. Text
matching is case- and accent-insensitive by default. Change a column's input
mode with `filterType`.

## Preferred filter modes

The effective mode of a column resolves as:

```text
column.filterType explicit
    > formatter-derived hint (when format is set)
    > "text"
```

| Mode      | Control                            | Applied operator                                                  |
|-----------|------------------------------------|-------------------------------------------------------------------|
| `text`    | text input                         | `contains` by default; see text query syntax below                |
| `select`  | select (see options below)         | `eq`                                                              |
| `boolean` | tri-state select: empty / Yes / No | `eq` on normalized booleans (`true` matches `1`, `"1"`, `"true"`) |
| `number`  | numeric text input                 | `contains` by default; explicit operators like `>100`             |
| `date`    | text input accepting partial dates | exact period matching or explicit comparisons like `>2025`        |

Notes:

- A `format: "boolean"` column gets the tri-state select automatically; a
  boolean formatter value and its filter share the same normalization, so what
  displays as ✓ is exactly what "Yes" matches.
- `filterMultiple: true` on a `select` column swaps the native control for a
  checkbox panel emitting an `in` filter - see "Multiple select" below. It is
  ignored for other modes (a multi boolean would degenerate into no filter).
- The `date` mode uses canonical ISO fragments with real date semantics:
  `2026` means any date in 2026, `2026-08` means any date in August 2026, and
  `2026-08-26` means that exact day. Explicit comparisons resolve to real
  bounds, so `>2025` becomes `gt 2025-12-31` and `>=2025` becomes
  `gte 2025-01-01`. The placeholder is `YYYY-MM-DD` unless
  `filterPlaceholder` is set.
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

## Text query syntax

Plain text keeps the existing `contains` behavior. Text-based inputs, including
`number` filters, also accept a small expression syntax that maps directly to
`FilterState`:

| Input     | Operator        |
|-----------|-----------------|
| `alice`   | `contains`      |
| `!alice`  | `notContains`   |
| `=alice`  | `eq`            |
| `!=alice` | `neq`           |
| `>30`     | `gt`            |
| `>=30`    | `gte`           |
| `<30`     | `lt`            |
| `<=30`    | `lte`           |
| `ali%`    | `startsWith`    |
| `!ali%`   | `notStartsWith` |
| `%ice`    | `endsWith`      |
| `!%ice`   | `notEndsWith`   |
| `%lic%`   | `contains`      |
| `!%lic%`  | `notContains`   |

Operator prefixes win over `%` matching. For example, `=%ice` means an exact
match on the literal `%ice`, not `endsWith("ice")`.

Use `\` to keep the mini-language literal when a value starts with an operator
or ends with `%`: `\!jean`, `foo\%`, `\=foo`.

## Date query syntax

Date filters expect canonical ISO fragments and normalize them into explicit
date bounds that serialize cleanly for a server data source:

| Input        | Canonical filter state                 |
|--------------|----------------------------------------|
| `2025`       | `between ["2025-01-01", "2025-12-31"]` |
| `2025-08`    | `between ["2025-08-01", "2025-08-31"]` |
| `2025-08-26` | `eq "2025-08-26"`                      |
| `>2025`      | `gt "2025-12-31"`                      |
| `>=2025`     | `gte "2025-01-01"`                     |
| `<2025`      | `lt "2025-01-01"`                      |
| `<=2025`     | `lte "2025-12-31"`                     |

`datetime` is still excluded from this syntax: its display value is localized,
so comparing the raw instant as a date would still be misleading.

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

> Text comparisons are case- and accent-insensitive for `eq`, `neq`, `contains`,
> `notContains`, `startsWith`, `notStartsWith`, `endsWith`, `notEndsWith`, and
> `in`. Boolean `eq` also normalizes values like `true`, `1`, `"1"`, and
> `"true"`.

| Operator        | Behavior                                                       |
|-----------------|----------------------------------------------------------------|
| `eq`            | equality; booleans compare after normalization                 |
| `neq`           | negation of `eq`                                               |
| `contains`      | substring match                                                |
| `notContains`   | negation of `contains`                                         |
| `startsWith`    | prefix match                                                   |
| `notStartsWith` | negation of `startsWith`                                       |
| `endsWith`      | suffix match                                                   |
| `notEndsWith`   | negation of `endsWith`                                         |
| `lt` / `lte`    | numeric if both operands are finite, otherwise lexical compare |
| `gt` / `gte`    | numeric if both operands are finite, otherwise lexical compare |
| `between`       | inclusive range, requires a 2-value array                      |
| `in`            | matches any value in a list                                    |
| `empty`         | `null`, `undefined`, or empty string                           |
| `notEmpty`      | negation of `empty`                                            |

`0` and `false` are real values: they are preserved and only `empty`/`notEmpty`
match against missing values. Invalid or empty filter values are ignored, not
treated as "match nothing".

Server data sources should apply equivalent case- and accent-insensitive
semantics for textual operators (`eq`, `contains`, `startsWith`, `endsWith`,
`in` and their negations).

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

A select column can accept several values with `filterMultiple: true` when the
browser supports the native Popover API and CSS Anchor Positioning. The native
`<select>` is then replaced by a compact control summarizing the selection
("Belgium, France +1") that opens a checkbox panel:

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
  1. Native Popover closes on `Escape`, outside click, or another auto popover,
  and restores focus to its trigger.
- Options resolve through `getFilterOptions()` like single selects, but
  empty-valued options ("All", placeholders) are never rendered: an empty
  value cannot participate in a set.
- Restore works both ways: an `in` initial query checks the matching boxes,
  and `clearFilters()` unchecks them.

Server grids receive the array through the standard bracket encoding
(`filters[country][value][0]=BE`), and `ArrayDataSource` matches it natively.

On browsers without all required capabilities, `filterMultiple` deliberately
degrades to the ordinary native single select. It emits the normal `eq` query
operator and remains filterable one value at a time; no `in` query should be
assumed for every browser.

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
