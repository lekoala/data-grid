# Migrating from v2 to v3

Data Grid v3 is a major cleanup of the v2 API and architecture. The overall usage remains familiar, but some APIs and configuration formats have changed to make the grid more predictable, extensible and framework-independent.

This guide covers the main changes you should review when upgrading.

## Data loading

v3 introduces a dedicated `DataSource` abstraction.

Instead of configuring server behavior directly on the grid, provide a data source responsible for loading rows:

```js
grid.dataSource = new FetchDataSource("/api/users");
```

A data source receives the current query and returns a page result:

```js
{
    rows: [...],
    total: 120
}
```

Custom integrations can implement:

```js
load(query, { signal })
```

The query contains pagination, sorting and filters in a consistent format.

## Query parameters

The old server-specific configuration has been simplified.

The grid now works with a normalized query:

```js
{
    page: 1,
    pageSize: 20,
    sort: [
        { field: "name", dir: "asc" }
    ],
    filters: {
        status: {
            operator: "eq",
            value: "active"
        }
    }
}
```

If your backend used custom v2 parameters, adapt them in your `DataSource` rather than in the grid itself.

## Filters

Filters are now structured and support explicit operators.

```js
{
    age: {
        operator: "gte",
        value: 18
    }
}
```

Supported operators include equality, comparison, text matching, ranges, lists and empty/not-empty checks.

Code relying on v2 filter shorthand should be updated to the structured `{ operator, value }` format.

## Selection

Selection is now managed by the grid core instead of being primarily plugin state.

Useful APIs include:

```js
grid.getSelectionState();
grid.isRowSelected(row);
grid.selectRow(row);
grid.deselectRow(row);
grid.toggleRow(row);
grid.selectAllVisible();
grid.clearSelection();
```

Rows should have a stable identifier. By default v3 uses:

```js
rowKey: "id"
```

A custom key or resolver can be configured when needed.

Selection can also represent “all rows except these IDs”, which makes server-paginated bulk selection possible without loading the entire dataset.

## Plugins

v3 has a formal plugin lifecycle.

Plugins should extend `BasePlugin` and use lifecycle hooks such as:

```js
connected()
disconnected()
beforeLoad()
afterLoad()
extendColumns()
beforeRender()
afterRender()
```

Custom v2 plugins that directly patched grid internals should be migrated to these hooks where possible.

## Cell rendering and actions

Rendering is now independent from Bootstrap, Font Awesome or other UI frameworks.

Columns can provide a renderer:

```js
{
    field: "name",
    renderCell(value, row) {
        return value;
    }
}
```

Renderers may return text or DOM nodes.

Row and bulk actions are also configuration objects rather than framework-specific markup.

```js
{
    name: "edit",
    label: "Edit",
    intent: "primary"
}
```

Themes decide how intents and controls are displayed.

## Editing

Editing is intentionally smaller and more explicit in v3.

Editable columns can define validation, while the grid exposes a simple edit lifecycle:

* start
* validate
* commit
* reject/cancel

Applications requiring complex forms should continue handling those outside the grid rather than treating the table as a full form framework.

## Styling and themes

v3 removes the previous Sass-based styling approach.

The core ships neutral CSS based on `--dg-*` custom properties, with optional themes layered on top.

If you customized v2 Sass variables or Bootstrap-specific selectors, migrate those changes to CSS custom properties and the new `.dg-*` hooks.

Do not rely on the internal DOM structure more than necessary.

The v2 `expand=true` option made a row click toggle cell wrapping. There is no
direct replacement in v3: wrapping is a permanent layout policy, not a row
disclosure interaction. Use `column.wrap: true` for columns that contain long
text, or the grid-wide `wrap: true` when every data column should wrap. For real
expandable content, use the `RowDetails` plugin through the `rowDetails`
renderer option.

## Accessibility

v3 relies much more on native HTML semantics.

In particular:

* the grid uses a native `<table>`;
* sortable headers use buttons and `aria-sort`;
* pagination uses native disabled controls and accessible labels;
* unnecessary ARIA grid roles and manually managed cell focus have been removed.

Custom renderers should preserve these native semantics whenever possible.

## Recommended migration approach

For most applications, migrate in this order:

1. Update the grid initialization and data source.
2. Adapt backend query parameters.
3. Convert filters to the structured format.
4. Configure a stable `rowKey` and review selection code.
5. Migrate custom renderers and actions.
6. Update custom plugins to the v3 lifecycle.
7. Replace v2 Sass/theme overrides with v3 CSS variables and selectors.
8. Review any code depending on internal DOM structure or private grid state.

v3 intentionally provides a smaller and more explicit public surface. When migrating, prefer the documented API over reproducing v2 internal behavior.
