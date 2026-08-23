import BasePlugin from "../core/base-plugin.js";
/** Expandable, application-rendered content associated with a data row. */
declare class RowDetails extends BasePlugin {
    /** @type {Set<String>} */
    expanded: Set<string>;
    /** @type {Set<String>} */
    collapsed: Set<string>;
    /** @param {import("../data-grid.js").default} grid */
    constructor(grid: import("../data-grid.js").default);
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
    /** @param {String} rowKey @param {Boolean} expanded */
    _change(rowKey: string, expanded: boolean): void;
    /** @param {Number} rowIndex */
    _detailId(rowIndex: number): string;
    /** @param {import("../data-grid.js").CellContext} ctx @returns {HTMLButtonElement} */
    createToggle({ row, rowIndex }: import("../data-grid.js").CellContext): HTMLButtonElement;
    /** @param {HTMLButtonElement} button @param {Record<string, any>} row @param {Number} rowIndex @param {Boolean} expanded */
    _syncToggle(button: HTMLButtonElement, row: Record<string, any>, rowIndex: number, expanded: boolean): void;
    /**
     * @param {HTMLTableRowElement} tr
     * @param {Record<string, any>} row
     * @param {Number} rowIndex
     * @param {Boolean} expanded
     * @param {Boolean} emit
     */
    _setRowExpanded(tr: HTMLTableRowElement, row: Record<string, any>, rowIndex: number, expanded: boolean, emit: boolean): void;
    /** @param {import("../core/base-plugin.js").RenderContext} context */
    afterRender(context: import("../core/base-plugin.js").RenderContext): void;
    updateLabels(): void;
}
export default RowDetails;
//# sourceMappingURL=row-details.d.ts.map