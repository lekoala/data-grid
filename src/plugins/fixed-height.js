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
        const spacerHeight = this.missingPageHeight();
        if (spacerHeight > 0) {
            spacerRow.setAttribute("height", String(Math.ceil(spacerHeight)));
            spacerRow.hidden = false;
        }
    }

    /**
     * Height missing to reach a full page, measured on the freshly rendered
     * rows. Row geometry is derived, short-lived state: reading it at use
     * time keeps density, theme, zoom and wrap changes reflected without any
     * invalidation. Count real data rows only: responsive child rows are
     * structure, not records.
     * @returns {Number}
     */
    missingPageHeight() {
        const rows = /** @type {HTMLTableRowElement[]} */ ([
            ...(this.grid.tbody?.querySelectorAll(":scope > tr.dg-data-row:not([hidden])") ?? []),
        ]);
        const unit = rows[0]?.getBoundingClientRect().height ?? 0;
        if (!unit) {
            return 0;
        }
        let used = 0;
        for (const row of rows) {
            used += row.getBoundingClientRect().height;
        }
        return this.grid.query.pageSize * unit - used;
    }
}

export default FixedHeight;
