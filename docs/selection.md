# Selection

`selectable: true` adds a checkbox column (`SelectableRows` plugin). Set
`singleSelect: true` for radio buttons instead (implies `selectable`).

## Selection state

Selection is server-first and lives in the core as a `SelectionState`:

```js
// explicit: the selected row keys are in `ids`
{ mode: "explicit", ids: Set(["1", "2"]), except: Set() }

// all: every matching row is selected except the ones in `except`
{ mode: "all", ids: Set(), except: Set(["3"]) }
```

`selectAll()` on the last page uses `mode: "all"`, so a select-all across server
pages only needs the keys of the rows you want to exclude.

Row keys come from the `rowKey` option (`"id"` by default), either a field name
or a function `(row) => key`.

## API

```js
grid.isRowSelected(row, index)  // boolean
grid.getSelectionState()        // { mode, ids, except } snapshot
grid.selectRow(row, index)
grid.deselectRow(row, index)
grid.toggleRow(row, index)
grid.selectAll()                // visible page, or everything when selectVisibleOnly is false
grid.clearSelection()
```

`getSelection(...keys)` is a page-local convenience: with no keys it returns the
selected row objects of the current page, with one key an array of values, with
several keys an array of objects.

## Events

```js
grid.addEventListener("selectionChange", (ev) => {
    console.log(ev.detail.selectionState);
});
```

The core owns the `tr[data-selected]` state attribute; the plugin only renders
the checkboxes.

## Bulk actions

`bulkActions` adds a bar with one button per action, shown when something is
selected:

```js
const grid = new DataGrid({
    selectable: true,
    bulkActions: [
        { name: "archive", label: "Archive", intent: "danger" },
    ],
});

grid.addEventListener("bulkAction", (ev) => {
    // { action, selection, query }
    console.log(ev.detail.action, ev.detail.selection, ev.detail.query);
});
```

Unlike row actions, a bulk action receives the whole `SelectionState` and the
current `QueryState`, so it can act server-side on any number of rows.
