import BasePlugin from "../core/base-plugin.js";
import getParentElement from "../utils/getParentElement.js";
import { dispatch, findAll, on } from "../utils/shortcuts.js";

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
        const headers = findAll(this.grid, "thead tr.dg-head-columns th[data-column-id]");
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
        on(th, "dragstart", (/** @type {DragEvent} */ e) => {
            if (grid._isResizing && e.preventDefault) {
                e.preventDefault();
                return;
            }
            grid.log("reorder col");
            const dt = e.dataTransfer;
            if (!dt) {
                return;
            }
            dt.effectAllowed = "move";
            dt.setData("text/plain", th.getAttribute("data-column-id") ?? "");
        });
        on(th, "dragover", (/** @type {DragEvent} */ e) => {
            if (e.preventDefault) {
                e.preventDefault();
            }
            if (e.dataTransfer) {
                e.dataTransfer.dropEffect = "move";
            }
            return false;
        });
        on(th, "drop", (/** @type {DragEvent} */ e) => {
            if (e.stopPropagation) {
                e.stopPropagation();
            }
            const target = getParentElement(/** @type {HTMLElement} */ (e.target), "TH");
            const dt = e.dataTransfer;
            if (!dt) {
                return false;
            }
            const draggedId = dt.getData("text/plain");
            const targetId = target?.getAttribute("data-column-id");
            if (!targetId || draggedId === targetId) {
                grid.log("reordered col stayed the same");
                return false;
            }
            // Virtual columns are pinned and cannot be reordered
            if (draggedId.startsWith("$") || targetId.startsWith("$")) {
                return false;
            }
            grid.log(`reordered col from ${draggedId} to ${targetId}`);

            const cols = grid.options.columns;
            const from = cols.findIndex((c) => (c.id ?? c.field) === draggedId);
            const to = cols.findIndex((c) => (c.id ?? c.field) === targetId);
            if (from === -1 || to === -1) {
                return false;
            }
            [cols[from], cols[to]] = [cols[to], cols[from]];

            grid.renderTable();

            dispatch(grid, "columnReordered", {
                col: draggedId,
                from,
                to,
            });
            return false;
        });
    }
}

export default DraggableHeaders;
