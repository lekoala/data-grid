import BasePlugin from "../core/base-plugin.js";
import debounce from "../utils/debounce.js";
import { addClass, findAll, removeClass } from "../utils/shortcuts.js";

function sortByPriority(list) {
  return Array.from(list).sort(function (a, b) {
    a = parseInt(a.dataset.responsive) || 1;
    b = parseInt(b.dataset.responsive) || 1;
    if (a === b) {
      b++;
    }
    return b - a;
  });
}

/**
 * @type {ResizeObserverCallback}
 */
//@ts-ignore
const callback = debounce((entries) => {
  for (const entry of entries) {
    /**
     * @type {import("../data-grid").default}
     */
    // @ts-ignore
    const grid = entry.target;
    const table = grid.table;
    // check inlineSize (width) and not blockSize (height)
    const contentBoxSize = Array.isArray(entry.contentBoxSize) ? entry.contentBoxSize[0] : entry.contentBoxSize;
    const size = parseInt(contentBoxSize.inlineSize);
    const tableWidth = table.offsetWidth;
    const realTableWidth = findAll(grid.headerRow, "th").reduce((result, th) => {
      return result + th.offsetWidth;
    }, 0);
    const diff = (realTableWidth || tableWidth) - size - 1;
    const minWidth = 50;
    // We have an array with the columns to show/hide are in order, most important first
    const headerCols = sortByPriority(
      findAll(grid.headerRow, "th[field]")
        .reverse()
        .filter((col) => {
          return col.dataset.responsive !== "0";
        })
    );
    let changed = false;

    // grid.log(`table is ${tableWidth}/${realTableWidth} and available size is ${size}`);

    // The table is too big
    if (diff > 0) {
      let remaining = diff;
      let cols = headerCols.filter((col) => {
        return !col.hasAttribute("hidden") && col.hasAttribute("data-responsive");
      });
      if (cols.length === 0) {
        cols = headerCols.filter((col) => {
          return !col.hasAttribute("hidden");
        });
        // Always keep one column
        if (cols.length === 1) {
          return;
        }
      }
      cols.forEach((col) => {
        if (remaining < 0) {
          return;
        }

        const colWidth = col.offsetWidth;
        const field = col.getAttribute("field");
        if (!field) {
          return;
        }
        col.dataset.baseWidth = col.offsetWidth;
        grid.hideColumn(field, false);
        changed = true;

        remaining -= colWidth;
        remaining = Math.round(remaining);
      });
    } else {
      const requiredWidth =
        headerCols
          .filter((col) => {
            return !col.hasAttribute("hidden");
          })
          .reduce((result, col) => {
            return result + parseInt(col.dataset.minWidth);
          }, 0) + minWidth; // Add an offset so that inserting column is smoother

      // Compute available width to insert columns
      let remaining = size - requiredWidth;
      // Do we have any hidden column that we can restore ?
      // Reverse the array to restore the columns in the proper order
      headerCols
        .slice()
        .reverse()
        .filter((col) => {
          return col.hasAttribute("hidden");
        })
        .forEach((col) => {
          if (remaining < minWidth) {
            return;
          }
          const colWidth = parseInt(col.dataset.minWidth);

          // We need to have enough space to restore it
          if (size < colWidth + requiredWidth) {
            remaining = -1; // break loop to keep restoring in order
            return;
          }

          const field = col.getAttribute("field");
          if (!field) {
            return;
          }
          grid.showColumn(field, false);
          changed = true;

          remaining -= colWidth;
          remaining = Math.round(remaining);
        });
    }

    // Check footer
    const footer = grid.table.querySelector("tfoot");
    if (footer.offsetWidth > size) {
      addClass(footer, "dg-footer-compact");
    } else if (footer.offsetWidth < size + 200) {
      removeClass(footer, "dg-footer-compact");
    }
    if (changed) {
      grid.renderTable();
    }
    grid.table.style.visibility = "visible";
  }
}, 100);
const resizeObserver = new ResizeObserver(callback);

/**
 * Responsive data grid
 */
class ResponsiveGrid extends BasePlugin {
  static get pluginName() {
    return "ResponsiveGrid";
  }
  /**
   * @param {import("../data-grid").default} grid
   */
  static connected(grid) {
    if (grid.options.responsive) {
      this.observe(grid);
    }
  }
  /**
   * @param {import("../data-grid").default} grid
   */
  static disconnected(grid) {
    this.unobserve(grid);
  }
  /**
   * @param {import("../data-grid").default} grid
   */
  static observe(grid) {
    if (!grid.options.responsive) {
      return;
    }
    resizeObserver.observe(grid);
    grid.style.display = "block"; // Otherwise resize doesn't happen
    grid.style.overflowX = "hidden"; // Prevent scrollbars from appearing
  }
  /**
   * @param {import("../data-grid").default} grid
   */
  static unobserve(grid) {
    resizeObserver.unobserve(grid);
    grid.style.display = "unset";
    grid.style.overflowX = "unset";
  }
}

export default ResponsiveGrid;
