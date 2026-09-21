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

Text inputs fill their cell, hint at their interactivity with an underline on
hover and paint a full ring on focus; checkboxes show an outer outline on
keyboard focus. The cell itself stays neutral, and a rejected value keeps its
own invalid signal.

## Custom editor

For editors the built-in types cannot express (combobox, date picker,
autocomplete, textarea...), `column.renderEditor` replaces the built-in control
with an application-owned editor:

```js
{
    field: "doctor",
    title: "Doctor",
    editable: true,
    renderEditor({ value, commit, cancel }) {
        const input = createDoctorCombobox({ initial: value });
        input.addEventListener("pick", (ev) => commit(ev.detail.id));
        input.addEventListener("blur", () => cancel());
        return input;
    },
}
```

The editor only owns its presentation. The grid keeps ownership of coercion,
`column.validate` / `options.validate` and the cancelable `edit` event:

- `renderEditor` is used only when the column is `editable`; display unchanged
  (stays `format` / `renderCell` — the editor steps aside, it does not replace
  `renderCell`).
- The returned value follows the same `RenderContent` contract as `renderCell`.
- `commit(value)` validates and commits the given value. It resolves to `true`
  when the change was accepted (model mutated and `edit` dispatched), `false`
  when a validation failed or an `edit` listener called `preventDefault()`
  (the row is reverted). An unchanged value also resolves to `true`.
- `cancel()` abandons the edit without touching the row.

There is no `reject()` in this contract: how to signal an error back to the
user stays the editor's visual responsibility, backed by `commit(...) === false`.

