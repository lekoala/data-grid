# Plugins

The core knows `Plugin`, never a specific plugin name. Plugins are optional and
decoupled: register them once, the core instantiates one per grid.

## The plugin contract

Any object exposing one of these methods is a plugin (duck typing):

| Hook                         | Called when                                  |
|------------------------------|----------------------------------------------|
| `connected()`                | the grid connects (`_connected`)             |
| `disconnected()`             | the grid disconnects                         |
| `extendColumns(columns)`     | before a render, to inject/configure columns |
| `beforeRender()`             | before a render cycle                        |
| `afterRender(context)`       | after a render (`"table"` or `"body"`)       |
| `responsiveChanged(enabled)` | the `responsive` option changes              |
| `saveStateChanged(enabled)`  | the `saveState` option changes               |

```js
import { DataGrid } from "data-grid-component";
import BasePlugin from "data-grid-component/plugin";

class MyPlugin extends BasePlugin {
    afterRender(context) {
        if (context === "body") {
            console.log("rows rendered", this.grid.rows.length);
        }
    }
}

DataGrid.registerPlugins({ MyPlugin });
```

`registerPlugins` merges a map of constructors keyed by name into the current
registry; an existing name is overwritten. The core calls `new Plugin(grid)`
for every grid instance. `registeredPlugins()` returns a snapshot, so changing
the returned object does not alter future grids.

## Plugin-facing grid API

Built-in and third-party plugins may use the following stable grid operations:

- `grid.ownsControl(element)` checks that an event target belongs to this grid
  rather than to a nested grid.
- `grid.getColumns()` reads the normalized columns for the current render cycle.
- `grid.getPlugin(name)` reads another instantiated plugin when composing features.
- `grid.syncColumnVisibility()` reconciles header, filter and body cells after a
  plugin changes column visibility.
- `grid.query` reads a snapshot of the current query state.
- `grid.restoreQuery(query)` replaces the runtime query before the first load
  without triggering a refresh.

Other underscored members and internal state are implementation details. A
plugin should use the documented lifecycle hooks and operations above instead
of reaching into `_...` members.

## Virtual columns

A plugin can inject columns through `extendColumns`. Columns added by plugins
use `virtual: true`, a stable `id` prefixed with `$`, a `position`
(`"start"` or `"end"`) and their own renderers:

```js
extendColumns(columns) {
    columns.unshift({
        id: "$myColumn",
        virtual: true,
        position: "start",
        sortable: false,
        renderHeaderCell: (th) => (th.textContent = ""),
        renderCell: (ctx) => document.createTextNode(String(ctx.rowIndex + 1)),
    });
}
```

The core creates the `<th>`/`<td>` and their structural attributes
(`data-column-id`, `scope`); renderers only fill them.

## Built-in plugins

| Plugin             | Option                        | What it does                                                    |
|--------------------|-------------------------------|-----------------------------------------------------------------|
| `SelectableRows`   | `selectable` / `singleSelect` | checkbox/radio selection column                                 |
| `BulkActions`      | `bulkActions`                 | bulk action bar for the selection                               |
| `RowActions`       | `actions`                     | inline actions; native popover menu when supported            |
| `ResponsiveGrid`   | `responsive`                  | hide/show columns by priority when the grid runs out of room    |
| `RowDetails`       | `rowDetails`                  | expandable application-rendered content below a row             |
| `ColumnResizer`    | `resizable`                   | drag-to-resize column handlers                                  |
| `DraggableHeaders` | `reorder`                     | drag-and-drop column reordering                                 |
| `ContextMenu`      | `menu`                        | pointer Popover to toggle columns; native context-menu fallback |
| `EditableColumn`   | `editable` columns            | inline editing (see `docs/editing.md`)                          |
| `FixedHeight`      | `autoheight`                  | fills the table height on the last page                         |
| `AutosizeColumn`   | `autosize`                    | measures widthless columns when enabled (off by default)        |
| `SaveState`        | `saveState`                   | persists query + column visibility                              |

The batteries-included entry (`data-grid.js`) registers them all and defines the
`<data-grid>` element.

`ContextMenu` uses Popover for top-layer rendering, light dismissal and Escape
handling, while keeping the native context-menu coordinates. It only requires
Popover support; browsers without it do not receive `preventDefault()` and keep
their ordinary browser context menu.

`RowActions` uses a native Popover, kept aligned by `@lekoala/floating`, for its
compact `⋯` presentation. Unsupported browsers keep every action inline,
including when `collapseActions` is requested; no business action depends on
floating UI.

## Row details

`rowDetails` receives `{ row, rowKey, grid }` and may return the same content
types as a cell renderer. Its detail row is separate from `.dg-data-row`, so it
does not participate in pagination, sorting or selection.

```js
const grid = new DataGrid({
    rowDetails: ({ row }) => {
        const details = document.createElement("dl");
        details.textContent = `Notes: ${row.notes}`;
        return details;
    },
});

const details = grid.getPlugin("RowDetails");
details.expand("customer-42");
details.collapse("customer-42");
details.toggle("customer-42");
details.collapseAll();
```

Use `rowDetailsStartOpen: true` to seed rows open. A toggle dispatches
`rowDetailsToggle` with `{ row, rowKey, expanded }`.

### Combining responsive columns and row details

Responsive columns and row details have different roles: responsive columns
adapt the table representation to the available width, while row details reveal
additional application content. By default, they share the row-details
disclosure: one control opens or closes both sections.

To keep responsive values visible while application details remain independently
collapsible, use the start-open presentation without a responsive toggle:

```js
const grid = new DataGrid({
    responsive: true,
    responsiveStartOpen: true,
    responsiveToggle: false,
    rowDetails: ({ row }) => renderCustomerActivity(row),
});
```

On narrow grids, hidden column values remain visible in a stacked child row and
the row-details chevron controls only the application details. This is useful
when responsive values are part of the baseline record presentation rather than
optional content.
