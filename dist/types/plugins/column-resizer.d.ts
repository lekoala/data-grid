import BasePlugin from "../core/base-plugin.js";
/**
 * Allows to resize columns
 */
declare class ColumnResizer extends BasePlugin {
    /** @type {AbortController|null} */
    _resizeController: AbortController | null;
    /**
     * @param {import("../data-grid.js").default} grid
     */
    constructor(grid: import("../data-grid.js").default);
    connected(): void;
    disconnected(): void;
    /**
     * @param {import("../core/base-plugin.js").RenderContext} context
     */
    afterRender(context: import("../core/base-plugin.js").RenderContext): void;
    updateLabels(): void;
    /**
     * @param {String} resizeLabel
     */
    renderResizer(resizeLabel: string): void;
    /**
     * @param {MouseEvent} event
     */
    onclick(event: MouseEvent): void;
    /**
     * @param {MouseEvent} event
     */
    onmousedown(event: MouseEvent): void;
}
export default ColumnResizer;
//# sourceMappingURL=column-resizer.d.ts.map