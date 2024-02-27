import BasePlugin from "../core/base-plugin.js";
import { $ } from "../utils/shortcuts.js"

/**
 * Adds an element for showing a spinning icon on grid loading.
 */
class SpinnerSupport extends BasePlugin {
  /**
   * Adds a spinner element with its associated css styles.
   */
  add() {
    const grid = this.grid,
      classes = grid.options.spinnerClass;
    if (!classes) return;
    const cls = classes.split(" ").map(e => `.${e}`).join(""),
      template = `
<style id="dg-styles">
  data-grid ${cls} { position: absolute; top: 37%; left: 47%; z-index: 999; }
  data-grid:not(.dg-loading) ${cls} { display: none; }
  data-grid:not(.dg-initialized).dg-loading ${cls} { top: 0; }
  @media only screen and (max-width: 767px) {
    data-grid[responsive] ${cls} { top: 8rem; left: 42%; } 
  }
</style>
`;
    if (!$("#dg-styles")) {
      const styleParent = $("head") ?? $("body"),
        position = /head/i.test(styleParent.tagName) ? "beforeend" : "afterbegin";
      styleParent.insertAdjacentHTML(position, template);
    }
    !$(`i${cls}`, grid) && grid.insertAdjacentHTML("afterbegin", `<i class="${classes}"></i>`);
  }
}

export default SpinnerSupport;