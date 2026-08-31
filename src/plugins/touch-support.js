import BasePlugin from "../core/base-plugin.js";
import { off, on } from "../utils/events.js";

const TOUCH_EVENTS = ["touchstart", "touchmove"];

/**
 * Allows to paginate with horizontal swipe motions
 */
class TouchSupport extends BasePlugin {
    /**
     * @param {import("../data-grid.js").default} grid
     */
    constructor(grid) {
        super(grid);
        this.touch = null;
    }

    connected() {
        on(this.grid, TOUCH_EVENTS, this, { passive: true });
    }

    disconnected() {
        off(this.grid, TOUCH_EVENTS, this);
    }

    ontouchstart(/** @type {TouchEvent} */ e) {
        this.touch = e.touches[0] ?? null;
    }

    ontouchmove(/** @type {TouchEvent} */ e) {
        if (!this.touch) {
            return;
        }
        const touch = e.touches[0];
        if (!touch) {
            return;
        }
        const grid = this.grid;
        const xDiff = this.touch.clientX - touch.clientX;
        const yDiff = this.touch.clientY - touch.clientY;

        if (Math.abs(xDiff) > Math.abs(yDiff)) {
            if (xDiff > 0) {
                grid.getNext();
            } else {
                grid.getPrev();
            }
        }
        this.touch = null;
    }
}

export default TouchSupport;
