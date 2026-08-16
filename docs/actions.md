# Row actions

Row actions are the standard entry point for business mutations on a row.
Define them in the `actions` option (the `RowActions` plugin adds an actions
column), or drive them from the server with `row.$actions` / `meta.actions`.

```js
const grid = new DataGrid({
    columns: [{ field: "name", title: "Name" }],
    actions: [
        {
            name: "edit",
            label: "Edit",
            intent: "primary",
            href: (row, ctx) => `/users/${row.id}`,
        },
        {
            name: "delete",
            label: "Delete",
            intent: "danger",
            confirm: (row) => `Delete ${row.name}?`,
            visible: (row) => !row.protected,
        },
    ],
});
```

Listen to the `action` event, perform the business operation, then mutate the
row in place (`updateRow`) or reload:

```js
grid.addEventListener("action", async (ev) => {
    const { action, name, row, rowKey, trigger } = ev.detail;

    if (name === "approve") {
        trigger.disabled = true;
        try {
            const result = await approve(rowKey);
            grid.updateRow(rowKey, { status: result.status });
        } finally {
            trigger.disabled = false;
        }
    }

    if (name === "delete") {
        await api.delete(rowKey);
        grid.removeRow(rowKey); // local dataset only; for remote: grid.refresh()
    }
});
```

## The `action` event

```js
grid.addEventListener("action", (ev) => {
    // { action, name, row, rowKey, rowIndex, trigger }
    console.log(ev.detail.action.intent, ev.detail.row, ev.detail.rowKey);
});
```

- `action` - the resolved action descriptor.
- `name` - `action.name` shorthand.
- `row` / `rowKey` / `rowIndex` - the target row and its stable key.
- `trigger` - the `<button>`/`<a>` actually clicked, useful to show a loading
  state. DataGrid itself never performs HTTP.

## Action properties

| Property   | Type                                                | Description                                      |
|------------|-----------------------------------------------------|--------------------------------------------------|
| `name`     | `String`                                            | the action name (`button[data-action]`)          |
| `label`    | `String`                                            | the button label and accessible name             |
| `intent`   | `"default"\|"primary"\|"danger"`                    | sets `data-intent` (styled via `dg-intent-*`)    |
| `href`     | `String \| Function`                                | renders an `<a>` link                            |
| `class`    | `String`                                            | class on the button                              |
| `visible`  | `(row, ctx) => Boolean`                             | hide the action for a given row                  |
| `disabled` | `Boolean \| (row, ctx) => Boolean`                  | block the action (see below)                     |
| `render`   | `({ action, row, grid }) => content`                | replace the button content                       |
| `confirm`  | `Boolean \| String \| (row, ctx) => Boolean \| String` | ask for confirmation before dispatching      |
| `default`  | `Boolean`                                           | clicking anywhere on the row triggers the action |

`visible`, `disabled`, `href` and `confirm` receive `(row, ctx)` with
`ctx = { grid, action, rowKey }` (a single `row` argument still works).

`disabled` actions really block: buttons get a native `disabled`, every element
gets `aria-disabled` and the `dg-disabled` class, and the click is prevented
without dispatching — including on `<a>` and custom renderers.

`confirm` accepts a boolean (generic `areYouSure` label), a message string, or
a resolver returning a message string (or `false` to skip confirmation).

A `default` action attaches a click handler to the whole row. Only the first
resolved `default` per row applies, and interactive elements
(`a, button, input, select, textarea`) never trigger it.

`grid.actionRenderer` applies a global renderer to every action that has no
`render`. Renderer content may be a `Node`, a string, or `{ html }`. An `href`
supports `{field}` interpolation or a `(row, ctx) => url` function.

## Server-driven actions

The actions column is a capability: it activates when `options.actions` is
non-empty, when `rowActions: true` (or the `row-actions` attribute) is set, or
when a declarative `<th data-actions>` is present.

`getActionsForRow(row)` resolves the actions of a row at render time:

```text
meta.actions           server definitions (base)
    overridden by
options.actions        client definitions (functions, renderers)
    overridden by
row.$actions           per-row availability + overrides
```

- `row.$actions !== undefined` is authoritative: only the listed actions are
  available (a `$actions: []` row gets no action buttons).
- Items are resolved against the definitions: a `String` is a lookup by name,
  an `Object` is merged over the definition of the same name.
- A row without `$actions` falls back to `options.actions`.

```json
{
    "rows": [
        { "id": 42, "name": "Jean", "$actions": ["view", "delete"] }
    ],
    "total": 142,
    "meta": {
        "actions": {
            "view": { "label": "View", "href": "/users/{id}" },
            "delete": { "label": "Delete", "intent": "danger", "confirm": true }
        }
    }
}
```

Server/HTML actions only carry serializable properties: `name`, `label`,
`intent`, `href`, `disabled` (boolean), `confirm` (boolean|string), `default`
and `class`. Functions (`visible`, `disabled`, `confirm`, `render`) stay
JavaScript-side via `options.actions`.

## Local mutations

`grid.updateRow(rowKey, patch)` merges the patch into the matching row of the
current page and re-renders — it works with any data source and never reloads
(so a server grid reflects a business mutation without a second request).

`grid.removeRow(rowKey)` removes the row from a mutable local dataset
(`ArrayDataSource`) and re-applies the query. With a remote data source it
returns `false`: refresh after a server-side deletion.

```js
await api.delete(rowKey);
await grid.refresh();
```

## Styling

Actions render as `<a>` when `href` is set, `<button>` otherwise, and follow the
`--dg-*` control tokens. `intent: "danger"` maps to the `--dg-danger-*` tokens.
