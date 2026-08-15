import BasePlugin from "../core/base-plugin.js";
/**
 * Allows to resize columns
 */
declare class AutosizeColumn extends BasePlugin {
    /**
     * @param {import("../core/base-plugin.js").RenderContext} context
     */
    afterRender(context: import("../core/base-plugin.js").RenderContext): void;
    /**
     * Autosize col based on column data
     * @param {HTMLTableCellElement} th
     * @param {import("../data-grid.js").Column} column
     * @param {Number} min
     * @param {Number} max
     * @returns {Number|undefined}
     */
    computeSize(th: HTMLTableCellElement, column: import("../data-grid.js").Column, min: number, max: number): number | undefined;
}
export default AutosizeColumn;
//# sourceMappingURL=autosize-column.d.ts.map