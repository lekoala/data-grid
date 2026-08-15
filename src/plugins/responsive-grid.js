import BasePlugin from "../core/base-plugin.js";
import debounce from "../utils/debounce.js";
import {
    addClass,
    ce,
    find,
    findAll,
    hasClass,
    insertAfter,
    removeAttribute,
    removeClass,
    setAttribute,
} from "../utils/shortcuts.js";

const RESPONSIVE_CLASS = "dg-responsive";
const RESPONSIVE_TOGGLE_WIDTH = 40;
// Restore only when there is real headroom: avoids hide/show flapping when the
// width sits exactly on a priority threshold (grid geometry is 4px based).
const RESTORE_HYSTERESIS = 8;

/**
 * @param {Array<HTMLElement>} list
 * @returns {Array<HTMLElement>}
 */
function sortByPriority(list) {
    return list.sort((a, b) => {
        const v1 = Number.parseInt(a.dataset.responsive ?? "") || 1;
        const v2 = Number.parseInt(b.dataset.responsive ?? "") || 1;
        return v2 - v1;
    });
}

/**
 * Responsive data grid
 */
class ResponsiveGrid extends BasePlugin {
    /**
     * @param {import("../data-grid.js").default} grid
     */
    constructor(grid) {
        super(grid);

        this.observerBlocked = false;
        this.unblockTimeout = null;
        this._lastEntry = null;
        this._lastProcessedWidth = /** @type {Number|null} */ (null);
        this._scheduleResize = /** @type {() => void} */ (debounce(() => this.resize(), 100));
        this.observer = new ResizeObserver((entries) => {
            this._lastEntry = entries[entries.length - 1];
            this._scheduleResize();
        });
    }

    connected() {
        if (this.grid.options.responsive) {
            this.observe();
        }
    }

    disconnected() {
        this.unobserve();
        if (this.unblockTimeout) {
            clearTimeout(this.unblockTimeout);
        }
    }

    /**
     * @param {Boolean} enabled
     */
    responsiveChanged(enabled) {
        if (enabled) {
            this.observe();
        } else {
            this.unobserve();
        }
    }

    observe() {
        if (!this.grid.options.responsive) {
            return;
        }
        this.observer.observe(this.grid);
        this.grid.style.display = "block"; // Otherwise resize doesn't happen
        this.grid.style.overflowX = "hidden"; // Prevent scrollbars from appearing
    }

    unobserve() {
        this.observer.unobserve(this.grid);
        this.grid.style.display = "unset";
        this.grid.style.overflowX = "unset";
    }

    /**
     * Inject the responsive toggle column. The column always exists when
     * responsive is active so the row structure stays stable during resize;
     * it is simply hidden until at least one column is responsiveHidden.
     * @param {import("../data-grid.js").Column[]} columns
     */
    extendColumns(columns) {
        if (!this.grid.options.responsive || !this.grid.options.responsiveToggle) {
            return;
        }
        columns.unshift({
            id: "$responsive",
            virtual: true,
            position: "start",
            sortable: false,
            title: "",
            class: `${RESPONSIVE_CLASS}-toggle`,
            hidden: !this.hasHiddenColumns(),
            renderHeaderCell: (th) => this.createHeaderCell(th),
            renderFilterCell: () => this.createFilterCell(),
            renderCell: () => this.createDataCell(),
        });
    }

    blockObserver() {
        this.observerBlocked = true;
        if (this.unblockTimeout) {
            clearTimeout(this.unblockTimeout);
        }
    }

    unblockObserver() {
        this.unblockTimeout = setTimeout(() => {
            this.observerBlocked = false;
            // Re-evaluate only when a genuinely new inlineSize arrived while the
            // observer was blocked; re-running for the same width is useless
            // (the state is idempotent for a given width).
            const entry = this._lastEntry;
            if (entry) {
                const contentBoxSize = Array.isArray(entry.contentBoxSize)
                    ? entry.contentBoxSize[0]
                    : entry.contentBoxSize;
                const size = Math.round(contentBoxSize.inlineSize);
                if (size !== this._lastProcessedWidth) {
                    this.resize();
                }
            }
        }, 200); // more than debounce
    }

