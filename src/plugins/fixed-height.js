import BasePlugin from "../core/base-plugin.js";
import { setAttribute } from "../utils/shortcuts.js";

/**
 * Support for fixed table height
 *
 * We should add a fake row to push the footer down in case we don't have enough rows
 */
class FixedHeight extends BasePlugin {
  /**
   */
  computeDefaultHeight() {
    const grid = this.grid;
    // Wait until height is fully computed
    requestAnimationFrame(() => {
      grid.defaultHeight = grid.querySelector("table").offsetHeight;

      // If we have a fixed height, make sure we have overflowY set
      if (grid.style.height) {
        grid.style.overflowY = "auto";
      }

      if (grid.options.autoheight) {
        // Adjust height so that it fits our table size
        if (grid.style.height) {
          grid.style.height = grid.defaultHeight + "px";
        }
        // If our min height is too big, adjust value
        if (grid.style.minHeight && parseInt(grid.style.minHeight) > grid.defaultHeight) {
          grid.style.minHeight = grid.defaultHeight + "px";
        }
      }
    });
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

  /**
   */
  updateFakeRow() {
    const grid = this.grid;
    if (!grid.style.height) {
      return;
    }
    // On last page, adjust height if using fixed height
    let fakeRow = grid.querySelector(".dg-fake-row");
    if (!fakeRow) {
      return;
    }

    // Check if we are below set height
    if (parseInt(grid.style.height) > grid.querySelector("tbody").offsetHeight) {
      const max = grid.options.perPage * grid.rowHeight;
      const visibleRows = grid.querySelectorAll("tbody tr:not([hidden])").length;
      const fakeHeight = visibleRows > 1 ? max - visibleRows * grid.rowHeight : max;
      setAttribute(fakeRow, "height", fakeHeight);
      fakeRow.removeAttribute("hidden");
    } else {
      fakeRow.removeAttribute("height");
    }
  }
}

export default FixedHeight;
