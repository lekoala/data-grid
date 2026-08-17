import BasePlugin from "../core/base-plugin.js";
import getTextWidth from "../utils/getTextWidth.js";
import { findAll, getAttribute, hasAttribute, setAttribute } from "../utils/shortcuts.js";

/**
 * Allows to resize columns
 */
class AutosizeColumn extends BasePlugin {
    /**
     * @param {import("../core/base-plugin.js").RenderContext} context
     */
    afterRender(context) {
        if (context !== "table") {
            return;
        }
        const grid = this.grid;
        if (!grid.options.autosize) {
            return;
        }
        const availableWidth = grid.clientWidth;
        const colMaxWidth = Math.round((availableWidth / grid.columnsLength(true)) * 2);
        const columns = new Map();
        for (const column of grid.getColumns()) {
            columns.set(column.id ?? column.field ?? "", column);
        }
        const ths = findAll(grid, "thead tr.dg-head-columns th[data-column-id]:not([hidden])");
        let totalWidth = 0;
        for (const th of ths) {
            const column = columns.get(th.getAttribute("data-column-id") ?? "");
            if (!column) {
                continue;
            }
            const colAvailableWidth = Math.min(availableWidth - totalWidth, colMaxWidth);
            const w = this.computeSize(
                /** @type {HTMLTableCellElement} */ (th),
                column,
                Number.parseInt(th.dataset.minWidth ?? ""),
                colAvailableWidth,
            );
            totalWidth += Number(w) || 0;
        }
    }

    /**
     * Autosize col based on column data
     * @param {HTMLTableCellElement} th
     * @param {import("../data-grid.js").Column} column
     * @param {Number} min
     * @param {Number} max
     * @returns {Number|undefined}
     */
    computeSize(th, column, min, max) {
        const grid = this.grid;
        if (hasAttribute(th, "width")) {
            return getAttribute(th, "width");
        }
        const field = column.field;
        if (!field || !grid.rows.length) {
            return;
        }
        const firstVal = grid.rows[0];
        const lastVal = grid.rows[grid.rows.length - 1];
        let v = firstVal[field] != null ? firstVal[field].toString() : "";
        const v2 = lastVal[field] != null ? lastVal[field].toString() : "";
        if (v2.length > v.length) {
            v = v2;
        }
        let width = 0;
        if (v.length <= 6) {
            width = min;
        } else if (v.length > 50) {
            width = max;
        } else {
            // Add some extra room to have some spare space
            width = getTextWidth(`${v}0000`, th);
        }
        if (width > max) {
            width = max;
        }
        if (width < min) {
            width = min;
        }
        setAttribute(th, "width", width);
        return width;
    }
}

export default AutosizeColumn;
