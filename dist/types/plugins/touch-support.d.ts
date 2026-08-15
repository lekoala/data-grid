import BasePlugin from "../core/base-plugin.js";
/**
 * Allows to paginate with horizontal swipe motions
 */
declare class TouchSupport extends BasePlugin {
    touch: Touch | null;
    /**
     * @param {import("../data-grid.js").default} grid
     */
    constructor(grid: import("../data-grid.js").default);
    connected(): void;
    disconnected(): void;
    ontouchstart(/** @type {TouchEvent} */ e: TouchEvent): void;
    ontouchmove(/** @type {TouchEvent} */ e: TouchEvent): void;
}
export default TouchSupport;
//# sourceMappingURL=touch-support.d.ts.map