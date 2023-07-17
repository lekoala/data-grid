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
   * On last page, use a fake row to push footer down
   */
  updateFakeRow() {
    const grid = this.grid;
    const fakeRow = this.fakeRow;
    if (!fakeRow) {
      return;
    }

    // We don't need a fake row if we display everything
    if (grid.options.perPage > grid.totalRecords()) {
      return;
    }
    // We are not on last page
    if (grid.page !== grid.totalPages()) {
      return;
    }
    if (!grid.options.autoheight) {
      return;
    }
    // Find remaining missing height
    const max = grid.options.perPage * grid.rowHeight;
    const visibleRows = grid.querySelectorAll("tbody tr:not([hidden])").length;
    const fakeHeight = visibleRows > 1 ? max - visibleRows * grid.rowHeight : max;
    if (fakeHeight > 0) {
      setAttribute(fakeRow, "height", fakeHeight);
      fakeRow.removeAttribute("hidden");
    } else {
      fakeRow.removeAttribute("height");
    }
  }
}

export default FixedHeight;
