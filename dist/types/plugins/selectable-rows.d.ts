import BasePlugin from "../core/base-plugin.js";
/**
 * Allows to select rows
 */
declare class SelectableRows extends BasePlugin {
    #private;
    selectAll: HTMLInputElement | undefined;
    get isSingleSelect(): boolean;
    get visibleOnly(): boolean;
    connected(): void;
    disconnected(): void;
    onselectionChange(): void;
    /**
     * Header select-all and body multi-select checkboxes. Delegated to the
     * grid so rerendered rows keep working without re-attaching.
     * @param {Event} event
     */
    onchange(event: Event): void;
    /**
     * Body radio buttons and their full-cell labels. The radio flow is kept on
     * `click` (not `change`) on purpose: a radio already selected must be
     * deselectable, which native radios do not allow without preventDefault.
     * @param {MouseEvent} event
     */
    onclick(event: MouseEvent): void;
    /**
     * Inject the selection column at the start.
     * @param {import("../data-grid.js").Column[]} columns
     */
    extendColumns(columns: import("../data-grid.js").Column[]): void;
    /**
     * After a render cycle, reflect the selection state on the checkboxes.
     * @param {import("../core/base-plugin.js").RenderContext} context
     */
    afterRender(context: import("../core/base-plugin.js").RenderContext): void;
    updateLabels(): void;
    /**
     * Reflect the current selection state on the body checkboxes.
     */
    syncSelection(): void;
    /**
     * Keep the header select-all checkbox in sync with the body.
     */
    syncSelectAll(): void;
    /**
     * @param {HTMLTableCellElement} th
     */
    createHeaderCell(th: HTMLTableCellElement): void;
    createFilterCell(): void;
    /**
     * @param {import("../data-grid.js").CellContext} ctx
     * @returns {HTMLElement}
     */
    createDataCell({ row, rowIndex }: import("../data-grid.js").CellContext): HTMLElement;
}
export default SelectableRows;
//# sourceMappingURL=selectable-rows.d.ts.map