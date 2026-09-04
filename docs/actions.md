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

| Property   | Type                                                   | Description                                     |
|------------|--------------------------------------------------------|-------------------------------------------------|
| `name`     | `String`                                               | the action name (`button[data-action]`)         |
| `label`    | `String`                                               | the button label and accessible name            |
| `intent`   | `"default"\|"primary"\|"danger"`                       | sets `data-intent` (styled via `dg-intent-*`)   |
| `href`     | `String \| Function`                                   | renders an `<a>` link                           |
| `class`    | `String`                                               | class on the button                             |
| `visible`  | `(row, ctx) => Boolean`                                | hide the action for a given row                 |
| `disabled` | `Boolean \| (row, ctx) => Boolean`                     | block the action (see below)                    |
| `render`   | `({ action, row, grid }) => content`                   | replace the button content                      |
| `confirm`  | `Boolean \| String \| (row, ctx) => Boolean \| String` | ask for confirmation before dispatching         |
| `default`  | `Boolean`                                              | the primary action of the row (see "Row click") |

`visible`, `disabled`, `href` and `confirm` receive `(row, ctx)` with
`ctx = { grid, action, rowKey }` (a single `row` argument still works).

`disabled` actions really block: buttons get a native `disabled`, every element
gets `aria-disabled` and the `dg-disabled` class, and the click is prevented
without dispatching — including on `<a>` and custom renderers.

`confirm` accepts a boolean (generic `areYouSure` label), a message string, or
a resolver returning a message string (or `false` to skip confirmation).

## Inline and collapsed presentation

One or two actions render inline by default. More actions, or
`collapseActions: true`, use a shared native Popover attached to the `⋯` invoker
when the Popover API is available. The browser owns top-layer rendering, light
dismissal, Escape and focus return; `@lekoala/floating` keeps the menu aligned
with the invoker while the grid or page scrolls and flips it back inside the
viewport when there is no room below.

This is progressive enhancement only. A browser without Popover renders every
available action inline; no action is hidden behind an unsupported menu and no
positioning fallback is installed.

## Row click

The `rowClick` option controls what clicking a data row does:

- `"action"` (default) — runs the row's `default` action.
- `"select"` — toggles the row selection (requires `selectable`).
- `"none"` — rows have no click behavior at all.

```js
const grid = new DataGrid({
    rowClick: "action",
    actions: [
        { name: "edit", label: "Edit", default: true },
        { name: "delete", label: "Delete", intent: "danger" },
    ],
});
```

`default: true` answers a different question than `rowClick`: it marks which
action is the *primary* action of a row. Only the first resolved `default` per
row applies, and it is resolved per row, so `row.$actions` can give a different
default action to each row. When `rowClick: "action"` activates it, the rendered
action element itself is clicked, so `href` navigation, `confirm`, `disabled`
and the `action` event all behave exactly as if the button or link was clicked.

A click inside a row never triggers the behavior when it originates from an
interactive element or an opt-out subtree:

```text
a, button, input, select, textarea,
[contenteditable]:not([contenteditable="false"]), [data-row-click-ignore]
```

A disabled `default` action keeps its `data-dg-default-action` marker (the row
click stays blocked by the existing disabled guard), but the row is not given
`dg-clickable-row`: the cursor only promises an interaction that actually works.

`[data-row-click-ignore]` is an escape hatch for custom renderers:

```html
<span data-row-click-ignore>…</span>
```

The whole composed path is inspected, so a control inside a shadow root still
counts as interactive.

Before the automatic behavior, a cancelable `rowClick` event fires on the grid:

```js
grid.addEventListener("rowClick", (ev) => {
    // { row, rowKey, rowIndex, originalEvent }
    if (ev.detail.row.locked) {
        ev.preventDefault(); // veto the row click behavior
    }
});
```

`rowClick` is a configuration concern; business rules belong in the event.

`grid.actionRenderer` applies a global renderer to every action that has no
`render`. Renderer content may be a `Node`, a string, or `{ html }`. An `href`
supports `{field}` interpolation or a `(row, ctx) => url` function. Interpolated
values are percent-encoded as URL components; use the function form to build a
complete URL. Unsafe executable protocols (`javascript:`, `data:`, `vbscript:`)
are rendered as non-navigating buttons.

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
The `$actions` column aligns to the end of the reading axis by default: right in
LTR and left in RTL.
