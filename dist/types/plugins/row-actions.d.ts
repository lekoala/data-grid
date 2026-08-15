export default RowActions;
/**
 * Add actions on rows
 */
declare class RowActions extends BasePlugin {
    /**
     * @returns {Boolean}
     */
    hasActions(): boolean;
    /**
     * @param {HTMLTableCellElement} th
     */
    createHeaderCell(th: HTMLTableCellElement): void;
    createFilterCell(): void;
    /**
     * Build the actions cell content: a toggle button plus one element per action.
     * @param {import("../data-grid.js").CellContext} ctx
     * @returns {DocumentFragment}
     */
    makeActionRow({ row, tr, grid }: import("../data-grid.js").CellContext): DocumentFragment;
    /**
     * Create the button (or link) for a single action.
     * @param {import("../data-grid.js").Action} action
     * @param {Record<string, any>} row
     * @param {import("../data-grid.js").default} grid
     * @param {import("../data-grid.js").Labels} labels
     * @returns {{ el: HTMLElement, dispatchAction: (ev: Event) => void }}
     */
    createActionElement(action: import("../data-grid.js").Action, row: Record<string, any>, grid: import("../data-grid.js").default, labels: import("../data-grid.js").Labels): {
        el: HTMLElement;
        dispatchAction: (ev: Event) => void;
    };
    /**
     * Apply renderer content to an element (same contract as renderCell).
     * @param {HTMLElement} el
     * @param {*} content
     */
    applyContent(el: HTMLElement, content: any): void;
    get actionClass(): string;
}
import BasePlugin from "../core/base-plugin.js";
//# sourceMappingURL=row-actions.d.ts.map