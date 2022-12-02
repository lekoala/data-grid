import BasePlugin from "../core/base-plugin.js";
import { setAttribute } from "../utils/shortcuts.js";

/**
 * Support for fixed table height
 *
 * We should add a fake row to push the footer down in case we don't have enough rows
 */
class FixedHeight extends BasePlugin {
  constructor(grid) {
    super(grid);

    this.hasFixedHeight = false;
    // If we have a fixed height, make sure we have overflowY set
    if (grid.style.height) {
      grid.style.overflowY = "auto";
      this.hasFixedHeight = true;
    }
  }

  /**
   */
  computeDefaultHeight() {
    console.log("compute");
    const grid = this.grid;
    this.updateFakeRow();

    if (grid.options.autoheight && !this.hasFixedHeight) {
      const h = 0;
      // Adjust height so that it fits our table size
      // grid.style.height = h + "px";

      // If our min height is too big, adjust value
      const mh = grid.style.minHeight;
      if (mh && parseInt(mh) > h) {
        grid.style.minHeight = h + "px";
      }
    }
  }

  /**
   */
  createFakeRow() {
    const grid = this.grid;
    const tbody = grid.querySelector("tbody");
    let tr = document.createElement("tr");
    setAttribute(tr, "role", "row");
    setAttribute(tr, "hidden", "");
    tr.classList.add("dg-fake-row");
    tr.tabIndex = 0;
    tbody.appendChild(tr);
  }

  get fakeRow() {
    return this.grid.querySelector(".dg-fake-row");
  }

  /**
   * On last page, adjust height if using fixed height
   */
  updateFakeRow() {
    const grid = this.grid;
    if (!grid.style.height) {
      // return;
    }
    const fakeRow = this.fakeRow;
    if (!fakeRow) {
      return;
    }

    // Find remaining missing height
    let max = grid.options.perPage * grid.rowHeight;
    if (this.hasFixedHeight) {
      let h = parseInt(this.grid.style.height);
      const thead = this.grid.querySelector("thead").offsetHeight;
      const tfoot = this.grid.querySelector("tfoot").offsetHeight;
      if (grid.isSticky()) {
        max = h + (thead + tfoot);
      } else {
        max = h;
      }
    }

    const visibleRows = grid.querySelectorAll("tbody tr:not([hidden])").length;
    const fakeHeight = visibleRows > 1 ? max - visibleRows * grid.rowHeight : max;
console.log(fakeHeight);
    if (fakeHeight > 0) {
      setAttribute(fakeRow, "height", fakeHeight);
      fakeRow.removeAttribute("hidden");
    } else {
      fakeRow.removeAttribute("height");
    }
  }
}

export default FixedHeight;
