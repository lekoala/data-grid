export default AutosizeColumn;
/**
 * Allows to resize columns
 */
declare class AutosizeColumn extends BasePlugin {
    /**
     * Autosize col based on column data
     * @param {HTMLTableCellElement} th
     * @param {import("../data-grid").Column} column
     * @param {Number} min
     * @param {Number} max
     * @returns {Number|undefined}
     */
    computeSize(th: HTMLTableCellElement, column: import("../data-grid").Column, min: number, max: number): number | undefined;
}
import BasePlugin from "../core/base-plugin.js";
//# sourceMappingURL=autosize-column.d.ts.map