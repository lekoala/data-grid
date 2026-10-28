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
| `updateLabels()`             | the grid refreshes its translated labels     |
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

| Plugin             | Option                        | What it does                                                               |
|--------------------|-------------------------------|----------------------------------------------------------------------------|
| `SelectableRows`   | `selectable` / `singleSelect` | checkbox/radio selection column                                            |
| `BulkActions`      | `bulkActions`                 | bulk action bar for the selection                                          |
| `RowActions`       | `actions`                     | inline actions; native popover menu when supported                         |
| `ResponsiveGrid`   | `responsive`                  | hide/show columns by priority when the grid runs out of room               |
| `RowDetails`       | `rowDetails`                  | expandable application-rendered content below a row                        |
| `ColumnResizer`    | `resizable`                   | drag-to-resize column handlers                                             |
| `DraggableHeaders` | `reorder`                     | drag-and-drop column reordering                                            |
| `ContextMenu`      | `menu`                        | pointer Popover to toggle columns; native context-menu fallback            |
| `EditableColumn`   | `editable` columns            | inline editing (see `docs/editing.md`)                                     |
| `FixedHeight`      | `autoheight`                  | fills the table height on the last page                                    |
| `AutosizeColumn`   | `autosize`                    | sizes widthless columns to the widest cell of the loaded page              |
| `SaveState`        | `saveState`                   | persists query + column order, explicit visibility and user-resized widths |

`SaveState` requires an explicit, stable `id` on the `<data-grid>` element (or
the constructor `id` option). State persistence is disabled with a warning when
the component has only its automatically generated runtime id.

The persisted column array keeps the current order and a `hidden` flag for every
base column; `width` is stored per column only once the user actually resized it
(the array order is the column order). Columns added to the schema later are
kept in their authored position on restore.

`columnResized` includes the stable column `id`, the legacy `col` field name
and the `width` string. SaveState tracks resized widths by `id`, including
columns rendered with an `id` and no `field`.

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

`ColumnResizer` tracks Pointer Events with pointer capture, so mouse and touch
both resize (coarse pointers get a wider hit area). `ColumnResizer` and
`DraggableHeaders` are deliberately pointer-driven with no keyboard or ARIA
alternative: set widths through `column.width` and order through the
`options.columns` array followed by `renderTable()` instead — both are
persisted by `SaveState`.

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

### Dialog display

`detailsDisplay: "dialog"` (attribute `details-display="dialog"`) opens the
same feature in a modal `<dialog>` instead of an inline row. It is one of two
values, `"inline"` (default) or `"dialog"`, and it is initial-only like
`loading`: set it before the grid connects or from the constructor. A later
change is ignored, with a debug warning.

```html
<data-grid src="/api/users" responsive details-display="dialog"></data-grid>
```

`rowDetails` is optional in dialog mode. Without it, the grid composes a
**record sheet** from its own columns, in `grid.getColumns()` order:

- included: columns with a `field`, not `virtual`, not `attr`, and not
  `hidden: true` — so visible and responsive-hidden columns;
- excluded: `hidden: true` columns (even when editable), virtual columns such as
  `$actions`, `attr` columns, and columns without a `field` — even when they
  define a `renderCell`, since a computed display column is not row data;
- label: `column.title || column.field`;
- value: `column.renderCell` when present, otherwise the default renderer
  (transform, format and declarative cell templates included).

The sheet reuses the table renderers, so keep `renderCell` pure as for any body
rerender. A renderer that returns a node already attached to the table gets a
clone in the sheet; the row keeps its own cell. The sheet context has no `tr`
(unlike a body cell), so a renderer or formatter that reads `ctx.tr` must handle
its absence.

When `rowDetails` is also configured, it is **appended after** the sheet in the
same scrollable body (`.dg-details-app`). It complements the sheet: do not repeat
fields the sheet already displays. When the renderer returns nothing, only the
sheet remains.

Behavior and limits:

- one dialog per grid and one session at a time: `expand()` on another row
  closes the previous one, then opens the new one; `expand()` on the row already
  open is a no-op and does not refresh the snapshot;
- `expand(rowKey)`, `collapse(rowKey)`, `toggle(rowKey)`, `isExpanded(rowKey)` and
  `collapseAll()` keep working; there is no `openDialog()` method;
- `rowDetailsToggle` fires `{ row, rowKey, expanded }` on open and on close
  (button, Escape or `collapse()`); disconnecting closes silently;
- `Escape` and the close button end the session. The backdrop does not close the
  dialog in this version;
- a body rerender (sort, filter, page change) does not close it: the content is
  a snapshot taken at open time. The same holds for `refresh()` or a replaced
  `dataSource`, even when the row disappears; `isExpanded()` keeps reporting the
  session until it closes;
- the dialog is a direct child of `<data-grid>`, outside `.dg-scroll`, so it
  inherits the grid theme tokens even in the top layer;
- a grid without a stable `rowKey` falls back to the row index for the sheet; a
  stable key is strongly recommended;
- the grid does not stack dialogs. If the application opens its own dialog (a
  full edit form, for example), close the grid one first.

`detailsDisplay: "dialog"` requires the `RowDetails` plugin; the
batteries-included entry registers it. Without the plugin the option is inert
and responsive keeps its own toggle.

### Combining responsive columns and a dialog

In dialog mode `ResponsiveGrid` yields its disclosure control to `RowDetails`
(one chevron per row) and no longer seeds a responsive child row, including with
`responsiveStartOpen: true`: the hidden values are already in the sheet.

- `responsiveStartOpen` is ignored in dialog mode;
- `rowDetailsStartOpen` is ignored in dialog mode;
- `responsiveToggle: false` still leaves the single `RowDetails` control and the
  sheet keeps the hidden values;
- the mode cannot switch at runtime, so an inline/dialog toggle is not offered.

### Application content

Application content is responsible for its own typography and colors. The grid
draws the sheet labels (`.dg-details-list dt`) and keeps the value cells quiet,
so a `renderCell` badge (or a declarative cell template) looks the same in the
table and in the sheet.


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
