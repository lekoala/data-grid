import BasePlugin from "../core/base-plugin.js";
/**
 * Support for fixed table height
 *
 * We should add a fake row to push the footer down in case we don't have enough rows
 */
declare class FixedHeight extends BasePlugin {
    hasFixedHeight: boolean;
    /**
     * @param {import("../data-grid.js").default} grid
     */
    constructor(grid: import("../data-grid.js").default);
    /**
     * @param {import("../core/base-plugin.js").RenderContext} context
     */
    afterRender(context: import("../core/base-plugin.js").RenderContext): void;
    /**
     */
    createFakeRow(): void;
    get fakeRow(): Element | null;
    /**
     * On last page, use a fake row to push footer down
     */
    updateFakeRow(): void;
}
export default FixedHeight;
//# sourceMappingURL=fixed-height.d.ts.map