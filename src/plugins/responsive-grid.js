import BasePlugin from "../core/base-plugin.js";
import debounce from "../utils/debounce.js";
import { addClass, ce, find, findAll, hasClass, insertAfter, removeAttribute, removeClass, setAttribute } from "../utils/shortcuts.js";

const RESPONSIVE_CLASS = "dg-responsive";

let obsTo;

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
    if (grid.plugins.ResponsiveGrid.observerBlocked) {
      return;
    }
    // check inlineSize (width) and not blockSize (height)
    const contentBoxSize = Array.isArray(entry.contentBoxSize) ? entry.contentBoxSize[0] : entry.contentBoxSize;
    const size = parseInt(contentBoxSize.inlineSize);
    const tableWidth = table.offsetWidth;
    const realTableWidth = findAll(grid.headerRow, "th").reduce((result, th) => {
      return result + th.offsetWidth;
    }, 0);
    const diff = (realTableWidth || tableWidth) - size - 1;
    const minWidth = 50;
    const prevAction = grid.plugins.ResponsiveGrid.prevAction;
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
      if (prevAction === "show") {
        return;
      }
      grid.plugins.ResponsiveGrid.prevAction = "hide";
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
        grid.setColProp(field, "responsiveHidden", true);
        changed = true;

        remaining -= colWidth;
        remaining = Math.round(remaining);
      });
    } else {
      if (prevAction === "hide") {
        return;
      }
      grid.plugins.ResponsiveGrid.prevAction = "show";

      const requiredWidth =
        headerCols
          .filter((col) => {
            return !col.hasAttribute("hidden");
          })
          .reduce((result, col) => {
            const width = col.dataset.minWidth ? parseInt(col.dataset.minWidth) : col.offsetWidth;
            return result + width;
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
          grid.setColProp(field, "responsiveHidden", false);
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
    // Prevent resize loop
    setTimeout(() => {
      grid.plugins.ResponsiveGrid.prevAction = null;
    }, 1000);
    grid.table.style.visibility = "visible";
  }
}, 100);
const resizeObserver = new ResizeObserver(callback);

/**
 * Responsive data grid
 */
class ResponsiveGrid extends BasePlugin {
  constructor(grid) {
    super(grid);

    this.observerBlocked = false;
    this.prevAction = null;
  }

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

  blockObserver() {
    this.observerBlocked = true;
    if (obsTo) {
      clearTimeout(obsTo);
    }
  }

  unblockObserver() {
    obsTo = setTimeout(() => {
      this.observerBlocked = false;
    }, 200); // more than debounce
  }

  /**
   * @returns {Boolean}
   */
  hasHiddenColumns() {
    let flag = false;
    this.grid.options.columns.forEach((col) => {
      if (col.responsiveHidden) {
        flag = true;
      }
    });
    return flag;
  }

  colIndex() {
    return this.grid.startColIndex() - 1;
  }

  /**
   * @param {HTMLTableRowElement} tr
   */
  createHeaderCol(tr) {
    if (!this.grid.options.responsiveToggle) {
      return;
    }
    let th = ce("th", tr);
    setAttribute(th, "scope", "col");
    setAttribute(th, "role", "columnheader button");
    setAttribute(th, "aria-colindex", this.colIndex());
    setAttribute(th, "width", "40");
    th.classList.add(...[`${RESPONSIVE_CLASS}-toggle`, "dg-not-resizable", "dg-not-sortable"]);
    th.tabIndex = 0;
  }

  /**
   * @param {HTMLTableRowElement} tr
   */
  createFilterCol(tr) {
    if (!this.grid.options.responsiveToggle) {
      return;
    }
    let th = ce("th", tr);
    setAttribute(th, "role", "columnheader button");
    setAttribute(th, "aria-colindex", this.colIndex());
    th.classList.add(`${RESPONSIVE_CLASS}-toggle`);
    th.tabIndex = 0;
  }

