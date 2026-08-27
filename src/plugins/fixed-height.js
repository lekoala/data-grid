import BasePlugin from "../core/base-plugin.js";
import { createSpanningRow } from "../utils/spanningRow.js";

/**
 * Keep the footer at the height of a full page on a partial last page.
 */
class FixedHeight extends BasePlugin {
    /**
     * @param {import("../core/base-plugin.js").RenderContext} context
     */
    afterRender(context) {
        if (context !== "body") {
            return;
        }
        this.createSpacerRow();
        this.updateSpacerRow();
    }

    createSpacerRow() {
        const grid = this.grid;
        const { row } = createSpanningRow(grid, { className: "dg-spacer-row" });
        row.hidden = true;
        row.setAttribute("aria-hidden", "true");
        grid.tbody?.appendChild(row);
    }

    /** @returns {HTMLTableRowElement|null} */
    get spacerRow() {
        return this.grid.querySelector(".dg-spacer-row");
    }

    /**
     * On a partial last page, use a spacer row to push the footer down.
     */
    updateSpacerRow() {
        const grid = this.grid;
        const spacerRow = this.spacerRow;
        if (!spacerRow) {
            return;
        }
        spacerRow.hidden = true;
        spacerRow.removeAttribute("height");

        // A single-page result follows its natural content height.
        if (grid.query.pageSize > grid.total) {
            return;
        }
        // We are not on last page
        if (grid.query.page !== grid.totalPages()) {
            return;
        }
        if (!grid.options.autoheight) {
            return;
        }
        const rowHeight = grid.rowHeight ?? 0;
        // Find remaining missing height
        const max = grid.query.pageSize * rowHeight;
        // Count real data rows only: responsive child rows are structure, not
        // records, and would otherwise inflate the fill-the-last-page measure.
        const visibleRows = grid.querySelectorAll("tbody tr.dg-data-row:not([hidden])").length;
        const spacerHeight = max - visibleRows * rowHeight;
        if (spacerHeight > 0) {
            spacerRow.setAttribute("height", String(spacerHeight));
            spacerRow.hidden = false;
        }
    }
}

export default FixedHeight;
