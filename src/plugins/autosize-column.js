import BasePlugin from "../core/base-plugin";
import getTextWidth from "../utils/getTextWidth";
import { getAttribute, hasAttribute, setAttribute } from "../utils/shortcuts";

/**
 * Allows to resize columns
 */
class AutosizeColumn extends BasePlugin {
  static get pluginName() {
    return "AutosizeColumn";
  }
  /**
   * Autosize col based on column data
   * @param {import("../data-grid").default} grid
   * @param {HTMLTableCellElement} th
   * @param {import("../data-grid").Column} column
   * @param {Number} min
   * @param {Number} max
   * @returns {Number}
   */
  static autosizeColumn(grid, th, column, min, max) {
    if (hasAttribute(th, "width")) {
      return getAttribute(th, "width");
    }
    if (!grid.data.length) {
      return;
    }
    let v = grid.data[0][column.field].toString();
    let v2 = grid.data[grid.data.length - 1][column.field].toString();
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
    if (width < min) {
      width = min;
    }
    setAttribute(th, "width", width);
    return width;
  }
}

export default AutosizeColumn;
