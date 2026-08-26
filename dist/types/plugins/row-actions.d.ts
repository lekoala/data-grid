import BasePlugin from "../core/base-plugin.js";
/**
 * Add actions on rows
 */
declare class RowActions extends BasePlugin {
    /** @type {HTMLUListElement|null} */
    menu: HTMLUListElement | null;
    /** @type {HTMLElement|null} */
    openCell: HTMLElement | null;
    /** @type {((e: MouseEvent) => void) | null} */
    _boundDocumentClick: ((e: MouseEvent) => void) | null;
    /** @type {((e: KeyboardEvent) => void) | null} */
    _boundKeydown: ((e: KeyboardEvent) => void) | null;
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
     * Position the menu inside the grid, anchored to the toggle rather than
     * the whole cell. This matters when another cell makes the row unusually
     * tall. Flip up or to the left when the toggle sits close to an edge.
     * The menu stays inside the grid bounds so the grid scroll container never
     * clips it.
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
}
export default RowActions;
//# sourceMappingURL=row-actions.d.ts.map