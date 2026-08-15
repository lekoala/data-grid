# Inline editing

Mark a column `editable` and the `EditableColumn` plugin replaces its cells with
inputs.

```js
const grid = new DataGrid({
    columns: [
        { field: "email", title: "Email", editable: true, editableType: "email" },
    ],
});
```

## Lifecycle

`start (focus) -> edit -> validate -> commit/reject`

- Enter (or blur) commits the value.
- Escape rejects the edit and restores the previous value.
- The edit mutates `row[field]` and dispatches a cancelable `edit` event.

## Validating

`column.validate(value, { row, column, grid })` returns `true`, `false` or an
error message. A grid-level `validate` option is used as a fallback for columns
without one. On failure the cell gets `td[data-invalid]` with the message in
`title`, and the value is reverted.

```js
{
    field: "email",
    title: "Email",
    editable: true,
    validate: (value) => /\S+@\S+\.\S+/.test(value) ? true : "Invalid email",
}
```

## Committing

Listen to the `edit` event and call `preventDefault()` to reject the change (the
row is reverted):

```js
grid.addEventListener("edit", (ev) => {
    // { data, value, field, column }
    console.log(ev.detail.data, ev.detail.field, ev.detail.value);
});
```

A rejected edit fires no event. See `demo/server.html` for a sample that saves
the change back to the server.
