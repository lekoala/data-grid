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

`registerPlugins` takes a map of constructors keyed by name; the core calls
`new Plugin(grid)` for every grid instance.

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

| Plugin             | Option                        | What it does                            |
|--------------------|-------------------------------|-----------------------------------------|
| `SelectableRows`   | `selectable` / `singleSelect` | checkbox/radio selection column         |
| `BulkActions`      | `bulkActions`                 | bulk action bar for the selection       |
| `RowActions`       | `actions`                     | row actions column                      |
| `ResponsiveGrid`   | `responsive`                  | hide/show columns by priority when the grid runs out of room |
| `RowDetails`       | `rowDetails`                  | expandable application-rendered content below a row |
| `ColumnResizer`    | `resizable`                   | drag-to-resize column handlers          |
| `DraggableHeaders` | `reorder`                     | drag-and-drop column reordering         |
| `ContextMenu`      | `menu`                        | right-click menu to toggle columns      |
| `EditableColumn`   | `editable` columns            | inline editing (see `docs/editing.md`)  |
| `FixedHeight`      | `autoheight`                  | fills the table height on the last page |
| `AutosizeColumn`   | `autosize`                    | computes column widths from the data    |
| `SpinnerSupport`   | `spinnerClass`                | shows a spinner while loading           |
| `SaveState`        | `saveState`                   | persists query + column state           |
| `TouchSupport`     | -                             | swipe to change page                    |

The batteries-included entry (`data-grid.js`) registers them all and defines the
`<data-grid>` element.

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
additional application content. Keep the plugins independent and use the
start-open responsive presentation when both are enabled:

```js
const grid = new DataGrid({
    responsive: true,
    responsiveStartOpen: true,
    responsiveToggle: false,
    rowDetails: ({ row }) => renderCustomerActivity(row),
});
```

On narrow grids, hidden column values remain visible in a stacked child row and
the row-details chevron is the only disclosure control. Setting
`responsiveToggle: true` remains supported when two independent controls are
intentionally required.
