import BasePlugin from "../core/base-plugin.js";
import getTextWidth from "../utils/getTextWidth.js";
import { getAttribute, hasAttribute, setAttribute } from "../utils/shortcuts.js";

/**
 * Allows to resize columns
 */
class AutosizeColumn extends BasePlugin {
  /**
   * Autosize col based on column data
   * @param {HTMLTableCellElement} th
   * @param {import("../data-grid").Column} column
   * @param {Number} min
   * @param {Number} max
   * @returns {Number}
   */
  computeSize(th, column, min, max) {
    const grid = this.grid;
    if (hasAttribute(th, "width")) {
      return getAttribute(th, "width");
    }
    if (!grid.data.length) {
      return;
    }
    const firstVal = grid.data[0];
    const lastVal = grid.data[grid.data.length - 1];
    let v = firstVal[column.field] ? firstVal[column.field].toString() : "";
    let v2 = lastVal[column.field] ? lastVal[column.field].toString() : "";
    if (v2.length > v.length) {
      v = v2;
    }
    let width = 0;
    if (v.length <= 6) {
      width = min;
    } else if (v.length > 50) {
      width = max;
    } else {
      // Add some extra room to have some spare space
      width = getTextWidth(v + "0000", th);
    }
    if (width > max) {
      width = max;
    }
    if (width < min) {
      width = min;
    }
    setAttribute(th, "width", width);
    return width;
  }
}

export default AutosizeColumn;
