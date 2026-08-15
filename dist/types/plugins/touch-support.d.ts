export default TouchSupport;
/**
 * Allows to paginate with horizontal swipe motions
 */
declare class TouchSupport extends BasePlugin {
    touch: Touch | null;
    ontouchstart(e: TouchEvent): void;
    ontouchmove(e: TouchEvent): void;
}
import BasePlugin from "../core/base-plugin.js";
//# sourceMappingURL=touch-support.d.ts.map