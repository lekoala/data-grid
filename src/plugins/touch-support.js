import BasePlugin from "../core/base-plugin.js";

/**
 * Allows to paginate with horizontal swipe motions
 */
class TouchSupport extends BasePlugin {
  static get pluginName() {
    return "TouchSupport";
  }

  /**
   * @param {import("../data-grid").default} grid
   */
  static connected(grid) {
    grid.touch = null;
    grid.touchstart = TouchSupport.touchstart.bind(grid);
    grid.touchmove = TouchSupport.touchmove.bind(grid);
    grid.addEventListener("touchstart", grid.touchstart, { passive: true });
    grid.addEventListener("touchmove", grid.touchmove, { passive: true });
  }

  /**
   * @param {import("../data-grid").default} grid
   */
  static disconnected(grid) {
    grid.removeEventListener("touchstart", grid.touchstart);
    grid.removeEventListener("touchmove", grid.touchmove);
  }

  static touchstart(e) {
    this.touch = e.touches[0];
  }

  /**
   * @this {import("../data-grid").default}
   */
  static touchmove(e) {
    if (!this.touch) {
      return;
    }
    const xDiff = this.touch.clientX - e.touches[0].clientX;
    const yDiff = this.touch.clientY - e.touches[0].clientY;

    if (Math.abs(xDiff) > Math.abs(yDiff)) {
      if (xDiff > 0) {
        this.getNext();
      } else {
        this.getPrev();
      }
    }
    this.touch = null;
  }
}

export default TouchSupport;
