import BasePlugin from "../core/base-plugin.js";
import { findAll } from "../utils/shortcuts.js";

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
        const cells = findAll(grid, "tbody td.dg-editable-col");
        for (const td of cells) {
            const rowIndex = Number.parseInt(td.dataset.rowIndex);
            const column = grid.getColumns().find((c) => (c.id ?? c.field) === td.getAttribute("data-column-id"));
            const item = grid.rows[rowIndex];
            if (!column || !item) {
                continue;
            }
            this.makeEditableInput(td, column, item, rowIndex);
        }
    }

    /**
     * @param {HTMLElement} td
     * @param {import("../data-grid").Column} column
     * @param {Object} item
     * @param {number} i
     */
    makeEditableInput(td, column, item, i) {
        const grid = this.grid;
        const gridId = grid.getAttribute("id");
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
        input.name = `${gridId.replace("-", "_")}[${i + 1}][${column.field}]`;
        input.value = item[column.field];
        input.dataset.field = column.field;

        const previous = () => item[column.field];

        const startEditing = () => {
            td.dataset.editing = "";
            delete td.dataset.invalid;
            delete td.title;
        };

        const endEditing = () => {
            delete td.dataset.editing;
        };

        const reject = (message) => {
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
            item[column.field] = value;
            const ev = new CustomEvent("edit", {
                detail: { data: item, value, field: column.field, column },
                cancelable: true,
            });
            grid.dispatchEvent(ev);
            if (ev.defaultPrevented) {
                item[column.field] = prev;
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
     * @param {import("../data-grid").Column} column
     * @param {*} value
     * @param {Object} row
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
