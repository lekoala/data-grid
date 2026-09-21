import BasePlugin from "../core/base-plugin.js";
import addSelectOption from "../utils/addSelectOption.js";
import applyContent from "../utils/applyContent.js";
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
        if (column.renderEditor) {
            this.#makeCustomEditor(td, column, item);
            return;
        }
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
                if (this.grid.options.enterMovesDown) {
                    // Only a successful commit may move the editing focus; on
                    // a rejection (validation or canceled edit) the user stays
                    // on the current cell. With no editable cell below, keep
                    // the plain end-of-edit behavior (commit then blur).
                    if (commit() && !this.#focusNextEditable(td, column)) {
                        input.blur();
                    }
                } else {
                    input.blur();
                }
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
     * Build an application-owned custom editor for `column.renderEditor`.
     * The plugin keeps ownership of coercion, validation and the cancelable
     * `edit` event; the editor only owns its presentation and decides when to
     * commit or cancel. The returned content follows the usual RenderContent
     * contract, exactly like `renderCell`.
     * @param {HTMLElement} td
     * @param {import("../data-grid.js").Column} column
     * @param {Record<string, any>} item
     */
    #makeCustomEditor(td, column, item) {
        const grid = this.grid;
        // Same base guard as the built-in editors: without a field there is no
        // model slot to commit into.
        if (!column.field) {
            return;
        }
        const endEditing = () => {
            td.removeAttribute("data-editing");
        };
        const commit = (/** @type {*} */ value) => {
            // Editors may hand back real booleans/numbers; normalize to the
            // control string protocol so comparison and coercion stay shared.
            const raw = typeof value === "boolean" ? (value ? "true" : "false") : String(value ?? "");
            return this.#commitValue(td, column, item, raw, {
                // The editor owns its own feedback and control state: a
                // rejected commit only reverts the model and ends editing.
                reject: endEditing,
                endEditing,
            });
        };
        const cancel = () => {
            endEditing();
        };
        const ctx = {
            value: this.#displayed(column, item),
            row: item,
            column,
            grid,
            commit,
            cancel,
        };
        // Editing replaces the display surface (like the built-in editors do);
        // renderCell/format output is a display concern and steps aside.
        td.replaceChildren();
        const renderEditor =
            /** @type {(ctx: import("../data-grid.js").EditorContext) => import("../data-grid.js").RenderContent} */ (
                column.renderEditor
            );
        applyContent(td, renderEditor(/** @type {import("../data-grid.js").EditorContext} */ (ctx)));
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
        const displayed = () => this.#displayed(column, item);
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
            return this.#commitValue(td, column, item, getValue(), { reject, endEditing });
        };
        return { displayed, commit, reject, startEditing, endEditing };
    }

    /**
     * Render the model value like the built-in editors do, so a control value
     * can be compared and restored against it (a numeric 42 reads as "42").
     * @param {import("../data-grid.js").Column} column
     * @param {Record<string, any>} item
     * @returns {String}
     */
    #displayed(column, item) {
        const value = item[/** @type {String} */ (column.field)];
        return value === undefined || value === null ? "" : String(value);
    }

    /**
     * Shared commit path: compare, validate, coerce, mutate and dispatch the
     * cancelable `edit` event. Resolves to true when the value was accepted
     * (an unchanged value counts as accepted), false when a validation failed
     * or an `edit` listener canceled the change.
     * @param {HTMLElement} td
     * @param {import("../data-grid.js").Column} column
     * @param {Record<string, any>} item
     * @param {String} rawValue
     * @param {{ reject: (message?: String|null) => void, endEditing: () => void }} handle
     * @returns {Boolean}
     */
    #commitValue(td, column, item, rawValue, { reject, endEditing }) {
        const field = /** @type {String} */ (column.field);
        if (rawValue === this.#displayed(column, item)) {
            endEditing();
            return true;
        }
        const error = this.validate(column, rawValue, item);
        if (error) {
            reject(error);
            return false;
        }
        const prev = item[field];
        /** @type {*} */
        let value = rawValue;
        if (typeof prev === "boolean") {
            value = rawValue === "true";
        } else if (typeof prev === "number") {
            if (rawValue.trim() === "") {
                reject();
                return false;
            }
            const parsed = Number(rawValue);
            if (!Number.isFinite(parsed)) {
                reject();
                return false;
            }
            value = parsed;
        }
        item[field] = value;
        if (!dispatch(this.grid, "edit", { data: item, value, field, column }, { cancelable: true })) {
            // The field must follow the model back to its previous value.
            item[field] = prev;
            reject();
            return false;
        }
        endEditing();
        return true;
    }

    /**
     * Move the editing focus one row down in the same column after a
     * successful Enter commit. Returns whether the focus actually moved; when
     * there is no editable cell below, navigate to nothing and let the caller
     * keep its end-of-edit behavior. Non-editable or hidden target cells are
     * not navigated to.
     * @param {HTMLElement} td
     * @param {import("../data-grid.js").Column} column
     * @returns {Boolean}
     */
    #focusNextEditable(td, column) {
        const row = /** @type {HTMLTableRowElement|null} */ (td.closest("tr.dg-data-row"));
        let next = row ? row.nextElementSibling : null;
        while (next && !(next instanceof HTMLTableRowElement && next.classList.contains("dg-data-row"))) {
            next = next.nextElementSibling;
        }
        if (!next) {
            return false;
        }
        // Match the target cell from the rendered column identity without
        // building a CSS selector from it: ids/fields may contain characters
        // that a selector would have to escape.
        const id = this.grid.getColumnId(column);
        /** @type {HTMLTableCellElement|null} */
        let cell = null;
        for (const candidate of next.cells) {
            if (candidate.dataset.columnId === id) {
                cell = candidate;
                break;
            }
        }
        if (!cell || cell.hasAttribute("hidden")) {
            return false;
        }
        const control = /** @type {HTMLElement|null} */ (
            cell.querySelector(".dg-editable, input, select, textarea, button, [tabindex]:not([tabindex='-1'])")
        );
        if (!control) {
            return false;
        }
        control.focus();
        return true;
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
