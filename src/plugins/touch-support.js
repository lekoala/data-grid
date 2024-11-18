import BasePlugin from "../core/base-plugin.js";

/**
 * Allows to paginate with horizontal swipe motions
 */
class TouchSupport extends BasePlugin {
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

    ontouchstart(e) {
        this.touch = e.touches[0];
    }

    ontouchmove(e) {
        if (!this.touch) {
            return;
        }
        const grid = this.grid;
        const xDiff = this.touch.clientX - e.touches[0].clientX;
        const yDiff = this.touch.clientY - e.touches[0].clientY;

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
