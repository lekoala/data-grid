import BasePlugin from "../core/base-plugin.js";
import getTextWidth from "../utils/getTextWidth.js";

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
            columns.set(grid.getColumnId(column), column);
        }
        const ths = /** @type {NodeListOf<HTMLTableCellElement>} */ (
            grid.querySelectorAll("thead tr.dg-head-columns th[data-column-id]:not([hidden])")
        );
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
        if (th.hasAttribute("width")) {
            const width = th.getAttribute("width");
            if (width !== null) {
                return Number(width);
            }
        }
        if (!column.field || !grid.rows.length) {
            return;
        }
        // Measure the widest cell actually rendered on the loaded page: its
        // text reflects formatters, transforms and custom renderers, and the
        // td carries the real cell font. Other pages are out of scope by
        // design: autosize means "fit the loaded sample", not "fit the whole
        // dataset".
        const id = grid.getColumnId(column);
        const cells = /** @type {NodeListOf<HTMLTableCellElement>|undefined} */ (
            grid.tbody?.querySelectorAll(`:scope > tr.dg-data-row:not([hidden]) td[data-column-id="${id}"]`)
        );
        if (!cells?.length) {
            return;
        }
        let width = 0;
        for (const td of cells) {
            // Add some extra room to have some spare space
            const w = getTextWidth(`${td.textContent}0000`, td, true);
            if (w > width) {
                width = w;
            }
        }
        if (width > max) {
            width = max;
        }
        if (width < min) {
            width = min;
        }
        th.setAttribute("width", String(width));
        return width;
    }
}

export default AutosizeColumn;
