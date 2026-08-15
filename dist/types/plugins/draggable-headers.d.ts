import BasePlugin from "../core/base-plugin.js";
/**
 * Allows to move headers
 */
declare class DraggableHeaders extends BasePlugin {
    /**
     * @param {import("../core/base-plugin.js").RenderContext} context
     */
    afterRender(context: import("../core/base-plugin.js").RenderContext): void;
    /**
     * @param {HTMLElement} th
     */
    makeHeaderDraggable(th: HTMLElement): void;
}
export default DraggableHeaders;
//# sourceMappingURL=draggable-headers.d.ts.map