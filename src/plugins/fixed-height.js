import BasePlugin from "../core/base-plugin.js";
import { setAttribute } from "../utils/shortcuts.js";

/**
 * Support for fixed table height
 *
 * We should add a fake row to push the footer down in case we don't have enough rows
 */
class FixedHeight extends BasePlugin {
    /**
     * @param {import("../data-grid.js").default} grid
     */
    constructor(grid) {
        super(grid);

        this.hasFixedHeight = false;
        // If we have a fixed height, make sure we have overflowY set
        if (grid.style.height) {
            grid.style.overflowY = "auto";
            this.hasFixedHeight = true;
        }
    }

    /**
     * @param {import("../core/base-plugin.js").RenderContext} context
     */
    afterRender(context) {
        if (context !== "body") {
            return;
        }
        this.createFakeRow();
        this.updateFakeRow();
    }

    /**
     */
    createFakeRow() {
        const grid = this.grid;
        const tbody = grid.querySelector("tbody");
        const tr = document.createElement("tr");
        setAttribute(tr, "hidden", "");
        tr.classList.add("dg-fake-row");
        tbody?.appendChild(tr);
    }

    get fakeRow() {
        return this.grid.querySelector(".dg-fake-row");
    }

    /**
     * On last page, use a fake row to push footer down
     */
    updateFakeRow() {
        const grid = this.grid;
        const fakeRow = this.fakeRow;
        if (!fakeRow) {
            return;
        }

        // We don't need a fake row if we display everything
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
        const fakeHeight = visibleRows > 1 ? max - visibleRows * rowHeight : max;
        if (fakeHeight > 0) {
            setAttribute(fakeRow, "height", fakeHeight);
            fakeRow.removeAttribute("hidden");
        } else {
            fakeRow.removeAttribute("height");
        }
    }
}

export default FixedHeight;
