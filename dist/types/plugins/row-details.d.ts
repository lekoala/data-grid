import BasePlugin from "../core/base-plugin.js";
/** Expandable, application-rendered content associated with a data row. */
declare class RowDetails extends BasePlugin {
    #private;
    /** @type {Set<String>} */
    expanded: Set<string>;
    /** @type {Set<String>} */
    collapsed: Set<string>;
    /** @param {import("../data-grid.js").default} grid */
    constructor(grid: import("../data-grid.js").default);
    connected(): void;
    disconnected(): void;
    /**
     * Delegate the expand/collapse toggle. The row is resolved from the DOM
     * (`data-row-index`) through the model (`grid.rows`), so the toggle keeps
     * working across body rerenders without re-attaching anything.
     * @param {MouseEvent} event
     */
    onclick(event: MouseEvent): void;
    /** @param {import("../data-grid.js").Column[]} columns */
    extendColumns(columns: import("../data-grid.js").Column[]): void;
    /** @public @param {String} rowKey @returns {Boolean} */
    isExpanded(rowKey: string): boolean;
    /** @public @param {String} rowKey */
    expand(rowKey: string): void;
    /** @public @param {String} rowKey */
    collapse(rowKey: string): void;
    /** @public @param {String} rowKey */
    toggle(rowKey: string): void;
    /** @public */
    collapseAll(): void;
    /** @param {import("../data-grid.js").CellContext} ctx @returns {HTMLButtonElement} */
    createToggle({ row, rowIndex }: import("../data-grid.js").CellContext): HTMLButtonElement;
    /** @param {import("../core/base-plugin.js").RenderContext} context */
    afterRender(context: import("../core/base-plugin.js").RenderContext): void;
    updateLabels(): void;
}
export default RowDetails;
//# sourceMappingURL=row-details.d.ts.map