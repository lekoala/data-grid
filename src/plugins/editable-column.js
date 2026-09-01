import BasePlugin from "../core/base-plugin.js";
import { dispatch } from "../utils/dispatch.js";

/**
 * Make editable inputs in rows.
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
        input.name = `${gridId.replace("-", "_")}[${i + 1}][${field}]`;
        input.setAttribute("aria-label", column.title ?? field);
        input.value = item[field] ?? "";
        input.dataset.field = field;

        const previous = () => item[field];

        const startEditing = () => {
            td.dataset.editing = "";
            td.removeAttribute("data-invalid");
            td.removeAttribute("title");
        };

        const endEditing = () => {
            td.removeAttribute("data-editing");
        };

        const reject = (/** @type {String|null} */ message = null) => {
            input.value = previous();
            endEditing();
            if (message) {
                td.dataset.invalid = "";
                td.title = message;
            }
        };

        const commit = () => {
            const value = input.value;
            if (value === previous()) {
                endEditing();
                return;
            }
            const error = this.validate(column, value, item);
            if (error) {
                reject(error);
                return;
            }
            const prev = previous();
            item[field] = value;
            if (!dispatch(grid, "edit", { data: item, value, field, column }, { cancelable: true })) {
                item[field] = prev;
            }
            endEditing();
        };

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