    /**
     * @returns {Boolean}
     */
    hasHiddenColumns() {
        let flag = false;

        for (const col of this.grid.options.columns) {
            if (col.responsiveHidden) {
                flag = true;
            }
        }
        return flag;
    }

    /**
     * @param {HTMLTableCellElement} th
     */
    createHeaderCell(th) {
        setAttribute(th, "width", "40");
        th.classList.add("dg-not-resizable", "dg-not-sortable");
    }

    createFilterCell() {}

    /**
     * @returns {HTMLElement}
     */
    createDataCell() {
        // Create icon
        const cell = document.createElement("div");
        cell.classList.add("dg-clickable-cell");
        cell.innerHTML = `<svg class='${RESPONSIVE_CLASS}-open' viewbox="0 0 24 24" height="24" width="24">
  <line x1="7" y1="12" x2="17" y2="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
  <line y1="7" x1="12" y2="17" x2="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
</svg>
<svg class='${RESPONSIVE_CLASS}-close' viewbox="0 0 24 24" height="24" width="24" style="display:none">
  <line x1="7" y1="12" x2="17" y2="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
</svg>`;

        cell.addEventListener("click", this);
        cell.addEventListener("mousedown", this);

        return cell;
    }

    /**
     * Apply responsive hide/show based on the last observed size.
     */
    resize() {
        const grid = this.grid;
        const table = grid.table;
        const headerRow = grid.headerRow;
        if (this.observerBlocked) {
            return;
        }
        if (!table || !headerRow) {
            return;
        }
        const entry = this._lastEntry;
        if (!entry) {
            return;
        }
        // check inlineSize (width) and not blockSize (height)
        const contentBoxSize = Array.isArray(entry.contentBoxSize) ? entry.contentBoxSize[0] : entry.contentBoxSize;
        const size = Math.round(contentBoxSize.inlineSize);
        // The state is idempotent for a given width: skip duplicate evaluations
        // (ex: a resize that merely re-renders after a visibility change).
        if (size === this._lastProcessedWidth) {
            return;
        }
        this._lastProcessedWidth = size;

        // Preferred (ideal) width of a header column, before any compression.
        // Falls back to the CSS min-width (plugin columns such as actions or
        // selection only declare a min/width in CSS) and finally 0: a column
        // without a declared basis is a stretch column and must not feed its
        // layout-dependent offsetWidth back into the math (that oscillates).
        const preferredWidth = (/** @type {HTMLElement} */ th) => {
            return (
                Number.parseInt(th.dataset.preferredWidth ?? "") ||
                Number.parseInt(th.getAttribute("width") ?? "") ||
                Number.parseInt(th.dataset.minWidth ?? "") ||
                Number.parseInt(getComputedStyle(th).minWidth || "") ||
                0
            );
        };

        // Hideable candidates: data columns only, responsive !== "0", not
        // manually hidden. Ordered most important last (priority order).
        const items = sortByPriority(
            findAll(headerRow, "th[field]")
                .reverse() // Order takes precedence if no priority is set
                .filter((th) => {
                    const column = grid.getCol(th.getAttribute("field") ?? "");
                    return column && column.responsive !== 0 && !column.hidden;
                }),
        ).map((th) => {
            return {
                th,
                column: /** @type {import("../data-grid.js").Column|null} */ (
                    grid.getCol(th.getAttribute("field") ?? "")
                ),
            };
        });

        const isColumnHidden = (/** @type {import("../data-grid.js").Column|null} */ column) => {
            return Boolean(column && (column.hidden || column.responsiveHidden));
        };

        // Virtual/fixed columns (selection, actions, ...) consume width without
        // being hideable. The responsive toggle column is excluded: it is
        // reserved separately below, only when columns are hidden.
        const fixedWidth = findAll(headerRow, "th:not([field])")
            .filter((th) => {
                return !th.classList.contains(`${RESPONSIVE_CLASS}-toggle`);
            })
            .reduce((result, th) => {
                return result + preferredWidth(/** @type {HTMLElement} */ (th));
            }, 0);
        const requiredWidth = (/** @type {Array<any>} */ visibleItems) => {
            let total = fixedWidth;
            if (grid.options.responsiveToggle && items.some(({ column }) => column?.responsiveHidden)) {
                total += RESPONSIVE_TOGGLE_WIDTH;
            }
            for (const { th } of visibleItems) {
                total += preferredWidth(th);
            }
            return total;
        };

        // All data columns that are currently rendered (including responsive: 0
        // columns, which never hide but still consume width).
        let visible = findAll(headerRow, "th[field]")
            .map((th) => {
                return {
                    th,
                    column: /** @type {import("../data-grid.js").Column|null} */ (
                        grid.getCol(th.getAttribute("field") ?? "")
                    ),
                };
            })
            .filter(({ column }) => !isColumnHidden(column));
        let changed = false;

        // The table is too wide: hide the next priority column until it fits.
        // Always keep at least one real data column.
        if (requiredWidth(visible) > size) {
            for (const item of items) {
                if (requiredWidth(visible) <= size) {
                    break;
                }
                if (visible.length <= 1) {
                    break;
                }
                const { column } = item;
                if (!column?.field || isColumnHidden(column)) {
                    continue;
                }
                grid.setColProp(column.field, "responsiveHidden", true);
                visible = visible.filter((c) => c.th !== item.th);
                changed = true;
            }
        } else {
            // Room is available: restore columns in reverse priority order while
            // they fit.
            const restorable = items.filter(({ column }) => column?.responsiveHidden).reverse();
            for (const { th, column } of restorable) {
                if (!column?.field) {
                    continue;
                }
                const width = preferredWidth(th);
                if (requiredWidth(visible) + width > size - RESTORE_HYSTERESIS) {
                    break;
                }
                grid.setColProp(column.field, "responsiveHidden", false);
                visible = [...visible, { th, column }];
                changed = true;
            }
        }

        if (changed) {
            this.blockObserver();
            grid._syncColumnVisibility();
            this.unblockObserver();
        }

        // Footer compact state is independent of column changes.
        const footer = find(table, "tfoot");
        if (footer) {
            const realFooterWidth = findAll(footer, ".dg-footer > div").reduce((result, div) => {
                return result + div.offsetWidth;
            }, 0);
            const availableFooterWidth = footer.offsetWidth - realFooterWidth;
            if (realFooterWidth > size) {
                addClass(footer, "dg-footer-compact");
            } else if (availableFooterWidth > 250) {
                removeClass(footer, "dg-footer-compact");
            }
        }
        table.style.visibility = "visible";
    }

