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

    /**
     * Reuse the single spacer row and keep it last. A progressive append puts
     * the new rows after the existing spacer, so moving it re-appends it at
     * the end instead of piling up duplicate spacers.
     */
    createSpacerRow() {
        const grid = this.grid;
        const tbody = grid.tbody;
        if (!tbody) {
            return;
        }
        let row = this.spacerRow;
        if (!row) {
            row = createSpanningRow(grid, { className: "dg-spacer-row" }).row;
            row.hidden = true;
            row.setAttribute("aria-hidden", "true");
        }
        tbody.appendChild(row);
    }

    /** @returns {HTMLTableRowElement|null} */
    get spacerRow() {
        return /** @type {HTMLTableRowElement|null} */ (
            this.grid.tbody?.querySelector(":scope > .dg-spacer-row") ?? null
        );
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

        // A single-page result follows its natural content height. An unknown
        // total (pager "more" without COUNT(*)) never takes this shortcut.
        if (grid.total != null && grid.query.pageSize > grid.total) {
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
