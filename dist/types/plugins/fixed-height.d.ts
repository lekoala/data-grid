import BasePlugin from "../core/base-plugin.js";
/**
 * Keep the footer at the height of a full page on a partial last page.
 */
declare class FixedHeight extends BasePlugin {
    /**
     * @param {import("../core/base-plugin.js").RenderContext} context
     */
    afterRender(context: import("../core/base-plugin.js").RenderContext): void;
    createSpacerRow(): void;
    /** @returns {HTMLTableRowElement|null} */
    get spacerRow(): HTMLTableRowElement | null;
    /**
     * On a partial last page, use a spacer row to push the footer down.
     */
    updateSpacerRow(): void;
}
export default FixedHeight;
//# sourceMappingURL=fixed-height.d.ts.map