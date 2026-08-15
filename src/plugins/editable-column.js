import BasePlugin from "../core/base-plugin.js";
import { dispatch, findAll } from "../utils/shortcuts.js";

/**
 * Make editable inputs in rows
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
     *
     * @param {HTMLElement} td
     * @param {import("../data-grid").Column} column
     * @param {Object} item
     * @param {number} i
     */
    makeEditableInput(td, column, item, i) {
        const gridId = this.grid.getAttribute("id");
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

        // Prevent row action
        input.addEventListener("click", (ev) => ev.stopPropagation());
        // Enter validates edit
        input.addEventListener("keypress", (ev) => {
            if (ev.type === "keypress") {
                const key = ev.keyCode || ev.key;
                if (key === 13 || key === "Enter") {
                    input.blur();
                    ev.preventDefault();
                }
            }
        });
        // Save on blur
        input.addEventListener("blur", () => {
            // Only fire on update
            if (input.value === item[input.dataset.field]) {
                return;
            }
            // Update underlying data
            item[input.dataset.field] = input.value;
            // Notify
            dispatch(this.grid, "edit", {
                data: item,
                value: input.value,
            });
        });
        td.replaceChildren(input);
    }
}

export default EditableColumn;
