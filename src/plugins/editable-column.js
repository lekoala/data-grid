import BasePlugin from "../core/base-plugin.js";
import addSelectOption from "../utils/addSelectOption.js";
import { dispatch } from "../utils/dispatch.js";

/**
 * Make editable inputs, selects and checkboxes in rows.
 * Editing lifecycle: start (focus) -> edit -> validate -> commit/reject.
 * Commit dispatches a cancelable "edit" event; preventDefault() rejects.
 */
class EditableColumn extends BasePlugin {
    /**
     * @param {import("../core/base-plugin.js").RenderContext} context
     */
    afterRender(context) {
        if (context !== "body") {
            return;
        }
        const grid = this.grid;
        const columns = new Map();
        for (const column of grid.getColumns()) {
            columns.set(grid.getColumnId(column), column);
        }
        const cells = /** @type {NodeListOf<HTMLTableCellElement>} */ (
            grid.querySelectorAll("tbody td.dg-editable-col")
        );
        for (const td of cells) {
            const rowIndex = Number.parseInt(td.dataset.rowIndex ?? "");
            const column = columns.get(td.getAttribute("data-column-id") ?? "");
            const item = grid.rows[rowIndex];
            if (!column || !item) {
                continue;
            }
            this.makeEditableInput(td, column, item, rowIndex);
        }
    }

    /**
     * @param {HTMLElement} td
     * @param {import("../data-grid.js").Column} column
     * @param {Record<string, any>} item
     * @param {number} i
     */
    makeEditableInput(td, column, item, i) {
        if (column.editableType === "select") {
            this.makeEditableSelect(td, column, item, i);
            return;
        }
        if (column.editableType === "checkbox") {
            this.makeEditableCheckbox(td, column, item, i);
            return;
        }
        const grid = this.grid;
        const field = column.field;
        if (!field) {
            return;
        }
        const gridId = grid.getAttribute("id") ?? "";
        const input = document.createElement("input");
        input.type = column.editableType || "text";
        if (input.type === "email") {
            input.inputMode = "email";
        }
        if (input.type === "decimal") {
            input.type = "text";
            input.inputMode = "decimal";
        }
        input.autocomplete = "off";
        input.spellcheck = false;
        input.classList.add("dg-editable");
        input.name = `${gridId.replaceAll("-", "_")}[${i + 1}][${field}]`;
        input.setAttribute("aria-label", column.title ?? field);
        input.dataset.field = field;

        const { displayed, commit, reject, startEditing } = this.#cellLifecycle(
            td,
            column,
            item,
            () => input.value,
            (value) => {
                input.value = value;
            },
        );
        input.value = displayed();

        // Prevent row action
        input.addEventListener("click", (ev) => ev.stopPropagation());
        // Enter validates edit, Escape rejects it
        input.addEventListener("keydown", (ev) => {
            if (ev.key === "Enter") {
                ev.preventDefault();
                input.blur();
            } else if (ev.key === "Escape") {
                reject();
                input.blur();
            }
        });
        // Start editing
        input.addEventListener("focus", startEditing);
        // Save on blur
        input.addEventListener("blur", commit);