  /**
   * @param {HTMLTableRowElement} tr
   */
  createDataCol(tr) {
    if (!this.grid.options.responsiveToggle) {
      return;
    }
    // Create col
    let td = document.createElement("td");
    setAttribute(td, "role", "gridcell button");
    setAttribute(td, "aria-colindex", this.colIndex());
    td.classList.add(`${RESPONSIVE_CLASS}-toggle`);

    // Create icon
    td.innerHTML = `<div class='dg-clickable-cell'><svg class='${RESPONSIVE_CLASS}-open' viewbox="0 0 24 24" height="24" width="24">
  <line x1="7" y1="12" x2="17" y2="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
  <line y1="7" x1="12" y2="17" x2="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
</svg>
<svg class='${RESPONSIVE_CLASS}-close' viewbox="0 0 24 24" height="24" width="24" style="display:none">
  <line x1="7" y1="12" x2="17" y2="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
</svg></div>`;
    tr.appendChild(td);

    td.addEventListener("click", this);
    td.addEventListener("mousedown", this);
  }

  computeLabelWidth() {
    let idealWidth = 0;
    let consideredCol = 0;
    while (idealWidth < 120) {
      consideredCol++;
      const hCol = find(this.grid, `.dg-head-columns th[aria-colindex="${consideredCol}"]`);
      if (hCol) {
        idealWidth += hCol.offsetWidth;
      } else {
        break;
      }
    }
    return idealWidth;
  }

  /**
   * @param {Event} ev
   */
  onmousedown(ev) {
    // Avoid selection through double click
    ev.preventDefault();
  }

  /**
   * @param {Event} ev
   */
  onclick(ev) {
    // Prevent expandable
    ev.stopPropagation();

    // target is the element that triggered the event (e.g., the user clicked on)
    // currentTarget is the element that the event listener is attached to.

    /**
     * @type {HTMLTableRowElement}
     */
    //@ts-ignore
    const td = ev.currentTarget;
    const tr = td.parentElement;
    const open = find(td, `.${RESPONSIVE_CLASS}-open`);
    const close = find(td, `.${RESPONSIVE_CLASS}-close`);

    this.blockObserver();

    const isExpanded = hasClass(tr, `${RESPONSIVE_CLASS}-expanded`);
    if (isExpanded) {
      removeClass(tr, `${RESPONSIVE_CLASS}-expanded`);
      open.style.display = "unset";
      close.style.display = "none";

      // Move back rows and cleanup row
      const childRow = tr.nextElementSibling;
      const hiddenCols = findAll(childRow, `.${RESPONSIVE_CLASS}-hidden`);
      hiddenCols.forEach((col) => {
        // We don't really need to care where we insert them since we are going to redraw anyway
        tr.appendChild(col);
        setAttribute(col, "hidden");
      });

      childRow.parentElement.removeChild(childRow);
    } else {
      addClass(tr, `${RESPONSIVE_CLASS}-expanded`);
      open.style.display = "none";
      close.style.display = "unset";

      // Create a child row and move rows into it
      const childRow = ce("tr");
      insertAfter(childRow, tr);
      addClass(childRow, `${RESPONSIVE_CLASS}-child-row`);

      const childRowTd = ce("td", childRow);
      setAttribute(childRowTd, "colspan", this.grid.columnsLength(true));

      const childTable = ce("table", childRowTd);
      addClass(childTable, `${RESPONSIVE_CLASS}-table`);

      const hiddenCols = findAll(tr, `.${RESPONSIVE_CLASS}-hidden`);
      const idealWidth = this.computeLabelWidth();
      hiddenCols.forEach((col) => {
        const childTableRow = ce("tr", childTable);

        // Add label
        const label = col.dataset.name;
        const labelCol = ce("th", childTableRow);
        // It looks much better when aligned with an actual col
        labelCol.style.width = `${idealWidth}px`;
        labelCol.innerHTML = label;

        // Add actual row
        childTableRow.appendChild(col);
        removeAttribute(col, "hidden");
      });
    }

    this.unblockObserver();
  }
}

export default ResponsiveGrid;
