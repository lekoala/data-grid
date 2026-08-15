export default SelectableRows;
/**
 * Allows to select rows
 */
declare class SelectableRows extends BasePlugin {
    get isSingleSelect(): boolean;
    get visibleOnly(): boolean;
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
    selectAll: HTMLInputElement | undefined;
    createFilterCell(): void;
    /**
     * @param {import("../data-grid.js").CellContext} ctx
     * @returns {HTMLElement}
     */
    createDataCell({ row, rowIndex }: import("../data-grid.js").CellContext): HTMLElement;
}
import BasePlugin from "../core/base-plugin.js";
//# sourceMappingURL=selectable-rows.d.ts.map