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
    /**
     * Height missing to reach a full page, measured on the freshly rendered
     * rows. Row geometry is derived, short-lived state: reading it at use
     * time keeps density, theme, zoom and wrap changes reflected without any
     * invalidation. Count real data rows only: responsive child rows are
     * structure, not records.
     * @returns {Number}
     */
    missingPageHeight(): number;
}
export default FixedHeight;
//# sourceMappingURL=fixed-height.d.ts.map