        td.replaceChildren(input);
    }

    /**
     * Build the select editor for an `editableType: "select"` column. Options
     * come from `column.editableOptions` (`{ value, label }`, a plain string
     * uses the same text twice). The current value is reflected as
     * `data-value` on the control so consumers can style per value. A select
     * commits as soon as the choice changes and owns its Enter/Escape
     * natively (pick/close the listbox), so there is never a pending state to
     * reject.
     * @param {HTMLElement} td
     * @param {import("../data-grid.js").Column} column
     * @param {Record<string, any>} item
     * @param {number} i
     */
    makeEditableSelect(td, column, item, i) {
        const grid = this.grid;
        const field = column.field;
        if (!field) {
            return;
        }
        const gridId = grid.getAttribute("id") ?? "";
        const select = document.createElement("select");
        select.classList.add("dg-editable");
        select.name = `${gridId.replaceAll("-", "_")}[${i + 1}][${field}]`;
        select.setAttribute("aria-label", column.title ?? field);
        select.dataset.field = field;

        const { displayed, commit, startEditing } = this.#cellLifecycle(
            td,
            column,
            item,
            () => select.value,
            (value) => {
                select.value = value;
            },
        );
        for (const entry of column.editableOptions ?? []) {
            const value = typeof entry === "string" ? entry : entry.value;
            const label = typeof entry === "string" ? entry : (entry.label ?? entry.value);
            addSelectOption(select, value, label);
        }
        const syncValue = () => {
            select.dataset.value = select.value;
        };
        select.value = displayed();
        syncValue();

        // Prevent row action
        select.addEventListener("click", (ev) => ev.stopPropagation());
        // Start editing
        select.addEventListener("focus", startEditing);
        // The choice commits on change; blur only repeats the commit as a
        // safety net for programmatic changes.
        select.addEventListener("change", () => {
            commit();
            syncValue();
        });
        select.addEventListener("blur", () => {
            commit();
            syncValue();
        });

        // The standard caret wrapper (same as filter and pager selects), so
        // the control reads as a dropdown with RTL support included.
        const wrap = document.createElement("span");
        wrap.className = "dg-select-field";
        wrap.appendChild(select);
        td.replaceChildren(wrap);
    }

    /**
     * Build the checkbox editor for an `editableType: "checkbox"` column.
     * Boolean models only: the state is string-encoded through the shared
     * lifecycle and committed back as a real boolean on `change`. Like the
     * select, a checkbox owns its keyboard natively (Space toggles), so
     * there is never a pending state to reject.
     * @param {HTMLElement} td
     * @param {import("../data-grid.js").Column} column
     * @param {Record<string, any>} item
     * @param {number} i
     */
    makeEditableCheckbox(td, column, item, i) {
        const grid = this.grid;
        const field = column.field;
        if (!field) {
            return;
        }
        const gridId = grid.getAttribute("id") ?? "";
        const input = document.createElement("input");
        input.type = "checkbox";
        input.classList.add("dg-editable");
        input.name = `${gridId.replaceAll("-", "_")}[${i + 1}][${field}]`;
        input.setAttribute("aria-label", column.title ?? field);
        input.dataset.field = field;

        const { displayed, commit, startEditing } = this.#cellLifecycle(
            td,
            column,
            item,
            () => String(input.checked),
            (value) => {
                input.checked = value === "true";
            },
        );
        input.checked = displayed() === "true";

        // Prevent row action
        input.addEventListener("click", (ev) => ev.stopPropagation());
        // Start editing
        input.addEventListener("focus", startEditing);
        // The toggle commits on change; blur repeats it as a safety net.
        input.addEventListener("change", commit);
        input.addEventListener("blur", commit);

        td.replaceChildren(input);
    }

    /**
     * Shared editing lifecycle for one cell control: the control reads through
     * getValue and is restored through setValue, so inputs, selects and
     * checkboxes share validation, coercion and the cancelable `edit` event.
     * @param {HTMLElement} td
     * @param {import("../data-grid.js").Column} column
     * @param {Record<string, any>} item
     * @param {() => String} getValue
     * @param {(value: String) => void} setValue
     */
    #cellLifecycle(td, column, item, getValue, setValue) {
        const grid = this.grid;
        const field = /** @type {String} */ (column.field);
        const previous = () => item[field];
        // Controls only carry strings: compare and restore against the model
        // value rendered the same way, so a numeric 42 does not read as edited.
        const displayed = () => {
            const value = previous();
            return value === undefined || value === null ? "" : String(value);
        };
        const startEditing = () => {
            td.dataset.editing = "";
            td.removeAttribute("data-invalid");
            td.removeAttribute("title");
        };
        const endEditing = () => {
            td.removeAttribute("data-editing");
        };
        const reject = (/** @type {String|null} */ message = null) => {
            setValue(displayed());
            endEditing();
            if (message) {
                td.dataset.invalid = "";
                td.title = message;
            }
        };
        const commit = () => {
            const rawValue = getValue();
            if (rawValue === displayed()) {
                endEditing();
                return;
            }
            const error = this.validate(column, rawValue, item);
            if (error) {
                reject(error);
                return;
            }
            const prev = previous();
            /** @type {*} */
            let value = rawValue;
            if (typeof prev === "boolean") {
                value = rawValue === "true";
            } else if (typeof prev === "number") {
                if (rawValue.trim() === "") {
                    reject();
                    return;
                }
                const parsed = Number(rawValue);
                if (!Number.isFinite(parsed)) {
                    reject();
                    return;
                }
                value = parsed;
            }
            item[field] = value;
            if (!dispatch(grid, "edit", { data: item, value, field, column }, { cancelable: true })) {
                item[field] = prev;
                // The field must follow the model back to its previous value.
                reject();
                return;
            }
            endEditing();
        };
        return { displayed, commit, reject, startEditing, endEditing };
    }

    /**
     * Run the column validator, then the grid-level one.
     * @param {import("../data-grid.js").Column} column
     * @param {*} value
     * @param {Record<string, any>} row
     * @returns {?String} error message or null when valid
     */
    validate(column, value, row) {
        const ctx = { row, column, grid: this.grid };
        const res = column.validate?.(value, ctx) ?? this.grid.options.validate?.(value, ctx);
        if (typeof res === "string") {
            return res;
        }
        return res === false ? "Invalid value" : null;
    }
}

export default EditableColumn;
