import BasePlugin from "../core/base-plugin.js";

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
        const grid = this.grid;
        grid.addEventListener("touchstart", this, { passive: true });
        grid.addEventListener("touchmove", this, { passive: true });
    }

    disconnected() {
        const grid = this.grid;
        grid.removeEventListener("touchstart", this);
        grid.removeEventListener("touchmove", this);
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
