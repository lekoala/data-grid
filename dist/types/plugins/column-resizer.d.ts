import BasePlugin from "../core/base-plugin.js";
/**
 * Allows to resize columns
 */
declare class ColumnResizer extends BasePlugin {
    /**
     * @param {import("../core/base-plugin.js").RenderContext} context
     */
    afterRender(context: import("../core/base-plugin.js").RenderContext): void;
    updateLabels(): void;
    /**
     * @param {String} resizeLabel
     */
    renderResizer(resizeLabel: string): void;
}
export default ColumnResizer;
//# sourceMappingURL=column-resizer.d.ts.map