    computeLabelWidth() {
        let idealWidth = 0;
        const hCols = findAll(this.grid, ".dg-head-columns th");
        for (const hCol of hCols) {
            if (idealWidth >= 120) {
                break;
            }
            idealWidth += hCol.offsetWidth;
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
        const cell = /** @type {HTMLElement} */ (ev.currentTarget);
        const tr = cell.closest("tr");
        if (!tr) {
            return;
        }
        const open = find(cell, `.${RESPONSIVE_CLASS}-open`);
        const close = find(cell, `.${RESPONSIVE_CLASS}-close`);
        if (!open || !close) {
            return;
        }

        this.blockObserver();

        const isExpanded = hasClass(tr, `${RESPONSIVE_CLASS}-expanded`);
        if (isExpanded) {
            removeClass(tr, `${RESPONSIVE_CLASS}-expanded`);
            open.style.display = "unset";
            close.style.display = "none";

            // Move back rows and cleanup row
            const childRow = tr.nextElementSibling;
            if (childRow) {
                const hiddenCols = findAll(childRow, `.${RESPONSIVE_CLASS}-hidden`);

                for (const col of hiddenCols) {
                    // We don't really need to care where we insert them since we are going to redraw anyway
                    tr.appendChild(col);
                    setAttribute(col, "hidden");
                }

                childRow.parentElement?.removeChild(childRow);
            }
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

            for (const col of hiddenCols) {
                const childTableRow = ce("tr", childTable);

                // Add label
                const label = col.dataset.name;
                const labelCol = ce("th", childTableRow);
                // It looks much better when aligned with an actual col
                labelCol.style.width = `${idealWidth}px`;
                labelCol.innerHTML = label ?? "";

                // Add actual row
                childTableRow.appendChild(col);
                removeAttribute(col, "hidden");
            }
        }

        this.unblockObserver();
    }
}

export default ResponsiveGrid;
