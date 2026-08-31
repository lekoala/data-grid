import BasePlugin from "../core/base-plugin.js";
/**
 * Add actions on rows
 */
declare class RowActions extends BasePlugin {
    #private;
    /** @type {HTMLUListElement|null} */
    menu: HTMLUListElement | null;
    /**
     * @param {import("../data-grid.js").default} grid
     */
    constructor(grid: import("../data-grid.js").default);
    connected(): void;
    disconnected(): void;
    /**
     * Delegate the collapsed-menu toggle. The row is resolved from the DOM
     * (`data-row-index`) through the model (`grid.rows`), so the toggle keeps
     * working across body rerenders without re-attaching anything.
     * @param {MouseEvent} event
     */
    onclick(event: MouseEvent): void;
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
    updateLabels(): void;
    beforeRender(): void;
    afterRender(): void;
    /**
     * The collapsed vs inline mode is a property of the whole column, not of
     * individual cells: within one table column every row must share the same
     * geometry (header, filter and body cells alike), otherwise a fixed-layout
     * table constrains the column to one width while cells assume another,
     * creating artificial overflow.
     *
     * The mode derives from the widest set of inline actions on the current
     * page: if every row fits 1-2 inline actions the column sizes to its
     * intrinsic inline width, otherwise it collapses to the compact `more`
     * cell (the fixed structural width).
     */
    syncCellModes(): void;
    /**
     * Fill the shared popover before the toggle's native default action opens
     * it. The browser owns opening, dismissal, focus restoration and placement.
     * @param {Record<string, any>} row
     */
    renderActionMenu(row: Record<string, any>): void;
    /**
     * Build the actions cell content: a toggle button plus one element per
     * resolved action. A row without actions gets an empty cell.
     * @param {import("../data-grid.js").CellContext} ctx
     * @returns {DocumentFragment}
     */
    makeActionRow({ row, tr, grid, rowIndex }: import("../data-grid.js").CellContext): DocumentFragment;
    /**
     * Activate the rendered default action of a data row: the element marked
     * with `data-dg-default-action` at render time is clicked, so href
     * navigation, confirmation, disabled state and the `action` event all behave
     * exactly as if the control itself was clicked.
     * @param {Number} rowIndex
     */
    activateDefaultAction(rowIndex: number): void;
    /**
     * Create the button (or link) for a single action.
     * @param {import("../data-grid.js").Action} action
     * @param {Record<string, any>} row
     * @param {Number} rowIndex
     * @param {Boolean} [menu] Render for the collapsed menu: keep the icon but
     * add a visible label next to it.
     * @returns {HTMLElement}
     */
    createActionElement(action: import("../data-grid.js").Action, row: Record<string, any>, rowIndex: number, menu?: boolean): HTMLElement;
}
export default RowActions;
//# sourceMappingURL=row-actions.d.ts.map