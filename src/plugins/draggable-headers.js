import BasePlugin from "../core/base-plugin.js";
import { dispatch } from "../utils/dispatch.js";

/**
 * Allows to move headers
 */
class DraggableHeaders extends BasePlugin {
    /**
     * @param {import("../core/base-plugin.js").RenderContext} context
     */
    afterRender(context) {
        if (context !== "table") {
            return;
        }
        const headers = /** @type {NodeListOf<HTMLTableCellElement>} */ (
            this.grid.querySelectorAll('thead tr.dg-head-columns th[data-column-id]:not([data-column-id^="$"])')
        );
        for (const th of headers) {
            this.makeHeaderDraggable(th);
        }
    }

    /**
     * @param {HTMLElement} th
     */
    makeHeaderDraggable(th) {
        const grid = this.grid;
        th.draggable = true;
        th.addEventListener("dragstart", (/** @type {DragEvent} */ e) => {
            grid.log("reorder col");
            const dt = e.dataTransfer;
            if (!dt) {
                return;
            }
            dt.effectAllowed = "move";
            dt.setData("text/plain", th.getAttribute("data-column-id") ?? "");
        });
        th.addEventListener("dragover", (/** @type {DragEvent} */ e) => {
            e.preventDefault();
            if (e.dataTransfer) {
                e.dataTransfer.dropEffect = "move";
            }
        });
        th.addEventListener("drop", (/** @type {DragEvent} */ e) => {
            e.stopPropagation();
            const target = /** @type {HTMLElement} */ (e.target).closest("th");
            const dt = e.dataTransfer;
            if (!dt) {
                return;
            }
            const draggedId = dt.getData("text/plain");
            const targetId = target?.getAttribute("data-column-id");
            if (!targetId || draggedId === targetId) {
                grid.log("reordered col stayed the same");
                return;
            }
            // Virtual columns are pinned and cannot be reordered
            if (draggedId.startsWith("$") || targetId.startsWith("$")) {
                return;
            }
            grid.log(`reordered col from ${draggedId} to ${targetId}`);

            const cols = grid.options.columns;
            const from = cols.findIndex((c) => grid.getColumnId(c) === draggedId);
            const to = cols.findIndex((c) => grid.getColumnId(c) === targetId);
            if (from === -1 || to === -1) {
                return;
            }
            [cols[from], cols[to]] = [cols[to], cols[from]];

            grid.renderTable();

            dispatch(grid, "columnReordered", {
                col: draggedId,
                from,
                to,
            });
        });
    }
}

export default DraggableHeaders;
