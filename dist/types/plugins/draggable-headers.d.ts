import BasePlugin from "../core/base-plugin.js";
/**
 * Allows to move headers
 */
declare class DraggableHeaders extends BasePlugin {
    #private;
    connected(): void;
    disconnected(): void;
    /**
     * @param {import("../core/base-plugin.js").RenderContext} context
     */
    afterRender(context: import("../core/base-plugin.js").RenderContext): void;
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