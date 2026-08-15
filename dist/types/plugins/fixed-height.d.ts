export default FixedHeight;
/**
 * Support for fixed table height
 *
 * We should add a fake row to push the footer down in case we don't have enough rows
 */
declare class FixedHeight extends BasePlugin {
    hasFixedHeight: boolean;
    /**
     */
    createFakeRow(): void;
    get fakeRow(): Element | null;
    /**
     * On last page, use a fake row to push footer down
     */
    updateFakeRow(): void;
}
import BasePlugin from "../core/base-plugin.js";
//# sourceMappingURL=fixed-height.d.ts.map