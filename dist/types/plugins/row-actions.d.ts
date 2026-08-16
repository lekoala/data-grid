import BasePlugin from "../core/base-plugin.js";
/**
 * Add actions on rows
 */
declare class RowActions extends BasePlugin {
    menu: HTMLUListElement | undefined;
    openCell: HTMLElement | null | undefined;
    _boundDocumentClick: ((ev: MouseEvent) => void) | null | undefined;
    _boundKeydown: ((ev: KeyboardEvent) => void) | null | undefined;
    /**
     * Whether the actions column is active: static `options.actions`, the
     * `rowActions` capability or a declarative `<th data-actions>`.
     * @returns {Boolean}
     */
    hasActions(): boolean;
    /**
     * Inject the actions column at the end.
     * @param {import("../data-grid.js").Column[]} columns
     */
    extendColumns(columns: import("../data-grid.js").Column[]): void;
    /**
     * @param {HTMLTableCellElement} th
     */
    createHeaderCell(th: HTMLTableCellElement): void;
    createFilterCell(): void;
    updateLabels(): void;
    /**
     * Close the popover on any full table render and keep the per-row
     * collapsed mode in sync with the resolved actions.
     * @param {import("../core/base-plugin.js").RenderContext} context
     */
    afterRender(context: import("../core/base-plugin.js").RenderContext): void;
    /**
     * The collapsed vs inline mode depends on the actions actually resolved
     * for each row, which is only known at render time.
     */
    syncCellModes(): void;
    /**
     * Toggle the popover menu for a collapsed actions cell.
     * @param {HTMLElement} cell
     * @param {Record<string, any>} row
     */
    toggleActionMenu(cell: HTMLElement, row: Record<string, any>): void;
    /**
     * Open (and fill) the popover menu anchored to the given actions cell.
     * @param {HTMLElement} cell
     * @param {Record<string, any>} row
     */
    openActionMenu(cell: HTMLElement, row: Record<string, any>): void;
    /**
     * Position the menu inside the grid, flipping up or to the left when the
     * cell sits close to an edge. The menu stays inside the grid bounds so the
     * grid scroll container never clips it.
     * @param {HTMLElement} cell
     */
    positionActionMenu(cell: HTMLElement): void;
    /**
     * Close and reset the popover menu.
     */
    closeActionMenu(): void;
    /**
     * Build the actions cell content: a toggle button plus one element per
     * resolved action. A row without actions gets an empty cell.
     * @param {import("../data-grid.js").CellContext} ctx
     * @returns {DocumentFragment}
     */
    makeActionRow({ row, tr, grid, rowIndex }: import("../data-grid.js").CellContext): DocumentFragment;
    /**
     * Create the button (or link) for a single action.
     * @param {import("../data-grid.js").Action} action
     * @param {Record<string, any>} row
     * @param {Number} rowIndex
     * @param {import("../data-grid.js").default} grid
     * @param {import("../data-grid.js").Labels} labels
     * @param {Boolean} [menu] Render for the collapsed menu: keep the icon but
     * add a visible label next to it.
     * @returns {{ el: HTMLElement, dispatchAction: (ev: Event) => void }}
     */
    createActionElement(action: import("../data-grid.js").Action, row: Record<string, any>, rowIndex: number, grid: import("../data-grid.js").default, labels: import("../data-grid.js").Labels, menu?: boolean): {
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
export default RowActions;
//# sourceMappingURL=row-actions.d.ts.map