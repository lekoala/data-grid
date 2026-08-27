import BasePlugin from "../core/base-plugin.js";
import { dispatch } from "../utils/dispatch.js";
import { off, on } from "../utils/events.js";

const DRAG_EVENTS = ["dragstart", "dragover", "drop"];

/**
 * Allows to move headers
 */
class DraggableHeaders extends BasePlugin {
    connected() {
        on(this.grid, DRAG_EVENTS, this);
    }

    disconnected() {
        off(this.grid, DRAG_EVENTS, this);
    }

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
            th.draggable = Boolean(this.grid.options.reorder);
        }
    }

    /**
     * The header th that owns a delegated drag event, or null. Virtual
     * columns (ids starting with `$`) are pinned and never draggable.
     * @param {Event} event
     * @returns {HTMLTableCellElement|null}
     */
    _draggableHeader(event) {
        if (!this.grid.options.reorder) {
            return null;
        }
        const target = event.target;
        if (!(target instanceof Element) || !this.grid._ownsControl(target)) {
            return null;
        }
        return /** @type {HTMLTableCellElement|null} */ (
            target.closest('thead tr.dg-head-columns th[data-column-id]:not([data-column-id^="$"])')
        );
    }

    /**
     * @param {DragEvent} event
     */
    ondragstart(event) {
        const th = this._draggableHeader(event);
        if (!th) {
            return;
        }
        this.grid.log("reorder col");
        const dt = event.dataTransfer;
        if (!dt) {
            return;
        }
        dt.effectAllowed = "move";
        dt.setData("text/plain", th.getAttribute("data-column-id") ?? "");
    }

    /**
     * @param {DragEvent} event
     */
    ondragover(event) {
        if (!this._draggableHeader(event)) {
            return;
        }
        event.preventDefault();
        if (event.dataTransfer) {
            event.dataTransfer.dropEffect = "move";
        }
    }

    /**
     * @param {DragEvent} event
     */
    ondrop(event) {
        const target = this._draggableHeader(event);
        if (!target) {
            return;
        }
        event.stopPropagation();
        const dt = event.dataTransfer;
        if (!dt) {
            return;
        }
        const draggedId = dt.getData("text/plain");
        const targetId = target.getAttribute("data-column-id");
        if (!targetId || draggedId === targetId) {
            this.grid.log("reordered col stayed the same");
            return;
        }
        // Virtual columns are pinned and cannot be reordered
        if (draggedId.startsWith("$") || targetId.startsWith("$")) {
            return;
        }
        this.grid.log(`reordered col from ${draggedId} to ${targetId}`);

        const cols = this.grid.options.columns;
        const from = cols.findIndex((c) => this.grid.getColumnId(c) === draggedId);
        const to = cols.findIndex((c) => this.grid.getColumnId(c) === targetId);
        if (from === -1 || to === -1) {
            return;
        }
        const moved = cols.splice(from, 1)[0];
        cols.splice(to, 0, moved);

        this.grid.renderTable();
        this.grid.renderBody();

        dispatch(this.grid, "columnReordered", {
            col: draggedId,
            from,
            to,
        });
    }
}

export default DraggableHeaders;
