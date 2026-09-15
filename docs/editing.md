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

## Select

`editableType: "select"` renders a `<select>` fed by `editableOptions`
(`{ value, label }`, a plain string uses the same text twice):

```js
{
    field: "status",
    title: "Status",
    editable: true,
    editableType: "select",
    editableOptions: [
        { value: "paid", label: "Paid" },
        { value: "unpaid", label: "Unpaid" },
    ],
}
```

- The choice commits on `change` with the same validation and cancelable
  `edit` event as inputs, including numeric coercion of the model value.
- The current value is reflected as `data-value` on the control, so per-value
  styling needs no extra hook:

```css
select.dg-editable[data-value="paid"] { ... }
select.dg-editable[data-value="unpaid"] { ... }
```

- Enter/Escape keep their native select behavior (pick/close the listbox);
  there is never a pending state to reject. See `demo/actions.html` for a
  colored status sample.

## Checkbox

`editableType: "checkbox"` renders a checkbox for boolean models,
centered with `align: "center"`:

```js
{ field: "active", title: "Active", align: "center", editable: true, editableType: "checkbox" }
```

- The toggle commits on `change` with the same validation and cancelable
  `edit` event; the event carries a real boolean (`validate` sees the raw
  `"true"`/`"false"` string, like numbers).
- Space keeps its native toggle behavior; there is never a pending state to
  reject. Style with `:checked`; no `data-value` reflection needed.

## Affordance

Editable cells hint at their interactivity on hover (a neutral inset frame);
while editing, only the control ring speaks, and a rejected value keeps its
own invalid signal.

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
