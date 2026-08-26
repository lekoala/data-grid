import BasePlugin from "../core/base-plugin.js";
/**
 * Allows to move headers
 */
declare class DraggableHeaders extends BasePlugin {
    connected(): void;
    disconnected(): void;
    /**
     * @param {import("../core/base-plugin.js").RenderContext} context
     */
    afterRender(context: import("../core/base-plugin.js").RenderContext): void;
    /**
     * The header th that owns a delegated drag event, or null. Virtual
     * columns (ids starting with `$`) are pinned and never draggable.
     * @param {Event} event
     * @returns {HTMLTableCellElement|null}
     */
    _draggableHeader(event: Event): HTMLTableCellElement | null;
    /**
     * @param {DragEvent} event
     */
    ondragstart(event: DragEvent): void;
    /**
     * @param {DragEvent} event
     */
    ondragover(event: DragEvent): void;
    /**
     * @param {DragEvent} event
     */
    ondrop(event: DragEvent): void;
}
export default DraggableHeaders;
//# sourceMappingURL=draggable-headers.d.ts.map