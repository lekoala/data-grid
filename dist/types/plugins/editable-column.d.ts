import BasePlugin from "../core/base-plugin.js";
/**
 * Make editable inputs in rows.
 * Editing lifecycle: start (focus) -> edit -> validate -> commit/reject.
 * Commit dispatches a cancelable "edit" event; preventDefault() rejects.
 */
declare class EditableColumn extends BasePlugin {
    /**
     * @param {import("../core/base-plugin.js").RenderContext} context
     */
    afterRender(context: import("../core/base-plugin.js").RenderContext): void;
    /**
     * @param {HTMLElement} td
     * @param {import("../data-grid.js").Column} column
     * @param {Record<string, any>} item
     * @param {number} i
     */
    makeEditableInput(td: HTMLElement, column: import("../data-grid.js").Column, item: Record<string, any>, i: number): void;
    /**
     * Run the column validator, then the grid-level one.
     * @param {import("../data-grid.js").Column} column
     * @param {*} value
     * @param {Record<string, any>} row
     * @returns {?String} error message or null when valid
     */
    validate(column: import("../data-grid.js").Column, value: any, row: Record<string, any>): string | null;
}
export default EditableColumn;
//# sourceMappingURL=editable-column.d.ts.map