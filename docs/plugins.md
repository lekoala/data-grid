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
import { BasePlugin } from "data-grid-component/src/core/base-plugin.js";

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
        noSort: true,
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
