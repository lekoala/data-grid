import BasePlugin from "../core/base-plugin.js";
import debounce from "../utils/debounce.js";
import { addClass, find, findAll, removeClass } from "../utils/shortcuts.js";

/**
 * @param {Array<HTMLElement>} list
 * @returns {Array<HTMLElement>}
 */
function sortByPriority(list) {
  return list.sort((a, b) => {
    const v1 = parseInt(a.dataset.responsive) || 1;
    const v2 = parseInt(b.dataset.responsive) || 1;
    return v2 - v1;
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
        .reverse() // Order takes precedence if no priority is set
        .filter((col) => {
          // Leave out unresponsive columns
          return col.dataset.responsive !== "0";
        })
    );
    let changed = false;

    grid.log(`table is ${tableWidth}/${realTableWidth} and available size is ${size}. Diff: ${diff}`);

    // The table is too big when diff has a high value, otherwise it will be like -1 or -2
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
        col.dataset.baseWidth = "" + col.offsetWidth;
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
      headerCols
        .slice()
        .reverse() // Reverse the array to restore the columns in the proper order
        .filter((col) => {
          return col.hasAttribute("hidden");
        })
        .forEach((col) => {
          if (remaining < minWidth) {
            return;
          }
          const colWidth = parseInt(col.dataset.minWidth);

          // We need to have enough space to restore it
          if (colWidth > remaining) {
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
    const footer = find(grid.table, "tfoot");
    const realFooterWidth = findAll(grid.table, ".dg-footer > div").reduce((result, div) => {
      return result + div.offsetWidth;
    }, 0);
    const availableFooterWidth = footer.offsetWidth - realFooterWidth;
    if (realFooterWidth > size) {
      addClass(footer, "dg-footer-compact");
    } else if (availableFooterWidth > 250) {
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
  connected() {
    if (this.grid.options.responsive) {
      this.observe();
    }
  }
  disconnected() {
    this.unobserve();
  }
  observe() {
    if (!this.grid.options.responsive) {
      return;
    }
    resizeObserver.observe(this.grid);
    this.grid.style.display = "block"; // Otherwise resize doesn't happen
    this.grid.style.overflowX = "hidden"; // Prevent scrollbars from appearing
  }
  unobserve() {
    resizeObserver.unobserve(this.grid);
    this.grid.style.display = "unset";
    this.grid.style.overflowX = "unset";
  }
}

export default ResponsiveGrid;
