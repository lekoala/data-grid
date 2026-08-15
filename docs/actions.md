# Row actions

Define actions in the `actions` option (the `RowActions` plugin adds an actions
column):

```js
const grid = new DataGrid({
    columns: [{ field: "name", title: "Name" }],
    actions: [
        {
            name: "edit",
            label: "Edit",
            intent: "primary",
            href: (row) => `/users/${row.id}`,
        },
        {
            name: "delete",
            label: "Delete",
            intent: "danger",
            confirm: true,
            visible: (row) => !row.protected,
        },
    ],
});
```

Listen to the `action` event:

```js
grid.addEventListener("action", (ev) => {
    // { data, action }
    console.log(ev.detail.data, ev.detail.action);
});
```

## Action properties

| Property   | Type                                 | Description                                      |
|------------|--------------------------------------|--------------------------------------------------|
| `name`     | `String`                             | the action name (`button[data-action]`)          |
| `label`    | `String`                             | the button label and accessible name             |
| `intent`   | `"default"\|"primary"\|"danger"`     | sets `data-intent` (styled via `dg-intent-*`)    |
| `href`     | `String \| Function`                 | renders an `<a>` link                            |
| `class`    | `String`                             | class on the button                              |
| `visible`  | `(row) => Boolean`                   | hide the action for a given row                  |
| `disabled` | `(row) => Boolean`                   | disable the action for a given row               |
| `render`   | `({ action, row, grid }) => content` | replace the button content                       |
| `confirm`  | `Boolean`                            | ask for confirmation before dispatching          |
| `default`  | `Boolean`                            | clicking anywhere on the row triggers the action |

`grid.actionRenderer` applies a global renderer to every action that has no
`render`. Renderer content may be a `Node`, a string, or `{ html }`. An `href`
supports `{field}` interpolation or a `(row) => url` function.

When `render` returns content such as an icon (`Node` or `{ html }`), `label`
stays the accessible name of the button `RowActions` creates. When a renderer
returns its own `<button>` or `<a>`, it controls the control and its accessible
semantics.

## Styling

Actions render as `<a>` when `href` is set, `<button>` otherwise, and follow the
`--dg-*` control tokens. `intent: "danger"` maps to the `--dg-danger-*` tokens.
